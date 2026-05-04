/**
 * ActiveRunsList — Displays currently running Cue tasks with stop controls
 * and an expandable live-logs panel that polls the in-flight stdout/stderr
 * buffer of the running process.
 */

import { useEffect, useRef, useState } from 'react';
import { Trash2, StopCircle, ChevronDown, ChevronRight } from 'lucide-react';
import type { Theme } from '../../types';
import type { CueRunResult } from '../../hooks/useCue';
import { getModalActions } from '../../stores/modalStore';
import { CUE_COLOR } from '../../../shared/cue-pipeline-types';
import { cueService } from '../../services/cue';
import { PipelineDot } from './StatusDot';
import { formatElapsed, getPipelineForSubscription } from './cueModalUtils';

interface ActiveRunsListProps {
	runs: CueRunResult[];
	theme: Theme;
	onStopRun: (runId: string) => void;
	onStopAll: () => void;
	subscriptionPipelineMap: Map<string, { name: string; color: string }>;
}

const LIVE_OUTPUT_POLL_MS = 1500;
const LIVE_OUTPUT_TAIL_CHARS = 8000;

export function ActiveRunsList({
	runs,
	theme,
	onStopRun,
	onStopAll,
	subscriptionPipelineMap,
}: ActiveRunsListProps) {
	// Track which run rows have their live-logs panel expanded.
	const [expandedRunIds, setExpandedRunIds] = useState<Set<string>>(() => new Set());

	const toggleExpanded = (runId: string) => {
		setExpandedRunIds((prev) => {
			const next = new Set(prev);
			if (next.has(runId)) next.delete(runId);
			else next.add(runId);
			return next;
		});
	};

	// Drop expansions for runs that have completed since last render so a
	// stale entry can't keep polling forever after the run finishes.
	useEffect(() => {
		const liveIds = new Set(runs.map((r) => r.runId));
		setExpandedRunIds((prev) => {
			let changed = false;
			const next = new Set<string>();
			for (const id of prev) {
				if (liveIds.has(id)) next.add(id);
				else changed = true;
			}
			return changed ? next : prev;
		});
	}, [runs]);

	if (runs.length === 0) {
		return (
			<div className="text-sm py-3" style={{ color: theme.colors.textDim }}>
				No active runs
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{runs.length > 1 && (
				<div className="flex justify-end">
					<button
						onClick={onStopAll}
						className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:opacity-80 transition-opacity"
						style={{ color: theme.colors.error }}
					>
						<StopCircle className="w-3.5 h-3.5" />
						Stop All
					</button>
				</div>
			)}
			{runs.map((run) => {
				const expanded = expandedRunIds.has(run.runId);
				return (
					<div
						key={run.runId}
						className="rounded"
						style={{ backgroundColor: theme.colors.bgActivity }}
					>
						<div className="flex items-center gap-3 px-3 py-2">
							<button
								onClick={() =>
									getModalActions().showConfirmation(`Stop run "${run.subscriptionName}"?`, () =>
										onStopRun(run.runId)
									)
								}
								className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
								title="Stop run"
							>
								<Trash2 className="w-3.5 h-3.5" style={{ color: theme.colors.error }} />
							</button>
							<button
								onClick={() => toggleExpanded(run.runId)}
								className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
								title={expanded ? 'Hide live logs' : 'Show live logs'}
								aria-expanded={expanded}
							>
								{expanded ? (
									<ChevronDown className="w-3.5 h-3.5" style={{ color: theme.colors.textDim }} />
								) : (
									<ChevronRight className="w-3.5 h-3.5" style={{ color: theme.colors.textDim }} />
								)}
							</button>
							<div className="flex-1 min-w-0 flex items-center gap-1.5">
								{(() => {
									const pInfo = getPipelineForSubscription(
										run.subscriptionName,
										subscriptionPipelineMap
									);
									return pInfo ? <PipelineDot color={pInfo.color} name={pInfo.name} /> : null;
								})()}
								<span style={{ color: theme.colors.textMain }}>{run.sessionName}</span>
								<span style={{ color: theme.colors.textDim }}>—</span>
								<span style={{ color: CUE_COLOR }}>"{run.subscriptionName}"</span>
							</div>
							<span
								className="text-xs font-mono flex-shrink-0"
								style={{ color: theme.colors.textDim }}
							>
								{formatElapsed(run.startedAt)}
							</span>
						</div>
						{expanded && <LiveOutputPanel runId={run.runId} theme={theme} />}
					</div>
				);
			})}
		</div>
	);
}

interface LiveOutputPanelProps {
	runId: string;
	theme: Theme;
}

/**
 * Polls the main process for the in-flight stdout/stderr buffer of a running
 * Cue run and renders the tail in a scrollable monospace panel. Polling
 * stops automatically when the panel unmounts (parent toggles expansion off
 * or the run leaves activeRuns) — see `ActiveRunsList`'s cleanup effect.
 */
function LiveOutputPanel({ runId, theme }: LiveOutputPanelProps) {
	const [stdout, setStdout] = useState('');
	const [stderr, setStderr] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [stale, setStale] = useState(false);
	const preRef = useRef<HTMLPreElement>(null);
	const userScrolledUpRef = useRef(false);

	useEffect(() => {
		let cancelled = false;
		const tick = async () => {
			try {
				const out = await cueService.getRunLiveOutput(runId);
				if (cancelled) return;
				if (out === null) {
					// Run is no longer active — keep whatever was last shown but
					// flag it as stale so the user knows it's frozen.
					setStale(true);
					return;
				}
				setError(null);
				setStdout(out.stdout);
				setStderr(out.stderr);
			} catch (e) {
				if (cancelled) return;
				setError(e instanceof Error ? e.message : String(e));
			}
		};
		tick();
		const id = setInterval(tick, LIVE_OUTPUT_POLL_MS);
		return () => {
			cancelled = true;
			clearInterval(id);
		};
	}, [runId]);

	// Auto-scroll to bottom on new content unless the user scrolled up.
	useEffect(() => {
		const el = preRef.current;
		if (!el || userScrolledUpRef.current) return;
		el.scrollTop = el.scrollHeight;
	}, [stdout, stderr]);

	const handleScroll = () => {
		const el = preRef.current;
		if (!el) return;
		const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
		userScrolledUpRef.current = distanceFromBottom > 20;
	};

	const tailStdout =
		stdout.length > LIVE_OUTPUT_TAIL_CHARS ? stdout.slice(-LIVE_OUTPUT_TAIL_CHARS) : stdout;
	const tailStderr =
		stderr.length > LIVE_OUTPUT_TAIL_CHARS ? stderr.slice(-LIVE_OUTPUT_TAIL_CHARS) : stderr;
	const hasAny = tailStdout.length > 0 || tailStderr.length > 0;

	return (
		<div className="px-3 pb-3 text-xs" style={{ borderTop: `1px solid ${theme.colors.border}` }}>
			{error && (
				<div className="mt-2 mb-1" style={{ color: theme.colors.error }}>
					Failed to fetch live output: {error}
				</div>
			)}
			{stale && !error && (
				<div className="mt-2 mb-1" style={{ color: theme.colors.textDim }}>
					Run finished — showing last buffered output. Full result available in Activity Log once it
					lands.
				</div>
			)}
			<pre
				ref={preRef}
				onScroll={handleScroll}
				className="font-mono whitespace-pre-wrap break-words rounded px-2 py-1.5 mt-2"
				style={{
					maxHeight: 280,
					overflowY: 'auto',
					backgroundColor: theme.colors.bgMain,
					color: theme.colors.textMain,
					border: `1px solid ${theme.colors.border}`,
					margin: 0,
				}}
			>
				{!hasAny && !error && (
					<span style={{ color: theme.colors.textDim }}>
						Waiting for output… (polling every {Math.round(LIVE_OUTPUT_POLL_MS / 1000)}s)
					</span>
				)}
				{tailStdout}
				{tailStderr && (
					<>
						{tailStdout && '\n'}
						<span style={{ color: theme.colors.error }}>{tailStderr}</span>
					</>
				)}
			</pre>
		</div>
	);
}
