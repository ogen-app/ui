import type { Asset, AssetChunk } from '@/types/content'

/**
 * A spreadsheet's chunks read back into sheets and rows (CON-366 §5.4).
 *
 * document-service never stores a grid. Per sheet it writes one **summary**
 * chunk — `Sheet "Pipeline" — columns: Deal, Region. 412 data rows.` and a
 * few sample rows — then **row groups**, each row one line of labelled fields
 * (`Sheet "Pipeline" | Deal: Contoso | Region: EMEA`) under a label like
 * `Sheet "Pipeline" rows 10-24`. A CSV has one unnamed sheet, so its labels
 * lose the prefix (`Rows 2-40`) and its lines start at the first field.
 *
 * Everything here reads that text back, and fails soft: a line that will not
 * split into fields keeps its raw text, and a row whose number cannot be known
 * exactly says so with `null` rather than guessing.
 */

const SPREADSHEET_EXTENSIONS = new Set([
  'xlsx',
  'xlsm',
  'xltx',
  'xls',
  'ods',
  'fods',
  'csv',
  'tsv',
])

const SPREADSHEET_MIME = /spreadsheet|ms-excel|text\/(csv|tab-separated-values)/

/** Whether a document asset is a workbook or a delimited file. */
export function isSpreadsheet(asset: Pick<Asset, 'type' | 'file'>): boolean {
  if (asset.type !== 'DOC' || !asset.file) return false
  if (SPREADSHEET_MIME.test(asset.file.mime_type)) return true
  const name = asset.file.original_name.toLowerCase()
  const dot = name.lastIndexOf('.')
  return dot >= 0 && SPREADSHEET_EXTENSIONS.has(name.slice(dot + 1))
}

/** What a sheet chunk's label says: which sheet, and which part of it. */
export type SheetLabel =
  | { sheet: string; part: 'summary' }
  | { sheet: string; part: 'rows'; from: number; to: number }

const LABEL =
  /^(?:Sheet "((?:[^"\\]|\\.)*)" )?(summary|rows (\d+)\s*[-–]\s*(\d+)|row (\d+))$/i

/**
 * Reads `Sheet "Pipeline" rows 10-24`, `Sheet "Q3" summary`, `Row 7` and the
 * like. The sheet name is Go-quoted (`%q`), so an escaped quote inside it is
 * unescaped; an unnamed sheet (a CSV) is `''`.
 */
export function parseSheetLabel(label: string): SheetLabel | null {
  const m = LABEL.exec(label.trim())
  if (!m) return null
  const sheet = m[1] === undefined ? '' : unquote(m[1])
  if (m[2].toLowerCase() === 'summary') return { sheet, part: 'summary' }
  if (m[5] !== undefined) {
    const row = Number(m[5])
    return { sheet, part: 'rows', from: row, to: row }
  }
  return { sheet, part: 'rows', from: Number(m[3]), to: Number(m[4]) }
}

function unquote(inner: string): string {
  try {
    return JSON.parse(`"${inner}"`) as string
  } catch {
    return inner
  }
}

/**
 * The label as a chip says it: `Pipeline · rows 10–24`. The words are the
 * server's — a citation reads the same in every language, like a PDF chunk's
 * "Slide 4" — only the quoting and the dash change. Null for a label that is
 * not a sheet's.
 */
export function shortSheetLabel(label: string): string | null {
  const parsed = parseSheetLabel(label)
  if (!parsed) return null
  const part =
    parsed.part === 'summary'
      ? 'summary'
      : parsed.from === parsed.to
        ? `row ${parsed.from}`
        : `rows ${parsed.from}–${parsed.to}`
  return parsed.sheet ? `${parsed.sheet} · ${part}` : part
}

export type SheetRow = {
  /** The sheet's own row number, or null when blank rows make it unknowable. */
  row: number | null
  /** The rows of the chunk it came from — what a citation names. */
  from: number
  to: number
  /** Fields by column label, or null for a line that would not split. */
  cells: Record<string, string> | null
  raw: string
}

