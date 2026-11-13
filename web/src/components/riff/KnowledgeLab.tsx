import { useEffect, useRef, useState } from 'react'
import { importNotes, MAX_CONTENT, MAX_NOTES, type KnowledgeNote } from './knowledge'

export default function KnowledgeLab({
  notes,
  storageError,
  onSave,
  onClose,
}: {
  notes: KnowledgeNote[]
  storageError: string
  onSave: (notes: KnowledgeNote[]) => boolean
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const [editing, setEditing] = useState<string | null>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => previous?.focus()
  }, [])

  function save() {
    setError('')
    setNotice('')
    if (!title.trim() || !content.trim()) {
      setError('Isi judul dan materi terlebih dahulu.')
      return
    }
    if (!editing && notes.length >= MAX_NOTES) {
      setError(`Maksimal ${MAX_NOTES} materi. Hapus atau edit materi yang sudah ada.`)
      return
    }
    const note = {
      id: editing ?? crypto.randomUUID(),
      title: title.trim(),
      content: content.trim(),
    }
    if (
      onSave(editing ? notes.map((item) => (item.id === editing ? note : item)) : [...notes, note])
    ) {
      setTitle('')
      setContent('')
      setEditing(null)
      setNotice('Materi tersimpan. RIFF akan mencari materi yang relevan saat kamu bertanya.')
    }
  }

  async function importFile(file?: File) {
    if (!file) return
    setError('')
    setNotice('')
    try {
      if (file.size > 150_000) throw new Error('File terlalu besar. Maksimal 150 KB.')
      const imported = importNotes(await file.text(), file.name)
      if (notes.length + imported.length > MAX_NOTES)
        throw new Error(
          `Impor melebihi batas ${MAX_NOTES} materi. Hapus beberapa materi terlebih dahulu.`,
        )
      if (onSave([...notes, ...imported]))
        setNotice(`${imported.length} materi berhasil ditambahkan, tanpa menimpa materi lama.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impor gagal.')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  function exportDataset() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ version: 1, notes }, null, 2)], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'riff-local-knowledge.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lab-title"
        className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden border border-[#73403a] bg-[#181415] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose()
          if (event.key === 'Tab') {
            const elements = [
              ...(dialog.current?.querySelectorAll<HTMLElement>(
                'button:not(:disabled), input, textarea',
              ) ?? []),
            ].filter((element) => element.getClientRects().length)
            const first = elements[0],
              last = elements.at(-1)
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault()
              last?.focus()
            }
            if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault()
              first?.focus()
            }
          }
        }}
      >
        <header className="flex items-start justify-between border-b border-[#38272a] px-6 py-5">
          <div>
            <p className="font-mono text-[8px] tracking-[2px] text-[#c17c6e]">
              LOCAL LAB / PERSONAL KNOWLEDGE
            </p>
            <h2
              id="lab-title"
              className="mt-2 font-[family-name:var(--condensed)] text-4xl font-extrabold"
            >
              AJARI <span className="text-[#ec3c35]">RIFF.</span>
            </h2>
          </div>
          <button
            className="px-3 py-2 font-mono text-xs text-[#c4a398] hover:text-white"
            onClick={onClose}
            aria-label="Tutup Local Lab"
          >
            TUTUP ×
          </button>
        </header>
        <div className="overflow-y-auto p-6">
          <p className="text-xs leading-6 text-[#b6a69c]">
            Tambahkan fakta, catatan, atau contoh jawaban milikmu. RIFF mencari materi yang relevan
            dan menyertakannya sebagai konteks saat menjawab.
          </p>
          <p className="mt-2 border-l-2 border-[#ae4638] pl-3 text-[11px] leading-5 text-[#c5907c]">
            Ini basis pengetahuan lokal, bukan fine-tuning bobot model. Materi disimpan di browser
            ini saja, tidak disinkronkan dan dapat hilang jika data situs dihapus. Ekspor untuk
            cadangan.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              save()
            }}
            className="mt-6 flex flex-col gap-3"
          >
            <label className="flex flex-col gap-2 font-mono text-[9px] tracking-wider text-[#b9a69c]">
              JUDUL / PERTANYAAN
              <input
                required
                maxLength={100}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Contoh: Jam operasional studio"
                className="border border-[#483330] bg-[#211a1b] px-3 py-3 font-sans text-xs text-[#e9dcd4] focus:border-[#d85847]"
              />
            </label>
            <label className="flex flex-col gap-2 font-mono text-[9px] tracking-wider text-[#b9a69c]">
              MATERI / JAWABAN
              <textarea
                required
                maxLength={MAX_CONTENT}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={5}
                placeholder="Tulis fakta atau penjelasan yang ingin RIFF gunakan..."
                className="resize-y border border-[#483330] bg-[#211a1b] px-3 py-3 font-sans text-xs leading-6 text-[#e9dcd4] focus:border-[#d85847]"
              />
            </label>
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[8px] text-[#8e7a70]">
                {content.length} / {MAX_CONTENT} KARAKTER
              </span>
              <div className="flex gap-3">
                {editing && (
                  <button
                    type="button"
                    className="text-xs text-[#bfa79b]"
                    onClick={() => {
                      setEditing(null)
                      setTitle('')
                      setContent('')
                    }}
                  >
                    Batal edit
                  </button>
                )}
                <button
                  type="submit"
                  className="bg-[#c83830] px-4 py-3 font-mono text-[9px] tracking-wide text-white hover:bg-[#ed4840]"
                >
                  {editing ? 'SIMPAN PERUBAHAN' : 'TAMBAH MATERI'} +
                </button>
              </div>
            </div>
          </form>
          {(error || storageError) && (
            <p
              role="alert"
              className="mt-4 border border-[#6c302b] bg-[#331a19] p-3 text-xs leading-5 text-[#f2b3a3]"
            >
              {error || storageError}
            </p>
          )}
          {notice && (
            <p role="status" className="mt-4 text-xs leading-5 text-[#bec5a0]">
              {notice}
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-3 border-y border-[#38292a] py-4">
            <span className="mr-auto font-mono text-[9px] text-[#b29484]">
              DATASET / {notes.length} OF {MAX_NOTES}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.json"
              className="hidden"
              aria-label="Impor dataset"
              onChange={(event) => void importFile(event.target.files?.[0])}
            />
            <button
              className="font-mono text-[9px] text-[#d4aaa0] hover:text-white"
              onClick={() => fileRef.current?.click()}
            >
              IMPOR .TXT / .JSON
            </button>
            <button
              disabled={!notes.length}
              className="font-mono text-[9px] text-[#d4aaa0] hover:text-white disabled:opacity-30"
              onClick={exportDataset}
            >
              EKSPOR JSON ↗
            </button>
          </div>
          <p className="mt-2 text-[10px] leading-5 text-[#8f7b71]">
            File .txt dipecah menjadi potongan pendek. File .json memakai format hasil ekspor RIFF.
            Maksimal 150 KB per file.
          </p>
          {!notes.length && (
            <p className="py-7 text-center text-xs text-[#8f7b71]">
              Belum ada materi. Mulai dengan satu hal yang ingin kamu ajarkan.
            </p>
          )}
          <div className="mt-3 flex flex-col gap-2">
            {notes.map((note) => (
              <article key={note.id} className="border border-[#362a2a] bg-[#1d1718] p-4">
                <h3 className="text-xs font-semibold text-[#dfc9bd]">{note.title}</h3>
                <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-[11px] leading-5 text-[#a48f83]">
                  {note.content}
                </p>
                <div className="mt-3 flex justify-end gap-4 font-mono text-[8px]">
                  <button
                    className="text-[#c9a599] hover:text-white"
                    onClick={() => {
                      setEditing(note.id)
                      setTitle(note.title)
                      setContent(note.content)
                      setNotice('')
                      dialog.current?.querySelector('input')?.focus()
                    }}
                  >
                    EDIT
                  </button>
                  <button
                    className="text-[#d07866] hover:text-[#ffad98]"
                    onClick={() => {
                      if (window.confirm(`Hapus materi "${note.title}" dari browser ini?`)) {
                        onSave(notes.filter((item) => item.id !== note.id))
                        if (editing === note.id) {
                          setEditing(null)
                          setTitle('')
                          setContent('')
                        }
                      }
                    }}
                  >
                    HAPUS
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
