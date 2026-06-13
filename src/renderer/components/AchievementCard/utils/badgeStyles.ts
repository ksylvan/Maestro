import type { CSSProperties } from 'react';
import type { Theme } from '../../../types';
import type { BadgeTooltipPosition } from '../types';

export const BADGE_TOTAL_LEVELS = 11;
export const GOLD_COLOR = '#FFD700';
export const ORANGE_COLOR = '#FF6B35';

export function getTooltipPosition(level: number): BadgeTooltipPosition {
	if (level <= 2) return 'left';
	if (level >= 10) return 'right';
	return 'center';
}

export function interpolateColor(color1: string, color2: string, t: number): string {
	const hex1 = color1.replace('#', '');
	const hex2 = color2.replace('#', '');

	const r1 = parseInt(hex1.substring(0, 2), 16);
	const g1 = parseInt(hex1.substring(2, 4), 16);
	const b1 = parseInt(hex1.substring(4, 6), 16);

	const r2 = parseInt(hex2.substring(0, 2), 16);
	const g2 = parseInt(hex2.substring(2, 4), 16);
	const b2 = parseInt(hex2.substring(4, 6), 16);

	const r = Math.round(r1 + (r2 - r1) * t);
	const g = Math.round(g1 + (g2 - g1) * t);
	const b = Math.round(b1 + (b2 - b1) * t);

	return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function getProgressRingSegmentColor(
	level: number,
	isUnlocked: boolean,
	theme: Theme
): string {
	if (!isUnlocked) {
		return theme.colors.border;
	}

	if (level <= 3) {
		return theme.colors.accent;
	}

	if (level <= 7) {
		const t = (level - 3) / 4;
		return interpolateColor(theme.colors.accent, GOLD_COLOR, t);
	}

	const t = (level - 7) / 4;
	return interpolateColor(GOLD_COLOR, ORANGE_COLOR, t);
}

export function getProgressionSegmentColor(
	level: number,
	isUnlocked: boolean,
	theme: Theme
): string {
	if (!isUnlocked) {
		return theme.colors.border;
	}

	if (level <= 3) {
		return theme.colors.accent;
	}

	if (level <= 7) {
		return GOLD_COLOR;
	}

	return ORANGE_COLOR;
}

export function getProgressionSegmentStyle(
	level: number,
	currentLevel: number,
	theme: Theme
): CSSProperties {
	const isUnlocked = level <= currentLevel;
	const isCurrent = level === currentLevel;

	return {
		backgroundColor: getProgressionSegmentColor(level, isUnlocked, theme),
		opacity: isUnlocked ? 1 : 0.5,
		border: isUnlocked ? 'none' : `1px dashed ${theme.colors.textDim}`,
		boxShadow: isCurrent ? `0 0 0 2px ${theme.colors.bgActivity}, 0 0 0 4px ${GOLD_COLOR}` : 'none',
	};
}
