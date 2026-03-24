<p align="center">
  <img src="assets/images/logo.png" alt="iChan logo" width="120">
</p>

<h1 align="center">iChan</h1>

<p align="center">
  A 4chan reader that doesn't look like 2005.
</p>

<p align="center">
  <a href="https://user7210unix.github.io/ichan/">Live Site</a> &nbsp;·&nbsp;
  <a href="#features">Features</a> &nbsp;·&nbsp;
  <a href="#how-it-works">How it works</a> &nbsp;·&nbsp;
  <a href="#settings">Settings</a>
</p>

---

## What is it

iChan is a fully client-side 4chan reader built as a single HTML file. The UI takes heavy inspiration from iOS — SF Pro fonts, iMessage-style post bubbles, Apple's color tokens, the works. No account, no install, no backend. Open the page and start reading.

**[→ Open iChan](https://user7210unix.github.io/ichan/)**

---

## Features

**Browsing**
- Searchable grid of every public 4chan board
- Favorite any board — pinned to the top of the grid and their own sidebar tab
- Full browsing history with per-entry deletion

**Threads**
- Filter thread list by keyword
- Sort by bump order, reply count, image count, or most recent activity
- Filter by media type (all / has image / has video)
- Pin threads to the top of the list
- Tag threads with custom labels you define in settings
- Content filters — hide posts by name, tripcode, subject, or comment; supports plain text or regex

**Reading**
- Posts rendered as iMessage-style chat bubbles — OP gets a distinct style from replies
- Greentext rendered inline with color (and optional italic)
- `>>quote` links show a hover popup of the referenced post without losing scroll position
- Last two replies previewed directly on thread cards
- Auto-refresh every 30 seconds on the active board or thread

**Images**
- Lazy-loaded thumbnails — uses `IntersectionObserver` per scroll container, not the viewport
- Click any image to open a fullscreen lightbox with a download button
- Hover over a thumbnail to preview the full image in a floating panel

**UI**
- Light and dark mode
- Adjustable font size (12–20px)
- High contrast text option
- Collapsible sidebar on desktop, swipe-to-open on mobile
- All settings persist in `localStorage`

---

## How it works

4chan's API doesn't set the CORS headers needed for direct browser requests from other origins. iChan routes everything through the [codetabs proxy](https://api.codetabs.com/) — a free, no-account public CORS proxy.

On first visit you'll see a prompt to open the proxy URL. This just warms up the session so your browser accepts responses from it. After clicking through, the gate won't appear again.

### API endpoints used

| Endpoint | Purpose |
|---|---|
| `a.4cdn.org/boards.json` | Full board listing |
| `a.4cdn.org/{board}/catalog.json` | Thread catalog for a board |
| `a.4cdn.org/{board}/thread/{no}.json` | All posts in a thread |
| `i.4cdn.org/{board}/{tim}s.jpg` | Post thumbnails |
| `i.4cdn.org/{board}/{tim}{ext}` | Full-size images |

### Lazy loading

Rather than observing images against the viewport, each scrollable container (`#th-list`, `#chat-scroll`) is passed as the `root` to its own `IntersectionObserver`. This is what makes lazy loading actually fire correctly inside `overflow: hidden` parents — a subtlety that's easy to get wrong.

---

## Settings

Accessible from the gear icon in the sidebar or the sliders icon in the top bar.

| Setting | Description |
|---|---|
| Dark mode | Switches the full CSS variable set to dark values |
| Font size | Scales the base font from 12 to 20px |
| High contrast text | Increases secondary text opacity for easier reading |
| Greentext italic | Renders `>lines` in italic as well as green |
| Image hover zoom | Enables the floating image preview on thumbnail hover |
| Auto-refresh | Polls the active board or thread every 30 seconds |
| Reply previews | Shows last two replies on thread cards |
| Thread tags | Define custom labels to assign to threads |
| Content filters | Hide posts by name / tripcode / subject / comment — plain text or regex |
| Favourite boards | Managed here or by starring boards in the sidebar |

---

## File structure

The entire app is `index.html`. Internally it's organized into clearly commented sections:

```
index.html
├── <style>        Design tokens, layout, component styles
├── HTML           Sidebar, main view, lightbox, settings panel
└── <script>
    ├── Config         API + proxy URLs
    ├── State          C (persisted config) · S (runtime state)
    ├── Lazy loading   IntersectionObserver per scroll root
    ├── Persistence    localStorage helpers
    ├── Routing        Page transitions, breadcrumb
    ├── Boards page    Grid rendering, search
    ├── Sidebar        Boards / favs / history tabs
    ├── Threads        Catalog fetch, filter, sort, cards
    ├── Chat           Thread fetch, bubble rendering, quote wiring
    ├── Formatting     Greentext parser, HTML stripping, quote links
    ├── Filters        Pattern/regex matching
    ├── Lightbox       Fullscreen image viewer
    ├── Hover zoom     Floating image preview
    ├── Reply popup    Hoverable quote preview
    ├── Auto-refresh   setInterval wrapper
    └── Init           Event wiring on DOMContentLoaded
```

---

## Limitations

- **Read-only** — the public 4chan API doesn't expose posting endpoints.
- **CORS proxy dependency** — if codetabs is down, data won't load. You can swap the `PROXY` constant at the top of the script for any compatible CORS proxy.
- **No video playback** — WebM/MP4 attachments show a thumbnail; clicking opens the file URL in a new tab rather than playing inline.
- **localStorage only** — settings and history don't sync across devices or browsers.

---

## License

MIT
