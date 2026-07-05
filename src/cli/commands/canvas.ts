// Canvas command - compose the agent-driven "living view" in the Maestro desktop
// app. The canvas is a roomy main-window surface where the agent free-places
// items (add/update/move/remove/clear), each rendering a BlockView spec (the
// same JSON block vocabulary as `view --type view`). Rides the same bridge as
// notify/view.

import { readFileSync } from 'fs';
import { withMaestroClient } from '../services/maestro-client';
import {
	CANVAS_OPS,
	type CanvasOp,
	type CanvasPayload,
	type CanvasStateSnapshot,
} from '../../shared/canvas-types';

interface CanvasAddOptions {
	x?: string;
	y?: string;
	width?: string;
	height?: string;
	title?: string;
	body?: string;
	bodyFile?: string;
	json?: boolean;
}

interface CanvasMoveOptions {
	x?: string;
	y?: string;
	json?: boolean;
}

interface CanvasRemoveOptions {
	json?: boolean;
}

/** Read the block spec from --body (inline) or --body-file (a file path). */
function resolveBody(body: string | undefined, bodyFile: string | undefined): string | undefined {
	if (bodyFile) {
		try {
			return readFileSync(bodyFile, 'utf8');
		} catch (error) {
			console.error(
				`Error: could not read --body-file: ${error instanceof Error ? error.message : String(error)}`
			);
			process.exit(1);
		}
	}
	return body;
}

/** Parse an optional numeric flag, exiting on a non-number. */
function parseNum(name: string, raw: string | undefined): number | undefined {
	if (raw === undefined) return undefined;
	const n = Number(raw);
	if (!Number.isFinite(n)) {
		console.error(`Error: --${name} must be a number`);
		process.exit(1);
	}
	return n;
}

/** Send one canvas op over the bridge and report the result. */
async function sendCanvas(
	payload: CanvasPayload,
	json: boolean | undefined,
	successMessage: string
): Promise<void> {
	if (!CANVAS_OPS.includes(payload.op)) {
		console.error(`Error: op must be one of: ${CANVAS_OPS.join(', ')}`);
		process.exit(1);
	}
	try {
		const result = await withMaestroClient(async (client) =>
			client.sendCommand<{ type: string; success: boolean; error?: string }>(
				{ type: 'canvas', ...payload },
				'canvas_result'
			)
		);
		if (result.success) {
			if (json) console.log(JSON.stringify({ success: true, id: payload.id, op: payload.op }));
			else console.log(successMessage);
		} else {
			const error = result.error || 'Failed to update canvas';
			if (json) console.log(JSON.stringify({ success: false, error }));
			else console.error(`Error: ${error}`);
			process.exit(1);
		}
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		if (json) console.log(JSON.stringify({ success: false, error: msg }));
		else console.error(`Error: ${msg}`);
		process.exit(1);
	}
}

function requireId(id: string, op: CanvasOp): void {
	if (!id.trim()) {
		console.error(`Error: id cannot be empty for canvas ${op}`);
		process.exit(1);
	}
}

export async function canvasAdd(id: string, options: CanvasAddOptions): Promise<void> {
	requireId(id, 'add');
	const body = resolveBody(options.body, options.bodyFile);
	if (!body) {
		console.error('Error: --body or --body-file (a JSON block spec) is required');
		process.exit(1);
	}
	await sendCanvas(
		{
			op: 'add',
			id,
			x: parseNum('x', options.x),
			y: parseNum('y', options.y),
			width: parseNum('width', options.width),
			height: parseNum('height', options.height),
			title: options.title,
			body,
		},
		options.json,
		`Canvas item '${id}' added`
	);
}

export async function canvasUpdate(id: string, options: CanvasAddOptions): Promise<void> {
	requireId(id, 'update');
	await sendCanvas(
		{
			op: 'update',
			id,
			x: parseNum('x', options.x),
			y: parseNum('y', options.y),
			width: parseNum('width', options.width),
			height: parseNum('height', options.height),
			title: options.title,
			body: resolveBody(options.body, options.bodyFile),
		},
		options.json,
		`Canvas item '${id}' updated`
	);
}

export async function canvasMove(id: string, options: CanvasMoveOptions): Promise<void> {
	requireId(id, 'move');
	const x = parseNum('x', options.x);
	const y = parseNum('y', options.y);
	if (x === undefined || y === undefined) {
		console.error('Error: canvas move requires --x and --y');
		process.exit(1);
	}
	await sendCanvas({ op: 'move', id, x, y }, options.json, `Canvas item '${id}' moved`);
}

export async function canvasRemove(id: string, options: CanvasRemoveOptions): Promise<void> {
	requireId(id, 'remove');
	await sendCanvas({ op: 'remove', id }, options.json, `Canvas item '${id}' removed`);
}

export async function canvasClear(options: CanvasRemoveOptions): Promise<void> {
	await sendCanvas({ op: 'clear' }, options.json, 'Canvas cleared');
}

/** Read the current canvas layout (items + size) so you can place around it. */
export async function canvasState(options: { json?: boolean }): Promise<void> {
	try {
		const result = await withMaestroClient(async (client) =>
			client.sendCommand<{
				success: boolean;
				snapshot?: CanvasStateSnapshot | null;
				error?: string;
			}>({ type: 'get_canvas_state' }, 'canvas_state_result')
		);
		if (!result.success) {
			console.error(`Error: ${result.error || 'Failed to read canvas state'}`);
			process.exit(1);
		}
		const snapshot = result.snapshot ?? { items: [], width: 0, height: 0 };
		if (options.json) {
			console.log(JSON.stringify(snapshot));
			return;
		}
		console.log(`Canvas ${snapshot.width}x${snapshot.height}, ${snapshot.items.length} item(s):`);
		for (const it of snapshot.items) {
			const title = it.title ? `  "${it.title}"` : '';
			console.log(`  ${it.id}  (${it.x},${it.y}) ${it.width}x${it.height}${title}`);
		}
	} catch (error) {
		console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	}
}
