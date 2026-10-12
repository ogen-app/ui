import { describe, expect, it } from 'vitest'
import type { AssetChunk } from '@/types/content'
import {
  citationStatus,
  columnLetter,
  inRange,
  nearRange,
  isNumericCell,
  isSpreadsheet,
  parseRowLine,
  parseSheetLabel,
  sheetColumns,
  sheetsFromChunks,
  shortSheetLabel,
} from './sheetChunks'

const chunk = (
  i: number,
  label: string,
  content: string,
  anchor?: AssetChunk['source_anchor'],
): AssetChunk => ({
  id: `c${i}`,
  asset_id: 'a1',
  chunk_index: i,
  page_start: 0,
  page_end: 0,
  source_label: label,
  source_anchor: anchor,
  content,
  token_count: 10,
})

describe('isSpreadsheet', () => {
  const file = (original_name: string, mime_type: string) => ({
    id: 'f',
    original_name,
    mime_type,
    size_bytes: 1,
    width: 0,
    height: 0,
    is_animated: false,
  })

  it('knows a workbook or a delimited file by type or name', () => {
    expect(
      isSpreadsheet({
        type: 'DOC',
        file: file(
          'q3.xlsx',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ),
      }),
    ).toBe(true)
    expect(
      isSpreadsheet({ type: 'DOC', file: file('leads.csv', 'text/csv') }),
    ).toBe(true)
    expect(
      isSpreadsheet({
        type: 'DOC',
        file: file('data.ods', 'application/octet-stream'),
      }),
    ).toBe(true)
  })

  it('leaves every other document alone', () => {
    expect(
      isSpreadsheet({
        type: 'DOC',
        file: file('deck.pptx', 'application/vnd.ms-powerpoint'),
      }),
    ).toBe(false)
    expect(
      isSpreadsheet({ type: 'PDF', file: file('q3.xlsx', 'text/csv') }),
    ).toBe(false)
    expect(isSpreadsheet({ type: 'DOC', file: null })).toBe(false)
  })
})

describe('parseSheetLabel / shortSheetLabel', () => {
  it('reads the labels document-service writes', () => {
    expect(parseSheetLabel('Sheet "Pipeline" rows 10-24')).toEqual({
      sheet: 'Pipeline',
      part: 'rows',
      from: 10,
      to: 24,
    })
    expect(parseSheetLabel('Sheet "Q3 \\"final\\"" summary')).toEqual({
      sheet: 'Q3 "final"',
      part: 'summary',
    })
    expect(parseSheetLabel('Rows 2-40')).toEqual({
      sheet: '',
      part: 'rows',
      from: 2,
      to: 40,
    })
    expect(parseSheetLabel('Sheet "A" row 7')).toEqual({
      sheet: 'A',
      part: 'rows',
      from: 7,
      to: 7,
    })
    expect(parseSheetLabel('Slide 4')).toBeNull()
  })

  it('shortens them for a chip', () => {
    expect(shortSheetLabel('Sheet "Pipeline" rows 10-24')).toBe(
      'Pipeline · rows 10–24',
    )
    expect(shortSheetLabel('Sheet "Pipeline" summary')).toBe(
      'Pipeline · summary',
    )
    expect(shortSheetLabel('Rows 2-40')).toBe('rows 2–40')
    expect(shortSheetLabel('p. 4')).toBeNull()
  })
})

describe('parseRowLine', () => {
  it('splits labelled fields and drops the sheet prefix', () => {
    expect(
      parseRowLine('Sheet "Pipeline" | Deal: Contoso | Region: EMEA'),
    ).toEqual({
      Deal: 'Contoso',
      Region: 'EMEA',
    })
    expect(parseRowLine('Name: Ann | Note: ratio: 3')).toEqual({
      Name: 'Ann',
      Note: 'ratio: 3',
    })
  })

  it('puts back a cell that held the separator, and gives up on an unlabelled line', () => {
    expect(parseRowLine('Deal: A | B | Region: EMEA')).toEqual({
      Deal: 'A | B',
      Region: 'EMEA',
    })
    expect(parseRowLine('just text')).toBeNull()
  })
})

