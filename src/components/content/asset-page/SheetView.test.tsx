import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { SheetCiteContext } from '@/hooks/useSheetCite'
import { sheetsFromChunks } from '@/lib/sheetChunks'
import type { AssetChunk } from '@/types/content'
import { SheetView } from './SheetView'
import { SourceChip } from './SourceChip'

const chunk = (
  i: number,
  sheet: string,
  label: string,
  range: string,
  content: string,
): AssetChunk => ({
  id: `c${i}`,
  asset_id: 'a1',
  chunk_index: i,
  page_start: 0,
  page_end: 0,
  source_label: label,
  source_anchor: { kind: 'sheet', sheet, cell_range: range },
  content,
  token_count: 10,
})

const sheets = sheetsFromChunks([
  chunk(
    0,
    'Pipeline',
    'Sheet "Pipeline" summary',
    'A1:B4',
    'Sheet "Pipeline" — columns: Deal, Value. 3 data rows.',
  ),
  chunk(
    1,
    'Pipeline',
    'Sheet "Pipeline" rows 2-4',
    'A2:B4',
    'Deal: Contoso | Value: €120k\nDeal: Litware | Value: €96k\nnot a row',
  ),
  chunk(
    2,
    'Regions',
    'Sheet "Regions" summary',
    'A1:A2',
    'Sheet "Regions" — columns: Region. 1 data rows.',
  ),
  chunk(3, 'Regions', 'Sheet "Regions" rows 2-2', 'A2:A2', 'Region: EMEA'),
])

function renderView(over: Partial<Parameters<typeof SheetView>[0]> = {}) {
  const props = {
    sheets,
    fallbackName: 'q3',
    selected: null,
    onSelect: vi.fn(),
    cited: null,
    onClearCited: vi.fn(),
    loading: false,
    failed: false,
    hasMore: false,
    loadingMore: false,
    onLoadMore: vi.fn(),
    fallback: <p>text view</p>,
    ...over,
  }
  render(<SheetView {...props} />)
  return props
}

describe('SheetView', () => {
  it('draws the first sheet as a table, numbers right-aligned', () => {
    renderView()
    const table = screen.getByRole('table')
    expect(within(table).getByText('Deal')).toBeInTheDocument()
    expect(within(table).getByText('€120k')).toHaveClass('text-right')
    expect(within(table).getByText('Contoso')).not.toHaveClass('text-right')
    // A line that would not split is shown whole, not spread across columns.
    expect(within(table).getByText('not a row')).toHaveAttribute('colspan', '2')
    expect(screen.getByText('Showing 3 of 3 rows')).toBeInTheDocument()
  })

  it('switches sheets from the pills', () => {
    const props = renderView()
    fireEvent.click(screen.getByRole('tab', { name: /Regions/ }))
    expect(props.onSelect).toHaveBeenCalledWith('Regions')
  })

  it('marks a cited range and names what cited it', () => {
    const props = renderView({
      cited: { sheet: 'Pipeline', from: 3, to: 3, by: 'Bigger deals' },
    })
    expect(screen.getByText('Rows 3–3')).toBeInTheDocument()
    expect(screen.getByText(/cited by “Bigger deals”/)).toBeInTheDocument()
    expect(screen.getByText('Litware').closest('tr')).toHaveClass(
      'bg-warning/10',
    )
    expect(screen.getByText('Contoso').closest('tr')).not.toHaveClass(
      'bg-warning/10',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(props.onClearCited).toHaveBeenCalled()
  })

  it('fetches further pages for a citation not loaded yet', () => {
    const props = renderView({
      cited: { sheet: 'Targets', from: 2, to: 9, by: '' },
      hasMore: true,
    })
    expect(props.onLoadMore).toHaveBeenCalled()
  })

  it('does not chase a citation the loaded rows rule out', () => {
    // Regions is followed by no sheet, but Pipeline is: Pipeline is complete.
    const props = renderView({
      cited: { sheet: 'Pipeline', from: 40, to: 45, by: '' },
      hasMore: true,
    })
    expect(props.onLoadMore).not.toHaveBeenCalled()
  })

  it('falls back to the text view when the chunks hold no sheet', () => {
    renderView({ sheets: [] })
    expect(screen.getByText('text view')).toBeInTheDocument()
  })
})

describe('SourceChip', () => {
  it('opens a sheet range where a sheet view can show it', () => {
    const cite = vi.fn()
    render(
      <SheetCiteContext.Provider value={{ cite }}>
        <SourceChip label='Sheet "Pipeline" rows 10-24' citedBy="EMEA first" />
      </SheetCiteContext.Provider>,
    )
    fireEvent.click(
      screen.getByRole('button', { name: /Pipeline · rows 10–24/ }),
    )
    expect(cite).toHaveBeenCalledWith(
      'Sheet "Pipeline" rows 10-24',
      'EMEA first',
    )
  })

  it('shows a heading path by its last heading, the full path on hover', () => {
    render(<SourceChip label="Process overview › SDLC methodology" />)
    expect(screen.getByText('SDLC methodology').parentElement).toHaveAttribute(
      'title',
      'Process overview › SDLC methodology',
    )
  })

  it('is a plain, shortened label anywhere else', () => {
    render(<SourceChip label='Sheet "Pipeline" summary' />)
    expect(
      screen.getByText('Pipeline · summary').parentElement,
    ).toHaveAttribute('title', 'Sheet "Pipeline" summary')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
