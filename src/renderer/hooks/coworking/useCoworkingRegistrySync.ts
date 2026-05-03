/**
 * Mirrors the active session's terminal tab state to the main-process coworking
 * registry. The registry is what the MCP `list_terminals` tool reads from; this
 * hook is what keeps it accurate.
 *
 * Strategy: subscribe to the session store and re-sync whenever the active
 * session id, the active session's terminal tabs, or any tab's metadata change.
 * Cheap because it's just an IPC call with a small array.
 *
 * Gated on the `coworking` Encore flag — when off, we proactively send a null
 * active session so the registry empties and `list_terminals` returns [].
 */

import { useEffect, useRef } from 'react';
import { useSessionStore, selectActiveSession } from '../../stores/sessionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTerminalTabDisplayName } from '../../utils/terminalTabHelpers';

export function useCoworkingRegistrySync(): void {
	const activeSession = useSessionStore(selectActiveSession);
	const enabled = useSettingsStore((s) => s.encoreFeatures?.coworking ?? false);
	const lastPayloadRef = useRef<string>('');

	useEffect(() => {
		if (!enabled) {
			window.maestro.coworking.setActiveSession(null).catch(() => {
				/* main process may not be ready during teardown */
			});
			lastPayloadRef.current = '';
			return;
		}

		if (!activeSession) {
			window.maestro.coworking.setActiveSession(null).catch(() => {});
			lastPayloadRef.current = '';
			return;
		}

		const sessionId = activeSession.id;
		const records = (activeSession.terminalTabs ?? [])
			.filter((t) => typeof t.coworkingId === 'number')
			.map((t, idx) => ({
				id: `term:${t.coworkingId}`,
				cwd: t.cwd ?? '',
				title: getTerminalTabDisplayName(t, idx),
				tabUuid: t.id,
				sessionId,
			}));

		// Skip the IPC if nothing has changed since last sync (cheap stringify of small payload).
		const payload = JSON.stringify({ sessionId, records });
		if (payload === lastPayloadRef.current) return;
		lastPayloadRef.current = payload;

		(async () => {
			try {
				await window.maestro.coworking.setActiveSession(sessionId);
				await window.maestro.coworking.syncSessionTerminals(sessionId, records);
			} catch {
				/* best-effort; main may not be ready or feature may have just been disabled */
			}
		})();
	}, [enabled, activeSession]);
}
