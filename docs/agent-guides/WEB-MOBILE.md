<!-- Verified 2026-04-10 against origin/rc (06e5a2eb3) -->

# Web & Mobile Interface

Architecture, components, hooks, and patterns for the Maestro web/mobile remote control interface.

---

## Overview

The web interface is a **separate React application** from the desktop renderer. It provides remote control of Maestro sessions from mobile/tablet devices over the local network. Communication with the Electron main process happens via WebSocket and REST API, not Electron IPC.

```text
Desktop App (Electron)
├── Main Process
│   └── Web Server (Fastify + @fastify/websocket)
│       ├── REST API: /$TOKEN/api/*
│       └── WebSocket: /$TOKEN/ws
└── Web Client (separate React app)
    └── Connects over HTTP/WS to main process
```

The server stack is Fastify with plugins: `@fastify/cors`, `@fastify/websocket`, `@fastify/rate-limit`, `@fastify/static`. See `src/main/web-server/WebServer.ts`.

---

## Architecture

### Directory Structure

```text
src/web/
├── App.tsx                   # Root app component (contexts, routing)
├── main.tsx                  # Entry point (createRoot)
├── index.ts                  # Module exports
├── index.css                 # Global styles
├── index.html                # HTML template
├── components/               # Shared web components
│   ├── Badge.tsx
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── PullToRefresh.tsx
│   ├── ThemeProvider.tsx
│   └── index.ts
├── hooks/                    # Web-specific hooks
│   ├── useWebSocket.ts       # Core WS connection
│   ├── useSessions.ts        # Session state management
│   ├── useNotifications.ts   # Push notifications
│   ├── useOfflineQueue.ts    # Offline command queueing
│   ├── useUnreadBadge.ts     # Tab badge counter
│   ├── useCommandHistory.ts  # Command recall
│   ├── useSwipeGestures.ts   # Touch gestures
│   ├── useSwipeUp.ts         # Swipe-up for history
│   ├── usePullToRefresh.ts   # Pull-to-refresh
│   ├── useLongPress.ts       # Long-press detection
│   ├── useLongPressMenu.ts   # Long-press context menu
│   ├── useVoiceInput.ts      # Voice-to-text
│   ├── useKeyboardVisibility.ts  # Virtual keyboard state
│   ├── useDeviceColorScheme.ts   # System dark/light mode
│   ├── useSlashCommandAutocomplete.ts
│   ├── useMobileKeyboardHandler.ts
│   ├── useMobileViewState.ts
│   ├── useMobileSessionManagement.ts
│   ├── useMobileAutoReconnect.ts
│   └── index.ts
├── utils/                    # Web-specific utilities
│   ├── config.ts             # Server config from window.__MAESTRO_CONFIG__
│   ├── cssCustomProperties.ts
│   ├── logger.ts             # Web-specific logger
│   ├── serviceWorker.ts      # PWA offline support
│   └── viewState.ts          # View state persistence (localStorage)
├── mobile/                   # Mobile-optimized React app (~39 components)
│   ├── App.tsx               # Mobile app root (defines MobileHeader internally)
│   ├── index.tsx             # Mobile entry point
│   ├── constants.ts          # Haptic patterns, breakpoints
│   │
│   ├── AllSessionsView.tsx        # Dashboard session grid
│   ├── AutoRunDocumentCard.tsx    # Auto Run doc card
│   ├── AutoRunDocumentViewer.tsx  # Full Auto Run doc viewer
│   ├── AutoRunIndicator.tsx
│   ├── AutoRunPanel.tsx
│   ├── AutoRunSetupSheet.tsx
│   ├── AchievementsPanel.tsx
│   ├── AgentCreationSheet.tsx
│   ├── CommandHistoryDrawer.tsx
│   ├── CommandInputBar.tsx
│   ├── CommandInputButtons.tsx
│   ├── ConnectionStatusIndicator.tsx
│   ├── ContextManagementSheet.tsx
│   ├── CuePanel.tsx
│   ├── GitDiffViewer.tsx
│   ├── GitStatusPanel.tsx
│   ├── GroupChatPanel.tsx
│   ├── GroupChatSetupSheet.tsx
│   ├── LeftPanel.tsx              # Mobile left drawer
│   ├── MessageHistory.tsx
│   ├── MobileHistoryPanel.tsx
│   ├── MobileMarkdownRenderer.tsx
│   ├── NotificationSettingsSheet.tsx
│   ├── OfflineQueueBanner.tsx
│   ├── QuickActionsMenu.tsx
│   ├── RecentCommandChips.tsx
│   ├── ResponseViewer.tsx
│   ├── RightDrawer.tsx            # Mobile right drawer
│   ├── RightPanel.tsx
│   ├── SessionPillBar.tsx
│   ├── SessionStatusBanner.tsx
│   ├── SettingsPanel.tsx
│   ├── SlashCommandAutocomplete.tsx
│   ├── TabBar.tsx
│   ├── TabSearchModal.tsx
│   ├── UsageDashboardPanel.tsx
│   └── WebTerminal.tsx            # xterm-based mobile terminal
└── public/                   # Static assets
```

