import { useEffect, useRef, useState } from 'react'
import KnowledgeLab from './KnowledgeLab'
import Markdown from './Markdown'
import { KNOWLEDGE_KEY, validateNotes, type KnowledgeNote } from './knowledge'
import { MODELS, useLocalAI } from './use-local-ai'

type IconName = 'plus' | 'arrow' | 'chat' | 'download' | 'menu' | 'close' | 'disc' | 'wave' | 'bolt'
function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    chat: <path d="M20 11.5a8 8 0 0 1-8 8H5l-3 2v-10a9 9 0 0 1 18 0Z" />,
    download: (
      <>
        <path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    disc: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
        <path d="m5 8 3-3m8 14 3-3" />
      </>
    ),
    wave: <path d="M3 10v4m4-8v12m5-16v20m5-16v12m4-8v4" />,
    bolt: <path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z" />,
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function Sigil({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 240" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="steel" x1="40" y1="20" x2="190" y2="230" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f0eeea" />
          <stop offset=".28" stopColor="#777472" />
          <stop offset=".43" stopColor="#e1dedb" />
          <stop offset=".55" stopColor="#4b4949" />
          <stop offset=".75" stopColor="#b8b5b2" />
          <stop offset="1" stopColor="#373536" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="81" stroke="currentColor" strokeWidth=".6" opacity=".25" />
      <circle
        cx="120"
        cy="120"
        r="105"
        stroke="currentColor"
        strokeWidth=".5"
        strokeDasharray="2 7"
        opacity=".35"
      />
      <path
        d="m120 4 12 76 42-39-24 53 77-22-62 45 71 18-78 11 35 58-56-39-17 72-15-72-57 39 35-58-78-11 71-18L13 72l77 22-24-53 42 39Z"
        fill="url(#steel)"
        stroke="#d1ccc9"
        strokeWidth=".4"
      />
      <path
        d="m120 42 3 63 28-16-18 29 51 11-53 5 13 28-24-17-24 17 13-28-53-5 51-11-18-29 28 16Z"
        fill="#151314"
      />
      <path d="m120 95 5 26 17 8-17 7-5 25-5-25-17-7 17-8Z" fill="#e53632" />
    </svg>
  )
}

