// ---------------------------------------------------------------------------
// config.ts — the names you must change to match YOUR Dataverse table.
//
// This sample stores each uploaded file as one record in a custom table that
// has a native Dataverse **File column**. The defaults below use the
// `sample_` publisher prefix as a placeholder. Replace every `sample_` with
// your own publisher prefix (e.g. `contoso_`) after you create the table, and
// make sure the names here match the table's actual logical/schema names.
//
// See README.md for the exact table + column + relationship schema to create.
// ---------------------------------------------------------------------------

export const config = {
  /** Entity set (plural) name — used in the /_api/<entitySet> route. */
  entitySet: 'sample_filerecords',
  /** Table logical name — used in site settings / table permissions. */
  table: 'sample_filerecord',

  // Columns on the table.
  /** Primary name column (single line of text). */
  nameColumn: 'sample_name',
  /** The native **File** column that holds the binary payload. */
  fileColumn: 'sample_file',
  /** Companion text column — original file name (download naming). */
  fileNameColumn: 'sample_filename',
  /** Companion text column — MIME type (download Blob typing). */
  mimeTypeColumn: 'sample_mimetype',
  /** Companion whole-number column — byte size (display without downloading). */
  fileSizeColumn: 'sample_filesize',

  /** Lookup column → contact, for per-user ownership. */
  contactColumn: 'sample_contact',

  /**
   * The single-valued **navigation property** of the contact lookup, used for the
   * `@odata.bind` on create. This is the relationship's *schema name* (PascalCase,
   * e.g. `sample_Contact`) — NOT the lowercase logical column name. Web API binds
   * are case-sensitive, so binding to `sample_contact@odata.bind` fails. Find it on
   * the lookup's relationship as `ReferencingEntityNavigationPropertyName`.
   */
  contactNavProperty: 'sample_Contact',

  /**
   * Primary key column of the table. Dataverse names it `<table>id`, so for
   * `sample_filerecord` it is `sample_filerecordid`.
   */
  get idColumn(): string {
    return `${this.table}id`
  },

  /**
   * The OData filter field for the contact lookup. Dataverse exposes lookups
   * for `$filter` as `_<column>_value`, so `sample_contact` → `_sample_contact_value`.
   */
  get contactValueField(): string {
    return `_${this.contactColumn}_value`
  },
} as const
