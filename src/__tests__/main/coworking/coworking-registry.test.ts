import { describe, it, expect, beforeEach } from 'vitest';
import { CoworkingRegistry } from '../../../main/coworking/coworking-registry';

describe('CoworkingRegistry', () => {
	let registry: CoworkingRegistry;

	beforeEach(() => {
		registry = new CoworkingRegistry();
	});

	function rec(id: string, tabUuid: string, sessionId: string, cwd = '/tmp', title = 'Terminal') {
		return { id, tabUuid, sessionId, cwd, title };
	}

	it('returns an empty list when no active session is set', () => {
		registry.upsertTerminal(rec('term:1', 'uuid-a', 'sess-1'));
		expect(registry.listForActiveSession()).toEqual([]);
	});

	it('lists terminals for the active session only', () => {
		registry.upsertTerminal(rec('term:1', 'uuid-a', 'sess-1'));
		registry.upsertTerminal(rec('term:1', 'uuid-b', 'sess-2'));
		registry.setActiveSession('sess-1');
		expect(registry.listForActiveSession()).toEqual([
			{ id: 'term:1', cwd: '/tmp', title: 'Terminal' },
		]);
		registry.setActiveSession('sess-2');
		expect(registry.listForActiveSession()).toEqual([
			{ id: 'term:1', cwd: '/tmp', title: 'Terminal' },
		]);
	});

	it('sorts entries by numeric coworkingId', () => {
		registry.upsertTerminal(rec('term:10', 'uuid-c', 'sess-1'));
		registry.upsertTerminal(rec('term:2', 'uuid-d', 'sess-1'));
		registry.upsertTerminal(rec('term:1', 'uuid-a', 'sess-1'));
		registry.setActiveSession('sess-1');
		expect(registry.listForActiveSession().map((e) => e.id)).toEqual([
			'term:1',
			'term:2',
			'term:10',
		]);
	});

	it('resolves public id to tab uuid only within the active session', () => {
		registry.upsertTerminal(rec('term:1', 'uuid-a', 'sess-1'));
		registry.upsertTerminal(rec('term:1', 'uuid-b', 'sess-2'));
		registry.setActiveSession('sess-1');
		expect(registry.resolveTabUuidForActiveSession('term:1')).toBe('uuid-a');
		registry.setActiveSession('sess-2');
		expect(registry.resolveTabUuidForActiveSession('term:1')).toBe('uuid-b');
		registry.setActiveSession(null);
		expect(registry.resolveTabUuidForActiveSession('term:1')).toBeNull();
	});

	it('removeTerminal drops the record', () => {
		registry.upsertTerminal(rec('term:1', 'uuid-a', 'sess-1'));
		registry.setActiveSession('sess-1');
		expect(registry.listForActiveSession()).toHaveLength(1);
		registry.removeTerminal('uuid-a');
		expect(registry.listForActiveSession()).toHaveLength(0);
	});

	it('syncSessionTerminals replaces only the targeted session', () => {
		registry.upsertTerminal(rec('term:1', 'uuid-a', 'sess-1'));
		registry.upsertTerminal(rec('term:1', 'uuid-x', 'sess-2'));
		registry.syncSessionTerminals('sess-1', [
			rec('term:2', 'uuid-b', 'sess-1', '/home', 'Alpha'),
			rec('term:3', 'uuid-c', 'sess-1', '/home', 'Beta'),
		]);
		registry.setActiveSession('sess-1');
		expect(registry.listForActiveSession().map((e) => e.id)).toEqual(['term:2', 'term:3']);
		registry.setActiveSession('sess-2');
		expect(registry.listForActiveSession().map((e) => e.id)).toEqual(['term:1']);
	});

	it("removeSession clears all of a session's terminals", () => {
		registry.upsertTerminal(rec('term:1', 'uuid-a', 'sess-1'));
		registry.upsertTerminal(rec('term:2', 'uuid-b', 'sess-1'));
		registry.upsertTerminal(rec('term:1', 'uuid-c', 'sess-2'));
		registry.removeSession('sess-1');
		registry.setActiveSession('sess-2');
		expect(registry.listForActiveSession()).toHaveLength(1);
		registry.setActiveSession('sess-1');
		expect(registry.listForActiveSession()).toHaveLength(0);
	});

	it('onChange fires on mutations and unsubscribe stops it', () => {
		let calls = 0;
		const off = registry.onChange(() => {
			calls += 1;
		});
		registry.upsertTerminal(rec('term:1', 'uuid-a', 'sess-1'));
		registry.setActiveSession('sess-1');
		registry.removeTerminal('uuid-a');
		expect(calls).toBe(3);
		off();
		registry.upsertTerminal(rec('term:2', 'uuid-b', 'sess-1'));
		expect(calls).toBe(3);
	});

	it('setActiveSession is a no-op when value is unchanged', () => {
		let calls = 0;
		registry.onChange(() => {
			calls += 1;
		});
		registry.setActiveSession('sess-1');
		registry.setActiveSession('sess-1');
		expect(calls).toBe(1);
	});
});
