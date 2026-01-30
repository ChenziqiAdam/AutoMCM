# AutoMCM Frontend

Electron-based desktop application for the AutoMCM workspace.

## Quick Start

```bash
# Development
npm run electron-dev

# Production
npm run electron

# Build distributable
npm run build
```

## Features

- **Three-panel layout**: Editor | Console | Preview
- **AUTOMCM.md editor**: Edit workspace constitution
- **LaTeX preview**: Real-time equation rendering with KaTeX
- **Agent console**: Monitor agent activity and logs
- **Phase tracking**: Visual indicators for Planning/Modeling/Writing
- **Artifacts viewer**: Browse generated files
- **Dark theme**: VS Code-inspired UI

## Documentation

See [docs/FRONTEND.md](../docs/FRONTEND.md) for detailed guide.

## Structure

```
frontend/
├── main.js        # Electron main process
├── preload.js     # Secure IPC bridge
├── index.html     # UI layout
├── css/
│   └── styles.css # Styling
└── js/
    └── app.js     # Frontend logic
```

## Requirements

- Node.js 18+
- Electron 40+
- KaTeX for LaTeX rendering

## Keyboard Shortcuts

- `Cmd/Ctrl + S`: Save AUTOMCM.md
- `Cmd/Ctrl + R`: Refresh workspace list
- `Cmd/Ctrl + L`: Clear console

(Shortcuts to be implemented in next version)
