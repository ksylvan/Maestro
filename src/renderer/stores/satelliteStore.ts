/**
 * satelliteStore - Zustand store for satellite views: small, agent-openable
 * panels that display or track what the user is working on.
 *
 * Fed by the CLI/web bridge (`remote:satellite` -> useRemoteIntegration ->
 * applySatellitePayload). Presentational only; SatelliteLayer renders the list.
 * Usable outside React via useSatelliteStore.getState().
 */

import { create } from 'zustand';
import type {
	SatelliteColor,
	SatelliteViewType,
	SatellitePayload,
	SatelliteDecisionOption,
} from '../../shared/satellite-types';
import { useSessionStore } from './sessionStore';

/** A resolved satellite ready to render (defaults applied). */
export interface SatelliteView {
	id: string;
	viewType: SatelliteViewType;
	title: string;
	/** Live tracker text; updated in place via the `update` op. */
	body?: string;
	/** File path for the `file` view type. */
	path?: string;
	/** Choice buttons for the `decision` view type. */
	options?: SatelliteDecisionOption[];
	color: SatelliteColor;
	/** Owning agent, used to expand the satellite into that agent's tab. */
	sessionId?: string;
	/** Resolved name of the owning agent, stamped on open for fleet attribution. */
	sourceAgent?: string;
	timestamp: number;
	/** Free-floating position, px from the top-left of the layer. Cascades on
	 *  open; the user drags the header to rearrange. */
	x?: number;
	y?: number;
}

/** Resolve an agent's display name from its session id (fleet attribution). */
function resolveAgentName(sessionId: string | undefined): string | undefined {
	if (!sessionId) return undefined;
	return useSessionStore.getState().sessions.find((s) => s.id === sessionId)?.name;
}

export interface SatelliteStoreState {
	satellites: SatelliteView[];
}

export interface SatelliteStoreActions {
	/** Create the satellite, or replace it if one with the same id is open. */
	upsertSatellite: (view: SatelliteView) => void;
	/** Merge fields into an open satellite (no-op if the id isn't open). */
	patchSatellite: (id: string, patch: Partial<Omit<SatelliteView, 'id'>>) => void;
	/** Remove a satellite by id. */
	removeSatellite: (id: string) => void;
	/** Reposition a satellite (free-floating drag). */
	moveSatellite: (id: string, x: number, y: number) => void;
	/** Remove all satellites. */
	clearSatellites: () => void;
}

export type SatelliteStore = SatelliteStoreState & SatelliteStoreActions;

export const useSatelliteStore = create<SatelliteStore>()((set) => ({
	satellites: [],

	upsertSatellite: (view) =>
		set((s) => ({
			satellites: s.satellites.some((v) => v.id === view.id)
				? s.satellites.map((v) => (v.id === view.id ? view : v))
				: [...s.satellites, view],
		})),

	patchSatellite: (id, patch) =>
		set((s) => ({
			satellites: s.satellites.map((v) => (v.id === id ? { ...v, ...patch } : v)),
		})),

	removeSatellite: (id) => set((s) => ({ satellites: s.satellites.filter((v) => v.id !== id) })),

	moveSatellite: (id, x, y) =>
		set((s) => ({ satellites: s.satellites.map((v) => (v.id === id ? { ...v, x, y } : v)) })),

	clearSatellites: () => set({ satellites: [] }),
}));

/** Cascade offset so freshly-opened satellites don't stack on the same pixel. */
let cascadeIndex = 0;

/**
 * Apply an incoming satellite payload from the bridge to the store, resolving
 * defaults on `open` and patching only the provided fields on `update`. Central
 * so the renderer bridge (useRemoteIntegration) stays a thin adapter.
 */
export function applySatellitePayload(p: SatellitePayload): void {
	const store = useSatelliteStore.getState();

	if (p.op === 'close') {
		store.removeSatellite(p.id);
		return;
	}

	if (p.op === 'update') {
		// Patch only the fields the caller actually sent, so an update that only
		// changes `body` (the common "living tracker" case) leaves title/path intact.
		const patch: Partial<Omit<SatelliteView, 'id'>> = {};
		if (p.viewType !== undefined) patch.viewType = p.viewType;
		if (p.title !== undefined) patch.title = p.title;
		if (p.body !== undefined) patch.body = p.body;
		if (p.path !== undefined) patch.path = p.path;
		if (p.options !== undefined) patch.options = p.options;
		if (p.color !== undefined) patch.color = p.color;
		if (p.sessionId !== undefined) patch.sessionId = p.sessionId;
		store.patchSatellite(p.id, patch);
		return;
	}

	// op === 'open'. Preserve position if this id is already open (re-open keeps
	// where the user put it); otherwise cascade a fresh default.
	const existing = store.satellites.find((v) => v.id === p.id);
	const step = (cascadeIndex++ % 6) * 28;
	store.upsertSatellite({
		id: p.id,
		viewType: p.viewType ?? 'tracker',
		title: p.title ?? p.id,
		body: p.body,
		path: p.path,
		options: p.options,
		color: p.color ?? 'theme',
		sessionId: p.sessionId,
		// Prefer the name the main process resolved (the HUD window has no session
		// store); fall back to local resolution for the in-app layer.
		sourceAgent: p.sourceAgent ?? resolveAgentName(p.sessionId),
		timestamp: Date.now(),
		x: existing?.x ?? 24 + step,
		y: existing?.y ?? 96 + step,
	});
}