### Key Differences from Desktop Renderer

| Aspect          | Desktop                               | Web                        |
| --------------- | ------------------------------------- | -------------------------- |
| IPC             | `window.maestro.*` (Electron preload) | WebSocket + REST API       |
| State           | Zustand stores                        | React hooks + WS events    |
| Navigation      | Keyboard-first                        | Touch-first                |
| Process control | Direct PTY spawn                      | Commands sent over WS      |
| Theme source    | Settings store                        | Synced from desktop via WS |
| File system     | Direct IPC access                     | No direct FS access        |

---

## Configuration

### Server-Injected Config

The Electron main process injects configuration into `window.__MAESTRO_CONFIG__`:

```typescript
interface MaestroConfig {
	securityToken: string; // UUID - required in all API/WS URLs
	sessionId: string | null; // Viewing specific session or null for dashboard
	tabId: string | null; // Specific tab within session
	apiBase: string; // e.g., "/$TOKEN/api"
	wsUrl: string; // e.g., "/$TOKEN/ws"
}
```

Access via `getMaestroConfig()` from `src/web/utils/config.ts`.

### URL Structure

```text
http://host:port/$SECURITY_TOKEN/                    # Dashboard
http://host:port/$SECURITY_TOKEN/session/$SESSION_ID  # Session view
http://host:port/$SECURITY_TOKEN/session/$SESSION_ID?tabId=$TAB_ID  # Tab view
```

The security token is a UUID that must be present in all API and WebSocket URLs.

---

## WebSocket Communication

### Connection Hook (`useWebSocket`)

File: `src/web/hooks/useWebSocket.ts`

Manages WebSocket lifecycle:

```typescript
type WebSocketState =
	| 'disconnected'
	| 'connecting'
	| 'connected'
	| 'authenticating'
	| 'authenticated';
```

The hook provides connection state, message sending, and event handlers. The primary auth path is the URL token (the `$SECURITY_TOKEN` segment), but the hook also exposes an explicit runtime handshake: `UseWebSocketReturn` includes `authenticate(token: string): void` and an `isAuthenticated: boolean` flag for clients that need to confirm auth state or re-authenticate over an existing connection. Typical usage: connect via URL token and rely on `isAuthenticated` to gate UI.

### Session Data Model

The WebSocket transmits `SessionData` objects:

```typescript
interface SessionData {
	id: string;
	name: string;
	toolType: string;
	state: string; // 'idle' | 'busy' | 'error' | 'connecting'
	inputMode: string; // 'ai' | 'terminal'
	cwd: string;
	groupId?: string | null;
	groupName?: string | null;
	groupEmoji?: string | null;
	usageStats?: UsageStats | null;
	lastResponse?: LastResponsePreview | null;
	agentSessionId?: string | null;
	aiTabs?: AITabData[]; // Multi-tab support
	activeTabId?: string | null;
}
```

### AI Tab Data

Each session can have multiple AI tabs. The WebSocket sends `AITabData`:

```typescript
interface AITabData {
	id: string;
	agentSessionId: string | null;
	name: string | null;
	starred: boolean;
	inputValue: string;
	usageStats?: UsageStats | null;
	createdAt: number;
	state: 'idle' | 'busy';
	thinkingStartTime?: number | null;
}
```

