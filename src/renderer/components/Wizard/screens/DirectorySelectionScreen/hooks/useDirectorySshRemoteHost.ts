import { useEffect, useState } from 'react';
import type { SshRemoteConfig } from '../../../../../../shared/types';
import type { WizardSessionSshRemoteConfig } from '../../../WizardContext';
import { logger } from '../../../../../utils/logger';

export function useDirectorySshRemoteHost(
	sessionSshRemoteConfig: WizardSessionSshRemoteConfig | undefined
): string | null {
	const [sshRemoteHost, setSshRemoteHost] = useState<string | null>(null);

	useEffect(() => {
		if (!sessionSshRemoteConfig?.enabled || !sessionSshRemoteConfig.remoteId) {
			setSshRemoteHost(null);
			return;
		}

		const remoteId = sessionSshRemoteConfig.remoteId;

		async function loadSshRemoteHost() {
			try {
				const configsResult = await window.maestro.sshRemote.getConfigs();
				if (configsResult.success && configsResult.configs) {
					const remote = configsResult.configs.find((r: SshRemoteConfig) => r.id === remoteId);
					if (remote) {
						setSshRemoteHost(remote.name || remote.host);
					}
				}
			} catch (error) {
				logger.error('Failed to load SSH remote config:', undefined, error);
			}
		}

		loadSshRemoteHost();
	}, [sessionSshRemoteConfig?.enabled, sessionSshRemoteConfig?.remoteId]);

	return sshRemoteHost;
}
