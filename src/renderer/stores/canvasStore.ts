/**
 * canvasStore - Zustand store for the agent-driven canvas: free-placed items,
 * each rendering a BlockView tree. Fed by the CLI/web bridge
 * (`remote:canvas` -> useRemoteIntegration -> applyCanvasPayload). Presentational
 * state only; CanvasOverlay renders the items. Usable outside React via
 * useCanvasStore.getState() (the bridge builds its `state` snapshot from here).
 */

import { create } from 'zustand';
import type { CanvasPayload, CanvasStateSnapshot } from '../../shared/canvas-types';
import type { BlockSpec } from '../components/BlockView';

/** Default item width when the agent doesn't specify one (px). */
export const CANVAS_ITEM_DEFAULT_WIDTH = 320;

/** A resolved canvas item ready to render (spec parsed, defaults applied). */
export interface CanvasItem {
	id: string;
	x: number;
	y: number;
	/** Fixed width; defaults to CANVAS_ITEM_DEFAULT_WIDTH. */
	width: number;
	/** Optional fixed height; unset = sized to content. */
	height?: number;
	title?: string;
	/** Parsed BlockView spec. Parse failures become an error callout. */
	spec: BlockSpec;
	/** Actual rendered height (px), measured by the overlay - so `canvas state`
	 *  reports a real footprint even for auto-sized (unset `height`) panels. */
	measuredHeight?: number;
	timestamp: number;
}

/** Parse an agent-authored JSON spec string; on failure, a visible error block. */
function parseSpec(body: string | undefined): BlockSpec {
	if (!body) return { blocks: [] };
	try {
		return JSON.parse(body) as BlockSpec;
	} catch {
		return { blocks: [{ kind: 'callout', text: 'Invalid canvas item JSON', color: 'error' }] };
	}
}

export interface CanvasStoreState {
	items: CanvasItem[];
	/** Canvas viewport size (px), reported by the overlay for agent awareness. */
	viewportWidth: number;
	viewportHeight: number;
	/** User "stash" toggle: hide the whole overlay without removing items. */
	hidden: boolean;
}

export interface CanvasStoreActions {
	upsertItem: (item: CanvasItem) => void;
	patchItem: (id: string, patch: Partial<Omit<CanvasItem, 'id'>>) => void;
	moveItem: (id: string, x: number, y: number) => void;
	resizeItem: (id: string, width: number, height: number) => void;
	setMeasuredHeight: (id: string, height: number) => void;
	removeItem: (id: string) => void;
	clearItems: () => void;
	setViewport: (width: number, height: number) => void;
	setHidden: (hidden: boolean) => void;
}

export type CanvasStore = CanvasStoreState & CanvasStoreActions;

/** Smallest a user can drag a panel down to (px). */
const MIN_ITEM_WIDTH = 200;
const MIN_ITEM_HEIGHT = 120;

export const useCanvasStore = create<CanvasStore>()((set) => ({
	items: [],
	viewportWidth: 0,
	viewportHeight: 0,
	hidden: false,

	upsertItem: (item) =>
		set((s) => ({
			items: s.items.some((v) => v.id === item.id)
				? s.items.map((v) => (v.id === item.id ? item : v))
				: [...s.items, item],
		})),

	patchItem: (id, patch) =>
		set((s) => ({ items: s.items.map((v) => (v.id === id ? { ...v, ...patch } : v)) })),

	moveItem: (id, x, y) =>
		set((s) => ({
			items: s.items.map((v) => (v.id === id ? { ...v, x: Math.max(0, x), y: Math.max(0, y) } : v)),
		})),

	resizeItem: (id, width, height) =>
		set((s) => ({
			items: s.items.map((v) =>
				v.id === id
					? {
							...v,
							width: Math.max(MIN_ITEM_WIDTH, width),
							height: Math.max(MIN_ITEM_HEIGHT, height),
						}
					: v
			),
		})),

	// Store the overlay-measured height. Guarded (only on a >1px change) so the
	// ResizeObserver that feeds it can't cause a render loop.
	setMeasuredHeight: (id, height) =>
		set((s) => {
			const rounded = Math.round(height);
			let changed = false;
			const items = s.items.map((v) => {
				if (v.id !== id || Math.abs((v.measuredHeight ?? 0) - rounded) <= 1) return v;
				changed = true;
				return { ...v, measuredHeight: rounded };
			});
			return changed ? { items } : s;
		}),

	removeItem: (id) => set((s) => ({ items: s.items.filter((v) => v.id !== id) })),

	clearItems: () => set({ items: [] }),

	setViewport: (width, height) => set({ viewportWidth: width, viewportHeight: height }),

	setHidden: (hidden) => set({ hidden }),
}));

/** Cascade offset so items opened without a position don't stack on one pixel. */
let cascadeIndex = 0;

/** Apply an incoming canvas payload from the bridge to the store. */
export function applyCanvasPayload(p: CanvasPayload): void {
	const store = useCanvasStore.getState();

	if (p.op === 'clear') {
		store.clearItems();
		return;
	}
	if (!p.id) return;

	if (p.op === 'remove') {
		store.removeItem(p.id);
		return;
	}

	if (p.op === 'move') {
		if (typeof p.x === 'number' && typeof p.y === 'number') store.moveItem(p.id, p.x, p.y);
		return;
	}

	if (p.op === 'update') {
		const patch: Partial<Omit<CanvasItem, 'id'>> = {};
		if (typeof p.x === 'number') patch.x = p.x;
		if (typeof p.y === 'number') patch.y = p.y;
		if (typeof p.width === 'number') patch.width = p.width;
		if (typeof p.height === 'number') patch.height = p.height;
		if (p.title !== undefined) patch.title = p.title;
		if (p.body !== undefined) patch.spec = parseSpec(p.body);
		store.patchItem(p.id, patch);
		return;
	}

	// op === 'add'. Preserve position if the id already exists; else cascade.
	const existing = store.items.find((v) => v.id === p.id);
	const step = (cascadeIndex++ % 6) * 32;
	store.upsertItem({
		id: p.id,
		x: p.x ?? existing?.x ?? 24 + step,
		y: p.y ?? existing?.y ?? 24 + step,
		width: p.width ?? existing?.width ?? CANVAS_ITEM_DEFAULT_WIDTH,
		height: p.height ?? existing?.height,
		title: p.title ?? existing?.title,
		spec: p.body !== undefined ? parseSpec(p.body) : (existing?.spec ?? { blocks: [] }),
		timestamp: Date.now(),
	});
}

/** Build the snapshot returned to `maestro-cli canvas state` (agent awareness). */
export function getCanvasSnapshot(): CanvasStateSnapshot {
	const { items, viewportWidth, viewportHeight } = useCanvasStore.getState();
	return {
		items: items.map((it) => ({
			id: it.id,
			x: Math.round(it.x),
			y: Math.round(it.y),
			width: Math.round(it.width),
			// Prefer the real rendered height; fall back to an explicit height.
			height: Math.round(it.measuredHeight ?? it.height ?? 0),
			title: it.title,
		})),
		width: viewportWidth,
		height: viewportHeight,
	};
}
