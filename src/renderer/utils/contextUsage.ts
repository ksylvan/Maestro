/**
 * Context Usage Estimation Utilities
 *
 * Provides fallback estimation for context window usage when agents
 * don't report their context window size directly.
 */

import type { ToolType } from '../types';
import type { UsageStats } from '../../shared/types';

/**
 * Default context window sizes for different agents.
 * Used as fallback when the agent doesn't report its context window size.
 */
export const DEFAULT_CONTEXT_WINDOWS: Record<ToolType, number> = {
	'claude-code': 200000, // Claude 3.5 Sonnet/Claude 4 default context
	claude: 200000, // Legacy Claude
	codex: 200000, // OpenAI o3/o4-mini context window
	opencode: 128000, // OpenCode (depends on model, 128k is conservative default)
	'factory-droid': 200000, // Factory Droid (varies by model, defaults to Claude Opus)
	terminal: 0, // Terminal has no context window
};

/**
 * Agents that use combined input+output context windows.
 * OpenAI models (Codex, o3, o4-mini) have a single context window that includes
 * both input and output tokens, unlike Claude which has separate limits.
 */
const COMBINED_CONTEXT_AGENTS: Set<ToolType> = new Set(['codex']);

/**
 * Calculate total context tokens based on agent-specific semantics.
 *
 * For Claude models, context tokens include:
 * - inputTokens: New uncached tokens sent to the model
 * - cacheCreationInputTokens: Tokens being cached for the first time
 * - cacheReadInputTokens: Tokens read from cache (still occupy context window)
 *
 * Note: Cached tokens still occupy space in the context window - they're just
 * cheaper to process. ClawdBot uses this same formula: input + cacheRead + cacheWrite
 *
 * For OpenAI models (Codex), context = input + output (combined limit)
 *
 * @param stats - The usage statistics containing token counts
 * @param agentId - The agent identifier for agent-specific calculation
 * @returns Total context tokens used
 */
export function calculateContextTokens(
	stats: Pick<
		UsageStats,
		'inputTokens' | 'outputTokens' | 'cacheReadInputTokens' | 'cacheCreationInputTokens'
	>,
	agentId?: ToolType
): number {
	// For Claude: total context = input + cacheCreation + cacheRead
	// All these tokens occupy the context window, regardless of caching
	const baseTokens =
		stats.inputTokens +
		(stats.cacheCreationInputTokens || 0) +
		(stats.cacheReadInputTokens || 0);

	// OpenAI models have combined input+output context limits
	if (agentId && COMBINED_CONTEXT_AGENTS.has(agentId)) {
		return baseTokens + stats.outputTokens;
	}

	// Claude models: output tokens don't consume context window
	return baseTokens;
}

/**
 * Estimate context usage percentage when the agent doesn't provide it directly.
 * Uses agent-specific default context window sizes for accurate estimation.
 *
 * Context calculation varies by agent:
 * - Claude models: inputTokens + cacheCreationInputTokens + cacheReadInputTokens
 *   (all tokens in context, output has separate limit)
 * - OpenAI models (Codex): inputTokens + outputTokens
 *   (combined context window includes both input and output)
 *
 * @param stats - The usage statistics containing token counts
 * @param agentId - The agent identifier for agent-specific context window size
 * @returns Estimated context usage percentage (0-100), or null if cannot be estimated
 */
export function estimateContextUsage(
	stats: Pick<
		UsageStats,
		| 'inputTokens'
		| 'outputTokens'
		| 'cacheReadInputTokens'
		| 'cacheCreationInputTokens'
		| 'contextWindow'
	>,
	agentId?: ToolType
): number | null {
	// Calculate total context using agent-specific semantics
	const totalContextTokens = calculateContextTokens(stats, agentId);

	// If context window is provided and valid, use it
	if (stats.contextWindow && stats.contextWindow > 0) {
		return Math.min(100, Math.round((totalContextTokens / stats.contextWindow) * 100));
	}

	// If no agent specified or terminal, cannot estimate
	if (!agentId || agentId === 'terminal') {
		return null;
	}

	// Use agent-specific default context window
	const defaultContextWindow = DEFAULT_CONTEXT_WINDOWS[agentId];
	if (!defaultContextWindow || defaultContextWindow <= 0) {
		return null;
	}

	if (totalContextTokens <= 0) {
		return 0;
	}

	return Math.min(100, Math.round((totalContextTokens / defaultContextWindow) * 100));
}
