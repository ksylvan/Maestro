/**
 * @file goal-runner.test.ts
 * @description Tests for the CLI Goal-Driven Auto Run engine (runGoal).
 *
 * runGoal is the CLI counterpart to the desktop useGoalRunner hook. It drives the
 * shared pure goal engine (src/shared/goalDriven/*): each iteration spawns a fresh
 * agent with the goal prompt, parses self-reported progress markers, records the
 * iteration, and asks the pure exit evaluator whether to continue. These tests
 * mock the CLI spawn/IO primitives and assert the loop + emitted JSONL events.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SessionInfo } from '../../../shared/types';
import type { JsonlEvent } from '../../../cli/output/jsonl';
import type { GoalRunConfig } from '../../../shared/goalDriven/types';

vi.mock('../../../cli/services/agent-spawner', () => ({
	spawnAgent: vi.fn(),
}));

vi.mock('../../../cli/services/system-prompt', () => ({
	prepareMaestroSystemPromptCli: vi.fn(),
}));

vi.mock('../../../cli/services/prompt-loader', () => ({
	getCliPrompt: vi
		.fn()
		.mockResolvedValue('Goal: {{GOAL}}\nExit: {{GOAL_EXIT_CRITERIA}}\nN: {{LOOP_NUMBER}}'),
}));

vi.mock('../../../cli/services/storage', () => ({
	addHistoryEntry: vi.fn(),
	readGroups: vi.fn(),
}));

vi.mock('../../../cli/services/git-utils', () => ({
	getGitBranch: vi.fn().mockReturnValue('main'),
	isGitRepo: vi.fn().mockReturnValue(false),
}));

vi.mock('../../../shared/cli-activity', () => ({
	registerCliActivity: vi.fn(),
	unregisterCliActivity: vi.fn(),
}));

vi.mock('../../../main/utils/logger', () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		toast: vi.fn(),
		autorun: vi.fn(),
	},
}));

import { runGoal } from '../../../cli/services/goal-runner';
import { spawnAgent } from '../../../cli/services/agent-spawner';
import { prepareMaestroSystemPromptCli } from '../../../cli/services/system-prompt';
import { addHistoryEntry, readGroups } from '../../../cli/services/storage';
import { registerCliActivity, unregisterCliActivity } from '../../../shared/cli-activity';

describe('goal-runner (runGoal)', () => {
	const mockSession = (overrides: Partial<SessionInfo> = {}): SessionInfo => ({
		id: 'session-123',
		name: 'Test Session',
		toolType: 'claude-code',
		cwd: '/path/to/project',
		projectRoot: '/path/to/project',
		...overrides,
	});

	const goalConfig = (overrides: Partial<GoalRunConfig> = {}): GoalRunConfig => ({
		goal: 'Ship the feature',
		exitCriteria: 'All tests pass',
		maxIterations: null,
		...overrides,
	});

	/** Build an agent response carrying a progress marker. */
	const progressResponse = (n: number, rationale?: string): string =>
		rationale
			? `Did work toward ${n}.\n\n<!-- maestro:progress ${n} | ${rationale} -->`
			: `Did work toward ${n}.\n\n<!-- maestro:progress ${n} -->`;

	async function collectEvents(generator: AsyncGenerator<JsonlEvent>): Promise<JsonlEvent[]> {
		const events: JsonlEvent[] = [];
		for await (const event of generator) events.push(event);
		return events;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(readGroups).mockReturnValue([]);
		vi.mocked(prepareMaestroSystemPromptCli).mockResolvedValue(undefined);
		vi.mocked(spawnAgent).mockResolvedValue({
			success: true,
			response: progressResponse(100, 'done'),
			agentSessionId: 'agent-1',
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('emits a goal_start event with the goal config and registers CLI activity', async () => {
		const events = await collectEvents(runGoal(mockSession(), goalConfig()));

		const start = events.find((e) => e.type === 'goal_start');
		expect(start).toBeDefined();
		expect(start?.goal).toBe('Ship the feature');
		expect(start?.exitCriteria).toBe('All tests pass');
		expect(registerCliActivity).toHaveBeenCalledWith(
			expect.objectContaining({ sessionId: 'session-123', playbookId: 'goal-run' })
		);
		// Always unregisters activity, even on the happy path.
		expect(unregisterCliActivity).toHaveBeenCalledWith('session-123');
	});

	it('writes an immediate start marker recording goal + exit criteria', async () => {
		await collectEvents(runGoal(mockSession(), goalConfig({ maxIterations: 10 })));

		const startEntry = vi.mocked(addHistoryEntry).mock.calls[0][0];
		expect(startEntry.summary).toBe('Goal-Driven Auto Run started');
		expect(startEntry.fullResponse).toContain('**Goal:** Ship the feature');
		expect(startEntry.fullResponse).toContain('**Exit Criteria:** All tests pass');
		expect(startEntry.fullResponse).toContain('**Iteration Limit:** 10');
		expect(startEntry.success).toBeUndefined();
	});

	it('completes in one iteration when the agent reports 100%', async () => {
		const events = await collectEvents(runGoal(mockSession(), goalConfig()));

		expect(spawnAgent).toHaveBeenCalledTimes(1);
		// Fresh agent each iteration: no agentSessionId passed in.
		expect(vi.mocked(spawnAgent).mock.calls[0][3]).toBeUndefined();

		const complete = events.find((e) => e.type === 'goal_complete');
		expect(complete?.success).toBe(true);
		expect(complete?.exitReason).toBe('completed');
		expect(complete?.finalProgress).toBe(100);
		expect(complete?.iterations).toBe(1);
	});

	it('loops across iterations and keeps displayed progress monotonic', async () => {
		const responses = [
			progressResponse(30, 'scaffolded'),
			progressResponse(55, 'overconfident'),
			progressResponse(35, 'walked back'),
			progressResponse(100, 'done'),
		];
		let call = 0;
		vi.mocked(spawnAgent).mockImplementation(async () => ({
			success: true,
			response: responses[call++],
			agentSessionId: `agent-${call}`,
		}));

		const events = await collectEvents(runGoal(mockSession(), goalConfig()));

		expect(spawnAgent).toHaveBeenCalledTimes(4);
		const progresses = events
			.filter((e) => e.type === 'goal_iteration_complete')
			.map((e) => e.progress as number);
		// Displayed percent never regresses despite the 55 -> 35 dip.
		expect(progresses).toEqual([30, 55, 55, 100]);
		expect(events.find((e) => e.type === 'goal_complete')?.exitReason).toBe('completed');
	});

	it('stops with "deadlock" when the agent declares one', async () => {
		vi.mocked(spawnAgent).mockResolvedValue({
			success: true,
			response:
				'Blocked.\n\n<!-- maestro:progress 40 -->\n<!-- maestro:deadlock: upstream API down -->',
			agentSessionId: 'agent-1',
		});

		const events = await collectEvents(runGoal(mockSession(), goalConfig()));

		expect(spawnAgent).toHaveBeenCalledTimes(1);
		expect(events.find((e) => e.type === 'goal_complete')?.exitReason).toBe('deadlock');
	});

	it('stops at max-iterations when the goal is never reached', async () => {
		vi.mocked(spawnAgent).mockResolvedValue({
			success: true,
			response: progressResponse(50, 'inching'),
			agentSessionId: 'agent-1',
		});

		const events = await collectEvents(runGoal(mockSession(), goalConfig({ maxIterations: 3 })));

		expect(spawnAgent).toHaveBeenCalledTimes(3);
		expect(events.find((e) => e.type === 'goal_complete')?.exitReason).toBe('max-iterations');
	});

	it('skips history writes when writeHistory is false', async () => {
		await collectEvents(runGoal(mockSession(), goalConfig(), { writeHistory: false }));
		expect(addHistoryEntry).not.toHaveBeenCalled();
	});

	it('threads SSH + per-session overrides into every spawn', async () => {
		const session = mockSession({
			customModel: 'opus',
			customEffort: 'high',
			customArgs: '--foo',
			customEnvVars: { BAR: '1' },
			sessionSshRemoteConfig: { enabled: true, remoteId: 'remote-1' } as never,
		});

		await collectEvents(runGoal(session, goalConfig()));

		const opts = vi.mocked(spawnAgent).mock.calls[0][4];
		expect(opts).toMatchObject({
			customModel: 'opus',
			customEffort: 'high',
			customArgs: '--foo',
			customEnvVars: { BAR: '1' },
			sshRemoteConfig: { enabled: true, remoteId: 'remote-1' },
		});
	});
});
