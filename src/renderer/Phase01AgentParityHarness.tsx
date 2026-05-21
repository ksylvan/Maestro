import { useEffect, useMemo, useState } from 'react';
import { AGENT_CAPABILITIES } from '../main/agents/capabilities';
import type { AgentId } from '../shared/agentIds';
import { AGENT_DISPLAY_NAMES, isBetaAgent } from '../shared/agentMetadata';

type DetectedAgent = {
	id: AgentId;
	name: string;
	available: boolean;
	hidden?: boolean;
	supportsBatch?: boolean;
};

const HARNESS_AGENT_IDS: AgentId[] = ['claude-code', 'opencode', 'factory-droid', 'hermes', 'pi'];

export function Phase01AgentParityHarness() {
	const [agents, setAgents] = useState<DetectedAgent[]>([]);
	const [status, setStatus] = useState<string>('Loading stubbed agent detection…');

	useEffect(() => {
		let mounted = true;
		void window.maestro.agents.detect().then((detected) => {
			if (!mounted) return;
			const normalized = detected.filter((agent) =>
				HARNESS_AGENT_IDS.includes(agent.id as AgentId)
			) as DetectedAgent[];
			setAgents(normalized);
			setStatus(
				'Stubbed detection loaded. Probe an agent below to validate copy and fallback behavior.'
			);
		});
		return () => {
			mounted = false;
		};
	}, []);

	const orderedAgents = useMemo(
		() =>
			HARNESS_AGENT_IDS.map(
				(id) =>
					agents.find((agent) => agent.id === id) ?? {
						id,
						name: AGENT_DISPLAY_NAMES[id],
						available: false,
					}
			),
		[agents]
	);

	const runProbe = (agent: DetectedAgent) => {
		const capabilities = AGENT_CAPABILITIES[agent.id];
		if (!agent.available) {
			setStatus(
				`${agent.name} probe blocked cleanly: the browser validation stub reports the CLI as unavailable, so Maestro should keep it visible but non-runnable until real local detection succeeds.`
			);
			return;
		}

		setStatus(
			`${agent.name} probe succeeded: detected=${agent.available}, batch=${capabilities.supportsBatchMode}, resume=${capabilities.supportsResume}, imageInput=${capabilities.supportsImageInput}, modelSelection=${capabilities.supportsModelSelection}.`
		);
	};

	return (
		<div className="min-h-screen bg-slate-950 px-8 py-10 text-slate-100">
			<div className="mx-auto flex max-w-6xl flex-col gap-6">
				<header className="space-y-3">
					<p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
						Phase 01 Validation Harness
					</p>
					<h1 className="text-3xl font-semibold tracking-tight">Hermes / Pi agent parity check</h1>
					<p className="max-w-3xl text-sm leading-6 text-slate-300">
						This dev-only harness uses the renderer browser stub plus the real shared agent metadata
						and capability definitions. It is only for the Phase 01 quality gate.
					</p>
				</header>

				<section className="rounded-2xl border border-cyan-900/60 bg-slate-900/80 p-4 text-sm text-slate-200 shadow-xl shadow-slate-950/30">
					<strong className="mr-2 text-cyan-300">Probe status:</strong>
					<span>{status}</span>
				</section>

				<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{orderedAgents.map((agent) => {
						const capabilities = AGENT_CAPABILITIES[agent.id];
						return (
							<article
								key={agent.id}
								className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/30"
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<h2 className="text-lg font-semibold text-slate-50">{agent.name}</h2>
										<p className="text-xs uppercase tracking-[0.24em] text-slate-400">{agent.id}</p>
									</div>
									<div className="flex flex-wrap justify-end gap-2">
										{isBetaAgent(agent.id) && (
											<span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-200">
												Beta
											</span>
										)}
										<span
											className={`rounded-full px-2.5 py-1 text-xs font-medium ${
												agent.available
													? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
													: 'border border-rose-500/40 bg-rose-500/15 text-rose-200'
											}`}
										>
											{agent.available ? 'Detected' : 'Stubbed unavailable'}
										</span>
									</div>
								</div>

								<ul className="space-y-1 text-sm text-slate-300">
									<li>Resume: {capabilities.supportsResume ? 'Yes' : 'No'}</li>
									<li>Batch mode: {capabilities.supportsBatchMode ? 'Yes' : 'No'}</li>
									<li>Image input: {capabilities.supportsImageInput ? 'Yes' : 'No'}</li>
									<li>Model selection: {capabilities.supportsModelSelection ? 'Yes' : 'No'}</li>
								</ul>

								<button
									type="button"
									onClick={() => runProbe(agent)}
									className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
								>
									Probe {agent.name}
								</button>
							</article>
						);
					})}
				</section>
			</div>
		</div>
	);
}
