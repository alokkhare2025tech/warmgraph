# Screenshots

The main README expects six PNGs in this folder. Take them at a **1440 × 900** browser window
(or wider) with the app running against a seeded instance.

| File | Screen | What to have on it |
|---|---|---|
| `01-overview.png` | `#/` | Stats row, the sector bars, and the persona picker visible |
| `02-warm-intro.png` | `#/intro` | A persona selected and a firm chosen, so the ranked routes and the narrated hop list are showing. Expand "Draft the ask" on the warmest route. |
| `03-explorer.png` | `#/explore/<any investor id>` | 2-hop depth selected, so the force layout is dense and the legend is visible |
| `04-conflicts.png` | `#/conflicts` | Ideally with at least one red "Direct rivals" card in view |
| `05-cypher-drawer.png` | any screen | Click **Cypher** in the top bar — capture the drawer with the highlighted query and its bound parameters |
| `06-data-model.png` | `#/model` | The schema diagram plus the start of the node table |

## Taking them

```bash
npm run dev
# open http://localhost:5173
```

Windows: `Win + Shift + S` for a region capture, or `Win + Alt + PrtScn` for the active window.

## Screen recording

The brief asks for a short recording as well (2–3 minutes is plenty). A sequence that
demonstrates everything without rambling:

1. **Overview** — say what the product is in one sentence, pick a founder persona.
2. **Warm intro** — choose a firm, walk through the warmest route and read one hop's narrative
   aloud. Point out the warmth score and where it comes from.
3. Click **Cypher** in the top bar — show that the query on screen is the query that ran, with
   parameters bound separately.
4. **Conflicts** — the six-hop query, and why it is awkward in SQL.
5. **Graph explorer** — click a node to re-centre.
6. Close on the **Data model** page.

[Loom](https://www.loom.com) has a free tier that gives you a shareable link immediately.
