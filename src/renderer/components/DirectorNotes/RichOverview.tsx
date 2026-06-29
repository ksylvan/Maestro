/**
 * RichOverview
 *
 * The Director's Notes "Rich Mode" dashboard. Composes the shared
 * presentational widget library (`components/widgets`) from real, deterministic
 * data: headline stat cards, an activity timeline, a source/type breakdown, and
 * per-agent bars. Every number comes from the existing IPC bridges
 * (`getGraphData` for activity buckets, `getUnifiedHistory` for AUTO/USER/CUE +
 * agent counts) - never from the LLM. The AI narrative markdown is rendered
 * below the widgets via the existing MarkdownRenderer. Each chart is wrapped in
 * ChartErrorBoundary so a single widget failure never blanks the tab.
 */

import { useEffect, useRef, useState } from 'react';
import { History, Bot, Zap, Timer, Activity, PieChart, Users, FileText } from 'lucide-react';
import type { Theme } from '../../types';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { ChartErrorBoundary } from '../UsageDashboard/ChartErrorBoundary';
import { Spinner } from '../ui/Spinner';
import { CUE_COLOR } from '../../../shared/cue-pipeline-types';
import { formatNumber } from '../../../shared/formatters';
import { formatDuration } from '../../../shared/performance-metrics';
import { generateTerminalProseStyles } from '../../utils/markdownConfig';
import { safeClipboardWrite } from '../../utils/clipboard';
import { useSettingsStore } from '../../stores/settingsStore';
import { COLORBLIND_STATUS_COLORS } from '../../constants/colorblindPalettes';
import { logger } from '../../utils/logger';
import { daysToLookbackHours, bucketCountForLookback } from './lookback';
import {
	StatCardGrid,
	SectionCard,
	ActivityTimeline,
	TypeBreakdown,
	AgentActivityBars,
	type StatCardDatum,
	type BarDatum,
	type DonutSlice,
	type TimelineBucket,
} from '../widgets';

/** Derived from the IPC contract so this stays in sync with the bridge. */
type SynopsisStats = NonNullable<
	Awaited<ReturnType<typeof window.maestro.directorNotes.generateSynopsis>>['stats']
>;
type GraphData = Awaited<ReturnType<typeof window.maestro.directorNotes.getGraphData>>;
type UnifiedHistory = Awaited<ReturnType<typeof window.maestro.directorNotes.getUnifiedHistory>>;

interface RichOverviewProps {
	theme: Theme;
	/** Deterministic generation stats from the synopsis call (for the generation-time card). */
	stats: SynopsisStats | null;
	/** AI narrative markdown to render below the widgets. */
	synopsis: string;
	/** Lookback window in days; drives the IPC queries. */
	lookbackDays: number;
	/** Forwarded to the narrative MarkdownRenderer (matches Plain-mode behavior). */
	enableBionifyReadingMode?: boolean;
}

/**
 * How many recent entries to sample for the per-agent breakdown. Headline
 * totals (entries, agents, AUTO/USER/CUE) come from the window-wide `stats`
 * aggregate, but the per-agent distribution is computed from the returned
 * entries, so cap the page at a sensible size for the prototype.
 */
const AGENT_SAMPLE_LIMIT = 1000;

