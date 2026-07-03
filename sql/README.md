# Template metadata extraction

`EXTRACT_TEMPLATE_METADATA` is a Snowflake Python stored procedure that reads an
Excel **report template** from a stage and writes a structural description of it
into `SE_DEMO_DB.JHI_HEDS_DEMO.TEMPLATE_METADATA`. That metadata drives the
[report-builder plugin](../src/report) (which matches Sigma data sources to the
template's sections) and the downstream procedure that writes data back into the
template's cells.

```
CALL SE_DEMO_DB.JHI_HEDS_DEMO.EXTRACT_TEMPLATE_METADATA('MY_TEMPLATE_ID');
```

The template's file name is looked up in `REPORT_TEMPLATES` (`TEMPLATE_FILE`
column) and downloaded from `@REPORTS_STAGE/templates/`. The procedure returns a
JSON summary (element counts by type, sheets processed, skipped/again-noise
counts, per-sheet errors, and cross-sheet name collisions).

## Files

| File | Role |
| --- | --- |
| `extract_core.py` | **Source of truth** — the pure openpyxl extraction logic, unit-runnable locally (`python3 extract_core.py <file.xlsx> [SheetName]`). |
| `build_procedure.py` | Embeds `extract_core.py` in a dollar-quoted `CREATE PROCEDURE` body and appends the Snowflake I/O handler. |
| `extract_template_metadata.sql` | **Generated** deployable procedure. Do not hand-edit — edit `extract_core.py` and run `python3 sql/build_procedure.py`. |

## Why it was rewritten

The original procedure only saw two things: **Excel Tables** (and only their
header row) and **scalar named ranges**. Real templates put load-bearing data in
many other shapes, so on a typical multi-fund workbook it missed, for example,
the entire fund-data block (`Valuation Date` / `ISIN Code` / `Reporting Name`)
on every sheet where those were loose cells rather than an Excel Table — the
common case.

The rewrite scans **every visible worksheet** and recognises:

- **Excel Tables** — with data-body ref, row/column counts, per-column value
  kinds, multi-row headers, and (for a single-row multi-field table) a
  `WIDE_RECORD` decomposition into per-field scalars so it maps the same way as
  sheets that lay the same fields out as loose cells.
- **Defined names** — workbook-global and sheet-local; scalars, 1-D lists and
  2-D ranges. Broken (`#REF!`), built-in (`_xlnm.*`) and full-column names are
  skipped rather than crashing the run.
- **Key/value fact blocks** — horizontal (labels row over values row) and
  vertical (label column beside value column), plus inline `Label: value` cells.
- **Detected breakdown tables** that are *not* Excel Tables — via a
  connected-component scan, with spacer-column de-fragmentation (a table split
  by a blank column is stitched back together) and section-title peeling.
- **Footnotes / labeled long text**.

Standalone single cells (section titles, developer annotations, aggregate
formula cells) are treated as noise and skipped — but **counted**, never
silently dropped, so a regression that swallows real content is visible in the
return summary.

## TEMPLATE_METADATA schema

The schema is **self-healing**: the procedure `CREATE TABLE IF NOT EXISTS` and
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for every column on each run, so it
can be deployed over an older/naive table without a manual migration.

| Column | Meaning |
| --- | --- |
| `TEMPLATE_ID` | The template this row belongs to. |
| `ELEMENT_KEY` | Unique per row: `Sheet!Name#seq`. |
| `ELEMENT_TYPE` | `TABLE`, `DATA_TABLE`, `NAMED_RANGE`, `NAMED_TABLE`, `KEY_VALUE`, `LABELED_TEXT`, `FOOTNOTE`. |
| `ELEMENT_NAME` | Table/name identifier, or the field label. |
| `SHEET_NAME` | Worksheet. |
| `CELL_REF` | Write target: the value cell (scalars) or data-body top-left (tables). |
| `LABEL_REF` | The label cell, for key/value elements. |
| `TABLE_REF` / `HEADER_REF` / `DATA_REF` | Full range / header range / data-body range for tables. |
| `ORIENTATION` | `scalar` / `horizontal` / `vertical` / `row` / `column`. |
| `NUM_ROWS` / `NUM_COLS` | Data-body dimensions. |
| `COLUMNS_JSON` | Table header names (JSON array). |
| `COL_KINDS_JSON` | Per-column inferred value kinds (JSON array). |
| `VALUE_KIND` | Scalar value kind: `TEXT` / `NUMBER` / `INTEGER` / `PERCENT` / `CURRENCY` / `DATE` / `BOOLEAN` / `EMPTY` (number-format aware). |
| `RAW_VALUE` | Current cached value in the template (sample; capped at 2000 chars). |
| `FORMULA` | Underlying formula if the cell is computed (e.g. a cross-sheet reference). |
| `DETECTION_METHOD` | `EXCEL_TABLE` / `DEFINED_NAME` / `KEY_VALUE_SCAN` / `REGION_SCAN` / `WIDE_RECORD`. |
| `SEQ` | Emission order within a sheet. |
| `EXTRACTED_AT` | Extraction timestamp. |

Only `SHEET_NAME`, `ELEMENT_TYPE`, `ELEMENT_NAME`, `CELL_REF`, `TABLE_REF` and
`COLUMNS_JSON` are consumed by the plugin (matched by column name); the rest is
descriptive metadata it ignores. The extra columns are deliberately named to
avoid the plugin's role-matching traps (a name normalising to contain `column`
would hijack the "columns required" role, and one containing `type` would hijack
the "element type" role — hence `NUM_COLS`, `COL_KINDS_JSON`, `VALUE_KIND`).

## Known consideration: duplicate scalar names across sheets

The same field label (e.g. `Valuation Date`) legitimately appears on many
sheets. `TEMPLATE_METADATA` keeps every occurrence distinct via `SHEET_NAME` and
`ELEMENT_KEY`, but the plugin's payload currently keys by `ELEMENT_NAME` alone —
so cross-sheet duplicates would collapse there. The procedure surfaces every
such collision under `duplicate_scalar_names` in its return summary. The clean
fix lives in the plugin (key the payload by sheet + name); the extractor does
not sheet-prefix `ELEMENT_NAME`, because that would break the plugin's
name-equality matching against Sigma source columns.
