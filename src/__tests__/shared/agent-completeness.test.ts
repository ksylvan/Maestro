/**
 * Cross-registry completeness checks for supported agents.
 */

import { describe, expect, it } from 'vitest';

import { AGENT_CAPABILITIES } from '../../main/agents/capabilities';
import { AGENT_DEFINITIONS, getAgentIds } from '../../main/agents/definitions';
import { DEFAULT_CONTEXT_WINDOWS } from '../../shared/agentConstants';
import { AGENT_IDS } from '../../shared/agentIds';
import { AGENT_DISPLAY_NAMES, BETA_AGENTS } from '../../shared/agentMetadata';

describe('agent completeness', () => {
	it('keeps AGENT_DEFINITIONS aligned with AGENT_IDS', () => {
		expect(getAgentIds().sort()).toEqual([...AGENT_IDS].sort());
		expect(AGENT_DEFINITIONS.map((definition) => definition.id).sort()).toEqual(
			[...AGENT_IDS].sort()
		);
	});

	it('has display names and capabilities for every known agent id', () => {
		for (const agentId of AGENT_IDS) {
			expect(AGENT_DISPLAY_NAMES[agentId]).toBeTruthy();
			expect(AGENT_CAPABILITIES[agentId]).toBeDefined();
		}
	});

	it('only references valid agent ids in shared partial registries', () => {
		for (const agentId of Object.keys(DEFAULT_CONTEXT_WINDOWS)) {
			expect(AGENT_IDS).toContain(agentId);
		}

		for (const agentId of BETA_AGENTS) {
			expect(AGENT_IDS).toContain(agentId);
		}
	});

	it('locks Hermes and Pi into every expected prototype registry', () => {
		for (const agentId of ['hermes', 'pi'] as const) {
			expect(AGENT_IDS).toContain(agentId);
			expect(getAgentIds()).toContain(agentId);
			expect(AGENT_DISPLAY_NAMES[agentId]).toBeTruthy();
			expect(AGENT_CAPABILITIES[agentId]).toBeDefined();
			expect(DEFAULT_CONTEXT_WINDOWS[agentId]).toBeGreaterThan(0);
			expect(BETA_AGENTS.has(agentId)).toBe(true);
		}
	});
});
