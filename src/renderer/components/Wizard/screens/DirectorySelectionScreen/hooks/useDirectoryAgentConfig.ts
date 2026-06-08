import { useEffect, useState } from 'react';
import type { AgentConfig, ToolType } from '../../../../../types';
import { logger } from '../../../../../utils/logger';

export function useDirectoryAgentConfig(selectedAgent: ToolType | null): AgentConfig | null {
	const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null);

	useEffect(() => {
		let mounted = true;

		async function fetchAgentConfig() {
			if (!selectedAgent) {
				setAgentConfig(null);
				return;
			}

			try {
				const config = await window.maestro.agents.get(selectedAgent);
				if (mounted && config) {
					setAgentConfig(config);
				}
			} catch (error) {
				logger.error('Failed to fetch agent config:', undefined, error);
			}
		}

		fetchAgentConfig();
		return () => {
			mounted = false;
		};
	}, [selectedAgent]);

	return agentConfig;
}