export type Sheet = {
  /** As the anchor names it; `''` for a CSV's one sheet. */
  name: string
  /** The header's own row number, from the summary's range. */
  headerRow: number | null
  /** The sheet's last row, from the same range — past it there is nothing. */
  lastRow: number | null
  /** From the summary chunk, in the file's order. */
  columns: string[]
  /** Data rows, from the summary; null until the summary has been read. */
  rowCount: number | null
  /** The summary's sample rows — what the stage draws before rows load. */
  samples: SheetRow[]
  /** The rows loaded so far, in order. */
  rows: SheetRow[]
}

const SUMMARY = /columns: (.*?)\. (\d+) data rows\./

/** Every sheet in the chunks loaded so far, in the workbook's order. */
export function sheetsFromChunks(chunks: AssetChunk[]): Sheet[] {
  const sheets = new Map<string, Sheet>()
  const sheetFor = (name: string) => {
    let sheet = sheets.get(name)
    if (!sheet) {
      sheet = {
        name,
        headerRow: null,
        lastRow: null,
        columns: [],
        rowCount: null,
        samples: [],
        rows: [],
      }
      sheets.set(name, sheet)
    }
    return sheet
  }

  for (const chunk of chunks) {
    const anchor = chunk.source_anchor
    const label = parseSheetLabel(chunk.source_label ?? '')
    if (anchor?.kind !== 'sheet' && !label) continue
    const sheet = sheetFor(anchor?.sheet ?? label?.sheet ?? '')
    const range = rangeOf(anchor?.cell_range, label)

    if (label?.part === 'summary') {
      sheet.headerRow = range?.from ?? null
      sheet.lastRow = range?.to ?? null
      const m = SUMMARY.exec(chunk.content)
      if (m) {
        sheet.columns = m[1]
          .split(', ')
          .map((c) => c.trim())
          .filter(Boolean)
        sheet.rowCount = Number(m[2])
      }
      const [, samples = ''] = chunk.content.split('\nSample rows:\n')
      sheet.samples = lines(samples).map((raw) => ({
        row: null,
        from: range?.from ?? 0,
        to: range?.to ?? 0,
        cells: parseRowLine(raw),
        raw,
      }))
      continue
    }

    if (!range) continue
    const rowLines = lines(chunk.content)
    // Blank rows were skipped but still counted, so line i is row from+i
    // only when nothing in the range was blank.
    const exact = rowLines.length === range.to - range.from + 1
    rowLines.forEach((raw, i) => {
      sheet.rows.push({
        row: exact ? range.from + i : null,
        from: range.from,
        to: range.to,
        cells: parseRowLine(raw),
        raw,
      })
    })
  }
  return [...sheets.values()]
}

function rangeOf(
  cellRange: string | undefined,
  label: SheetLabel | null,
): { from: number; to: number } | null {
  const m = cellRange ? /^[A-Z]+(\d+):[A-Z]+(\d+)$/.exec(cellRange) : null
  if (m) return { from: Number(m[1]), to: Number(m[2]) }
  return label?.part === 'rows' ? { from: label.from, to: label.to } : null
}

function lines(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

const FIELD_SEP = ' | '
const SHEET_PREFIX = /^Sheet "(?:[^"\\]|\\.)*"$/

/**
 * `Sheet "Pipeline" | Deal: Contoso | Region: EMEA` → `{Deal, Region}`.
 *
 * A cell that itself held ` | ` leaves a piece with no `Label: ` in front of
 * it; that piece belongs to the field before it and is put back. A line whose
 * first field has no label at all is not a row this can read: null.
 */
export function parseRowLine(line: string): Record<string, string> | null {
  const parts = line.split(FIELD_SEP)
  if (parts.length > 0 && SHEET_PREFIX.test(parts[0])) parts.shift()
  const cells: Record<string, string> = {}
  let last: string | null = null
  for (const part of parts) {
    const at = part.indexOf(': ')
    if (at > 0) {
      last = part.slice(0, at)
      cells[last] = part.slice(at + 2)
    } else if (last !== null) {
      cells[last] += FIELD_SEP + part
    } else {
      return null
    }
  }
  return last === null ? null : cells
}

