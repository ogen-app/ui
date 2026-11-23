/**
 * The upload modal and its drop zone.
 *
 * The limits are one line per kind of file, because each answers a
 * different question — "will it take my PDF", "my spreadsheet", "my photo"
 * — and a reader looking for one should not have to read past the others.
 * Sizes are interpolated from the caps in `lib/assetStatus`, so the copy
 * never states a number that has drifted from the one enforced. Images state
 * none: their cap is the operator's (CON-281), and the server names it when
 * a file is over it.
 */
export const uploads = {
  limitText: 'Markdown up to {{md}}, PDF up to {{pdf}}',
  limitDocuments:
    'Word, Excel, PowerPoint, OpenDocument, EPUB, CSV, HTML, email, RTF and text files up to {{size}}',
  limitImages: 'Images: JPEG, PNG, WebP, GIF, HEIC, AVIF, TIFF and BMP',
  limitAudio:
    'Audio: MP3, WAV, M4A, AAC, OGG, Opus, FLAC, WebM and AIFF up to {{size}}',
  /** Why an upload can finish and the document still not be readable. */
  backgroundNote:
    'Everything except Markdown is read in the background, so it finishes after upload.',
  browse: 'Drop files here or click to browse',
  remove: 'Remove {{name}}',
  /** Last resort: the request died without the server wording anything. */
  failed: 'Upload failed',
  cancel: 'CANCEL',
  submit: 'UPLOAD',
  /** The count is what makes the button worth reading twice before clicking. */
  submitCount: 'UPLOAD ({{n}})',
  /** Named while a drag is over the page — the one moment the destination
      can be stated without being asked for. */
  dropInto: 'Add these to {{scope}}',
  /**
   * A staged image whose bytes are already in the workspace (CON-246
   * R-Dedup). It names the document rather than saying "duplicate", because
   * the useful half is *which* one — the file may have been filed under a
   * name the uploader would never have searched for.
   *
   * Stated before the upload, not after, which is the whole reason it
   * exists: the server answers a byte-identical image with the asset it
   * already has, so uploading one is indistinguishable from nothing
   * happening. It is a warning and not a refusal — in a campaign the upload
   * still does something, it attaches that existing document here.
   *
   * Images only. The server dedupes nothing else, so a second copy of a PDF
   * really is a second document.
   */
  duplicate: 'Already in the content bank as "{{title}}"',

  /**
   * Why a file was refused.
   *
   * The server composes these as prose and the client matches on it
   * (`lib/uploadError`) — see that module for why, and for what is being
   * asked of the API instead. Each one says what to do about it where there
   * is anything to do, and admits it is our fault where there isn't.
   */
  errors: {
    type: "This kind of file can't be added to the content bank.",
    /**
     * `.doc`, `.xls`, `.ppt` — or a password-protected Office file, which the
     * server refuses in the same words. Both have the same fix.
     */
    legacyOffice:
      "Older or password-protected Office files can't be read. Save it as an unprotected .docx, .xlsx or .pptx and upload that.",
    /** The name said one thing and the bytes were another. */
    unsupportedType: "This file's contents aren't a kind we can read.",
    vector:
      "SVG and other vector images aren't supported. Export it as a PNG or JPEG first.",
    /** The cap is the server's own, lifted out of its message. */
    tooBig: 'This file is over the {{limit}} limit.',
    /** The same refusal when the server's message carried no number. */
    tooBigUnstated: 'This file is too big to upload.',
    dimensions: 'This image is too big to store — the limit is {{max}}.',
    dimensionsUnstated: 'This image has too many pixels to store.',
    /** A recording longer than the plan allows; the limit is the server's. */
    duration_one:
      'This recording is over the {{count}}-minute limit for your plan.',
    duration_other:
      'This recording is over the {{count}}-minute limit for your plan.',
    durationUnstated: 'This recording is longer than your plan allows.',
    /** A tier limit — file count or storage — not anything about the file. */
    quota:
      "Your plan's content bank limit has been reached, so this wasn't added.",
    /**
     * The service that reads this kind of file is switched off or down. Not
     * the file's fault, and trying later is the whole of the advice.
     */
    unavailable:
      "Files like this can't be read right now. Try again in a few minutes.",
    /** Searchable, but the structured read didn't finish. */
    partial: 'Only part of this could be read.',
    empty: 'This file is empty.',
    notPdf: "This isn't a readable PDF.",
    invalid: "This file couldn't be read — it may be damaged.",
    /** A deployment fault: the bucket isn't configured. */
    notConfigured: "This server can't store images yet.",
    undecodable: "This image couldn't be read — it may be damaged.",
    /** Our side failed. Nothing about the file is wrong. */
    server: 'Something went wrong saving this file. Try again.',
    /**
     * The file never reached storage. Most often a bucket that doesn't
     * accept uploads from this address, which the browser only reports as a
     * network failure — so it says to retry and names the likelier cause.
     */
    storage:
      "The file couldn't be sent to storage. Try again — if it keeps failing, storage isn't accepting uploads from this app yet.",
  },
}
