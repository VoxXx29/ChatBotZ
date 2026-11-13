import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function Markdown({ text }: { text: string }) {
  return (
    <div className="whitespace-normal [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-3 whitespace-pre-wrap">{children}</p>,
          h1: ({ children }) => (
            <h3 className="mb-2 mt-5 text-base font-bold text-[#ecdbcf]">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="mb-2 mt-5 text-sm font-bold text-[#ecdbcf]">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="mb-2 mt-4 font-semibold text-[#ecdbcf]">{children}</h4>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-[#e8d9ce]">{children}</strong>
          ),
          ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-5">{children}</ol>,
          pre: ({ children }) => (
            <pre className="my-3 max-w-full overflow-x-auto border border-[#49342f] bg-[#100e0f] p-3 font-mono text-[11px] leading-6">
              {children}
            </pre>
          ),
          code: ({ children, className }) => (
            <code
              className={`break-normal whitespace-pre-wrap font-mono text-[11px] text-[#e9b59b] ${className ?? ''}`}
            >
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-[#c85c45] pl-3 text-[#bba08f]">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="break-words text-[#f09276] underline underline-offset-2"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-3 max-w-full overflow-x-auto">
              <table className="w-full border-collapse text-left text-[11px]">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-[#4c342e] bg-[#2b1c1b] px-3 py-2 font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="border border-[#4c342e] px-3 py-2">{children}</td>,
          hr: () => <hr className="my-4 border-[#49322b]" />,
          img: () => (
            <span className="text-[10px] text-[#aa8876]">
              [Gambar eksternal tidak dimuat demi privasi]
            </span>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
