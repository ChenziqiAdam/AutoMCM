# Frontend Features

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  AutoMCM  [Workspace Selector ▼] [🔄]     [Planning][Modeling][Writing]  │
├───────────────┬──────────────────┬──────────────────────────────┤
│               │                  │                              │
│  AUTOMCM.md   │  Agent Console   │  Preview                     │
│  Editor       │                  │  ┌───────────────────────┐   │
│               │  [11:20:15] INFO │  │ Rendered │ Artifacts │   │
│  # Problem:   │  [11:20:16] ✓    │  └───────────────────────┘   │
│  Ocean Plastic│  [11:20:17] ⚠    │                              │
│               │  [11:20:18] ✗    │  # Problem                   │
│  ## Variables │                  │  Ocean plastic...            │
│  | Symbol |...│  > _             │                              │
│               │                  │  ## Variables                │
│  [Save]       │  [🗑] [Send]     │  $\rho_w$ = density          │
│               │                  │                              │
└───────────────┴──────────────────┴──────────────────────────────┘
│  Workspace: ocean_plastics     │  Progress: Building model... │
└─────────────────────────────────────────────────────────────────┘
```

## Panel Descriptions

### Left Panel: AUTOMCM.md Editor
- **Purpose**: Edit workspace constitution
- **Features**:
  - Multi-line text editor
  - Auto-save capability
  - Syntax: Markdown
  - Font: Monospace
- **Actions**:
  - [Save] button: Persist changes to disk

### Middle Panel: Agent Console
- **Purpose**: Monitor agent activity
- **Features**:
  - Timestamped logs
  - Color-coded types:
    - INFO (blue): General information
    - SUCCESS (green): Completed tasks
    - WARNING (yellow): Warnings
    - ERROR (red): Failures
  - Auto-scroll to latest
  - Command input
- **Actions**:
  - [🗑] Clear console
  - [Send] Execute command

### Right Panel: Preview
- **Purpose**: View workspace content
- **Tabs**:
  1. **Rendered**: Markdown preview with LaTeX
     - Headers, paragraphs, lists
     - Inline math: `$E=mc^2$` → $E=mc^2$
     - Display math: `$$\int_0^1 f(x)dx$$`
     - Tables, code blocks

  2. **Artifacts**: Generated files
     - Python scripts (.py)
     - LaTeX documents (.tex)
     - PDFs (.pdf)
     - Images (.png, .jpg)
     - Data files (.csv, .json)

## Header Components

### Workspace Selector
- Dropdown menu with all workspaces
- Auto-populated from `workspace/` directory
- [🔄] Refresh button to reload list

### Phase Indicators
Visual pills showing current workflow stage:
- **Planning** (yellow): Research and design
- **Modeling** (green): Implementation and testing
- **Writing** (blue): Paper generation

Click to highlight active phase.

## Status Bar

Bottom bar showing:
- **Left**: Current workspace name
- **Right**: Progress indicator (e.g., "Building model 3/7")

## Color Scheme

### Backgrounds
- Primary: `#1e1e1e` (darkest)
- Secondary: `#252526` (panels)
- Tertiary: `#2d2d30` (headers)

### Text
- Primary: `#cccccc` (main text)
- Secondary: `#858585` (muted text)

### Accents
- Blue: `#007acc` (primary actions)
- Green: `#4ec9b0` (success, modeling)
- Yellow: `#dcdcaa` (warning, planning)
- Red: `#f48771` (errors)

## Keyboard Shortcuts (Planned)

- `Cmd/Ctrl + S`: Save AUTOMCM.md
- `Cmd/Ctrl + R`: Refresh workspace list
- `Cmd/Ctrl + L`: Clear console
- `Cmd/Ctrl + K`: Focus command input
- `Cmd/Ctrl + 1/2/3`: Switch to panel 1/2/3
- `Cmd/Ctrl + T`: Switch preview tab

## Log Types

### INFO
```
[11:20:15] INFO AutoMCM Frontend initialized
```
General information, neutral color.

### SUCCESS
```
[11:20:16] SUCCESS Loaded workspace: ocean_plastics
```
Successful operations, green highlight.

### WARNING
```
[11:20:17] WARNING No API key configured
```
Non-critical issues, yellow highlight.

### ERROR
```
[11:20:18] ERROR Failed to compile LaTeX
```
Critical errors, red highlight.

## Artifact Types

File extensions and their display types:

| Extension | Type | Icon/Color |
|-----------|------|-----------|
| .py | Python Script | 🐍 |
| .tex | LaTeX Document | 📄 |
| .pdf | PDF Document | 📕 |
| .png, .jpg | Image | 🖼️ |
| .csv | Data File | 📊 |
| .json | JSON Data | { } |
| .md | Markdown | 📝 |

## Preview Rendering

### Markdown Elements
- `# Heading 1` → Large blue heading
- `## Heading 2` → Medium green heading
- `### Heading 3` → Small yellow heading
- `**bold**` → **bold text**
- `*italic*` → *italic text*
- `` `code` `` → `monospace`
- `- item` → • Bullet list

### LaTeX Math
- Inline: `$x^2 + y^2 = r^2$`
- Display: `$$\frac{-b \pm \sqrt{b^2-4ac}}{2a}$$`
- Rendered with KaTeX

### Tables
```markdown
| Symbol | Definition | Units |
|--------|-----------|-------|
| ρ_w | Water density | kg/m³ |
```

Rendered as styled HTML table.

## Future Enhancements

### Editor
- [ ] Syntax highlighting (CodeMirror)
- [ ] Line numbers
- [ ] Search/replace
- [ ] Undo/redo
- [ ] Auto-complete for variables

### Console
- [ ] Filtering by log type
- [ ] Export logs to file
- [ ] Clickable file paths
- [ ] Command history (↑/↓ arrows)

### Preview
- [ ] PDF viewer for artifacts
- [ ] Image viewer
- [ ] Code syntax highlighting
- [ ] Export to HTML
- [ ] Print preview

### General
- [ ] Draggable panel splitters
- [ ] Full-screen mode
- [ ] Settings panel
- [ ] Theme customization
- [ ] Multi-workspace tabs
