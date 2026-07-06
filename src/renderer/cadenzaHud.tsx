/**
 * CadenzaHudRoot - "HUD mode" render entry for the cadenza desktop overlay.
 *
 * The main renderer bundle is reused: the main process loads it into a
 * transparent, always-on-top child window with `?cadenzaHud`, and main.tsx
 * mounts this instead of the full app. It renders only the cadenza cards (no
 * app chrome), themed to match the user's active theme, and receives cadenzas
 * over the same `remote:cadenza` bridge the in-app CadenzaLayer uses.
 *
 * Reusing the bundle (rather than a second Vite entry) is deliberate: the HUD
 * gets themes, the widget library, and the Markdown renderer for free.
 */

import { useEffect, useMemo } from 'react';
import { THEMES } from './constants/themes';
import { useSettingsStore, loadAllSettings } from './stores/settingsStore';
import { CadenzaLayer } from './components/Cadenza';
import { applyCadenzaPayload } from './stores/cadenzaStore';

export function CadenzaHudRoot() {
	const activeThemeId = useSettingsStore((s) => s.activeThemeId);
	const customThemeColors = useSettingsStore((s) => s.customThemeColors);

	// The HUD window boots its own renderer context, so hydrate settings here
	// (for the active theme) - the full app isn't mounted to do it for us.
	useEffect(() => {
		void loadAllSettings();
	}, []);

	// Same bridge the in-app layer rides; events are routed to this window's
	// webContents by the main process (see cadenza HUD window wiring).
	useEffect(() => {
		const off = window.maestro?.process?.onRemoteCadenza?.((payload) => {
			applyCadenzaPayload(payload);
		});
		// Tell main the subscription is live so it can flush the cadenza that
		// triggered this (lazily created) window - otherwise the first one is lost.
		window.maestro?.process?.notifyCadenzaHudReady?.();
		return () => off?.();
	}, []);

	// Click-through management lives in the main process (it polls the cursor
	// against card rects the CadenzaLayer reports). Doing hover detection here
	// would need `setIgnoreMouseEvents(forward)`, which is unsupported on Linux.

	const theme = useMemo(() => {
		if (activeThemeId === 'custom') {
			return { ...THEMES.custom, colors: customThemeColors };
		}
		return THEMES[activeThemeId];
	}, [activeThemeId, customThemeColors]);

	return <CadenzaLayer theme={theme} isHud />;
}
