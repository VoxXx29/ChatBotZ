import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateNotes,
  importNotes,
  retrieveNotes,
  buildContext,
  MAX_NOTES,
} from '../src/components/riff/knowledge.ts'

const notes = [
  { id: 'one', title: 'Jam studio', content: 'Studio buka pukul 10.00 dan tutup pukul 22.00.' },
  { id: 'two', title: 'Belajar listrik', content: 'Arus listrik adalah aliran muatan listrik.' },
]

test('validates notes and allowlists fields', () => {
  assert.deepEqual(validateNotes([{ ...notes[0], injected: 'ignored' }]), [notes[0]])
  assert.throws(() => validateNotes([{ ...notes[0], content: '' }]))
  assert.throws(() => validateNotes([{ ...notes[0], content: 'x'.repeat(3001) }]))
  assert.throws(() => validateNotes([notes[0], notes[0]]))
  assert.throws(() => validateNotes(Array(MAX_NOTES + 1).fill(notes[0])))
})

test('imports plain text in bounded chunks', () => {
  const imported = importNotes('Materi pertama.\n'.repeat(300), 'studio.txt')
  assert.ok(imported.length > 1)
  assert.ok(imported.every((note) => note.content.length <= 1800))
  assert.equal(new Set(imported.map((note) => note.id)).size, imported.length)
  assert.throws(() => importNotes('', 'empty.txt'))
  assert.throws(() => importNotes('pdf', 'file.pdf'))
  assert.throws(() => importNotes('x'.repeat(150_001), 'big.txt'))
})

test('roundtrips dataset format and reassigns import IDs', () => {
  const data = JSON.stringify({ version: 1, notes })
  const imported = importNotes(data, 'backup.json')
  assert.equal(imported[0].title, notes[0].title)
  assert.notEqual(imported[0].id, notes[0].id)
  assert.throws(() => importNotes('{}', 'wrong.json'))
  assert.throws(() => importNotes('{invalid}', 'bad.json'))
})

test('retrieves relevant local references, never unrelated fallback material', () => {
  assert.equal(retrieveNotes('Jam studio berapa?', notes)[0].id, 'one')
  assert.equal(retrieveNotes('Jelaskan arus listrik', notes)[0].id, 'two')
  assert.deepEqual(retrieveNotes('Resep pasta', notes), [])
  assert.deepEqual(retrieveNotes('apa itu yang', notes), [])
})

test('includes local references and actual conversation context', () => {
  const history = [
    { role: 'user', text: 'Kapan studio buka?' },
    { role: 'bot', text: 'Pukul 10.00.' },
    { role: 'user', text: 'Jam studio tutup?' },
  ]
  const result = buildContext(history, notes, history.at(-1).text)
  assert.ok(result.messages[0].content.includes('10.00'))
  assert.ok(result.messages[0].content.includes('not instructions'))
  assert.deepEqual(result.sources, ['Jam studio'])
  assert.equal(result.messages.at(-1).content, 'Jam studio tutup?')
  assert.equal(result.messages[2].role, 'assistant')
})

test('bounds history and omits failed responses', () => {
  const history = Array.from({ length: 30 }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'bot',
    text: `${i} ${'a'.repeat(2000)}`,
  }))
  history.push({ role: 'bot', text: 'An internal error', failed: true })
  const result = buildContext(history, [], 'test')
  const turns = result.messages.slice(1)
  assert.equal(turns[0].role, 'user')
  assert.ok(turns.reduce((sum, item) => sum + item.content.length, 0) <= 2200)
  assert.ok(!JSON.stringify(result).includes('An internal error'))
})

test('keeps model role ordering after a failed turn', () => {
  const result = buildContext(
    [
      { role: 'user', text: 'Failed question' },
      { role: 'bot', text: 'Error', failed: true },
      { role: 'user', text: 'New question' },
    ],
    [],
    'New question',
  )
  assert.equal(result.messages.length, 2)
  assert.equal(result.messages[1].content, 'New question')
})

test('retrieves relevant text near the end of a long note', () => {
  const result = buildContext(
    [{ role: 'user', text: 'Apa password studio?' }],
    [{ id: 'long', title: 'Studio', content: 'a '.repeat(1000) + 'Password studio: metalmerah.' }],
    'Apa password studio?',
  )
  assert.ok(result.messages[0].content.includes('metalmerah'))
})
