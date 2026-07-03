/**
 * Tests for the hoisted touch primitives in `src/renderer/utils/touch.ts`.
 * Focuses on `isCoarsePointer` (the new helper) and `triggerHaptic`.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
	isCoarsePointer,
	triggerHaptic,
	supportsHaptics,
	HAPTIC_PATTERNS,
} from '../../../renderer/utils/touch';

describe('touch primitives', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('isCoarsePointer', () => {
		it('returns true when the coarse-pointer media query matches', () => {
			vi.spyOn(window, 'matchMedia').mockImplementation(
				(query: string) =>
					({
						matches: query === '(pointer: coarse)',
						media: query,
					}) as MediaQueryList
			);
			expect(isCoarsePointer()).toBe(true);
		});

		it('returns false when the media query does not match (fine pointer)', () => {
			vi.spyOn(window, 'matchMedia').mockImplementation(
				(query: string) =>
					({
						matches: false,
						media: query,
					}) as MediaQueryList
			);
			expect(isCoarsePointer()).toBe(false);
		});

		it('falls back to false when matchMedia throws', () => {
			vi.spyOn(window, 'matchMedia').mockImplementation(() => {
				throw new Error('matchMedia unavailable');
			});
			expect(isCoarsePointer()).toBe(false);
		});
	});

	describe('triggerHaptic', () => {
		it('calls navigator.vibrate with the given pattern when supported', () => {
			const vibrate = vi.fn();
			Object.defineProperty(navigator, 'vibrate', {
				configurable: true,
				value: vibrate,
			});
			expect(supportsHaptics()).toBe(true);
			triggerHaptic(HAPTIC_PATTERNS.tap);
			expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.tap);
		});

		it('is a no-op when vibrate is unavailable', () => {
			Object.defineProperty(navigator, 'vibrate', {
				configurable: true,
				value: undefined,
			});
			expect(supportsHaptics()).toBe(false);
			// Should not throw.
			expect(() => triggerHaptic(HAPTIC_PATTERNS.success)).not.toThrow();
		});
	});
});