type Message = {
  role: 'user' | 'bot'
  text: string
  time: string
  failed?: boolean
  sources?: string[]
  stopped?: boolean
  lengthLimited?: boolean
}
type Session = { id: string; title: string; messages: Message[] }
const initialSession: Session = {
  id: 'initial',
  title: 'The beginning of the noise',
  messages: [],
}
const prompts: {
  number: string
  icon: IconName
  title: string
  description: string
  message: string
}[] = [
  {
    number: '01',
    icon: 'disc',
    title: 'FIND YOUR SOUND',
    description: 'Temukan band di luar radarmu.',
    message: 'Rekomendasi band metal buat pemula, dong.',
  },
  {
    number: '02',
    icon: 'wave',
    title: 'LEARN SOMETHING',
    description: 'Sains, ide, dan rasa penasaran.',
    message: 'Jelaskan cara kerja listrik dengan contoh sederhana.',
  },
  {
    number: '03',
    icon: 'bolt',
    title: 'BUILD SOMETHING',
    description: 'Coding, rencana, dan kreativitas.',
    message: 'Ajari aku membuat halaman HTML sederhana, langkah demi langkah.',
  },
]
const timeNow = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([initialSession])
  const [activeId, setActiveId] = useState(initialSession.id)
  const [input, setInput] = useState('')
  const [pendingIds, setPendingIds] = useState<string[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [labOpen, setLabOpen] = useState(false)
  const [notes, setNotes] = useState<KnowledgeNote[]>([])
  const [storageError, setStorageError] = useState('')
  const [hint, setHint] = useState('')
  const ai = useLocalAI()
  const sending = useRef(false)
  const modelPanel = useRef<HTMLElement>(null)
  const bottom = useRef<HTMLDivElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const active = sessions.find((s) => s.id === activeId)!
  const pending = pendingIds.includes(activeId)
  const anyPending = pendingIds.length > 0

  useEffect(() => {
    if (active.messages.length || pending) {
      bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    } else {
      bottom.current?.closest('.chat-scroll')?.scrollTo({ top: 0 })
    }
  }, [active.messages.length, active.messages.at(-1)?.text, pending, activeId])
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KNOWLEDGE_KEY)
      if (raw) setNotes(validateNotes(JSON.parse(raw)))
    } catch {
      setStorageError(
        'Materi tersimpan tidak dapat dibaca atau penyimpanan browser dibatasi. Ekspor cadangan sebelum menutup halaman.',
      )
    }
  }, [])
  useEffect(() => {
    if (!aboutOpen && !sidebarOpen) return
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAboutOpen(false)
        setSidebarOpen(false)
      }
    }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [aboutOpen, sidebarOpen])

  function saveNotes(value: KnowledgeNote[]) {
    try {
      const safe = validateNotes(value)
      localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(safe))
      setNotes(safe)
      setStorageError('')
      return true
    } catch {
      setStorageError(
        'Materi belum tersimpan. Penyimpanan browser dibatasi atau penuh. Izinkan penyimpanan situs, lalu coba lagi.',
      )
      return false
    }
  }

  async function send(text: string, retry = false) {
    const clean = text.trim()
    if (!clean || sending.current || anyPending) return
    if (ai.status !== 'ready') {
      setInput(clean)
      setHint(
        'Aktifkan model lokal terlebih dahulu. Unduhan hanya dimulai setelah kamu menekan Aktifkan AI.',
      )
      modelPanel.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    sending.current = true
    setHint('')
    const id = activeId
    const history: Message[] = retry
      ? active.messages.slice(0, -1)
      : [...active.messages, { role: 'user', text: clean, time: timeNow() }]
    const replyIndex = history.length
    setInput('')
    if (textarea.current) textarea.current.style.height = '28px'
    setSessions((all) =>
      all.map((s) =>
        s.id === id
          ? {
              ...s,
              title: s.messages.length ? s.title : clean,
              messages: [...history, { role: 'bot', text: '', time: timeNow() }],
            }
          : s,
      ),
    )
    setPendingIds([id])
    const updateReply = (patch: Partial<Message>) =>
      setSessions((all) =>
        all.map((s) =>
          s.id === id
            ? {
                ...s,
                messages: s.messages.map((m, i) => (i === replyIndex ? { ...m, ...patch } : m)),
              }
            : s,
        ),
      )
    try {
      const result = await ai.generate(history, notes, (partial) => updateReply({ text: partial }))
      updateReply(result)
    } catch {
      updateReply({
        failed: true,
        text: 'Sinyal lokal terputus. Model tidak berhasil menyelesaikan jawaban. Coba pertanyaan lebih singkat atau muat ulang model. Tidak ada pesan yang dikirim ke layanan AI cloud.',
      })
    } finally {
      setPendingIds([])
      sending.current = false
    }
  }

  function newSession() {
    const empty = sessions.find((s) => !s.messages.length && !pendingIds.includes(s.id))
    if (empty) setActiveId(empty.id)
    else {
      const session = { id: crypto.randomUUID(), title: 'Untitled noise', messages: [] }
      setSessions((all) => [session, ...all])
      setActiveId(session.id)
    }
    setInput('')
    setSidebarOpen(false)
    textarea.current?.focus()
  }

  function exportLog() {
    const text = `RIFF / CONVERSATION LOG\n${active.title}\n\n${active.messages.map((m) => `[${m.time}] ${m.role === 'user' ? 'YOU' : 'RIFF'}\n${m.text}`).join('\n\n')}`
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'riff-conversation.txt'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Tutup navigasi"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault()
            newSession()
          }}
          aria-label="Riff beranda"
        >
          <span className="brand-symbol">
            r<span>ı</span>ff
          </span>
          <span className="brand-registered">®</span>
          <span className="brand-caption">TURN DOWN THE ORDINARY.</span>
        </a>
        <button className="new-session" onClick={newSession}>
          <Icon name="plus" size={17} /> NEW SESSION <span>↗</span>
        </button>
        <div className="history-heading">
          <span>THE ARCHIVE</span>
          <span>{String(sessions.length).padStart(2, '0')}</span>
        </div>
        <nav className="session-list" aria-label="Riwayat percakapan">
          {sessions.map((session) => (
            <button
              key={session.id}
              className={`session ${session.id === activeId ? 'selected' : ''}`}
              onClick={() => {
                setActiveId(session.id)
                setInput('')
                setSidebarOpen(false)
              }}
            >
              <Icon name="chat" size={16} />
              <span>{session.title}</span>
              {session.id === activeId && <i />}
            </button>
          ))}
          <p className="history-note">
            Every great riff starts
            <br />
            with a conversation.
          </p>
        </nav>
        <div className="sidebar-bottom">
          <div className="backstage-card">
            <span className="mini-label">NO GATEKEEPING. JUST METAL.</span>
            <div>
              HEAVY MUSIC.
              <br />
              <span>OPEN MINDS.</span>
            </div>
            <span className="card-cross">✳</span>
          </div>
          <button
            className="mb-2 flex w-full items-center justify-between border border-[#5c3530] bg-[#281a1b] px-3 py-3 text-left font-mono text-[9px] tracking-wider text-[#dda397] hover:border-[#bc5748]"
            onClick={() => {
              setLabOpen(true)
              setSidebarOpen(false)
            }}
          >
            AJARI RIFF <span>{String(notes.length).padStart(2, '0')} +</span>
          </button>
          <button
            className="about-button"
            onClick={() => {
              setAboutOpen(true)
              setSidebarOpen(false)
            }}
          >
            <span className="about-icon">
              <Icon name="wave" size={16} />
            </span>
            <span>
              Inside the noise<small>Tentang RIFF</small>
            </span>
            <Icon name="arrow" size={16} />
          </button>
          <div className="sidebar-footer">
            <span>EST. 2025</span>
            <span>VOL. 001</span>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu icon-button"
              aria-label="Buka navigasi"
              onClick={() => setSidebarOpen(true)}
            >
              <Icon name="menu" />
            </button>
            <span className="channel-slash">/</span>
            <span>THE HEAVY ROOM</span>
            <span className="channel-tag">OPEN CHANNEL</span>
          </div>
          <div className="topbar-right">
            <span className="signal">
              <i />{' '}
              {ai.status === 'ready'
                ? 'LOCAL AI READY'
                : ai.status === 'loading'
                  ? 'LOADING MODEL'
                  : 'LOCAL MODE'}
            </span>
            <span className="topbar-divider" />
            <button className="export-button" onClick={exportLog} aria-label="Unduh percakapan">
              <Icon name="download" size={16} />
              <span>EXPORT LOG</span>
            </button>
          </div>
        </header>

        <div className="chat-scroll">
          <div className="content-column">
            <section className={`intro ${active.messages.length ? 'intro-compact' : ''}`}>
              <div className="intro-kicker">
                <span className="red-line" /> LOCAL INTELLIGENCE. LOUD ATTITUDE.
              </div>
              <div className="hero-art">
                <div className="orbit-label orbit-top">
                  NO CLOUD AI.
                  <br />
                  JUST ATTITUDE.
                </div>
                <Sigil className="hero-sigil" />
                <div className="orbit-label orbit-bottom">
                  33° 45′ N<br />
                  VOLUME / MAX
                </div>
              </div>
              <h1>
                LOUD THOUGHTS.
                <br />
                <span>DARK ANSWERS.</span>
              </h1>
              <p className="intro-description">
                Musik keras, sains, coding, atau ide liar berikutnya.
                <br className="desktop-break" /> AI di browser lo. Pertanyaan lo, tetap di perangkat
                lo.
              </p>
              <div className="intro-bottom">
                <span className="intro-bottom-cross">✳</span>
                <span>LESS SMALL TALK. MORE DISTORTION.</span>
                <span className="edition">[ RIFF — V.01 ]</span>
              </div>
            </section>

            <section
              ref={modelPanel}
              aria-label="Mesin AI lokal"
              className="mb-6 border border-[#50312c] bg-[#211718] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[8px] tracking-[1.5px] text-[#b97c6c]">
                    THE ENGINE / 100% BROWSER INFERENCE
                  </p>
                  <h2 className="mt-2 font-[family-name:var(--condensed)] text-xl font-bold tracking-wide text-[#e0cec4]">
                    {ai.status === 'ready'
                      ? 'LOCAL SIGNAL IS LIVE.'
                      : ai.status === 'loading'
                        ? 'WAKING UP THE MACHINE.'
                        : 'YOUR MACHINE. YOUR INTELLIGENCE.'}
                  </h2>
                </div>
                <button
                  className="border border-[#705046] px-3 py-2 font-mono text-[8px] tracking-wide text-[#d3aca0] hover:border-[#d7614e]"
                  onClick={() => setLabOpen(true)}
                >
                  AJARI RIFF / {notes.length}
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-[#ac9487]">
                Tanpa API key. Model open-source diunduh dari Hugging Face/GitHub dan dijalankan di
                GPU perangkatmu. Chat dan materi tidak dikirim ke penyedia model.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="flex min-w-0 flex-1 flex-col gap-1 font-mono text-[7px] tracking-wider text-[#a58476]">
                  MODEL LOKAL
                  <select
                    aria-label="Pilih model AI"
                    value={ai.model}
                    disabled={ai.status === 'ready' || ai.status === 'loading' || anyPending}
                    onChange={(event) => ai.setModel(event.target.value)}
                    className="w-full min-w-[180px] border border-[#4b3430] bg-[#181415] px-2 py-2 font-sans text-[11px] text-[#ddc6b9] outline-none focus:border-[#d7614e] disabled:opacity-60"
                  >
                    {MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </label>
                {ai.status === 'loading' ? (
                  <button
                    onClick={ai.unload}
                    className="mt-3 border border-[#75443a] px-4 py-3 font-mono text-[8px] text-[#d5b2a2]"
                  >
                    BATALKAN
                  </button>
                ) : ai.status === 'ready' ? (
                  <button
                    disabled={anyPending}
                    onClick={ai.unload}
                    className="mt-3 border border-[#75443a] px-4 py-3 font-mono text-[8px] text-[#d5b2a2] disabled:opacity-40"
                  >
                    LEPAS MODEL
                  </button>
                ) : (
                  <button
                    disabled={ai.status === 'checking' || ai.status === 'unsupported'}
                    onClick={() => void ai.load()}
                    className="mt-3 bg-[#c63830] px-4 py-3 font-mono text-[8px] tracking-wide text-white hover:bg-[#ed4840] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {ai.status === 'checking'
                      ? 'CEK WEBGPU…'
                      : ai.status === 'error'
                        ? 'COBA MUAT LAGI ↗'
                        : 'AKTIFKAN AI ↗'}
                  </button>
                )}
              </div>
              <p className="mt-2 text-[9px] leading-5 text-[#a58a7c]">
                {MODELS.find((model) => model.id === ai.model)?.detail} Model di-cache jika browser
                mengizinkan. Memuat ulang halaman tetap perlu inisialisasi model.
              </p>
              {ai.status === 'loading' && (
                <div className="mt-3" role="status">
                  <progress
                    className="h-1 w-full accent-[#ec3c35]"
                    value={ai.progress}
                    max={100}
                    aria-label="Progres pemuatan model"
                  />
                  <p className="mt-2 break-words font-mono text-[8px] leading-4 text-[#b99180]">
                    {ai.progress}% / {ai.progressText}
                  </p>
                  <p className="mt-1 text-[9px] text-[#9d7e70]">
                    Unduhan pertama dapat berlangsung beberapa menit. Jangan tutup tab ini.
                  </p>
                </div>
              )}
              {ai.status === 'unsupported' && (
                <p
                  role="alert"
                  className="mt-3 border-l-2 border-[#d86049] pl-3 text-[11px] leading-5 text-[#e6a38b]"
                >
                  WebGPU tidak tersedia. Gunakan Chrome/Edge terbaru di perangkat dengan GPU yang
                  mendukung dan aktifkan akselerasi grafis. Preview iframe bisa membatasi GPU; coba
                  buka aplikasi yang dipublikasikan di tab tersendiri. RIFF tidak memakai layanan
                  cloud sebagai pengganti.
                </p>
              )}
              {ai.error && (
                <p role="alert" className="mt-3 text-[11px] leading-5 text-[#eea38c]">
                  {ai.error}
                </p>
              )}
              {hint && (
                <p role="status" className="mt-3 text-[11px] leading-5 text-[#e7b39a]">
                  {hint}
                </p>
              )}
              {ai.status === 'ready' && (
                <p role="status" className="mt-2 font-mono text-[8px] tracking-wide text-[#c4cf9a]">
                  MODEL SIAP / INFERENSI LOKAL · {notes.length} MATERI PRIBADI
                </p>
              )}
            </section>

            <div className="conversation-start">
              <span />
              <p>THE SESSION STARTS HERE</p>
              <span />
            </div>
            <div className="message-row">
              <div className="bot-avatar">
                <Icon name="wave" size={18} />
              </div>
              <div className="message-content">
                <div className="message-meta">
                  <strong>RIFF</strong>
                  <span className="bot-tag">YOUR LOCAL AI COMPANION</span>
                  <time>NOW</time>
                </div>
                <div className="bot-bubble">
                  <p>Selamat datang di sisi yang lebih berisik.</p>
                  <p>
                    Gue RIFF. Mau bahas band, belajar sesuatu, nulis, atau ngoding?
                    <br className="desktop-break" /> Aktifkan model di atas, lalu tanya apa yang lo
                    penasaran. Gue bisa salah, jadi cek lagi fakta penting.
                  </p>
                </div>
              </div>
            </div>

            {active.messages.length === 0 && (
              <div className="prompt-grid">
                {prompts.map((prompt) => (
                  <button
                    key={prompt.number}
                    className="prompt-card"
                    onClick={() => send(prompt.message)}
                  >
                    <div className="prompt-card-top">
                      <Icon name={prompt.icon} size={20} />
                      <span>{prompt.number}</span>
                    </div>
                    <h2>{prompt.title}</h2>
                    <p>{prompt.description}</p>
                    <span className="prompt-arrow">
                      <Icon name="arrow" size={18} />
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="messages" role="log" aria-label="Percakapan" aria-live="polite">
              {active.messages.map((message, index) =>
                message.role === 'bot' && !message.text ? null : (
                  <div
                    className={`message-row ${message.role === 'user' ? 'user-row' : ''}`}
                    key={`${activeId}-${index}`}
                  >
                    <div className={message.role === 'bot' ? 'bot-avatar' : 'user-avatar'}>
                      {message.role === 'bot' ? <Icon name="wave" size={18} /> : 'Y'}
                    </div>
                    <div className="message-content">
                      <div className="message-meta">
                        <strong>{message.role === 'bot' ? 'RIFF' : 'YOU'}</strong>
                        <time>{message.time}</time>
                      </div>
                      <div
                        className={
                          message.role === 'bot' ? 'bot-bubble reply-bubble' : 'user-bubble'
                        }
                      >
                        {message.role === 'bot' ? <Markdown text={message.text} /> : message.text}
                        {message.failed && index === active.messages.length - 1 && (
                          <button
                            className="mt-3 block border border-[#8d4b3e] px-3 py-2 font-mono text-[8px] text-[#e5aa94] disabled:opacity-40"
                            disabled={anyPending || ai.status !== 'ready'}
                            onClick={() => void send(active.messages[index - 1]?.text ?? '', true)}
                          >
                            COBA LAGI ↗
                          </button>
                        )}
                      </div>
                      {!!message.sources?.length && (
                        <p className="mt-2 font-mono text-[8px] leading-5 text-[#aa8c78]">
                          KONTEKS LOKAL / {message.sources.join(' · ')}
                        </p>
                      )}
                      {message.stopped && (
                        <p className="mt-2 font-mono text-[8px] text-[#a48779]">
                          DIHENTIKAN OLEH PENGGUNA
                        </p>
                      )}
                      {message.lengthLimited && (
                        <p className="mt-2 text-[10px] text-[#ad8e7b]">
                          Batas panjang jawaban tercapai. Kirim “lanjutkan” untuk meneruskan
                          pembahasan.
                        </p>
                      )}
                    </div>
                  </div>
                ),
              )}
              {pending && (
                <div className="message-row">
                  <div className="bot-avatar">
                    <Icon name="wave" size={18} />
                  </div>
                  <div className="typing" aria-label="RIFF sedang mengetik">
                    <span />
                    <span />
                    <span />
                    <small>
                      {active.messages.at(-1)?.text
                        ? 'Generating locally…'
                        : 'Thinking on your device…'}
                    </small>
                  </div>
                </div>
              )}
            </div>
            <div ref={bottom} className="scroll-anchor" />
          </div>
        </div>

        <footer className="composer-area">
          <div className="composer-inner">
            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault()
                send(input)
              }}
            >
              <span className="input-prefix">↳</span>
              <textarea
                ref={textarea}
                aria-label="Pesan untuk RIFF"
                placeholder="Bawa pertanyaan lo ke sini..."
                value={input}
                maxLength={1100}
                rows={1}
                onChange={(e) => {
                  setInput(e.target.value)
                  e.target.style.height = '28px'
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 124)}px`
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    send(input)
                  }
                }}
              />
              {pending ? (
                <button
                  type="button"
                  onClick={ai.stop}
                  className="shrink-0 border border-[#b95242] bg-[#592a24] px-3 py-3 font-mono text-[8px] tracking-wide text-[#f0bca6]"
                  aria-label="Hentikan jawaban"
                >
                  STOP ■
                </button>
              ) : (
                <button
                  className="send-button"
                  type="submit"
                  disabled={!input.trim() || anyPending || ai.status !== 'ready'}
                  aria-label="Kirim pesan"
                >
                  <Icon name="arrow" size={23} />
                </button>
              )}
            </form>
            <div className="composer-footer">
              <span>
                <span className="tiny-cross">✳</span> BUILT FOR THE LOUD ONES.
              </span>
              <span className="demo-note">
                {anyPending && !pending
                  ? 'MENJAWAB DI SESI LAIN'
                  : ai.status === 'ready'
                    ? 'OPEN-SOURCE · ON DEVICE'
                    : 'AKTIFKAN MODEL UNTUK CHAT'}
              </span>
              <span className="keyboard-hint">
                <kbd>Enter</kbd> to send <span>·</span> <kbd>Shift + Enter</kbd> new line
              </span>
            </div>
          </div>
        </footer>
      </main>

      {aboutOpen && (
        <div className="modal-backdrop" onClick={() => setAboutOpen(false)}>
          <section
            className="about-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              autoFocus
              className="modal-close icon-button"
              aria-label="Tutup tentang RIFF"
              onClick={() => setAboutOpen(false)}
            >
              <Icon name="close" />
            </button>
            <span className="intro-kicker">INSIDE THE NOISE / VOL. 001</span>
            <h2 id="about-title">
              NOT FOR
              <br />
              <span>THE ORDINARY.</span>
            </h2>
            <p>
              RIFF adalah asisten AI serbaguna dengan jiwa metal. Bahas musik, belajar, coding, atau
              ide kreatif. Nggak ada gatekeeping.
            </p>
            <p>
              RIFF menjalankan model open-source Qwen 2.5 lewat WebLLM di GPU browsermu, bukan model
              yang dilatih dari nol. Internet diperlukan untuk mengunduh file model. Tidak ada API
              AI cloud, dan percakapan tidak dikirim ke penyedia model. Jawaban dapat salah; model
              kecil lebih terbatas dalam penalaran dan bahasa.
            </p>
            <p>
              “Ajari RIFF” menambahkan referensi lokal, bukan fine-tuning bobot. Materi tersimpan
              hanya di browser ini. Chat bertahan selama halaman terbuka; gunakan Export Log untuk
              cadangan. RIFF tidak memiliki akses pencarian web atau berita langsung.
            </p>
            <button className="modal-cta" onClick={() => setAboutOpen(false)}>
              BACK TO THE NOISE <Icon name="arrow" size={18} />
            </button>
          </section>
        </div>
      )}
      {labOpen && (
        <KnowledgeLab
          notes={notes}
          storageError={storageError}
          onSave={saveNotes}
          onClose={() => setLabOpen(false)}
        />
      )}
    </div>
  )
}
