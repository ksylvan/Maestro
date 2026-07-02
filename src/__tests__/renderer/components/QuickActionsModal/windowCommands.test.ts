/**
 * Tests for buildWindowCommands - the Cmd+K palette commands that move the active
 * agent between windows. Mirrors the Left Bar's Move-to-Window submenu.
 */

import { describe, it, expect, vi } from 'vitest';
import { buildWindowCommands } from '../../../../renderer/components/QuickActionsModal/commands/windowCommands';
import type { Session } from '../../../../renderer/types';
import type { WindowMoveTarget } from '../../../../renderer/utils/windowTargets';

function makeSession(partial: Partial<Session> & Pick<Session, 'id' | 'name'>): Session {
	// Only id/name are read by buildWindowCommands; cast the rest.
	return { id: partial.id, name: partial.name } as Session;
}

function makeTarget(
	partial: Partial<WindowMoveTarget> & Pick<WindowMoveTarget, 'windowId'>
): WindowMoveTarget {
	return {
		isMain: false,
		windowNumber: 2,
		label: 'Bravo',
		isCurrentOwner: false,
		...partial,
	};
}

describe('buildWindowCommands', () => {
	const noop = () => {};

	it('returns [] with no active agent', () => {
		expect(
			buildWindowCommands({
				activeSession: undefined,
				windowTargets: [makeTarget({ windowId: 'win-2' })],
				moveToNewWindow: vi.fn(),
				moveToWindow: vi.fn(),
				setQuickActionOpen: noop,
			})
		).toEqual([]);
	});

	it('returns [] when no windows are enumerated (single-window app)', () => {
		expect(
			buildWindowCommands({
				activeSession: makeSession({ id: 'a', name: 'Alpha' }),
				windowTargets: [],
				moveToNewWindow: vi.fn(),
				moveToWindow: vi.fn(),
				setQuickActionOpen: noop,
			})
		).toEqual([]);
	});

	it('always offers "new window" and one command per non-owner window', () => {
		const commands = buildWindowCommands({
			activeSession: makeSession({ id: 'a', name: 'Alpha' }),
			windowTargets: [
				makeTarget({
					windowId: 'primary',
					isMain: true,
					label: 'Main Window',
					isCurrentOwner: true,
				}),
				makeTarget({ windowId: 'win-2', label: 'Bravo' }),
			],
			moveToNewWindow: vi.fn(),
			moveToWindow: vi.fn(),
			setQuickActionOpen: noop,
		});
		const labels = commands.map((c) => c.label);
		expect(labels).toContain('Move Agent to New Window: Alpha');
		expect(labels).toContain('Move Agent to Bravo');
		// The current owner (primary) is not a destination.
		expect(labels).not.toContain('Move Agent to Main Window');
	});

	it('wires "new window" and per-window actions to the movers and closes the palette', () => {
		const moveToNewWindow = vi.fn();
		const moveToWindow = vi.fn();
		const setQuickActionOpen = vi.fn();
		const commands = buildWindowCommands({
			activeSession: makeSession({ id: 'a', name: 'Alpha' }),
			windowTargets: [makeTarget({ windowId: 'win-2', label: 'Bravo' })],
			moveToNewWindow,
			moveToWindow,
			setQuickActionOpen,
		});

		commands.find((c) => c.id === 'move-to-new-window')!.action();
		expect(moveToNewWindow).toHaveBeenCalledWith('a');
		expect(setQuickActionOpen).toHaveBeenCalledWith(false);

		commands.find((c) => c.id === 'move-to-window-win-2')!.action();
		expect(moveToWindow).toHaveBeenCalledWith('a', 'win-2');
	});
});