### Last Response Preview

For mobile display, responses are truncated server-side:

```typescript
interface LastResponsePreview {
	text: string; // First 3 lines or ~500 chars
	timestamp: number;
	source: 'stdout' | 'stderr' | 'system';
	fullLength: number; // Original length
}
```

---

## Session Management (`useSessions`)

File: `src/web/hooks/useSessions.ts`

Builds on `useWebSocket` to provide high-level session management:

```typescript
interface Session extends SessionData {
	isSending?: boolean;
	lastError?: string;
}

interface UseSessionsReturn {
	sessions: Session[];
	activeSession: Session | null;
	connectionState: WebSocketState;
	sendCommand: (sessionId: string, command: string) => Promise<boolean>;
	sendToActive: (command: string) => Promise<boolean>;
	interrupt: (sessionId: string) => Promise<boolean>;
	interruptActive: () => Promise<boolean>;
	switchMode: (sessionId: string, mode: InputMode) => Promise<boolean>;
	// ... tab ops (selectTab, newTab, closeTab, ...) and more
}
```

### Group Organization

Sessions are grouped into `GroupInfo` objects:

```typescript
interface GroupInfo {
	id: string | null; // null = ungrouped
	name: string;
	emoji: string | null;
	sessions: Session[];
}
```

---

## Mobile App Component Tree

```text
AppRoot (App.tsx)
├── ThemeProvider
│   └── MaestroModeContext.Provider
│       └── OfflineContext.Provider
│           └── MobileApp (mobile/App.tsx)
│               ├── MobileHeader
│               ├── OfflineQueueBanner
│               ├── SessionPillBar
│               ├── TabBar
│               ├── AutoRunIndicator
│               ├── CommandInputBar
│               │   ├── SlashCommandAutocomplete
│               │   └── CommandInputButtons
│               ├── ResponseViewer
│               ├── MessageHistory
│               ├── AllSessionsView
│               ├── MobileHistoryPanel
│               └── TabSearchModal
```

---

## Contexts

### OfflineContext

Tracks whether the device is offline:

```typescript
const { isOffline } = useOfflineStatus();
```

### MaestroModeContext

Manages dashboard vs. session view navigation:

```typescript
const {
	isDashboard,
	isSession,
	sessionId,
	tabId,
	securityToken,
	goToDashboard,
	goToSession,
	updateUrl,
} = useMaestroMode();
```

### DesktopTheme

Theme synced from the desktop app via WebSocket:

```typescript
const theme = useDesktopTheme();
```

---

## Mobile-Specific Hooks

### `useOfflineQueue`

Queues commands typed while offline and sends them when reconnected:

```typescript
interface QueuedCommand {
	id: string;
	command: string;
	sessionId: string;
	timestamp: number;
	inputMode: 'ai' | 'terminal';
	attempts: number;
	lastError?: string;
}
```

Features:

- Persists to `localStorage` (survives page reloads)
- Max queue size: 50 commands
- Automatic retry on reconnection with 100ms delay between sends
- Manual retry and clearing

### `useNotifications`

Browser push notification management:

```typescript
const {
	permission, // 'default' | 'granted' | 'denied'
	isSupported,
	hasPrompted,
	requestPermission,
} = useNotifications({
	autoRequest: true,
	requestDelay: 2000,
	onGranted: () => console.log('Notifications enabled'),
});
```

### `useMobileViewState`

Persists view state to `localStorage`:

- Which overlays are open (all sessions, history panel, tab search)
- History filter and search state
- Active session and tab selection
- Screen size tracking (phone vs tablet breakpoint at 700px height)

### `useMobileKeyboardHandler`

Adapts keyboard shortcuts for the mobile interface.

### `useMobileAutoReconnect`

Automatic WebSocket reconnection with exponential backoff.

### `useMobileSessionManagement`

Session selection, switching, and tab management for mobile.

### Touch Gesture Hooks

- `useSwipeGestures` - Horizontal swipe for session switching
- `useSwipeUp` - Swipe up to reveal history
- `usePullToRefresh` - Pull-to-refresh for session data
- `useLongPress` / `useLongPressMenu` - Long-press for context menus

