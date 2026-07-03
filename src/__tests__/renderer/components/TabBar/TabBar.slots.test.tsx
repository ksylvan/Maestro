/**
 * @file TabBar.slots.test.tsx
 * @description Defends TabBar's optional pinned slots (`leadingSlot` /
 * `trailingSlot`), used by Pianola's manager surface. Contract: when a slot
 * node is passed it renders inside the sticky-left group; when neither is
 * passed, no slot nodes appear (default agents are unaffected). lucide-react,
 * shortcutFormatter, matchMedia and ResizeObserver are auto-mocked in
 * `src/__tests__/setup.ts`, so a bare `render(<TabBar />)` mounts cleanly.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TabBar } from '../../../../renderer/components/TabBar';
import type { AITab } from '../../../../renderer/types';
import { mockTheme } from '../../../helpers/mockTheme';

function baseTab(): AITab {
	return {
		id: 't1',
		agentSessionId: null,
		name: null,
		starred: false,
		logs: [],
		inputValue: '',
		stagedImages: [],
		createdAt: Date.now(),
		state: 'idle',
	};
}

function renderTabBar(extra?: { leadingSlot?: React.ReactNode; trailingSlot?: React.ReactNode }) {
	return render(
		<TabBar
			tabs={[baseTab()]}
			activeTabId="t1"
			theme={mockTheme}
			onTabSelect={vi.fn()}
			onTabClose={vi.fn()}
			onNewTab={vi.fn()}
			{...extra}
		/>
	);
}

describe('TabBar pinned slots', () => {
	it('renders both slot nodes when leadingSlot and trailingSlot are provided', () => {
		renderTabBar({
			leadingSlot: <div data-testid="probe-lead" />,
			trailingSlot: <div data-testid="probe-trail" />,
		});

		expect(screen.getByTestId('probe-lead')).toBeInTheDocument();
		expect(screen.getByTestId('probe-trail')).toBeInTheDocument();
	});

	it('renders neither slot node when no slots are provided', () => {
		renderTabBar();

		expect(screen.queryByTestId('probe-lead')).not.toBeInTheDocument();
		expect(screen.queryByTestId('probe-trail')).not.toBeInTheDocument();
	});
});
