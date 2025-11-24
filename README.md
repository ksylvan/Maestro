# Maestro

> A unified, highly-responsive developer IDE for managing multiple AI coding assistants simultaneously.

Maestro is a desktop application built with Electron that allows you to run and manage multiple AI coding tools (Claude Code, Aider, OpenCode, etc.) in parallel with a Linear/Superhuman-level responsive interface.

## Features

- 🚀 **Multi-Instance Management** - Run multiple AI assistants and terminal sessions simultaneously
- 🎨 **Beautiful UI** - Obsidian-inspired themes with keyboard-first navigation
- 🔄 **Dual-Mode Input** - Switch between terminal and AI interaction modes seamlessly
- 🌐 **Remote Access** - Built-in web server with optional ngrok/Cloudflare tunneling
- 🎯 **Git Integration** - Automatic git status, diff tracking, and workspace detection
- ⚡ **Keyboard Shortcuts** - Full keyboard control with customizable shortcuts
- 📝 **Session Management** - Group, rename, and organize your sessions
- 🎭 **Multiple Themes** - 8 themes including Dracula, Monokai, Nord, Tokyo Night, GitHub Light, Solarized, One Light, and Gruvbox
- 📄 **File Explorer** - Browse project files with syntax highlighting and markdown preview
- ✏️ **Scratchpad** - Built-in markdown editor with live preview

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Git (optional, for git-aware features)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd maestro

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Package for distribution
npm run package
```

### Platform-Specific Builds

```bash
# macOS only
npm run package:mac

# Windows only
npm run package:win

# Linux only
npm run package:linux
```

## Development

### Project Structure

```
maestro/
├── src/
│   ├── main/              # Electron main process (Node.js backend)
│   │   ├── utils/         # Shared utilities
│   │   └── ...            # Process management, IPC, web server
│   └── renderer/          # React frontend (UI)
│       ├── components/    # React components
│       ├── types/         # TypeScript definitions
│       ├── utils/         # Frontend utilities
│       └── constants/     # App constants
├── build/                 # Application icons
├── .github/workflows/     # CI/CD automation
└── dist/                  # Build output (generated)
```

### Tech Stack

**Backend (Electron Main)**
- Electron 28+
- TypeScript
- node-pty (terminal emulation)
- Fastify (web server)
- electron-store (settings persistence)

**Frontend (Renderer)**
- React 18
- TypeScript
- Tailwind CSS
- Vite
- Lucide React (icons)
- marked (Markdown rendering)
- react-syntax-highlighter (code highlighting)
- emoji-mart (emoji picker)

### Development Scripts

```bash
# Start dev server with hot reload
npm run dev

# Build main process only
npm run build:main

# Build renderer only
npm run build:renderer

# Full production build
npm run build

# Start built application
npm start
```

## Building for Release

### 1. Prepare Icons

Place your application icons in the `build/` directory:
- `icon.icns` - macOS (512x512 or 1024x1024)
- `icon.ico` - Windows (256x256)
- `icon.png` - Linux (512x512)

### 2. Update Version

Update version in `package.json`:
```json
{
  "version": "0.1.0"
}
```

### 3. Build Distributables

```bash
# Build for all platforms
npm run package

# Platform-specific
npm run package:mac    # Creates .dmg and .zip
npm run package:win    # Creates .exe installer
npm run package:linux  # Creates .AppImage, .deb, .rpm
```

Output will be in the `release/` directory.

## GitHub Actions Workflow

The project includes automated builds via GitHub Actions:

1. **Create a release tag:**
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

2. **GitHub Actions will automatically:**
   - Build for macOS, Windows, and Linux
   - Create release artifacts
   - Publish a GitHub Release with downloads

## Configuration

Settings are stored in:
- **macOS**: `~/Library/Application Support/maestro/`
- **Windows**: `%APPDATA%/maestro/`
- **Linux**: `~/.config/maestro/`

### Configuration Files

- `maestro-settings.json` - User preferences (theme, shortcuts, LLM settings, UI preferences)

## Architecture

### Process Management

Maestro uses a dual-process model:

1. **PTY Processes** - For terminal sessions (full shell emulation)
2. **Child Processes** - For AI tools (Claude Code, Aider, etc.)

All processes are managed through IPC (Inter-Process Communication) with secure context isolation.

### Security

- ✅ Context isolation enabled
- ✅ No node integration in renderer
- ✅ Secure IPC via preload script
- ✅ No shell injection (uses `execFile` instead of `exec`)
- ✅ Input sanitization for all user inputs

## Keyboard Shortcuts

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Quick Actions | `⌘K` | `Ctrl+K` |
| Toggle Sidebar | `⌘B` | `Ctrl+B` |
| Toggle Right Panel | `⌘\` | `Ctrl+\` |
| New Agent | `⌘N` | `Ctrl+N` |
| Kill Agent | `⌘⇧⌫` | `Ctrl+Shift+Backspace` |
| Previous Agent | `⌘⇧{` | `Ctrl+Shift+{` |
| Next Agent | `⌘⇧}` | `Ctrl+Shift+}` |
| Switch AI/Shell Mode | `⌘J` | `Ctrl+J` |
| Show Shortcuts | `⌘/` | `Ctrl+/` |
| Open Settings | `⌘,` | `Ctrl+,` |
| Go to Files Tab | `⌘⇧F` | `Ctrl+Shift+F` |
| Go to History Tab | `⌘⇧H` | `Ctrl+Shift+H` |
| Go to Scratchpad | `⌘⇧S` | `Ctrl+Shift+S` |
| Toggle Markdown Edit/Preview | `⌘E` | `Ctrl+E` |

*All shortcuts are customizable in Settings*

## Remote Access

Maestro includes a built-in web server for remote access:

1. **Local Access**: `http://localhost:8000`
2. **LAN Access**: `http://[your-ip]:8000`
3. **Public Access**: Enable ngrok or Cloudflare tunnel in Settings

### Enabling Public Tunnels

1. Get an API token from [ngrok.com](https://ngrok.com) or Cloudflare
2. Open Settings → Network
3. Select your tunnel provider and enter your API key
4. Start the tunnel from the session interface

The web server provides REST API endpoints and WebSocket support for real-time session updates.
