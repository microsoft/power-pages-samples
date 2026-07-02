// ---------------------------------------------------------------------------
// config.ts — knobs for the Azure Blob file-upload sample.
//
// Unlike the notes / file-column samples, this sample needs NO custom table.
// Files are attached to the signed-in user's own **contact** record: the
// Power Pages file-management Web API writes the bytes to your Azure Blob
// container and creates a small **annotation (note) placeholder** record on the
// contact to track each file. So the only "table" involved is `annotation`,
// scoped to the contact — exactly like the notes sample.
//
// The values below MUST stay in sync with the shipped site settings under
// `.powerpages-site/site-settings/Site-FileManagement-*`:
//   - allowedExtensions  ↔ Site/FileManagement/SupportedFileType
//   - allowedTypes       ↔ Site/FileManagement/SupportedMimeType
//   - maxFileBytes       ↔ Site/FileManagement/MaxFileSize (KB)
// If the server allow-lists and these disagree, the server wins (you'll get an
// FU00004/FU00005 rejection); keeping them aligned just gives a nicer client
// error first.
// ---------------------------------------------------------------------------

export const config = {
  /**
   * The parent table each file is attached to. This sample uses the visitor's
   * own `contact` so files are owned by — and fenced to — the signed-in user.
   * The blob placeholder annotation's `objectid` is set to this record.
   */
  parentTable: 'contact',

  /** Client-side type allow-list (mirrors Site/FileManagement/SupportedMimeType). */
  allowedTypes: ['application/pdf', 'image/png', 'image/jpeg', 'text/plain'],
  /** Extension fallback for when the browser reports an empty `file.type`. */
  allowedExtensions: ['.pdf', '.png', '.jpg', '.jpeg', '.txt'],

  /** Self-cap (mirrors Site/FileManagement/MaxFileSize = 10240 KB). */
  maxFileBytes: 10 * 1024 * 1024,

  /**
   * Upload block size for the UploadBlock loop. The portal caps an un-chunked
   * call at 128 MB and a single chunk at 100 MB; the official sample uses 50 MB
   * blocks. We use a smaller 4 MB block so the progress bar advances smoothly on
   * the modest file sizes this sample allows.
   */
  chunkSize: 4 * 1024 * 1024,

  /**
   * Suffix the file-management API appends to the annotation placeholder's file
   * name for blob-stored files. We filter on it when listing and strip it for
   * display. (The exact suffix/metadata behavior is a live-test item — see README.)
   */
  blobAnnotationSuffix: '.azure.txt',
} as const
