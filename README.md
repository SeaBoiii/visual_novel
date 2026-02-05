# Crosswinds in Sapa — Branching Narrative Visual Novel

A browser-based, choice-driven visual novel where every decision shifts **Affection**, **Trust**, and **Tension** across multiple routes and endings. Includes a full in-browser story editor with a node graph, image uploads, and GitHub Pages deployment.

## Features
- Branching narrative with condition-based endings
- Three relationship meters (Affection, Trust, Tension)
- Per-scene choice-hiding on return (optional)
- Visual node graph editor with pan & zoom
- Scene and ending editors (conditions are editable in the UI)
- Local image uploads and URL fetch (via `server.py`)
- Save slots + Back button during play
- GitHub Pages deployment workflow

## Project Structure
```
.
├─ assets/
│  ├─ css/
│  └─ js/
├─ data/
│  ├─ story.json   # Story content (scenes, characters, meters)
│  ├─ endings.json # Endings + conditions
│  └─ story.js     # Fallback story data
├─ images/
├─ index.html      # Game
├─ editor.html     # Story editor
├─ server.py       # Local upload + story services
└─ .github/workflows/deploy.yml
```

## Run Locally
The game reads from `data/story.json` + `data/endings.json`. Use the local server so the JSON can be loaded by the browser.

```bash
python server.py
```

Open:
- Game: `http://localhost:8000/index.html`
- Editor: `http://localhost:8000/editor.html`

## Editing the Story
The **story source of truth** is `data/story.json`.

You can edit it in two ways:
1. **Editor UI** (`editor.html`)
2. Manually editing `data/story.json`

### Per‑scene choice hiding
Use this per scene:
```json
"hideChosenChoicesOnReturn": true
```

### Example ending condition
```json
{
  "type": "min",
  "meter": "affection",
  "character": "kira",
  "value": 70
}
```

Supported condition types:
- `min`, `max_ge`, `max_le`
- `diff_greater`, `diff_abs_lte`
- `top_is`, `top_diff_gte`, `top_diff_lte`
- `total_min`, `total_max`

## Images
- Place images in `images/`
- In scenes, use `"image": "images/your-file.jpg"`

The editor can upload images locally and by URL when `server.py` is running.

## GitHub Pages Deployment
A GitHub Actions workflow is included:
`.github/workflows/deploy.yml`

To deploy:
1. Push to `main`
2. In GitHub → Settings → Pages → **Source: GitHub Actions**

## Notes
- The game **always reads from `data/story.json`**. If that file can’t be fetched, it will display a load error.
- Save slots are stored in **localStorage** (per browser).

---

If you want help extending the story editor or adding new gameplay systems, open an issue or reach out.
