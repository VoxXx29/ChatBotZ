import { cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const destination = path.resolve(process.argv[2] ?? path.join(root, 'exports/riff-vercel'))
const relative = path.relative(root, destination)
if (
  !relative ||
  relative === 'src' ||
  relative.startsWith(`src${path.sep}`) ||
  relative.startsWith('..')
) {
  throw new Error('Pilih direktori kosong di dalam proyek, misalnya exports/riff-vercel.')
}
await mkdir(destination, { recursive: true })
if ((await readdir(destination)).length) {
  throw new Error(
    `Direktori tujuan tidak kosong: ${relative}. Gunakan folder baru; ekspor tidak menimpa file lama.`,
  )
}

async function write(name, content) {
  const output = path.join(destination, name)
  await mkdir(path.dirname(output), { recursive: true })
  await writeFile(output, content)
}
async function copy(source, target = source) {
  const output = path.join(destination, target)
  await mkdir(path.dirname(output), { recursive: true })
  await cp(path.join(root, source), output)
}

const components = [
  'RiffChat.tsx',
  'KnowledgeLab.tsx',
  'Markdown.tsx',
  'ai.worker.ts',
  'knowledge.ts',
  'use-local-ai.ts',
]
for (const name of components) {
  const source = await readFile(path.join(root, 'src/components/riff', name), 'utf8')
  if (/from\s+['"](?:next(?:\/|['"])|payload['"]|@payloadcms\/)/.test(source)) {
    throw new Error(
      `Komponen ${name} memiliki dependensi server. Sesuaikan ekspor sebelum melanjutkan.`,
    )
  }
  await write(`src/components/riff/${name}`, source.replace(/^(['"])use client\1;?\s*\n/, ''))
}
await copy('src/app/(frontend)/styles.css', 'src/index.css')
for (const file of await readdir(path.join(root, 'public/fonts'))) {
  if (!/\.(ttf|txt)$/.test(file)) continue
  const content = await readFile(path.join(root, 'public/fonts', file))
  if (content.subarray(0, 80).toString().startsWith('version https://git-lfs.github.com/spec/v1')) {
    throw new Error(
      `Font ${file} masih berupa pointer Git LFS. Jalankan git lfs pull sebelum ekspor.`,
    )
  }
  if (!(await stat(path.join(root, 'public/fonts', file))).isFile()) continue
  await write(`public/fonts/${file}`, content)
}
for (const file of ['local-ai.test.mjs', 'browser-cdp.mjs', 'browser-flow.mjs']) {
  await copy(`tests/${file}`)
}
await copy('docs/local-ai.md')
await copy('scripts/templates/vercel-readme.md', 'README.md')

const pkg = {
  name: 'chatbotz-riff-local',
  version: '1.0.0',
  private: true,
  type: 'module',
  packageManager: 'pnpm@10.11.0',
  engines: { node: '>=22.12.0' },
  scripts: {
    dev: 'vite',
    build: 'tsc --noEmit && vite build',
    preview: 'vite preview',
    test: 'node --experimental-strip-types --test tests/local-ai.test.mjs',
    'test:browser': 'node tests/browser-flow.mjs',
  },
  dependencies: {
    '@mlc-ai/web-llm': '0.2.88',
    react: '19.2.0',
    'react-dom': '19.2.0',
    'react-markdown': '10.1.0',
    'remark-gfm': '4.0.1',
  },
  devDependencies: {
    '@tailwindcss/vite': '4.3.5',
    '@types/node': '^22.0.0',
    '@types/react': '^19.0.0',
    '@types/react-dom': '^19.0.0',
    '@vitejs/plugin-react': '6.0.0',
    tailwindcss: '4.3.5',
    typescript: '~5.7.3',
    vite: '8.0.5',
  },
}
await write('package.json', `${JSON.stringify(pkg, null, 2)}\n`)
await write('pnpm-workspace.yaml', "packages:\n  - '.'\nonlyBuiltDependencies:\n  - esbuild\n")
await write(
  'tsconfig.json',
  `${JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        moduleResolution: 'Bundler',
        jsx: 'react-jsx',
        strict: true,
        skipLibCheck: true,
        esModuleInterop: true,
        isolatedModules: true,
        resolveJsonModule: true,
        noEmit: true,
        types: ['node', 'vite/client'],
      },
      include: ['src', 'vite.config.ts'],
    },
    null,
    2,
  )}\n`,
)
await write(
  'vercel.json',
  `${JSON.stringify(
    {
      $schema: 'https://openapi.vercel.sh/vercel.json',
      framework: 'vite',
      installCommand: 'pnpm install --frozen-lockfile',
      buildCommand: 'pnpm run build',
      outputDirectory: 'dist',
      headers: [
        {
          source: '/(.*)',
          headers: [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'no-referrer' },
          ],
        },
      ],
    },
    null,
    2,
  )}\n`,
)
await write(
  'vite.config.ts',
  `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { target: 'es2022' },
  worker: { format: 'es' },
})
`,
)
await write(
  'src/main.tsx',
  `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import RiffChat from './components/riff/RiffChat'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode><RiffChat /></StrictMode>,
)
`,
)
await write(
  'index.html',
  `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#101011" />
    <meta name="description" content="RIFF — AI open-source di browser kamu. Tanpa API cloud, dengan pengetahuan lokal milikmu." />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>RIFF — Local Intelligence. Loud Attitude.</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
)
await write(
  'public/favicon.svg',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#101011"/><path d="M17 14h20c15 0 17 24 2 28l12 10H36L25 40v12H14l7-30h-6Zm10 10-2 8h9c6 0 7-8 1-8Z" fill="#ec3c35"/></svg>\n',
)
await write(
  '.gitignore',
  'node_modules/\ndist/\n.vercel/\n.env*\n*.tsbuildinfo\n*.log\n.DS_Store\n',
)
// Keep deployable fonts as ordinary Git files even when this snapshot is
// committed underneath the Make repository's global Git LFS rules.
await write('.gitattributes', 'public/fonts/*.ttf -filter -diff -merge -text\n')
await write('.nvmrc', '24\n')
console.log(`Ekspor mandiri dibuat di ${relative}`)
console.log('Lanjutkan: pnpm --dir ' + JSON.stringify(relative) + ' install')
console.log(
  'Lalu: pnpm --dir ' +
    JSON.stringify(relative) +
    ' test && pnpm --dir ' +
    JSON.stringify(relative) +
    ' build',
)
