# Sigma data explorer plugin

A [Sigma Computing workbook plugin](https://help.sigmacomputing.com/docs/plugin-development-api)
that recreates a classic "data explorer" experience on top of any Sigma data
element. Attach a table and the plugin builds itself:

- **Left pane — "Choose columns".** An auto-generated column picker of the
  columns the source exposes to the plugin: a "Column name contains" search
  box, a select-all checkbox, and a compact checkbox list with a muted type
  badge. Everything is selected by default; narrow it to shape the output.
- **Right pane — "Preview".** A compact, virtualised grid of the selected
  columns and the rows — a live view of the data that becomes the JSON output.
- **Footer bar.** A live selected-column and row count, a "Clear all" link, and
  the primary **Run** button, which fires whichever workbook action sequence is
  attached to the plugin's action trigger.

**Filtering is left to the workbook.** The plugin reads whatever the element is
already filtered to (by native Sigma controls, table filters, etc.), so the
rows it previews and exports reflect the workbook's current state. The selected
columns and their rows are written to a workbook text control as JSON for an
action sequence to hand onward.

The plugin is a fully static Vite + React + TypeScript app built on
[`@sigmacomputing/plugin`](https://github.com/sigmacomputing/plugin). It makes
no backend calls and stores nothing outside the workbook: all state that
matters is persisted through the plugin config, so it travels with the
workbook document.

## Local development

1. `npm install`
2. `npm run dev` — the dev server listens on **http://localhost:3000**, which
   is exactly where Sigma's built-in **Sigma Plugin Dev Playground** plugin
   points by default.
3. In a Sigma workbook (Edit mode), add a **Plugin** element under UI elements
   and pick *Sigma Plugin Dev Playground*. The editor panel then shows this
   plugin's configuration fields.

Other scripts: `npm run build` (typecheck + production build), `npm test`
(unit tests for the pure logic), `npm run lint`, `npm run preview`.

## Editor panel fields

| Field | Type | Map it to |
| --- | --- | --- |
| Data source (`source`) | element | The workbook table/element to explore. Everything else derives from it. |
| Columns (`columns`) | column (multiple) | The source columns to make available to the plugin — **select all** to expose the whole table. |
| Output control (`selectedColumnsControl`) | variable | A workbook **text** control that receives the selected columns and rows as a JSON string. |
| On run (`runAction`) | action trigger | The workbook action sequence to fire when the user clicks Run. |

The **Columns** field is required because **Sigma only streams the plugin data
for the columns declared to it** — a column the plugin can't see has no values
to preview or export. Mapping it once (select all) exposes the table; the
in-plugin picker then chooses which of those columns land in the output. There
are no per-filter fields: filtering is handled by the workbook's own controls.

## The output contract

On every change (and again immediately before the run action fires), the
plugin serializes the **filtered table** — the selected columns and their row
values — to the mapped text control:

```json
{
  "columns": ["Region", "Sales"],
  "rows": [
    { "Region": "East", "Sales": 10 },
    { "Region": "West", "Sales": 20 }
  ],
  "rowCount": 2,
  "truncated": false
}
```

- `columns` lists the selected columns' **display names**, in the element's
  column order (not click order).
- `rows` are objects keyed by those display names; missing values are `null`.
- Rows are whatever the workbook has the element filtered to — the plugin
  reads the already-filtered data.
- Rows are capped (default 1,000) to stay within a control's size limit.
  `rowCount` is the full row count and `truncated` is `true` when the cap
  dropped rows. (Row data is also bounded by the SDK's 25,000-value window.)
- Columns removed from the source (or from the Columns field) drop out
  automatically.

The selected column **ids** are also persisted into the plugin config
(`client.config.set`), so the selection survives reloads even if column names
or their order change.

> **If the table isn't being saved:** map a workbook text control to the
> "Output control" field in the editor panel. While it is unmapped the plugin
> shows an inline notice and skips the write; once mapped, the JSON is written
> on load and on every change.

### Consuming the output from an action sequence

A typical wiring: the "On run" action sequence reads the text control's value
(the JSON above) and passes it onward — for example as a VARCHAR argument to a
warehouse stored procedure that parses the table and populates a report
template. Any downstream step that can read a workbook control can consume it.

The plugin cannot observe the action sequence's outcome. Clicking Run shows an
"Action sequence triggered" toast; completion or errors surface in the
workbook itself. If nothing is attached to the "On run" trigger, Run still
writes the table to the control and shows a "No run action is configured"
toast instead.

## Filtering

Filtering is **the workbook's job**, not the plugin's. Add native Sigma
controls (list values, date ranges, etc.) or table filters to the source
element; the plugin reads the element's already-filtered data through the SDK
and previews/exports exactly those rows. This keeps the plugin to a single
responsibility — pick columns, preview, export — and gives you Sigma's full
filtering power (including cascading and warehouse pushdown) for free.

The plugin's data is bounded by the rows the SDK has fetched (up to 25,000
values per column); the preview offers **Load more rows** to fetch further
chunks, and the row-count indicator notes the chunking.

## Deploying

The repo ships a GitHub Pages workflow (`.github/workflows/deploy.yml`): on
every push to `main` it runs `npm ci`, builds with the repository name as the
asset base path (`VITE_BASE_PATH=/<repo-name>/`), uploads `dist/` with
`actions/upload-pages-artifact`, and publishes with `actions/deploy-pages`.
Enable it once with **Settings → Pages → Build and deployment → GitHub
Actions** (or `gh api repos/{owner}/{repo}/pages -X POST -f
build_type=workflow`).

The published site is fully static, served over HTTPS, and sends no
iframe-blocking headers — which is what Sigma's iframe embedding requires.

### Registering the plugin in Sigma

1. In Sigma, go to **Administration → Account → Plugins** (location can vary
   by tenant; sometimes under *Development*).
2. Click **Add**, give the plugin a name, and paste the production URL
   (`https://<owner>.github.io/<repo>/`).
3. In any workbook, add a Plugin element and select it.

## Project layout

```
src/
  main.tsx                  SigmaClientProvider wrapper
  App.tsx                   layout, output-control + run wiring
  config.ts                 editor panel declaration (single source of truth)
  hooks/useColumnPicker.ts  exposed columns, selection, persistence
  components/               ColumnPane, PreviewGrid, FooterBar, VirtualList,
                            Toast
  lib/                      pure logic: table payload, row helpers —
                            unit-tested in lib/__tests__
```

All Sigma-host interaction stays behind the hooks so the pure logic in `lib/`
is testable without a workbook.

## License

[MIT](./LICENSE)