describe('citationStatus', () => {
  const sheets = sheetsFromChunks([
    chunk(0, 'Sheet "A" summary', 'Sheet "A" — columns: X. 3 data rows.', {
      kind: 'sheet',
      sheet: 'A',
      cell_range: 'A1:A40',
    }),
    chunk(1, 'Sheet "A" rows 2-4', 'X: 1\nX: 2\nX: 3', {
      kind: 'sheet',
      sheet: 'A',
      cell_range: 'A2:A4',
    }),
  ])
  const cite = (sheet: string, from: number, to: number) => ({
    sheet,
    from,
    to,
    by: '',
  })

  it('finds loaded rows and waits for unloaded ones', () => {
    expect(citationStatus(sheets, cite('A', 3, 3))).toBe('found')
    expect(citationStatus(sheets, cite('A', 10, 12))).toBe('more')
    expect(citationStatus(sheets, cite('B', 2, 5))).toBe('more')
  })

  it('gives up where the rows cannot be', () => {
    // Past the sheet's last row.
    expect(citationStatus(sheets, cite('A', 50, 60))).toBe('never')
    // A later sheet has started, so this one is fully loaded.
    const withNext = [...sheets, { ...sheets[0], name: 'B' }]
    expect(citationStatus(withNext, cite('A', 10, 12))).toBe('never')
  })
})

describe('sheetsFromChunks', () => {
  const chunks = [
    chunk(
      0,
      'Sheet "Pipeline" summary',
      'Sheet "Pipeline" — columns: Deal, Region, Value. 3 data rows.\nSample rows:\nSheet "Pipeline" | Deal: A | Region: EMEA | Value: 10',
      { kind: 'sheet', sheet: 'Pipeline', cell_range: 'A1:C4' },
    ),
    chunk(
      1,
      'Sheet "Pipeline" rows 2-4',
      'Sheet "Pipeline" | Deal: A | Region: EMEA | Value: 10\nSheet "Pipeline" | Deal: B | Col D: x\nSheet "Pipeline" | Deal: C',
      { kind: 'sheet', sheet: 'Pipeline', cell_range: 'A2:D4' },
    ),
    chunk(
      2,
      'Sheet "Regions" rows 2-9',
      'Region: EMEA | Won: 41%\nRegion: NA | Won: 28%',
      {
        kind: 'sheet',
        sheet: 'Regions',
        cell_range: 'A2:B9',
      },
    ),
    chunk(3, 'Slide 1', 'not a sheet', { kind: 'slide', slide: 1 }),
  ]
  const sheets = sheetsFromChunks(chunks)

  it('groups rows under their sheet, in workbook order', () => {
    expect(sheets.map((s) => s.name)).toEqual(['Pipeline', 'Regions'])
    expect(sheets[0].columns).toEqual(['Deal', 'Region', 'Value'])
    expect(sheets[0].rowCount).toBe(3)
    expect(sheets[0].samples).toHaveLength(1)
    expect(sheetColumns(sheets[0])).toEqual([
      'Deal',
      'Region',
      'Value',
      'Col D',
    ])
  })

  it('numbers rows only when no blank row hides in the range', () => {
    expect(sheets[0].rows.map((r) => r.row)).toEqual([2, 3, 4])
    expect(sheets[1].rows.map((r) => r.row)).toEqual([null, null])
    expect(inRange(sheets[0].rows[1], { from: 3, to: 3 })).toBe(true)
    expect(inRange(sheets[0].rows[0], { from: 3, to: 3 })).toBe(false)
    // An unnumbered row is cited when its group overlaps the range.
    // An unnumbered row is only marked when the range covers its chunk…
    expect(inRange(sheets[1].rows[0], { from: 5, to: 6 })).toBe(false)
    expect(inRange(sheets[1].rows[0], { from: 2, to: 9 })).toBe(true)
    // …but the chunk still counts as where the citation is.
    expect(nearRange(sheets[1].rows[0], { from: 5, to: 6 })).toBe(true)
  })
})

describe('columnLetter', () => {
  it('counts columns the way a spreadsheet does', () => {
    expect([0, 4, 25, 26, 27, 701].map(columnLetter)).toEqual([
      'A',
      'E',
      'Z',
      'AA',
      'AB',
      'ZZ',
    ])
  })
})

describe('isNumericCell', () => {
  it('right-aligns figures and nothing else', () => {
    for (const v of ['42', '€120k', '$1,200.50', '41%', '-3', '(12)']) {
      expect(isNumericCell(v)).toBe(true)
    }
    for (const v of ['EMEA', '12 Sep', 'Q3']) {
      expect(isNumericCell(v)).toBe(false)
    }
  })
})
