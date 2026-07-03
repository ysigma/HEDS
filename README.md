# Sigma data explorer plugin

A [Sigma Computing workbook plugin](https://help.sigmacomputing.com/docs/plugin-development-api)
that recreates a classic "data explorer" experience on top of any Sigma data
element. Attach a table and the plugin builds itself:

- **Left pane — "Set parameters".** One searchable multi-select dropdown per
  configured filter slot, labelled with the mapped column's name and populated
  with that column's distinct values. Selections are pushed into mapped
  workbook controls, so the rest of the workbook filters along with the plugin.
- **Right pane — "Choose columns".** An auto-generated column picker sourced
  live from the attached element: a "Column name contains" search box, a
  select-all checkbox, and a compact checkbox list of every column with a muted
  type badge. The selection is written to a workbook text control as JSON.
- **Footer bar.** Applied-filter chips, a live selected-column count, a
  "Clear all" link, and the primary **Run** button, which fires whichever
  workbook action sequence is attached to the plugin's action trigger.

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
| Filter 1–6 column (`filter{n}Column`) | column | A text, number, integer or boolean column from the data source you want a dropdown for. |
| Filter 1–6 control (`filter{n}Control`) | variable | The workbook control that dropdown should drive. Use a list control (text list, number list) for multi-select; scalar controls fall back to single-select. |
| Selected columns control (`selectedColumnsControl`) | variable | A workbook **text** control that receives the chosen columns as a JSON string. |
| On run (`runAction`) | action trigger | The workbook action sequence to fire when the user clicks Run. |
| In-plugin filtering mode (`inPluginFiltering`) | toggle | Off (default) = Mode A, control-wired. On = Mode B, self-contained filtering with a preview grid. |
| Max distinct values per dropdown (`maxDistinctValues`) | text | Cap on dropdown list length. Defaults to 1000; invalid input falls back to the default. |

A filter slot is **active only when both its column and its control are
mapped** (in Mode B, only the column is required). Incomplete slots are
ignored silently. Plugins cannot create workbook controls at runtime, which is
why each slot pairs a column with a pre-existing control.

> **Date filters:** date-range filtering stays with native Sigma controls in
> v1 — the slot columns are limited to text, number, integer and boolean
> types.

## The selected-columns contract

On every change to the column picker (and again immediately before the run
action fires), the plugin writes this exact JSON shape to the mapped text
control:

```json
{"columns":["Column Name 1","Column Name 2"]}
```

- Values are the columns' **display names**.
- Order is stable and matches the element's column order, not click order.
- Columns that have been removed from the source element are dropped
  automatically.

The selected column **ids** are also persisted into the plugin config
(`client.config.set`), so the selection survives reloads even if column names
or their order change.

> **If the columns aren't being saved:** map a workbook text control to the
> "Selected columns control" field in the editor panel. While it is unmapped
> the plugin shows an inline notice and skips the write; once mapped, the JSON
> is written on load and on every change.

### Consuming the output from an action sequence

A typical wiring: the "On run" action sequence reads the text control's value
(the JSON string above) and passes it onward — for example as a VARCHAR
argument to a warehouse stored procedure, which can parse the array and build
a dynamic projection. Any downstream step that can read a workbook control can
consume it.

The plugin cannot observe the action sequence's outcome. Clicking Run shows an
"Action sequence triggered" toast; completion or errors surface in the
workbook itself. If nothing is attached to the "On run" trigger, Run still
writes the selected columns to the control and shows a "No run action is
configured" toast instead.

## Mode A vs Mode B

| | Mode A — control-wired (default) | Mode B — in-plugin filtering |
| --- | --- | --- |
| Where filtering happens | In the warehouse: dropdowns write to workbook controls, controls filter the element. | In the plugin's memory, over the rows fetched so far. |
| Cascading dropdowns | Free — the filtered element streams back into the plugin, so other dropdowns narrow automatically. | None — dropdowns always show values from the loaded rows. |
| Affects other workbook elements | Yes, through the shared controls. | No — the underlying element is untouched. |
| Data volume | Whatever the element resolves to. | Bounded by the SDK's 25,000-value chunks; a "Load more rows" affordance fetches further chunks. |
| Extra UI | — | A compact preview grid of the selected columns (first 200 filtered rows, virtualised). |

In Mode A the plugin also *reads* each mapped control on load and reflects its
current value in the dropdown, so plugin state and workbook state stay in sync
in both directions, and clearing a dropdown clears the control (sets it to
null) rather than just clearing local state.

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
  App.tsx                   layout + Mode A/B switch
  config.ts                 editor panel declaration (single source of truth)
  hooks/useFilterSlots.ts   active slots, distinct values, control sync
  hooks/useColumnPicker.ts  column list, selection, persistence, JSON payload
  components/               FilterPane, ColumnPane, PreviewGrid (Mode B),
                            FooterBar, MultiSelectDropdown, VirtualList, Toast
  lib/                      pure logic: distinct values, payload, control
                            parsing, row filtering — unit-tested in lib/__tests__
```

All Sigma-host interaction stays behind the hooks so the pure logic in `lib/`
is testable without a workbook.

## License

[MIT](./LICENSE)
