import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RichOverview } from '../../../../renderer/components/DirectorNotes/RichOverview';
import { mockTheme } from '../../../helpers/mockTheme';

// Narrative markdown is rendered through a stub so we can assert its content.
vi.mock('../../../../renderer/components/MarkdownRenderer', () => ({
	MarkdownRenderer: ({ content }: { content: string }) => (
		<div data-testid="markdown-renderer">{content}</div>
	),
}));

// Error boundary is a passthrough in tests (no error path exercised here).
vi.mock('../../../../renderer/components/UsageDashboard/ChartErrorBoundary', () => ({
	ChartErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Prose styles are irrelevant to behavior here.
vi.mock('../../../../renderer/utils/markdownConfig', () => ({
	generateTerminalProseStyles: () => '',
}));

// Deterministic lookback conversion so we can assert the IPC call arguments.
vi.mock('../../../../renderer/components/DirectorNotes/lookback', () => ({
	daysToLookbackHours: (days: number) => (days <= 0 ? null : 168),
	bucketCountForLookback: () => 28,
}));

// Settings store: colorblind off.
vi.mock('../../../../renderer/stores/settingsStore', () => ({
	useSettingsStore: (selector: (s: { colorBlindMode: boolean }) => unknown) =>
		selector({ colorBlindMode: false }),
}));

const mockGetGraphData = vi.fn();
const mockGetUnifiedHistory = vi.fn();

const SYNOPSIS = '# Director Notes\n\nNarrative body.';
const STATS = { agentCount: 9, entryCount: 99, durationMs: 5000 };

beforeEach(() => {
	mockGetGraphData.mockResolvedValue({
		buckets: [
			{ auto: 2, user: 1, cue: 0 },
			{ auto: 0, user: 3, cue: 1 },
		],
		bucketCount: 28,
		earliestTimestamp: 0,
		latestTimestamp: 0,
		totalCount: 7,
		autoCount: 2,
		userCount: 4,
		cueCount: 1,
		cached: false,
		stats: {
			agentCount: 2,
			sessionCount: 2,
			autoCount: 30,
			userCount: 60,
			cueCount: 10,
			totalCount: 100,
		},
	});
	mockGetUnifiedHistory.mockResolvedValue({
		entries: [
			{
				id: '1',
				type: 'USER',
				timestamp: 0,
				summary: '',
				projectPath: '',
				sourceSessionId: 's1',
				agentName: 'alpha',
			},
			{
				id: '2',
				type: 'AUTO',
				timestamp: 0,
				summary: '',
				projectPath: '',
				sourceSessionId: 's1',
				agentName: 'alpha',
			},
			{
				id: '3',
				type: 'USER',
				timestamp: 0,
				summary: '',
				projectPath: '',
				sourceSessionId: 's2',
				agentName: 'beta',
			},
		],
		total: 3,
		limit: 1000,
		offset: 0,
		hasMore: false,
		stats: {
			agentCount: 2,
			sessionCount: 2,
			autoCount: 30,
			userCount: 60,
			cueCount: 10,
			totalCount: 100,
		},
	});

	(window as unknown as { maestro: unknown }).maestro = {
		directorNotes: {
			getGraphData: mockGetGraphData,
			getUnifiedHistory: mockGetUnifiedHistory,
		},
	};
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('RichOverview', () => {
	it('queries getGraphData and getUnifiedHistory with derived args on mount', async () => {
		render(<RichOverview theme={mockTheme} stats={STATS} synopsis={SYNOPSIS} lookbackDays={7} />);

		await waitFor(() => {
			expect(mockGetGraphData).toHaveBeenCalledWith(28, 168);
		});
		expect(mockGetUnifiedHistory).toHaveBeenCalledWith({ lookbackDays: 7, limit: 1000 });
	});

	it('renders headline stat cards from the deterministic aggregates', async () => {
		render(<RichOverview theme={mockTheme} stats={STATS} synopsis={SYNOPSIS} lookbackDays={7} />);

		await waitFor(() => {
			expect(screen.getByText('Total Entries')).toBeInTheDocument();
		});
		expect(screen.getByText('Agents')).toBeInTheDocument();
		expect(screen.getByText('Auto vs User')).toBeInTheDocument();
		// AUTO/USER split: 30 / 60, with auto% = round(30/90) = 33.
		expect(screen.getByText('30 / 60')).toBeInTheDocument();
		expect(screen.getByText('33% auto · 67% user')).toBeInTheDocument();
		// Generation-time card from the synopsis stats prop.
		expect(screen.getByText('Generation Time')).toBeInTheDocument();
		expect(screen.getByText('5.00s')).toBeInTheDocument();
	});

	it('renders the source breakdown percentages over the full AUTO/USER/CUE total', async () => {
		render(<RichOverview theme={mockTheme} stats={STATS} synopsis={SYNOPSIS} lookbackDays={7} />);

		await waitFor(() => {
			// user 60/100, auto 30/100, cue 10/100
			expect(screen.getByText('60%')).toBeInTheDocument();
		});
		expect(screen.getByText('30%')).toBeInTheDocument();
		expect(screen.getByText('10%')).toBeInTheDocument();
	});

	it('renders per-agent bars derived from the entries sample', async () => {
		render(<RichOverview theme={mockTheme} stats={STATS} synopsis={SYNOPSIS} lookbackDays={7} />);

		await waitFor(() => {
			expect(screen.getByText('alpha')).toBeInTheDocument();
		});
		expect(screen.getByText('beta')).toBeInTheDocument();
	});

	it('renders the AI narrative markdown below the widgets', async () => {
		render(<RichOverview theme={mockTheme} stats={STATS} synopsis={SYNOPSIS} lookbackDays={7} />);

		await waitFor(() => {
			expect(screen.getByTestId('markdown-renderer')).toBeInTheDocument();
		});
		expect(screen.getByTestId('markdown-renderer')).toHaveTextContent('Narrative body.');
	});

	it('omits the generation-time card when no stats are provided', async () => {
		render(<RichOverview theme={mockTheme} stats={null} synopsis={SYNOPSIS} lookbackDays={7} />);

		await waitFor(() => {
			expect(screen.getByText('Total Entries')).toBeInTheDocument();
		});
		expect(screen.queryByText('Generation Time')).not.toBeInTheDocument();
	});

	it('refetches when the lookback window changes', async () => {
		const { rerender } = render(
			<RichOverview theme={mockTheme} stats={STATS} synopsis={SYNOPSIS} lookbackDays={7} />
		);
		await waitFor(() => {
			expect(mockGetUnifiedHistory).toHaveBeenCalledTimes(1);
		});

		rerender(
			<RichOverview theme={mockTheme} stats={STATS} synopsis={SYNOPSIS} lookbackDays={30} />
		);
		await waitFor(() => {
			expect(mockGetUnifiedHistory).toHaveBeenCalledTimes(2);
		});
		expect(mockGetUnifiedHistory).toHaveBeenLastCalledWith({ lookbackDays: 30, limit: 1000 });
	});
});
