/**
 * clearAiTabConversation(session, tabId) — the pure scoped-clear reducer behind
 * Pianola's per-tab "Clear chat":
 * - resets ONLY the target tab (logs -> [], agentSessionId -> null,
 *   inputValue -> '', stagedImages -> []);
 * - every OTHER tab keeps its transcript + agent session (the core
 *   anti-regression: no cross-tab bleed);
 * - session-level fields (session.agentSessionId, activeTabId) are untouched;
 * - an unknown tab id is a no-op returning the SAME session reference.
 */
import { describe, it, expect } from 'vitest';
import { clearAiTabConversation } from '../../../renderer/utils/tabHelpers';
import type { AITab, LogEntry, Session } from '../../../renderer/types';

function log(text: string): LogEntry {
	return { id: `log-${text}`, timestamp: 1, source: 'user', text } as unknown as LogEntry;
}

function tab(overrides: Partial<AITab> = {}): AITab {
	return {
		id: 't-1',
		agentSessionId: 'agent-1',
		name: null,
		starred: false,
		logs: [log('hi')],
		inputValue: 'draft text',
		stagedImages: ['data:image/png;base64,AAAA'],
		createdAt: 0,
		state: 'idle',
		...overrides,
	} as unknown as AITab;
}

function session(tabs: AITab[], overrides: Partial<Session> = {}): Session {
	return {
		id: 's-1',
		name: 'Pianola',
		agentSessionId: 'session-level-agent',
		activeTabId: 't-1',
		aiTabs: tabs,
		...overrides,
	} as unknown as Session;
}

describe('clearAiTabConversation', () => {
	it('clears only the target tab and leaves a second tab fully intact', () => {
		const target = tab({
			id: 'target',
			agentSessionId: 'agent-target',
			logs: [log('a'), log('b')],
			inputValue: 'unsent',
			stagedImages: ['img-1'],
		});
		const other = tab({
			id: 'other',
			agentSessionId: 'agent-other',
			logs: [log('keep-1'), log('keep-2')],
			inputValue: 'other draft',
			stagedImages: ['img-other'],
		});
		const s = session([target, other]);

		const result = clearAiTabConversation(s, 'target');

		const clearedTab = result.aiTabs.find((t) => t.id === 'target')!;
		expect(clearedTab.logs).toEqual([]);
		expect(clearedTab.agentSessionId).toBeNull();
		expect(clearedTab.inputValue).toBe('');
		expect(clearedTab.stagedImages).toEqual([]);

		// Core anti-regression: the non-target tab must NOT bleed. It keeps its
		// transcript, agent session, and draft — and is the same object identity.
		const untouched = result.aiTabs.find((t) => t.id === 'other')!;
		expect(untouched).toBe(other);
		expect(untouched.logs).toEqual([log('keep-1'), log('keep-2')]);
		expect(untouched.agentSessionId).toBe('agent-other');
		expect(untouched.inputValue).toBe('other draft');
		expect(untouched.stagedImages).toEqual(['img-other']);
	});

	it('leaves session-level fields untouched', () => {
		const s = session([tab({ id: 'target' }), tab({ id: 'other' })]);

		const result = clearAiTabConversation(s, 'target');

		expect(result.agentSessionId).toBe('session-level-agent');
		expect(result.activeTabId).toBe('t-1');
		// A real clear returns a fresh session object (React needs a new ref).
		expect(result).not.toBe(s);
	});

	it('returns the same session reference for an unknown tab id', () => {
		const s = session([tab({ id: 'target' }), tab({ id: 'other' })]);

		const result = clearAiTabConversation(s, 'does-not-exist');

		expect(result).toBe(s);
	});
});