export function RichOverview({
	theme,
	stats,
	synopsis,
	lookbackDays,
	enableBionifyReadingMode = false,
}: RichOverviewProps) {
	const colorBlindMode = useSettingsStore((s) => s.colorBlindMode);
	const [graphData, setGraphData] = useState<GraphData | null>(null);
	const [history, setHistory] = useState<UnifiedHistory | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const requestIdRef = useRef(0);

	// Fetch deterministic activity + history aggregates on mount and whenever
	// the lookback window changes. A monotonic request id guards against a
	// slow earlier response clobbering a newer one after rapid changes.
	useEffect(() => {
		const requestId = ++requestIdRef.current;
		const lookbackHours = daysToLookbackHours(lookbackDays);
		const bucketCount = bucketCountForLookback(lookbackHours);
		setIsLoading(true);

		(async () => {
			try {
				const [graph, unified] = await Promise.all([
					window.maestro.directorNotes.getGraphData(bucketCount, lookbackHours),
					window.maestro.directorNotes.getUnifiedHistory({
						lookbackDays,
						limit: AGENT_SAMPLE_LIMIT,
					}),
				]);
				if (requestId !== requestIdRef.current) return;
				setGraphData(graph);
				setHistory(unified);
			} catch (err) {
				if (requestId !== requestIdRef.current) return;
				logger.error('Failed to load Rich Overview data:', undefined, err);
				setGraphData(null);
				setHistory(null);
			} finally {
				if (requestId === requestIdRef.current) setIsLoading(false);
			}
		})();
	}, [lookbackDays]);

	// --- Derive widget data from the deterministic aggregates ---
	const autoColor = colorBlindMode ? COLORBLIND_STATUS_COLORS.warning : theme.colors.warning;
	const userColor = theme.colors.accent;

	const buckets: TimelineBucket[] = graphData?.buckets ?? [];
	const totalsTrend = buckets.map((b) => b.auto + b.user + b.cue);

	const histStats = history?.stats;
	const totalEntries = histStats?.totalCount ?? graphData?.totalCount ?? 0;
	const agentCount = histStats?.agentCount ?? 0;
	const autoCount = histStats?.autoCount ?? graphData?.autoCount ?? 0;
	const userCount = histStats?.userCount ?? graphData?.userCount ?? 0;
	const cueCount = histStats?.cueCount ?? graphData?.cueCount ?? 0;

	const autoUserTotal = autoCount + userCount;
	const autoPct = autoUserTotal > 0 ? Math.round((autoCount / autoUserTotal) * 100) : 0;
	const userPct = autoUserTotal > 0 ? 100 - autoPct : 0;

	const cards: StatCardDatum[] = [
		{
			label: 'Total Entries',
			value: totalEntries,
			icon: History,
			color: userColor,
			trend: totalsTrend,
		},
		{ label: 'Agents', value: agentCount, icon: Bot, color: userColor },
		{
			label: 'Auto vs User',
			value: autoCount,
			displayValue: `${formatNumber(autoCount)} / ${formatNumber(userCount)}`,
			caption: `${autoPct}% auto · ${userPct}% user`,
			icon: Zap,
			color: autoColor,
		},
	];
	if (stats && stats.durationMs > 0) {
		cards.push({
			label: 'Generation Time',
			value: stats.durationMs,
			displayValue: formatDuration(stats.durationMs),
			icon: Timer,
			color: theme.colors.success,
		});
	}

	const slices: DonutSlice[] = [
		{ label: 'User', value: userCount, color: userColor },
		{ label: 'Auto', value: autoCount, color: autoColor },
		{ label: 'Cue', value: cueCount, color: CUE_COLOR },
	];

	// Per-agent entry counts from the sampled entries page.
	const agentBars: BarDatum[] = (() => {
		const counts = new Map<string, number>();
		for (const entry of history?.entries ?? []) {
			const name = entry.agentName || entry.sessionName || 'Unknown agent';
			counts.set(name, (counts.get(name) ?? 0) + 1);
		}
		return Array.from(counts.entries()).map(([label, value]) => ({ label, value }));
	})();

	const proseStyles = generateTerminalProseStyles(theme, '.director-notes-content');

	return (
		<div className="flex flex-col gap-4">
			{/* Headline stat cards */}
			{isLoading && !history ? (
				<div className="flex items-center gap-3 py-6 px-1">
					<Spinner size={18} color={theme.colors.accent} />
					<span className="text-sm" style={{ color: theme.colors.textDim }}>
						Loading activity…
					</span>
				</div>
			) : (
				<StatCardGrid theme={theme} cards={cards} />
			)}

			{/* Activity timeline */}
			<SectionCard theme={theme} title="Activity Timeline" icon={Activity}>
				<ChartErrorBoundary theme={theme} chartName="Activity Timeline">
					<ActivityTimeline
						theme={theme}
						buckets={buckets}
						colors={{ auto: autoColor, user: userColor, cue: CUE_COLOR }}
					/>
				</ChartErrorBoundary>
			</SectionCard>

			{/* Source / type breakdown */}
			<SectionCard theme={theme} title="Source Breakdown" icon={PieChart}>
				<ChartErrorBoundary theme={theme} chartName="Source Breakdown">
					<TypeBreakdown theme={theme} slices={slices} />
				</ChartErrorBoundary>
			</SectionCard>

			{/* Per-agent activity */}
			<SectionCard theme={theme} title="Agent Activity" icon={Users}>
				<ChartErrorBoundary theme={theme} chartName="Agent Activity">
					<AgentActivityBars theme={theme} data={agentBars} />
				</ChartErrorBoundary>
			</SectionCard>

			{/* AI narrative — unchanged markdown, framed in a card for now */}
			{synopsis && (
				<SectionCard theme={theme} title="AI Narrative" icon={FileText}>
					<div className="director-notes-content">
						<style>{proseStyles}</style>
						<MarkdownRenderer
							content={synopsis}
							theme={theme}
							onCopy={(text) => safeClipboardWrite(text)}
							enableBionifyReadingMode={enableBionifyReadingMode}
						/>
					</div>
				</SectionCard>
			)}
		</div>
	);
}

export default RichOverview;
