// The tool that split each catalogue into one file per top-level section
// (2026-11-23), kept for scripts/catalogue-port.sh: it cuts
// <dir>/<locale>.ts into <dir>/<locale>/<section>.ts on the source text, so
// comments survive, and writes <dir>/<locale>/index.ts to put them back
// together. Delete both scripts once no branch predates the split.
//
//   node scripts/catalogue-split.mjs <dir> en en plain
//   node scripts/catalogue-split.mjs <dir> es es typed
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const [dir, locale, exportName, typed] = process.argv.slice(2)
const src = fs.readFileSync(path.join(dir, `${locale}.ts`), 'utf8')
const lines = src.split('\n')

const open = lines.findIndex(
  (l) => l.startsWith(`export const ${exportName}`) && l.endsWith('= {'),
)
const close = lines.findIndex((l, i) => i > open && l === '}')
if (open < 0 || close < 0) throw new Error('object literal not found')

const header = lines.slice(0, open)
const after = lines.slice(close + 1)
const sections = []
let pending = []
for (let i = open + 1; i < close; i++) {
  const line = lines[i]
  const m = /^ {2}([A-Za-z]\w*): \{$/.exec(line)
  if (!m) {
    if (line.trim() === '') {
      if (pending.length) pending.push(line)
      continue
    }
    if (/^ {2}(\/\/|\/\*\*?|\*| \*)/.test(line)) {
      pending.push(line)
      continue
    }
    throw new Error(`unexpected top-level line ${i + 1}: ${line}`)
  }
  const end = lines.findIndex((l, j) => j > i && /^ {2}\},?$/.test(l))
  if (end < 0) throw new Error(`no end for ${m[1]}`)
  const body = lines.slice(i + 1, end)
  for (const b of body)
    if (b !== '' && !b.startsWith('    '))
      throw new Error(`bad indent in ${m[1]}: ${b}`)
  while (pending.length && pending.at(-1).trim() === '') pending.pop()
  sections.push({ name: m[1], preamble: pending, body })
  pending = []
  i = end
}
if (pending.length) throw new Error('trailing comment with no section')

const outDir = path.join(dir, locale)
fs.mkdirSync(outDir, { recursive: true })
const dedent = (l) => (l.startsWith('  ') ? l.slice(2) : l)
for (const s of sections) {
  const out = []
  if (typed === 'typed')
    out.push(`import type { Translation } from '../en'`, '')
  out.push(...s.preamble.map(dedent))
  out.push(
    typed === 'typed'
      ? `export const ${s.name}: Translation['${s.name}'] = {`
      : `export const ${s.name} = {`,
  )
  out.push(...s.body.map(dedent), '}', '')
  fs.writeFileSync(path.join(outDir, `${s.name}.ts`), out.join('\n'))
}

const index = [
  ...header,
  ...sections.map((s) => `import { ${s.name} } from './${s.name}'`),
  '',
  `export const ${exportName}${typed === 'typed' ? ': Translation' : ''} = {`,
  ...sections.map((s) => `  ${s.name},`),
  '}',
  ...after,
]
fs.writeFileSync(path.join(outDir, 'index.ts'), index.join('\n'))
fs.rmSync(path.join(dir, `${locale}.ts`))
process.stdout.write(`${locale}: ${sections.length} sections\n`)
