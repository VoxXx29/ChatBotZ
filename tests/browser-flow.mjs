// This suite mocks GPU inference, not model quality or GPU compatibility.
// It exercises the real WebLLM proxy and application streaming/error flows.
import { connect, wait, assert } from './browser-cdp.mjs'
const { c, js, events, ws } = await connect()
await c('Page.enable')
await c('Runtime.enable')
const mock = `
window.__workerMode='normal';window.__workerRequests=[];window.__workersTerminated=0;
Object.defineProperty(navigator,'gpu',{value:{requestAdapter:async()=>({})},configurable:true});
window.Worker=class extends EventTarget{
 onmessage=null; streams=new Map();dead=false;
 terminate(){this.dead=true;window.__workersTerminated++}
 emit(uuid,content,kind='return'){if(!this.dead)this.onmessage?.(new MessageEvent('message',{data:{kind,uuid,content}}))}
 postMessage(msg){
  if(msg.kind==='setLogLevel')return;
  if(msg.kind==='reload'){window.__workerRequests.push(msg);setTimeout(()=>{this.emit(msg.uuid,{progress:.5,text:'Test download'},'initProgressCallback');this.emit(msg.uuid,null)},120);return}
  if(msg.kind==='chatCompletionStreamInit'){
   window.__workerRequests.push(msg);
   if(window.__workerMode==='error'){this.emit(msg.uuid,'Simulated GPU failure','throw');return}
   if(window.__workerMode==='stall')return;
   this.streams.set(msg.content.streamId,{i:0,stopped:false});this.emit(msg.uuid,null);return
  }
  if(msg.kind==='interruptGenerate'){for(const stream of this.streams.values())stream.stopped=true;this.emit(msg.uuid,null);return}
  if(msg.kind==='completionStreamNextChunk'){
   const stream=this.streams.get(msg.content.streamId);
   setTimeout(()=>{if(!stream||stream.stopped||stream.i>=3){this.emit(msg.uuid,undefined);return}
   const chunks=['Jawaban **lokal**.\\n\\n','Studio tutup pukul 23.00.\\n\\n',''];
   const i=stream.i++;this.emit(msg.uuid,{choices:[{index:0,delta:{content:i===2?'':chunks[i]},finish_reason:i===2?'stop':null}]});},150);return
  }
  this.emit(msg.uuid,null)
 }
};`
const { identifier } = await c('Page.addScriptToEvaluateOnNewDocument', { source: mock })
await c('Page.navigate', { url: process.env.TEST_APP_URL || 'http://localhost:3000' })
await wait(1200)
await js(
  'localStorage.setItem("riff-local-knowledge-v1",JSON.stringify([{id:"test",title:"Jam studio",content:"Studio buka pukul 11.00 dan tutup pukul 23.00."}]))',
)
await c('Page.reload')
await wait(800)
await js(
  '[...document.querySelectorAll("button")].find(b=>b.textContent.includes("AKTIFKAN AI")).click()',
)
for (let i = 0; i < 100; i++) {
  await wait(100)
  if (await js('document.body.innerText.includes("MODEL SIAP")')) break
}
assert(
  await js('document.body.innerText.includes("MODEL SIAP")'),
  'mock engine enables chat through real WebLLM proxy',
)
assert(
  await js('document.querySelector("select").disabled'),
  'model selection locked while engine loaded',
)
async function send(text) {
  await js(
    `(()=>{const t=document.querySelector('.composer textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,${JSON.stringify(text)});t.dispatchEvent(new Event('input',{bubbles:true}));})()`,
  )
  await wait(50)
  await js('document.querySelector(".composer").requestSubmit()')
}
await send('Jam studio tutup?')
await wait(250)
assert(
  await js(
    'document.querySelector(".reply-bubble")?.textContent.includes("Jawaban lokal") && !!document.querySelector(".typing")',
  ),
  'streaming updates appear before completion',
)
await wait(600)
assert(
  await js('document.querySelector(".reply-bubble strong")?.textContent==="lokal"'),
  'AI Markdown is safely formatted',
)
assert(
  await js(
    'window.__workerRequests.find(r=>r.kind==="chatCompletionStreamInit").content.request.messages[0].content.includes("23.00")',
  ),
  'local knowledge reaches actual generation request',
)
assert(
  await js('document.body.innerText.includes("KONTEKS LOKAL / Jam studio")'),
  'retrieved references are disclosed',
)
await send('Lalu studio buka jam berapa?')
await wait(850)
assert(
  await js(
    'window.__workerRequests.filter(r=>r.kind==="chatCompletionStreamInit")[1].content.request.messages.some(m=>m.role==="assistant"&&m.content.includes("23.00"))',
  ),
  'follow-up passes prior assistant answer as context',
)
await js('window.__workerMode="error"')
await send('Pertanyaan gagal')
await wait(250)
assert(
  await js('document.querySelectorAll(".reply-bubble")[2].textContent.includes("COBA LAGI")'),
  'generation errors expose a retry action',
)
await js(
  'window.__workerMode="normal";[...document.querySelectorAll(".reply-bubble button")].at(-1).click()',
)
await wait(850)
assert(
  await js(
    'document.querySelectorAll(".user-row").length===3 && !document.querySelector(".reply-bubble button")',
  ),
  'retry replaces failed reply without duplicating user message',
)
await send('Pertanyaan di sesi lama')
await wait(50)
await js('document.querySelector(".new-session").click()')
assert(
  await js(
    'document.querySelectorAll(".session").length===2 && document.querySelector(".send-button").disabled',
  ),
  'session switching keeps a single generation lock',
)
await wait(850)
await js('document.querySelectorAll(".session")[1].click()')
assert(
  await js('document.querySelectorAll(".user-row").length===4'),
  'response stays attached to its originating session',
)
await js('window.__workerMode="stall"')
await send('Jawaban yang akan dihentikan')
await wait(150)
await js(`document.querySelector('[aria-label="Hentikan jawaban"]').click()`)
for (let i = 0; i < 50; i++) {
  await wait(100)
  if (await js('!document.querySelector(".typing")')) break
}
assert(
  await js(
    '!document.querySelector(".typing") && document.body.innerText.includes("DIHENTIKAN OLEH PENGGUNA")',
  ),
  'Stop resolves stalled generation without locking chat',
)
assert(
  await js('window.__workersTerminated>0 && document.body.innerText.includes("AKTIFKAN AI")'),
  'unresponsive GPU worker released after Stop',
)
assert(
  events.filter((e) => e.method === 'Runtime.exceptionThrown').length === 0,
  'mocked streaming and error flows have no uncaught runtime exceptions',
)
await c('Page.removeScriptToEvaluateOnNewDocument', { identifier })
await c('Page.reload')
ws.close()