### `useVoiceInput`

Voice-to-text input using the Web Speech API.

### `useKeyboardVisibility`

Tracks virtual keyboard state on mobile devices to adjust layout.

### `useUnreadBadge`

Manages browser tab badge for unread session responses.

---

## Shared Web Components

Located in `src/web/components/`:

| Component       | Purpose                                    |
| --------------- | ------------------------------------------ |
| `ThemeProvider` | Provides theme context synced from desktop |
| `Button`        | Themed button with variants                |
| `Badge`         | Status badges                              |
| `Card`          | Content cards                              |
| `Input`         | Form inputs                                |
| `PullToRefresh` | Pull-to-refresh wrapper                    |

---

## Mobile Components

### `CommandInputBar`

Primary input surface. Supports two modes:

- **AI mode** - sends to AI agent
- **Terminal mode** - sends as shell command

Features:

- Slash command autocomplete
- Per-session, per-tab draft persistence
- Voice input toggle
- Image attachment
- Read-only mode indicator

### `SessionPillBar`

Horizontal scrollable session list. Each pill shows:

- Session name and status color
- Group emoji
- Unread indicator

### `TabBar`

Tab navigation within a session (mirroring the desktop tab system).

### `ResponseViewer`

Displays AI responses with:

- Markdown rendering (`MobileMarkdownRenderer`)
- Thinking indicator
- Response timestamp
- Full-length toggle

### `AllSessionsView`

Dashboard grid showing all active sessions with:

- Group organization
- Status indicators
- Quick session switching
- Cost and context usage display

### `MobileHistoryPanel`

History viewer with:

- Filter by type (all, auto-run, user)
- Search
- Expandable entries

### `AutoRunIndicator`

Compact auto-run status indicator showing current task progress.

---

## Service Worker & PWA

File: `src/web/utils/serviceWorker.ts`

The web interface registers a service worker for:

- Offline support (cached static assets)
- `isOffline()` detection
- Background sync for command queue

---

## Haptic Feedback

File: `src/web/mobile/constants.ts`

Touch interactions trigger haptic feedback via `navigator.vibrate()`:

```typescript
import { triggerHaptic, HAPTIC_PATTERNS } from './constants';

triggerHaptic(HAPTIC_PATTERNS.TAP); // Light tap
triggerHaptic(HAPTIC_PATTERNS.SUCCESS); // Success pattern
triggerHaptic(HAPTIC_PATTERNS.ERROR); // Error pattern
```

---

## Key Files Reference

| Concern           | Primary Files                                                        |
| ----------------- | -------------------------------------------------------------------- |
| App root          | `src/web/App.tsx`, `src/web/main.tsx`                                |
| Mobile app        | `src/web/mobile/App.tsx`, `src/web/mobile/index.tsx`                 |
| WebSocket         | `src/web/hooks/useWebSocket.ts`                                      |
| Sessions          | `src/web/hooks/useSessions.ts`                                       |
| Config            | `src/web/utils/config.ts`                                            |
| Theme             | `src/web/components/ThemeProvider.tsx`                               |
| Offline           | `src/web/hooks/useOfflineQueue.ts`, `src/web/utils/serviceWorker.ts` |
| View state        | `src/web/hooks/useMobileViewState.ts`, `src/web/utils/viewState.ts`  |
| Notifications     | `src/web/hooks/useNotifications.ts`                                  |
| Shared components | `src/web/components/`                                                |
| Mobile components | `src/web/mobile/`                                                    |
| Development       | `npm run dev:web`                                                    |

---

## Deferred: web-server-factory.ts

Main-to-renderer push events only reach browser clients when they go through `safeSend` (`src/main/utils/safe-send.ts`), which fans each event out to the desktop `webContents` AND to the web-desktop bridge via `broadcastBridgeEvent`. The Phase 01 migration routed the session/app data sends across the IPC handlers through `safeSend` so web clients stop silently missing group chat, stats, Cue, and Auto Run events.

`src/main/web-server/web-server-factory.ts` was deliberately left out of that migration. Its ~58 direct `webContents.send(...)` calls are not new events originating in the main process: they mirror actions that a web client already performed (over the WebSocket bridge) back onto the desktop renderer so the two surfaces stay in sync. Bridging those sends through `safeSend` would echo each web-originated action straight back to the web client that initiated it, causing duplicate state updates and feedback loops.