/**
 * The columns to draw: the summary's, then any label a row carried that the
 * summary did not name (a header-less column, "Col F").
 */
export function sheetColumns(sheet: Sheet): string[] {
  const columns = [...sheet.columns]
  const seen = new Set(columns)
  for (const row of [...sheet.samples, ...sheet.rows]) {
    for (const key of Object.keys(row.cells ?? {})) {
      if (!seen.has(key)) {
        seen.add(key)
        columns.push(key)
      }
    }
  }
  return columns
}

/** A column's letter by its 0-based index: 0 → A, 25 → Z, 26 → AA. */
export function columnLetter(index: number): string {
  let n = Math.max(0, index)
  let s = ''
  for (;;) {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
    if (n < 0) return s
  }
}

const NUMERIC = /^[-+(]?[$€£¥]?\s?\d[\d.,\s]*\s?(%|[kKmMbB])?\)?$/

/** Whether a cell reads as a number, and so sits right-aligned. */
export function isNumericCell(value: string): boolean {
  return NUMERIC.test(value.trim())
}

/** One sheet as a line of facts names it: display name and data rows. */
export type SheetSummary = { name: string; rows: number | null }

/**
 * The sheets for display. A CSV's one sheet has no name of its own, so it
 * takes `fallbackName` — the file's.
 */
export function summarizeSheets(
  sheets: Sheet[],
  fallbackName: string,
): SheetSummary[] {
  return sheets.map((sheet) => ({
    name: sheet.name || fallbackName,
    rows: sheet.rowCount,
  }))
}

/** A range of rows something cited, and what cited it. */
export type CitedRange = {
  sheet: string
  from: number
  to: number
  by: string
}

/**
 * Where a citation stands against the chunks loaded so far: its rows are
 * here (`found`), may be on a later page (`more`), or cannot be — the range
 * is past the sheet's last row, the loaded rows have already gone past it
 * (blank rows are never stored), or a later sheet has started, which only
 * happens once this one is fully loaded (`never`).
 */
export function citationStatus(
  sheets: Sheet[],
  cited: CitedRange,
): 'found' | 'more' | 'never' {
  const at = sheets.findIndex((s) => s.name === cited.sheet)
  if (at < 0) return 'more'
  const sheet = sheets[at]
  // Found once the chunk holding the range is loaded — even when blank rows
  // keep its rows unnumbered and nothing can be marked exactly.
  if (sheet.rows.some((r) => nearRange(r, cited))) return 'found'
  if (sheet.lastRow !== null && cited.from > sheet.lastRow) return 'never'
  if (sheet.rows.some((r) => r.from > cited.to)) return 'never'
  return at < sheets.length - 1 ? 'never' : 'more'
}

/**
 * Whether a row is cited — and so marked. A numbered row is when its number
 * is in the range. An unnumbered one (its chunk skipped blank rows) only when
 * the range covers its whole chunk: a citation of "row 12" cannot say which
 * of a chunk's unnumbered rows it means, and marking all of them would claim
 * rows nobody cited.
 */
export function inRange(
  row: Pick<SheetRow, 'row' | 'from' | 'to'>,
  range: { from: number; to: number },
): boolean {
  return row.row !== null
    ? row.row >= range.from && row.row <= range.to
    : range.from <= row.from && range.to >= row.to
}

/**
 * Whether a row's chunk overlaps a cited range — where the citation is, even
 * when its rows cannot be marked. What the sheet view scrolls to when nothing
 * is `inRange`.
 */
export function nearRange(
  row: Pick<SheetRow, 'from' | 'to'>,
  range: { from: number; to: number },
): boolean {
  return row.from <= range.to && row.to >= range.from
}
