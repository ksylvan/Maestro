import type { Session } from '../../../types';
import type { QuickAction } from '../types';
import type { WindowMoveTarget } from '../../../utils/windowTargets';

interface BuildWindowCommandsArgs {
	activeSession: Session | undefined;
	/**
	 * Windows the active agent can move into, already labeled and owner-flagged by
	 * `buildWindowMoveTargets`. Empty in a single-window app (registry not
	 * hydrated), which suppresses all move-to-window commands.
	 */
	windowTargets: WindowMoveTarget[];
	moveToNewWindow: (sessionId: string) => void | Promise<void>;
	moveToWindow: (sessionId: string, targetWindowId: string) => void | Promise<void>;
	setQuickActionOpen: (open: boolean) => void;
}

/**
 * Cmd+K palette commands for moving the active agent between windows: detach into
 * a new window, or move into any existing window (labeled by its lead agent;
 * "Move Agent to Main Window" doubles as "bring back to the primary"). Mirrors
 * the Left Bar's Move-to-Window submenu so both surfaces stay in lockstep. All
 * labels contain "Window" / "Move Agent" so keyword search surfaces them.
 *
 * Returns `[]` when there is no active agent or no enumerated windows, so a
 * single-window app shows no window commands.
 */
export function buildWindowCommands({
	activeSession,
	windowTargets,
	moveToNewWindow,
	moveToWindow,
	setQuickActionOpen,
}: BuildWindowCommandsArgs): QuickAction[] {
	if (!activeSession || windowTargets.length === 0) return [];

	const sessionId = activeSession.id;
	const commands: QuickAction[] = [
		{
			id: 'move-to-new-window',
			label: `Move Agent to New Window: ${activeSession.name}`,
			action: () => {
				void moveToNewWindow(sessionId);
				setQuickActionOpen(false);
			},
		},
	];

	for (const target of windowTargets) {
		// The window that already surfaces the agent is not a move destination.
		if (target.isCurrentOwner) continue;
		commands.push({
			id: `move-to-window-${target.windowId}`,
			label: `Move Agent to ${target.label}`,
			action: () => {
				void moveToWindow(sessionId, target.windowId);
				setQuickActionOpen(false);
			},
		});
	}

	return commands;
}
