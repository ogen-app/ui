# Assets & uploads

Conventions for the Content Bank / Assets module, the asset page, uploads and their refusals. Moved out of the root `CLAUDE.md` so it
loads only when needed — read this before changing the code it covers, and
keep it accurate when these rules change.

- **Video uploads take a different path from images and PDFs** — presign →
  direct PUT to storage → finalize, so multi-hundred-megabyte files never
  buffer in the API. Routed by kind inside `usePostAttachments.upload`; the
  finalize response is the same shape an image upload returns. Video *rules*
  come off `GET /api/platforms` (`video_constraints`) rather than the
  `lib/platformMedia.ts` override table — but the size cap does not: 500 MB
  (`MAX_VIDEO_UPLOAD_BYTES`) is ours, and always wins over the seeded ceiling.
  A probed-but-zero `duration_ms` means video-service was down, not a
  zero-length file. See `docs/technical-decisions.md#video-ingest`.
  **A Content-Bank recording takes the same shape** (`uploadAudioFile`),
  sharing `services/api/storageUpload` — which
  sends exactly the headers presign signed, never `file.type`, because the
  browser's `audio/x-m4a` is not the server's `audio/mp4`. Presign creates the
  asset before a byte moves, so a failed PUT or a refused finalize deletes it
  again; a finalize that never answered does not, since its run may have begun.

- **An asset only opens in the editor if `assetScreen` says so.** It answers
  one of `editor | extracted | image | audio | unsupported`, and the editor is a
  named answer, never the fallback: only `null | MD | URL` reach it. Never
  restore "everything else gets `AssetEditor`" — it seeds BlockNote from
  `content` and autosaves it back, so the first type whose `content` isn't a
  document is overwritten by anyone who opens it and types (CON-235). **PDF and
  DOC are read-only** (`AssetExtractedView`): the server refuses a changed
  `content` on PDF, DOC and AUDIO (409 `content_locked`, CON-312), and their
  `content` is only the upload's `"[]"` placeholder anyway — the text lives in
  the chunks, so that screen reads `GET /:id/chunks`, and the list states a PDF
  by its pages rather than counting the placeholder's one "word". An image
  (`AssetImageView`, CON-246) and a recording (`AssetAudioView`, CON-282) have
  screens of their own; `UnsupportedAsset` is only reached by a kind this build
  has never heard of. Saves send `content` only once it has been edited, so a
  rename on an ingested type is a title-only PUT. See
  `docs/technical-decisions.md#asset-opening`.

- **The asset page is two columns, and those screens are its Source tab**
  (CON-366, shipped unflagged; `docs/asset-page.md`). `AssetDocument` renders
  `AssetPage`: what the asset is on the left (stage, facts, the **title** —
  edited there and nowhere else), the LLM analysis and its ideas under
  Insights on the right, and `assetScreen`'s screen under Source, with no title
  field or page-width card of its own. A recording has **one** `<audio>`, the
  stage's; the transcript, commitment and idea chips drive it through
  `useAudioSeek`. Don't give a Source screen its own title or player back —
  two title fields edit one value with two debounces, and two players play over
  each other.

- **An asset update is presence-aware, and a campaign's is not.** Since CON-279
  the asset PUT reads `alt_text` and `tag_ids` as optional: omit one and the
  stored value is left alone, send it — including `""` or `[]` — and it is
  replaced. So a screen sends the fields it owns and nothing else: the document
  editor sends `content` (the title comes from the page's left column), the
  image screen sends the three fields it shows. `assetToPayload` is gone with the bug it existed for; do not
  reintroduce a helper that round-trips fields the screen cannot see, because
  that is exactly what put a stale copy of the tags back over a bulk re-tag.
  The image screen still debounces the whole asset rather than each field, for
  the unrelated reason that two saves in flight each carry a stale copy of the
  other's field.

- **A bank image reaches a post as a copy, never a reference** (CON-290).
  `POST /api/posts/:id/attachments/from-asset` strips the bank's original
  (which keeps its EXIF) into an object the attachment owns, so deleting the
  asset leaves the post intact, and the copy is charged to
  `media_storage_bytes` like an upload. The media card's **From Assets** tile
  opens `AddFromAssetsModal`, images only, on the post's campaign with the
  whole bank one switch away. Two rules: **never send `alt_text`** — omitted,
  the asset's text *and* whether a person wrote it carry over, while a sent one
  is marked user-edited — and attach **one at a time, in pick order**, because
  the server positions each copy as it lands. The server keeps no link back to
  the asset, so "already on this post" is this tab's memory
  (`usePostAttachments.attachedAssetIds`) and a reload forgets it.

- **Tags are filed over a selection, not on a row** (`POST
  /api/content-bank/assets/tags`, CON-279). Each asset keeps what it has, minus
  `remove`, plus `add`, so the client never has to say what an asset already
  carries and two people filing at once don't overwrite each other. The server
  refuses a tag named in both lists rather than picking a winner.

- **Deleting a document asks, from every way in.** The row's bin, the selection
  bar and the document's own screen all reach a confirmation that *names* what
  it is about to delete — one title, or a count. The bin used to delete on one
  click, on the argument that a row is one of twenty and a mistake is visible
  immediately; the second half is false, because nothing in the product undoes
  this. Route a new entry point through `DeleteDocumentsDialog`
  (`ContentList` holds the state; a single row is a selection of one) rather
  than calling the mutation, and never add a second path that skips the asking.

- **A duplicate upload is warned about before it happens, not after.** The
  server dedupes an identical **image** by checksum within the workspace and
  answers with the asset it already has — no new row, no changed timestamp —
  so the upload's entire visible effect is that nothing happens. `UploadModal`
  hashes each staged image (`lib/fileChecksum`, `crypto.subtle`) and names the
  document it would resolve to. Images only: nothing else carries a checksum,
  so a second PDF really is a second document and warning about one would be a
  promise the server doesn't keep.

- **An upload refusal is worded by its `code`, not its prose.** Since
  CON-281/312 every `/upload` result, post-attachment refusal and failed asset
  (`failure_code`) carries one of `models/upload_code.go`'s codes, and
  `lib/uploadError` switches on it — the client's own refusals
  (`validateUploadFile`) answer in the same codes, so one table words both. The
  prose is read for only two things: the numbers a code deliberately leaves out
  (a cap, a duration limit), lifted out rather than restated, and a code this
  build predates, which falls back to matching the sentence as everything did
  before codes existed. Add a case there, not a literal at the call site. Two
  codes are ours and never sent: `legacy_office` (a `.doc` is told to save as
  `.docx`) and `storage_upload_failed` (a presigned PUT that never reached the
  bucket). **The client holds no image cap** — the operator sets it (CON-281),
  and a guess below it refuses files the server takes.