Wiring the factory into the bridge therefore requires an echo-suppression design (for example, tagging each mirrored event with its originating client id and having the bridge skip re-delivering it to that origin) before the sends can safely fan out. That work is out of scope for the safeSend parity pass and is tracked as a separate effort. Until then, leave the `web-server-factory.ts` sends as direct `webContents.send(...)` calls.

---

## Legacy mobile retirement inventory

Compiled 2026-07-03 (Phase 06, retirement step 1). This is the pre-deletion catalog of every reference to the legacy mobile web app (`src/web/mobile/` and its entry points) that lives OUTSIDE `src/web/` itself, with a keep/remove verdict for each. Retirement step 2 acts on this catalog; nothing was deleted in step 1.

### Halt check (safe to proceed)

The legacy mobile React app is neither served nor imported at runtime by any non-legacy, non-test code:

- Its `index.html` is never served. `src/main/web-server/routes/staticRoutes.ts` serves the web-desktop bundle's `index.html` for every SPA route (token root, `/desktop`, `/session/:id`, and the valid-token catch-all). See the comment at `staticRoutes.ts:75-80`.
- No runtime module imports `src/web/mobile/*`. The two prescribed greps returned only comment strings mentioning the *concept* "web/mobile" (see below), plus test files under `src/__tests__/web/mobile/`. Zero `import`/`require`/`lazy()` of the mobile app exist outside `src/web/` and the legacy tests.

Because the mobile bundle is not reachable at runtime, retirement is safe and no `maestro:halt` marker was written.

### Greps run

```bash
# Grep 1: web/mobile references in src, excluding src/web/ and __tests__
grep -rn "web/mobile\|from '\.\./mobile\|from './mobile" src --include="*.ts" --include="*.tsx" | grep -v "src/web/" | grep -v __tests__
# -> all hits are documentation comments (see "Comment-only references" below); NO code imports.

# Grep 2: src/web references in build config
grep -rn "src/web" package.json vite.config*.mts scripts/ 2>/dev/null | grep -vi web-desktop
# -> only vite.config.web.mts (the mobile bundle config). No scripts/ references.
```

### Inventory (references outside `src/web/`)

| Location (file:line)                          | What it is                                                                 | Verdict         |
| --------------------------------------------- | ------------------------------------------------------------------------- | --------------- |
| `package.json:26` `dev:web`                   | Dev server for the mobile bundle (`vite --config vite.config.web.mts`)     | **REMOVE**      |
| `package.json:37` `build:web`                 | Production build of the mobile bundle (`vite build --config vite.config.web.mts`) | **REMOVE** |
| `package.json:30` `build`                     | Chains `... && npm run build:web && npm run build:web-desktop && ...`      | **EDIT** (drop `&& npm run build:web`) |
| `vite.config.web.mts` (whole file)            | Vite config for the mobile bundle; entry `src/web/index.html`, `publicDir: src/web/public`, output `dist/web/` | **REMOVE** |
| `src/main/web-server/WebServer.ts:775-783`    | Static mount of `dist/web/assets/` (compiled legacy mobile JS/CSS)         | **REMOVE**      |
| `src/main/web-server/WebServer.ts:786-793`    | Static mount of `dist/web/icons/` (PWA icons; Phase 03 uses it)            | **KEEP**        |
| `src/main/web-server/WebServer.ts:160,211,255-278,284+` | `webAssetsPath` field + `resolveWebAssetsPath()` + `isServableWebAssetsPath()` | **KEEP but REWORK** (see BLOCKER below) |
| `src/main/web-server/routes/staticRoutes.ts:183-193` | `/<token>/manifest.json` route (reads `webAssetsPath`)             | **KEEP**        |
| `src/main/web-server/routes/staticRoutes.ts:196-206` | `/<token>/sw.js` route (reads `webAssetsPath`)                     | **KEEP**        |
| `src/main/web-server/routes/staticRoutes.ts:75-85` | `webAssetsPath` ctor param + comment ("Legacy mobile-web bundle root. Retained for the PWA manifest/service worker/icons") | **KEEP** (comment already scopes it to PWA) |
| `src/__tests__/web/mobile/*` (25 suites)      | Unit tests that import `src/web/mobile/*` components/constants             | **REMOVE / rewrite** (step 2 item 6) |
| `src/__tests__/web/utils/serviceWorker.test.ts` | Tests `src/web/utils/serviceWorker.ts` (kept module)                     | **KEEP**        |

