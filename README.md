# Crosswinds in Sapa — Branching Narrative Visual Novel

[![Deploy to GitHub Pages](https://github.com/SeaBoiii/visual_novel/actions/workflows/deploy.yml/badge.svg)](https://github.com/SeaBoiii/visual_novel/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> A browser-based, choice-driven visual novel where every decision shapes relationships and destinies.

## 📖 About

**Crosswinds in Sapa** is an interactive narrative experience that puts you in the shoes of a Singaporean engineer facing one of life's most profound decisions. Navigate through a complex web of relationships with five unique characters, where your choices influence three invisible meters—**Affection**, **Trust**, and **Tension**—leading to multiple branching paths and endings.

### The Story

On a restless night, a single choice can no longer be postponed. Five names press into a single decision:
- A **brilliant boss** who respects competence like truth
- A **preschool teacher** whose warmth feels like home  
- A **Kazakh traveller** met in Sapa who turns mist into permanence
- A **close friend** who knows your patterns and still chooses gentleness
- An **ex-nurse** you once loved, re-met by fate on a sacred journey in Mecca

Every moment shifts the invisible relationship meters, and the ending isn't decided by love alone, but by whether you become someone safe to choose.

## ✨ Key Features

### 🎮 Gameplay
- **Branching narrative** with multiple condition-based endings
- **Dynamic relationship system** tracking Affection, Trust, and Tension for each character
- **Save/Load system** with multiple save slots (stored in browser localStorage)
- **Story log** to review your journey
- **Back button** to reconsider recent choices
- **Per-scene choice hiding** on return visits (optional)

### 🛠️ Editor Features
- **Visual node graph** with pan & zoom for story flow visualization
- **Live preview mode** to test your story changes in real-time
- **Scene editor** with full control over dialogue, choices, and branching
- **Ending condition builder** with visual rule editor
- **Image management** with local uploads and URL fetching
- **JSON import/export** for version control and collaboration
- **Auto-save to disk** via local Python server

### 🚀 Deployment
- **GitHub Pages ready** with included workflow
- **Self-contained** - no build process required
- **Mobile responsive** design

## 🎯 Quick Start

### Prerequisites

- **Python 3.6+** (for local development server)
- A modern web browser (Chrome, Firefox, Safari, or Edge)
- Git (for cloning the repository)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SeaBoiii/visual_novel.git
   cd visual_novel
   ```

2. **Start the local server**
   ```bash
   python server.py
   ```
   
   The server will start on `http://localhost:8000`

3. **Open in your browser**
   - **Play the game**: [http://localhost:8000/index.html](http://localhost:8000/index.html)
   - **Edit the story**: [http://localhost:8000/editor.html](http://localhost:8000/editor.html)

> **Note**: The Python server is required for local development to handle CORS issues when loading JSON files and to enable image upload features in the editor.

## 📁 Project Structure

```
.
├─ assets/
│  ├─ css/              # Stylesheets for game and editor
│  └─ js/               # Game engine and editor logic
├─ data/
│  ├─ story.json        # Story content (scenes, characters, meters)
│  ├─ endings.json      # Endings + conditions
│  └─ story.js          # Fallback story data for static hosting
├─ images/              # Game images and backgrounds
├─ index.html           # Game player interface
├─ editor.html          # Story editor interface
├─ server.py            # Local development server
└─ .github/
   └─ workflows/
      └─ deploy.yml     # GitHub Pages deployment workflow
```

## 🎨 Editing Your Story

The **story source of truth** is `data/story.json`. You can modify it in two ways:

### 1. Using the Visual Editor (Recommended)

1. Open `http://localhost:8000/editor.html` in your browser
2. Use the **node graph** to visualize story flow and click nodes to edit them
3. In the **Scene Editor** panel:
   - Modify scene text, titles, and images
   - Add or remove choices
   - Set relationship meter effects for each choice
4. In the **Ending Editor** panel:
   - Create endings with custom conditions
   - Set priority and requirements
5. Click **"Apply To Preview"** to test changes immediately
6. Click **"Export JSON"** to download your story (the server auto-saves to disk)

### 2. Manual JSON Editing

Edit `data/story.json` directly in your text editor. The file structure includes:
- `characters`: Define character names and initial meter values
- `scenes`: Array of scene objects with dialogue, choices, and effects
- (Endings are stored separately in `data/endings.json`)

## 🎭 Story Configuration

### Character Meters

Each character has three relationship meters that range from 0-100:
- **Affection**: Romantic interest and emotional connection
- **Trust**: Reliability and faith in the relationship  
- **Tension**: Conflict and unresolved issues

### Scene Structure

Basic scene example:
```json
{
  "id": "scene_01",
  "label": "Chapter 1",
  "title": "A Sleepless Night",
  "text": "Your phone lies face-down on the nightstand...",
  "image": "images/night_room.jpg",
  "choices": [
    {
      "text": "Think about work",
      "effects": [
        { "character": "kira", "meter": "affection", "delta": 5 }
      ],
      "nextScene": "scene_02a"
    }
  ]
}
```

### Per-Scene Choice Hiding

Hide previously selected choices when returning to a scene:
```json
{
  "id": "scene_hub",
  "hideChosenChoicesOnReturn": true,
  "choices": [...]
}
```

### Ending Conditions

Define complex conditions that determine which ending a player sees:
```json
{
  "id": "ending_kira_best",
  "title": "A New Chapter",
  "text": "You made your choice...",
  "priority": 10,
  "conditions": [
    {
      "type": "min",
      "meter": "affection",
      "character": "kira",
      "value": 70
    },
    {
      "type": "max_le",
      "meter": "tension", 
      "character": "kira",
      "value": 30
    }
  ]
}
```

#### Supported Condition Types

| Type | Description |
|------|-------------|
| `min` | Character's meter must be ≥ value |
| `max_ge` | Character's meter must be ≤ value (highest of all) |
| `max_le` | Character's meter must be ≤ value |
| `diff_greater` | Difference between two characters' meters |
| `diff_abs_lte` | Absolute difference between meters |
| `top_is` | Specified character must have highest meter |
| `top_diff_gte` | Top character's lead must be ≥ value |
| `top_diff_lte` | Top character's lead must be ≤ value |
| `total_min` | Sum of all a character's meters ≥ value |
| `total_max` | Sum of all a character's meters ≤ value |

## 🖼️ Managing Images

### Adding Images

1. **Via Editor** (with `server.py` running):
   - Upload local files using the file input
   - Fetch images from URLs automatically
   - Images are saved to `images/` directory

2. **Manually**:
   - Place image files in the `images/` directory
   - Reference them in scenes: `"image": "images/your-file.jpg"`

### Supported Formats
- JPG/JPEG
- PNG
- GIF
- WebP

## 🌐 Deploying to GitHub Pages

This project is ready for one-click deployment to GitHub Pages:

### Setup Instructions

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Navigate to **Settings** → **Pages**
   - Under **Source**, select **GitHub Actions**

3. **Automatic Deployment**
   - The included workflow (`.github/workflows/deploy.yml`) will automatically deploy on every push to `main`
   - Your site will be live at: `https://[username].github.io/[repository-name]`

### Custom Domain (Optional)

To use a custom domain:
1. Add a `CNAME` file to the repository root
2. Configure DNS settings with your domain provider
3. Update GitHub Pages settings with your domain

## 💾 Game Progress & Saves

- **Save Slots**: Three save slots available in-game
- **Storage**: Saves are stored in browser `localStorage`
- **Portability**: Saves are browser and device-specific
- **Back Button**: Undo recent choices without losing progress

## 🔧 Troubleshooting

### Common Issues

**Problem**: Game shows "Failed to load story"
- **Solution**: Make sure you're running `python server.py` and accessing via `http://localhost:8000`

**Problem**: Images not displaying in editor
- **Solution**: Ensure `server.py` is running. Image upload requires the server to handle file operations.

**Problem**: Changes not appearing in game
- **Solution**: 
  1. Clear your browser cache
  2. Make sure you clicked "Apply To Preview" in the editor
  3. Check that `data/story.json` was updated

**Problem**: GitHub Pages deployment failed
- **Solution**: 
  1. Check the Actions tab for error details
  2. Ensure the workflow file has correct permissions
  3. Verify that GitHub Pages is enabled in repository settings

**Problem**: Save slots not working
- **Solution**: 
  1. Check if localStorage is enabled in your browser
  2. Private/Incognito mode may restrict localStorage
  3. Clear browser data if saves are corrupted

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Areas for Contribution
- New story content and branches
- Additional ending conditions
- UI/UX improvements
- Mobile optimization
- Accessibility enhancements
- Additional language support
- Bug fixes and performance improvements

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Credits

- **Story & Design**: Original narrative experience
- **Engine**: Custom JavaScript visual novel engine
- **Editor**: Interactive node-based story editor
- **Deployment**: GitHub Pages automation

## 📚 Additional Resources

### For Story Writers
- Study the existing `data/story.json` for examples
- Use the visual editor's node graph to plan branching paths
- Test different choice combinations to ensure all paths work

### For Developers  
- The game engine is in `assets/js/script.js`
- Editor logic is in `assets/js/editor.js`
- Styles can be customized in `assets/css/`

### For Players
- Experiment with different choices to discover all endings
- Use save slots to explore alternative paths
- Pay attention to the relationship meters for clues

---

## 🎮 Getting Started Checklist

- [ ] Clone the repository
- [ ] Install Python 3.6+
- [ ] Run `python server.py`
- [ ] Open `http://localhost:8000/index.html` to play
- [ ] Open `http://localhost:8000/editor.html` to create
- [ ] Make your story changes
- [ ] Test in the preview mode
- [ ] Deploy to GitHub Pages
- [ ] Share your creation!

---

**Ready to begin your journey?** Start the server and open the game to experience the story, or dive into the editor to craft your own narrative masterpiece.

For questions, issues, or feature requests, please [open an issue](https://github.com/SeaBoiii/visual_novel/issues) on GitHub.
