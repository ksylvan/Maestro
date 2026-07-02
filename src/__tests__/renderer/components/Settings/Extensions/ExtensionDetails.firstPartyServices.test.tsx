/**
 * ExtensionDetails surfaces a first-party feature's supervised background
 * services (from the shared first-party registry) with a simple status line
 * derived from the tile's enabled state — no live process polling. Pianola's
 * tile shows `pianola.supervisor`; features with no services show nothing.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { ExtensionDetails } from '../../../../../renderer/components/Settings/Extensions/ExtensionDetails';
import {
	BUILTIN_FEATURES,
	builtinExtension,
} from '../../../../../renderer/components/Settings/Extensions/extensionModel';
import type { EncoreFeatureFlags } from '../../../../../renderer/types';
import type { Theme } from '../../../../../renderer/types';

const theme = {
	colors: {
		textMain: '#eee',
		textDim: '#999',
		bgMain: '#111',
		accent: '#4af',
		border: '#333',
		warning: '#fa0',
		error: '#f44',
		success: '#4f4',
	},
} as unknown as Theme;

const flags = (overrides: Partial<EncoreFeatureFlags> = {}): EncoreFeatureFlags => ({
	directorNotes: false,
	usageStats: false,
	symphony: false,
	maestroCue: false,
	pianola: false,
	plugins: false,
	...overrides,
});

function renderBuiltin(flag: keyof EncoreFeatureFlags, enabled: boolean): void {
	const def = BUILTIN_FEATURES.find((f) => f.flag === flag);
	if (!def) throw new Error(`no builtin feature for flag ${flag}`);
	render(
		<ExtensionDetails
			theme={theme}
			ext={builtinExtension(def, flags({ [flag]: enabled }))}
			contributions={null}
			busy={false}
			onBack={vi.fn()}
			onTogglePlugin={vi.fn()}
			onToggleBuiltin={vi.fn()}
			onUninstall={vi.fn()}
			onRevoke={vi.fn()}
			getGrants={vi.fn(async () => ({ requested: [], granted: [] }))}
		/>
	);
}

afterEach(cleanup);

describe('ExtensionDetails first-party background services', () => {
	it('shows pianola.supervisor as Running (supervised) when the feature is enabled', () => {
		renderBuiltin('pianola', true);
		const row = screen.getByTestId('extension-background-service');
		expect(row.getAttribute('data-service')).toBe('pianola.supervisor');
		expect(screen.getByTestId('extension-background-service-status').textContent).toBe(
			'Running (supervised)'
		);
	});

	it('shows pianola.supervisor as Stopped when the feature is disabled', () => {
		renderBuiltin('pianola', false);
		expect(screen.getByTestId('extension-background-service-status').textContent).toBe('Stopped');
	});

	it('renders no background-service section for a first-party feature without services', () => {
		// Symphony's definition declares no background services.
		renderBuiltin('symphony', true);
		expect(screen.queryByTestId('extension-background-service')).toBeNull();
	});
});
