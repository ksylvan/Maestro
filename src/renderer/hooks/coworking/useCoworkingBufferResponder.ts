/**
 * Handles `coworking:requestBuffer` events from main and answers them via the
 * per-session `TerminalView` ref map already kept by `MainPanel`. The hook
 * never assumes a particular ref shape; it just calls `getTerminalBuffer`
 * on the matching ref and ships back whatever it returns (or empty string).
 */

import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { TerminalViewHandle } from '../../components/TerminalView';

export function useCoworkingBufferResponder(
	terminalViewRefs: MutableRefObject<Map<string, TerminalViewHandle>>
): void {
	useEffect(() => {
		const off = window.maestro.coworking.onRequestBuffer((tabUuid, sessionId, responseChannel) => {
			let content = '';
			try {
				if (sessionId) {
					content = terminalViewRefs.current.get(sessionId)?.getTerminalBuffer(tabUuid) ?? '';
				} else {
					// No session id given — try every mounted view (cheap, small map).
					for (const handle of terminalViewRefs.current.values()) {
						const got = handle.getTerminalBuffer(tabUuid);
						if (got) {
							content = got;
							break;
						}
					}
				}
			} catch {
				content = '';
			}
			window.maestro.coworking.sendBufferResponse(responseChannel, content);
		});
		return off;
	}, [terminalViewRefs]);
}
