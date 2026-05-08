import { formatElapsedTime } from '../../../../shared/formatters';
import type { HistoryEntry } from '../../../types';

export interface LoopSummaryParams {
	loopIteration: number;
	loopTasksCompleted: number;
	loopStartTime: number;
	loopTotalInputTokens: number;
	loopTotalOutputTokens: number;
	loopTotalCost: number;
	sessionCwd: string;
	sessionId: string;
	isFinal: boolean;
	exitReason?: string;
}

export function createLoopSummaryEntry(params: LoopSummaryParams): Omit<HistoryEntry, 'id'> {
	const {
		loopIteration,
		loopTasksCompleted,
		loopStartTime,
		loopTotalInputTokens,
		loopTotalOutputTokens,
		loopTotalCost,
		sessionCwd,
		sessionId,
		isFinal,
		exitReason,
	} = params;

	const loopElapsedMs = Date.now() - loopStartTime;
	const loopNumber = loopIteration + 1;
	const summaryPrefix = isFinal ? `Loop ${loopNumber} (final)` : `Loop ${loopNumber}`;
	const loopSummary = `${summaryPrefix} completed: ${loopTasksCompleted} task${loopTasksCompleted !== 1 ? 's' : ''} accomplished`;

	const loopDetails = [
		`**${summaryPrefix} Summary**`,
		'',
		`- **Tasks Accomplished:** ${loopTasksCompleted}`,
		`- **Duration:** ${formatElapsedTime(loopElapsedMs)}`,
		loopTotalInputTokens > 0 || loopTotalOutputTokens > 0
			? `- **Tokens:** ${(loopTotalInputTokens + loopTotalOutputTokens).toLocaleString()} (${loopTotalInputTokens.toLocaleString()} in / ${loopTotalOutputTokens.toLocaleString()} out)`
			: '',
		loopTotalCost > 0 ? `- **Cost:** $${loopTotalCost.toFixed(4)}` : '',
		exitReason ? `- **Exit Reason:** ${exitReason}` : '',
	]
		.filter((line) => line !== '')
		.join('\n');

	return {
		type: 'AUTO',
		timestamp: Date.now(),
		summary: loopSummary,
		fullResponse: loopDetails,
		projectPath: sessionCwd,
		sessionId: sessionId,
		success: true,
		elapsedTimeMs: loopElapsedMs,
		usageStats:
			loopTotalInputTokens > 0 || loopTotalOutputTokens > 0
				? {
						inputTokens: loopTotalInputTokens,
						outputTokens: loopTotalOutputTokens,
						cacheReadInputTokens: 0,
						cacheCreationInputTokens: 0,
						totalCostUsd: loopTotalCost,
						contextWindow: 0,
					}
				: undefined,
	};
}
