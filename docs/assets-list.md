# The Assets list (CON-370)

`/assets` and `/campaigns/:id/assets` (`ContentList` → `tables/docsTable`).
The list describes what each document *offers* rather than its storage record.

## A row

- **Kind:** a bare Hugeicons mark with no box (`AssetKindMark`, `lib/assetList`'s `listKind`).
  - PDF, document, spreadsheet, CSV, web page, recording, note.
  - An image puts its thumbnail in the slot instead.
- **Title:** written as words (`listTitle`).
  - URL-encoding is decoded, a file's extension dropped, and underscores become spaces.
  - A hyphenated file name reads as words.
  - A page's " - InfoQ" suffix goes when the row shows its domain.
  - Titles wrap and never truncate, so the table measures each row (`VirtualTable`'s `measureRows`).
- **Second line**, when there is one:
  - "Reading the document…" while ingest or analysis runs.
  - Otherwise the analysis gist, behind `asset-list-gist`, until the list payload carries `gist`.
- **Facts:** a quiet line with:
  - the domain;
  - a recording's duration, once the payload carries `file.duration_ms`;
  - pages, words or size;
  - a status only when it isn't Ready ("Partial — page cut short").
- **Ideas:** the verdict pill (`VerdictPill`).
  - One segment per verdict, icon and count, always in the order Undecided · Yes · Not now · No.
  - Verdicts with no ideas are left out. Undecided is the only teal.
  - The tooltip, which is also the pill's accessible name, spells the counts out.
  - A segment opens the asset page on that pile (`?verdict=`).
  - Counts come from `GET /api/ideas`, grouped by source asset (`ideaCountsByAsset`). A due "Not now" counts as Undecided.
  - Sorting the column orders by Undecided, most first.
- **Updated:** one line through `lib/intl`.
  - A distance within the week, then a date with a four-digit year.
  - The exact time is in the tooltip.
- **Campaign:** the campaigns holding the document. On a campaign's own list the column is "Also in" and names the others. Post usage is not shown here.
- **Tags:** shown as pills.
- **Empty cells:** a faint dash, with "None" for a screen reader.
- **Bin:** shows on hover or focus only, and on touch screens. It still goes through `DeleteDocumentsDialog`.

## The asset page's piles

Above the ideas, the asset page shows the same verdicts with their words as filters (`AssetIdeaList`), driven by `?verdict=`. Choosing "No" is the one way to see the answered-no ideas again. Choosing the active pile again clears the filter.

## Wireframes

![Cut the noise](assets-list/1-cut-the-noise.png)
![Ideas and gist](assets-list/3-ideas-and-gist.png)
![The verdict pill](assets-list/4-verdict-pill.png)

As built, with illustrative data:

![As built](assets-list/built.png)
