// Agent busy-state detection for CLI run commands.
//
// Shared by `run-playbook` and `goal-run` so a CLI run never starts on an agent
// that is already busy in the desktop app or another CLI instance. Extracted
// from run-playbook.ts to avoid duplicating the (subtle) desktop config-path
// logic across commands.

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { isSessionBusyWithCli, getCliActivityForSession } from '../../shared/cli-activity';

export interface BusyCheckResult {
	busy: boolean;
	reason?: string;
}

/**
 * Check if the desktop app has the session in a busy state.
 *
 * NOTE: This reads the desktop app's lowercase "maestro" config directory (the
 * electron-store default from package.json "name": "maestro"), which is
 * intentionally different from cli/services/storage.ts using "Maestro"
 * (capitalized) for CLI-specific storage. We need the desktop's session state,
 * not CLI storage.
 */
export function isSessionBusyInDesktop(sessionId: string): BusyCheckResult {
	try {
		const platform = os.platform();
		const home = os.homedir();
		let configDir: string;

		if (platform === 'darwin') {
			configDir = path.join(home, 'Library', 'Application Support', 'maestro');
		} else if (platform === 'win32') {
			configDir = path.join(
				process.env.APPDATA || path.join(home, 'AppData', 'Roaming'),
				'maestro'
			);
		} else {
			configDir = path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'maestro');
		}

		const sessionsPath = path.join(configDir, 'maestro-sessions.json');
		const content = fs.readFileSync(sessionsPath, 'utf-8');
		const data = JSON.parse(content);
		const sessions = data.sessions || [];

		const session = sessions.find((s: { id: string }) => s.id === sessionId);
		if (session && session.state === 'busy') {
			return { busy: true, reason: 'Desktop app shows agent is busy' };
		}
		return { busy: false };
	} catch {
		// Can't read sessions file, assume not busy.
		return { busy: false };
	}
}

/**
 * Check if an agent is busy from another CLI instance or the desktop app.
 */
export function checkAgentBusy(agentId: string): BusyCheckResult {
	// Check CLI activity first.
	const cliActivity = getCliActivityForSession(agentId);
	if (cliActivity && isSessionBusyWithCli(agentId)) {
		return {
			busy: true,
			reason: `Running "${cliActivity.playbookName}" from CLI (PID: ${cliActivity.pid})`,
		};
	}

	// Then desktop state.
	const desktopBusy = isSessionBusyInDesktop(agentId);
	if (desktopBusy.busy) {
		return { busy: true, reason: 'Busy in desktop app' };
	}

	return { busy: false };
}
