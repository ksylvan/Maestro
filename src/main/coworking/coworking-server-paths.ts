/**
 * Resolves stable absolute paths for the bundled coworking MCP server.
 *
 * The script lives at `<userData>/coworking-mcp-server.js`. We refresh its
 * contents on every Maestro `app.ready` so a Maestro upgrade automatically
 * picks up the latest server. The `command` field in each agent's MCP config
 * points at this path.
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { getCoworkingServerScript } from './coworking-server-script';

const SCRIPT_FILENAME = 'coworking-mcp-server.js';

/** Absolute path of the bundled server script. */
export function getCoworkingServerScriptPath(): string {
	return path.join(app.getPath('userData'), SCRIPT_FILENAME);
}

/** Write/refresh the bundled server script at app boot. Idempotent. */
export async function ensureCoworkingServerScript(): Promise<string> {
	const scriptPath = getCoworkingServerScriptPath();
	const contents = getCoworkingServerScript();
	try {
		const existing = await fs.promises.readFile(scriptPath, 'utf8').catch(() => null);
		if (existing === contents) return scriptPath;
		await fs.promises.mkdir(path.dirname(scriptPath), { recursive: true });
		await fs.promises.writeFile(scriptPath, contents, { mode: 0o644 });
		logger.info(`[Coworking] Refreshed MCP server script at ${scriptPath}`, 'Coworking');
	} catch (err) {
		logger.error(
			`[Coworking] Failed to write MCP server script: ${err instanceof Error ? err.message : String(err)}`,
			'Coworking'
		);
		throw err;
	}
	return scriptPath;
}

/** Build the spawn command + args + env for the bundled MCP server. */
export function buildMcpServerSpec(env: Record<string, string>): {
	command: string;
	args: string[];
	env: Record<string, string>;
} {
	// `node` from PATH — every supported agent already runs in a context where Node is required
	// (Claude Code, Codex, OpenCode, Factory Droid all are Node CLIs).
	return {
		command: 'node',
		args: [getCoworkingServerScriptPath()],
		env,
	};
}
