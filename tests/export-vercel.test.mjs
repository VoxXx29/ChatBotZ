import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const exporter = path.join(root, 'scripts/export-vercel.mjs')

test('standalone export contains deployable browser source without platform dependencies', async () => {
  await mkdir(path.join(root, 'exports'), { recursive: true })
  const destination = await mkdtemp(path.join(root, 'exports/test-export-'))
  try {
    execFileSync(process.execPath, [exporter, destination], { stdio: 'pipe' })
    const pkg = JSON.parse(await readFile(path.join(destination, 'package.json'), 'utf8'))
    assert.equal(pkg.dependencies['@mlc-ai/web-llm'], '0.2.88')
    assert.ok(!Object.keys(pkg.dependencies).some((name) => /payload|figma|next/.test(name)))
    assert.equal(pkg.scripts.build, 'tsc --noEmit && vite build')
    const config = JSON.parse(await readFile(path.join(destination, 'vercel.json'), 'utf8'))
    assert.equal(config.framework, 'vite')
    assert.equal(config.outputDirectory, 'dist')
    assert.ok(config.installCommand.includes('--frozen-lockfile'))
    const component = await readFile(
      path.join(destination, 'src/components/riff/RiffChat.tsx'),
      'utf8',
    )
    assert.ok(component.includes('useLocalAI'))
    assert.ok(!component.startsWith("'use client'"))
    const font = await readFile(path.join(destination, 'public/fonts/barlow-condensed-800.ttf'))
    assert.ok(font.length > 10000)
    assert.ok(!font.subarray(0, 80).toString().includes('git-lfs'))
    const workspace = await readFile(path.join(destination, 'pnpm-workspace.yaml'), 'utf8')
    assert.ok(workspace.includes("'.'"))
    await assert.rejects(readFile(path.join(destination, '.env')))
    await assert.rejects(readFile(path.join(destination, 'src/payload.config.ts')))
  } finally {
    await rm(destination, { recursive: true, force: true })
  }
})

test('export never overwrites a nonempty destination or the app source', async () => {
  await mkdir(path.join(root, 'exports'), { recursive: true })
  const destination = await mkdtemp(path.join(root, 'exports/test-preserve-'))
  try {
    await writeFile(path.join(destination, 'keep.txt'), 'user data')
    assert.throws(() => execFileSync(process.execPath, [exporter, destination], { stdio: 'pipe' }))
    assert.equal(await readFile(path.join(destination, 'keep.txt'), 'utf8'), 'user data')
    assert.throws(() =>
      execFileSync(process.execPath, [exporter, path.join(root, 'src')], { stdio: 'pipe' }),
    )
  } finally {
    await rm(destination, { recursive: true, force: true })
  }
})
