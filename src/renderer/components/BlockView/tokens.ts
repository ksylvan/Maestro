/**
 * BlockView design tokens - the fixed, mandated styling vocabulary. Agents pick
 * from these semantic names; the app resolves them to concrete theme values so
 * agent-authored views always match the active Maestro theme and never carry raw
 * CSS.
 */

import type { Theme } from '../../types';
import type { BlockAlign, BlockColor, BlockGap } from './types';

/** Fallback orange - no theme slot defines it (matches Center Flash / cadenzas). */
const ORANGE_HEX = '#f97316';

/** Resolve a semantic block color to a concrete theme color. */
export function resolveBlockColor(
	color: BlockColor | undefined,
	theme: Theme,
	fallback?: string
): string {
	switch (color) {
		case 'success':
			return theme.colors.success;
		case 'warning':
			return theme.colors.warning;
		case 'error':
			return theme.colors.error;
		case 'orange':
			return ORANGE_HEX;
		case 'neutral':
			return theme.colors.textDim;
		case 'accent':
			return theme.colors.accent;
		default:
			return fallback ?? theme.colors.accent;
	}
}

/** Mandated spacing scale (px). */
export const GAP_PX: Record<BlockGap, number> = {
	none: 0,
	sm: 8,
	md: 16,
	lg: 24,
};

/** Resolve a gap name to px, defaulting to `md`. */
export function resolveGap(gap: BlockGap | undefined): number {
	return GAP_PX[gap ?? 'md'] ?? GAP_PX.md;
}

/** Map a cross-axis alignment name to a CSS `align-items` value. */
export function resolveAlign(align: BlockAlign | undefined): string {
	switch (align) {
		case 'center':
			return 'center';
		case 'end':
			return 'flex-end';
		case 'start':
			return 'flex-start';
		case 'stretch':
		default:
			return 'stretch';
	}
}