### npm scripts and vite configs to remove in step 2 (explicit)

- Delete npm script `dev:web` (`package.json:26`).
- Delete npm script `build:web` (`package.json:37`).
- Edit the `build` script (`package.json:30`) to drop `&& npm run build:web`.
- Delete the file `vite.config.web.mts`.

`dev:web-desktop` (`package.json:27`), `build:web-desktop` (`package.json:28`), and `vite.config.web-desktop.mts` are the CURRENT browser interface and STAY untouched.

### BLOCKER for step 2: PWA assets are built by the mobile config

The PWA assets the task says to keep (manifest.json, sw.js, icons/) are currently produced only as a side effect of the legacy build:

1. `vite.config.web.mts` sets `publicDir: src/web/public`, so building `build:web` copies `src/web/public/{manifest.json,sw.js,icons/}` into `dist/web/`.
2. `WebServer.resolveWebAssetsPath()` resolves `webAssetsPath` to `dist/web` and, via `isServableWebAssetsPath()`, requires that directory to contain an `index.html` (not referencing the dev entrypoint) AND an `assets/` folder.
3. The kept routes read from `webAssetsPath`: manifest.json (`staticRoutes.ts:187`), sw.js (`staticRoutes.ts:200`), icons/ mount (`WebServer.ts:786`).

So removing `build:web` / `vite.config.web.mts` and deleting `src/web/index.html` (step 2) would leave `dist/web` unbuilt, `resolveWebAssetsPath()` returning `null`, and the manifest/sw.js/icons routes returning 404 - silently breaking the PWA that step 2 is supposed to preserve.

Step 2 (or a dedicated follow-up) MUST provide a replacement so `src/web/public/` still lands in a served location, for example one of:

- Add a lightweight copy step (or a `publicDir`) that emits `src/web/public/*` into `dist/web/` (or a renamed `dist/pwa/`), and repoint `resolveWebAssetsPath()` at it; AND
- Relax `isServableWebAssetsPath()` so it no longer requires a mobile-app `index.html` + `assets/` (those disappear with the mobile bundle) - a PWA-assets root only needs `manifest.json`/`sw.js`/`icons/`.

Until that replacement exists, do NOT delete `build:web`/`vite.config.web.mts` without also rewiring the PWA asset source, or the install prompt and service worker will break.

### Cross-`src/web` keep dependency: serviceWorker.ts

`src/web-desktop/bootstrap.ts:13` imports `registerServiceWorker` from `../web/utils/serviceWorker`. This is Phase 03 (web-desktop) consuming a module inside `src/web/` - it is the reason step 2 item (4) keeps `src/web/utils/serviceWorker.ts`. It is a KEEP dependency, not a reference to sever. The legacy importers of the same module (`src/web/App.tsx:20`, `src/web/utils/index.ts:25-26`) go away with the mobile app.

### Comment-only references (no action)

Grep 1's hits are documentation comments that mention the *concept* "web/mobile client" and reference no code path into the mobile app. They require no change:

`src/renderer/utils/markdownConfig.ts:95`, `src/renderer/components/Markdown/config.ts:10`, `src/renderer/hooks/batch/internal/useBatchBroadcast.ts:25,60`, `src/renderer/hooks/remote/useRemoteHandlers.ts:133,383`, `src/renderer/hooks/remote/index.ts:41`, `src/renderer/global.d.ts:814,821`, `src/shared/cue/subscription-id.ts:3`, `src/shared/deep-link-urls.ts:46`, `src/shared/settingsMetadata.ts:694,700`, `src/shared/markdownPlugins.ts:5`, `src/main/web-server/web-settings-snapshot.ts:3`, `src/main/web-server/types.ts:644`, `src/main/ipc/handlers/notifications.ts:138`.
