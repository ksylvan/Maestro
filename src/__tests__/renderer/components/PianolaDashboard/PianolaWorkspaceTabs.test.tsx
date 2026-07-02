/**
 * PianolaWorkspaceTabs contract — Pianola's header tab bar:
 * - one chip per chat tab, label = `tab.name` or the `Chat {i+1}` fallback;
 * - the per-tab close button exists ONLY when more than one tab is open;
 * - Dashboard / tab-select / add / close / clear each fire their own callback
 *   with the right argument;
 * - active state (`aria-selected` per tab, `aria-pressed` on Dashboard) is keyed
 *   off `activeView` + `activeTabId`;
 * - the clear button is `disabled` (and does NOT fire) when `clearDisabled`;
 * - the Dashboard badge appears only while `needsInputCount > 0`.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { PianolaWorkspaceTabs } from '../../../../renderer/components/PianolaDashboard/PianolaWorkspaceTabs';
import type { AITab, Theme } from '../../../../renderer/types';

const theme = {
	colors: {
		bgSidebar: '#111',
		border: '#333',
		textMain: '#eee',
		textDim: '#999',
		accent: '#4af',
		accentForeground: '#000',
		warning: '#fa0',
		error: '#f44',
	},
} as unknown as Theme;

function tab(overrides: Partial<AITab> = {}): AITab {
	return {
		id: 't-1',
		agentSessionId: null,
		name: null,
		starred: false,
		logs: [],
		inputValue: '',
		stagedImages: [],
		createdAt: 0,
		state: 'idle',
		...overrides,
	} as unknown as AITab;
}

type Props = Parameters<typeof PianolaWorkspaceTabs>[0];

function renderTabs(overrides: Partial<Props> = {}) {
	const handlers = {
		onSelectView: vi.fn(),
		onSelectTab: vi.fn(),
		onNewTab: vi.fn(),
		onCloseTab: vi.fn(),
		onClearActiveChat: vi.fn(),
	};
	const props: Props = {
		theme,
		activeView: 'chat',
		needsInputCount: 0,
		tabs: [tab({ id: 't-1' })],
		activeTabId: 't-1',
		clearDisabled: false,
		...handlers,
		...overrides,
	};
	render(<PianolaWorkspaceTabs {...props} />);
	return handlers;
}

afterEach(cleanup);

describe('PianolaWorkspaceTabs', () => {
	it('renders the container plus one chat chip per tab', () => {
		renderTabs({
			tabs: [tab({ id: 'a' }), tab({ id: 'b' }), tab({ id: 'c' })],
			activeTabId: 'a',
		});
		expect(screen.getByTestId('pianola-workspace-tabs')).toBeInTheDocument();
		expect(screen.getAllByTestId('pianola-chat-tab')).toHaveLength(3);
	});

	it('labels a named tab by its name and an unnamed tab by the Chat {i+1} fallback', () => {
		renderTabs({
			tabs: [tab({ id: 'a', name: null }), tab({ id: 'b', name: 'Roadmap' })],
			activeTabId: 'a',
		});
		// index 0 has no name -> "Chat 1"; index 1 uses its name.
		expect(screen.getByText('Chat 1')).toBeInTheDocument();
		expect(screen.getByText('Roadmap')).toBeInTheDocument();
		expect(screen.queryByText('Chat 2')).toBeNull();
	});

	it('renders NO close button for a single tab and one per tab for two+', () => {
		renderTabs({ tabs: [tab({ id: 'only' })], activeTabId: 'only' });
		expect(screen.queryByTestId('pianola-close-chat')).toBeNull();

		cleanup();
		renderTabs({ tabs: [tab({ id: 'a' }), tab({ id: 'b' })], activeTabId: 'a' });
		expect(screen.getAllByTestId('pianola-close-chat')).toHaveLength(2);
	});

	it('fires onSelectTab with the tab id when a chat chip is clicked', () => {
		const h = renderTabs({
			tabs: [tab({ id: 'a', name: 'Alpha' }), tab({ id: 'b', name: 'Beta' })],
			activeTabId: 'a',
		});
		fireEvent.click(screen.getByText('Beta'));
		expect(h.onSelectTab).toHaveBeenCalledTimes(1);
		expect(h.onSelectTab).toHaveBeenCalledWith('b');
	});

	it('fires onSelectView("dashboard") when the Dashboard button is clicked', () => {
		const h = renderTabs();
		fireEvent.click(screen.getByTestId('pianola-tab-dashboard'));
		expect(h.onSelectView).toHaveBeenCalledTimes(1);
		expect(h.onSelectView).toHaveBeenCalledWith('dashboard');
	});

	it('marks only the matching tab aria-selected in chat view (Dashboard not pressed)', () => {
		renderTabs({
			tabs: [tab({ id: 'a' }), tab({ id: 'b' })],
			activeView: 'chat',
			activeTabId: 'b',
		});
		const chips = screen.getAllByTestId('pianola-chat-tab');
		expect(chips[0]).toHaveAttribute('aria-selected', 'false');
		expect(chips[1]).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByTestId('pianola-tab-dashboard')).toHaveAttribute('aria-pressed', 'false');
	});

	it('selects no chat tab and presses Dashboard when activeView is dashboard', () => {
		renderTabs({
			tabs: [tab({ id: 'a' }), tab({ id: 'b' })],
			activeView: 'dashboard',
			activeTabId: 'b',
		});
		for (const chip of screen.getAllByTestId('pianola-chat-tab')) {
			expect(chip).toHaveAttribute('aria-selected', 'false');
		}
		expect(screen.getByTestId('pianola-tab-dashboard')).toHaveAttribute('aria-pressed', 'true');
	});

	it('fires onNewTab when the add button is clicked', () => {
		const h = renderTabs();
		fireEvent.click(screen.getByTestId('pianola-add-chat'));
		expect(h.onNewTab).toHaveBeenCalledTimes(1);
	});

	it('fires onCloseTab with the id of the clicked tab', () => {
		const h = renderTabs({
			tabs: [tab({ id: 'a' }), tab({ id: 'b' })],
			activeTabId: 'a',
		});
		// close buttons are in tab order, so the second belongs to tab 'b'.
		fireEvent.click(screen.getAllByTestId('pianola-close-chat')[1]);
		expect(h.onCloseTab).toHaveBeenCalledTimes(1);
		expect(h.onCloseTab).toHaveBeenCalledWith('b');
	});

	it('fires onClearActiveChat when the clear button is enabled', () => {
		const h = renderTabs({ clearDisabled: false });
		fireEvent.click(screen.getByTestId('pianola-clear-chat'));
		expect(h.onClearActiveChat).toHaveBeenCalledTimes(1);
	});

	it('disables the clear button and does NOT fire when clearDisabled is true', () => {
		const h = renderTabs({ clearDisabled: true });
		const clear = screen.getByTestId('pianola-clear-chat') as HTMLButtonElement;
		expect(clear.disabled).toBe(true);
		fireEvent.click(clear);
		expect(h.onClearActiveChat).not.toHaveBeenCalled();
	});

	it('badges the Dashboard with the count when needsInputCount > 0', () => {
		renderTabs({ needsInputCount: 7 });
		expect(screen.getByTestId('pianola-tab-dashboard')).toHaveTextContent('Dashboard7');
	});

	it('shows no badge when needsInputCount is 0', () => {
		renderTabs({ needsInputCount: 0 });
		const dashboard = screen.getByTestId('pianola-tab-dashboard');
		expect(dashboard).toHaveTextContent('Dashboard');
		expect(dashboard.textContent).toBe('Dashboard');
	});
});
