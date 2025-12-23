/**
 * Context Merge Types
 *
 * Types for merging session contexts and transferring context between agents.
 * Used by the context grooming service to combine multiple sessions or tabs
 * into a unified, optimized context for a new session.
 */

import type { ToolType, UsageStats } from '../../shared/types';
import type { LogEntry } from './index';

/**
 * Represents a source of context data that can be merged.
 * Can be either an open tab within a session or a stored agent session.
 */
export interface ContextSource {
  /** Whether this is a tab within a session or a stored session */
  type: 'tab' | 'session';
  /** The Maestro session ID containing this context */
  sessionId: string;
  /** For tabs: the specific tab ID */
  tabId?: string;
  /** The agent session ID (e.g., Claude's internal session ID) */
  agentSessionId?: string;
  /** Project root path for this context */
  projectRoot: string;
  /** Display name for this context source */
  name: string;
  /** The conversation logs to be merged */
  logs: LogEntry[];
  /** Token usage statistics for this context */
  usageStats?: UsageStats;
  /** The agent type that created this context */
  agentType: ToolType;
}

/**
 * Request to merge multiple contexts into a new session.
 */
export interface MergeRequest {
  /** The contexts to be merged (minimum 1, typically 2 or more) */
  sources: ContextSource[];
  /** The agent type for the target merged session */
  targetAgent: ToolType;
  /** Project root path for the target session */
  targetProjectRoot: string;
  /** Optional custom prompt for the grooming agent */
  groomingPrompt?: string;
}

/**
 * Result of a context merge operation.
 */
export interface MergeResult {
  /** Whether the merge completed successfully */
  success: boolean;
  /** ID of the newly created Maestro session (on success) */
  newSessionId?: string;
  /** ID of the active tab in the new session (on success) */
  newTabId?: string;
  /** Error message if the merge failed */
  error?: string;
  /** Estimated tokens saved by grooming/deduplication */
  tokensSaved?: number;
}

/**
 * Progress information during a context merge operation.
 * Used to update the UI during long-running merge operations.
 */
export interface GroomingProgress {
  /** Current stage of the grooming process */
  stage: 'collecting' | 'grooming' | 'creating' | 'complete';
  /** Progress percentage (0-100) */
  progress: number;
  /** Human-readable status message */
  message: string;
}

/**
 * Information about duplicate content found across contexts.
 * Used to estimate potential token savings from deduplication.
 */
export interface DuplicateInfo {
  /** Index of the source context containing the duplicate */
  sourceIndex: number;
  /** The duplicated content snippet */
  content: string;
}

/**
 * Result of duplicate content detection across contexts.
 */
export interface DuplicateDetectionResult {
  /** List of detected duplicates with their source indices */
  duplicates: DuplicateInfo[];
  /** Estimated token savings from removing duplicates */
  estimatedSavings: number;
}
