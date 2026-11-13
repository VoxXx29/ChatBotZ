import { useCallback, useEffect, useRef, useState } from 'react'
import type { WebWorkerMLCEngine } from '@mlc-ai/web-llm'
import { buildContext, type ChatTurn, type KnowledgeNote } from './knowledge'

export const MODELS = [
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC',
    name: 'Qwen 2.5 · 0.5B / Ringan',
    detail: 'Unduhan ±500 MB · memori GPU ±1,1 GB. Cepat, tetapi jawaban lebih sederhana.',
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC',
    name: 'Qwen 2.5 · 1.5B / Lebih mampu',
    detail: 'Unduhan ±1 GB · memori GPU ±1,9 GB. Lebih baik untuk bahasa dan penjelasan.',
  },
] as const
export type EngineStatus = 'checking' | 'unsupported' | 'idle' | 'loading' | 'ready' | 'error'

export function useLocalAI() {
  const [status, setStatus] = useState<EngineStatus>('checking')
  const [model, setModel] = useState<string>(MODELS[0].id)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [error, setError] = useState('')
  const engine = useRef<WebWorkerMLCEngine | null>(null)
  const worker = useRef<Worker | null>(null)
  const loadVersion = useRef(0)
  const running = useRef(false)
  const stopped = useRef(false)
  const abortGeneration = useRef<((reason: Error) => void) | null>(null)
  const hardStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let alive = true
    async function check() {
      try {
        const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
        const adapter = gpu ? await gpu.requestAdapter() : null
        if (alive) setStatus(adapter ? 'idle' : 'unsupported')
      } catch {
        if (alive) setStatus('unsupported')
      }
    }
    void check()
    return () => {
      alive = false
      loadVersion.current++
      worker.current?.terminate()
      engine.current = null
      if (hardStopTimer.current) clearTimeout(hardStopTimer.current)
      stopped.current = true
      abortGeneration.current?.(new Error('Component unmounted'))
    }
  }, [])

  const unload = useCallback(() => {
    loadVersion.current++
    worker.current?.terminate()
    worker.current = null
    engine.current = null
    running.current = false
    setProgress(0)
    setProgressText('')
    setError('')
    setStatus('idle')
  }, [])

  const load = useCallback(async () => {
    if (worker.current) return
    const version = ++loadVersion.current
    setStatus('loading')
    setError('')
    setProgress(0)
    setProgressText('Menyiapkan mesin lokal…')
    try {
      const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm')
      if (version !== loadVersion.current) return
      const localWorker = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' })
      worker.current = localWorker
      let rejectWorker!: (reason: Error) => void
      const workerFailure = new Promise<never>((_, reject) => {
        rejectWorker = reject
      })
      const onWorkerError = () => rejectWorker(new Error('Worker AI gagal dijalankan.'))
      localWorker.addEventListener('error', onWorkerError, { once: true })
      const ready = await Promise.race([
        CreateWebWorkerMLCEngine(
          localWorker,
          model,
          {
            initProgressCallback: (report) => {
              if (version !== loadVersion.current) return
              setProgress(Math.round(Math.max(0, Math.min(1, report.progress)) * 100))
              setProgressText(report.text)
            },
            logLevel: 'ERROR',
          },
          { context_window_size: 4096 },
        ),
        workerFailure,
      ])
      localWorker.removeEventListener('error', onWorkerError)
      if (version !== loadVersion.current) {
        localWorker.terminate()
        return
      }
      engine.current = ready
      setStatus('ready')
      setProgress(100)
    } catch {
      if (version !== loadVersion.current) return
      worker.current?.terminate()
      worker.current = null
      engine.current = null
      setStatus('error')
      setError(
        'Model gagal dimuat. Periksa koneksi ke Hugging Face/GitHub, ruang penyimpanan, dan memori GPU. Tutup tab berat, lalu coba lagi. WebGPU dapat dibatasi di dalam preview iframe.',
      )
    }
  }, [model])

  const stop = useCallback(() => {
    stopped.current = true
    engine.current?.interruptGenerate()
    if (hardStopTimer.current) clearTimeout(hardStopTimer.current)
    // Some GPUs cannot interrupt a long prefill promptly. Release the worker
    // rather than leaving the interface blocked indefinitely.
    hardStopTimer.current = setTimeout(() => {
      if (!running.current) return
      worker.current?.terminate()
      worker.current = null
      engine.current = null
      setStatus('idle')
      abortGeneration.current?.(new Error('Generation stopped'))
    }, 1500)
  }, [])

  const generate = useCallback(
    async (history: ChatTurn[], notes: KnowledgeNote[], onText: (text: string) => void) => {
      if (!engine.current || running.current) throw new Error('Aktifkan model AI terlebih dahulu.')
      const localEngine = engine.current
      running.current = true
      stopped.current = false
      let text = ''
      let watchdog: ReturnType<typeof setTimeout> | undefined
      let cancelled = false
      const failure = new Promise<never>((_, reject) => {
        abortGeneration.current = reject
      })
      const refreshWatchdog = () => {
        clearTimeout(watchdog)
        watchdog = setTimeout(() => {
          cancelled = true
          worker.current?.terminate()
          worker.current = null
          engine.current = null
          setStatus('error')
          setError(
            'GPU tidak merespons selama 2 menit. Model dilepas agar halaman tetap bisa digunakan. Coba model ringan, tutup tab lain, atau gunakan perangkat dengan GPU yang lebih memadai.',
          )
          abortGeneration.current?.(new Error('Local GPU generation timed out'))
        }, 120_000)
      }
      try {
        const run = async () => {
          const { messages, sources } = buildContext(history, notes, history.at(-1)?.text ?? '')
          refreshWatchdog()
          const stream = await localEngine.chat.completions.create({
            messages,
            stream: true,
            max_tokens: 768,
            temperature: 0.65,
            repetition_penalty: 1.1,
          })
          let lengthLimited = false
          for await (const chunk of stream) {
            if (cancelled) break
            refreshWatchdog()
            const choice = chunk.choices[0]
            text += choice?.delta.content ?? ''
            if (choice?.finish_reason === 'length') lengthLimited = true
            onText(text)
          }
          if (!text.trim() && !stopped.current)
            throw new Error('Model belum menghasilkan jawaban. Coba pertanyaan lebih singkat.')
          return {
            text: text.trim() || 'Jawaban dihentikan.',
            sources,
            stopped: stopped.current,
            lengthLimited,
          }
        }
        return await Promise.race([run(), failure])
      } catch (cause) {
        if (stopped.current)
          return {
            text: text.trim() || 'Jawaban dihentikan.',
            sources: [],
            stopped: true,
            lengthLimited: false,
          }
        throw cause
      } finally {
        cancelled = true
        clearTimeout(watchdog)
        if (hardStopTimer.current) clearTimeout(hardStopTimer.current)
        hardStopTimer.current = null
        abortGeneration.current = null
        running.current = false
      }
    },
    [],
  )

  return { status, model, setModel, progress, progressText, error, load, unload, generate, stop }
}
