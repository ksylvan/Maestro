/**
 * Canvas types - the agent-driven, free-placement "living view" surface. Unlike
 * satellites (small floating cards) the canvas is a roomy main-window view where
 * the agent positions items at (x, y) and each item renders a BlockView tree
 * (see components/BlockView). Shared across the CLI command, the main-process
 * bridge, the preload bridge, and the renderer store so every layer agrees on
 * one payload shape.
 *
 * The agent composes with awareness of the current layout via a `state` read
 * (CanvasStateSnapshot), so it can place new items without overlapping.
 */

/** add = create/replace by id; update = merge fields; move = reposition; remove
 *  = delete by id; clear = remove all. */
export type CanvasOp = 'add' | 'update' | 'move' | 'remove' | 'clear';

export const CANVAS_OPS: readonly CanvasOp[] = [
	'add',
	'update',
	'move',
	'remove',
	'clear',
] as const;

/**
 * A single canvas operation sent across the bridge. `id` identifies the item for
 * update/move/remove; `body` is the item's BlockView spec as a JSON string.
 */
export interface CanvasPayload {
	op: CanvasOp;
	/** Stable item id (required for every op except `clear`). */
	id?: string;
	/** Free-placement position, px from the canvas top-left. */
	x?: number;
	y?: number;
	/** Optional fixed size; unset = sized to content up to a max. */
	width?: number;
	height?: number;
	/** Optional item title shown in its frame header. */
	title?: string;
	/** The item's BlockView spec, as a JSON string (parsed by the renderer). */
	body?: string;
}

/** One item's geometry as returned by the `state` read (for agent awareness). */
export interface CanvasItemState {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	title?: string;
}

/** Snapshot of the canvas returned to `maestro-cli canvas state`. */
export interface CanvasStateSnapshot {
	items: CanvasItemState[];
	/** Canvas viewport size in px, so the agent can place within bounds. */
	width: number;
	height: number;
}
