const DEV_RENDERER_AGENT_FIXTURES = [
	{ id: 'claude-code', name: 'Claude Code', available: true, hidden: false, supportsBatch: true },
	{ id: 'opencode', name: 'OpenCode', available: true, hidden: false, supportsBatch: true },
	{ id: 'codex', name: 'Codex', available: true, hidden: false, supportsBatch: true },
	{
		id: 'factory-droid',
		name: 'Factory Droid',
		available: true,
		hidden: false,
		supportsBatch: true,
	},
	{ id: 'hermes', name: 'Hermes', available: false, hidden: false, supportsBatch: false },
	{ id: 'pi', name: 'Pi', available: false, hidden: false, supportsBatch: false },
] as const;

export function installBrowserMaestroStub(): void {
	if (
		typeof window === 'undefined' ||
		window.maestro ||
		(window.location.protocol !== 'http:' && window.location.protocol !== 'https:')
	) {
		return;
	}

	const settings = new Map<string, unknown>();
	const agentConfigs = new Map<string, Record<string, unknown>>();
	const gitResult = { stdout: '', stderr: '', code: 0 };

	window.maestro = {
		settings: {
			get: async (key: string) => settings.get(key),
			set: async (key: string, value: unknown) => {
				settings.set(key, value);
			},
			getAll: async () => ({}),
			getAllSettings: async () => ({}),
			getGlobalSettings: async () => ({}),
			onChanged: () => () => {},
			onSettingsChanged: () => () => {},
		},
		app: {
			onSystemResume: () => () => {},
			onQuitConfirmationRequest: () => () => {},
			confirmQuit: async () => undefined,
			cancelQuit: async () => undefined,
		},
		autorun: {
			readDoc: async () => ({ success: false }),
			writeDoc: async () => ({ success: true }),
			listDocs: async () => ({ success: true, docs: [] }),
		},
		fs: {
			homeDir: async () => '/home/egsox',
			exists: async () => true,
			browseDirectory: async () => null,
			validatePath: async () => ({ valid: true, isDirectory: true }),
			stat: async () => ({ isDirectory: true, size: 0, mtimeMs: Date.now() }),
			readFile: async () => '',
			readDir: async () => [],
		},
		git: {
			isAvailable: async () => true,
			isRepo: async () => true,
			status: async () => gitResult,
			branch: async () => gitResult,
			diff: async () => gitResult,
			numstat: async () => gitResult,
			remote: async () => gitResult,
			branches: async () => gitResult,
			tags: async () => gitResult,
			getRepositoryStatus: async () => null,
			selectRepository: async () => null,
			checkGhCli: async () => ({ installed: true, authenticated: true }),
			scanWorktreeDirectory: async () => ({ success: true, repositories: [] }),
			worktreeSetup: async () => ({ success: true }),
			removeWorktree: async () => ({ success: true }),
			watchWorktreeDirectory: async () => ({ success: true }),
			onWorktreeDiscovered: () => () => {},
			unwatchWorktreeDirectory: async () => ({ success: true }),
		},
		groupChat: {
			onAutoRunTriggered: () => () => {},
			onStateChange: () => () => {},
			onParticipantsChanged: () => () => {},
			onParticipantState: () => () => {},
			onParticipantLiveOutput: () => () => {},
			onModeratorSessionIdChanged: () => () => {},
			onAutoRunBatchComplete: () => () => {},
			onMessage: () => () => {},
			onModeratorUsage: () => () => {},
			triggerAutoRun: async () => undefined,
			sendToModerator: async () => ({ success: true }),
			load: async () => null,
			getMessages: async () => [],
			startModerator: async () => null,
			create: async () => ({ id: 'stub-group-chat', name: 'Stub Group Chat' }),
			delete: async () => undefined,
			archive: async (_id: string, archived: boolean) => ({ archived }),
			rename: async () => undefined,
			update: async (_id: string, update: Record<string, unknown>) => update,
			stopAll: async () => undefined,
			getHistory: async () => [],
			resetParticipantContext: async () => undefined,
			removeParticipant: async () => undefined,
		},
		history: {
			add: async () => undefined,
			getFilePath: async () => null,
		},
		leaderboard: {
			sync: async () => ({ success: false, found: false, data: null }),
			getTopUsers: async () => [],
			getStats: async () => null,
		},
		logger: {
			getLogLevel: async () => 'info',
			setLogLevel: async () => undefined,
			setMaxLogBuffer: async () => undefined,
			log: async () => undefined,
		},
		notifications: {
			updateSettings: async () => undefined,
		},
		openspec: {
			getPrompts: async () => [],
		},
		power: {
			getStatus: async () => ({ platform: 'linux', enabled: false }),
			setEnabled: async () => undefined,
		},
		process: {
			listModels: async () => [],
			spawn: async () => undefined,
			onData: () => () => {},
			onSessionId: () => () => {},
			onUsage: () => () => {},
			onExit: () => () => {},
		},
		agents: {
			list: async () => [...DEV_RENDERER_AGENT_FIXTURES],
			detect: async () => [...DEV_RENDERER_AGENT_FIXTURES],
			get: async (id: string) => DEV_RENDERER_AGENT_FIXTURES.find((agent) => agent.id === id),
			getConfig: async (id: string) => agentConfigs.get(id) ?? {},
			setConfig: async (id: string, value: Record<string, unknown>) => {
				agentConfigs.set(id, value as Record<string, unknown>);
			},
			refresh: async (id: string) => DEV_RENDERER_AGENT_FIXTURES.find((agent) => agent.id === id),
			getModels: async () => [],
		},
		sessions: {
			getAll: async () => [],
			setAll: async () => undefined,
		},
		shell: {
			openExternal: async () => undefined,
		},
		speckit: {
			getPrompts: async () => [],
		},
		ssh: {
			listRemotes: async () => [],
			validateRemotePath: async () => ({ checking: false, valid: true, isDirectory: true }),
		},
		sshRemote: {
			getConfigs: async () => ({ configs: [] }),
			getAll: async () => [],
			validateRemotePath: async () => ({ valid: true, isDirectory: true }),
		},
		stats: {
			checkCorruption: async () => ({ corrupted: false }),
			checkForCorruption: async () => ({ corrupted: false }),
			getInitializationResult: async () => null,
		},
		updates: {
			setAllowPrerelease: async () => undefined,
			setBetaUpdatesEnabled: async () => undefined,
			check: async () => ({ updateAvailable: false, error: null }),
			checkForUpdates: async () => ({ available: false }),
			onUpdateStatus: () => () => {},
		},
		wakatime: {
			checkCli: async () => ({ available: false }),
			validateApiKey: async () => ({ valid: false }),
		},
		platform: 'linux',
	} as unknown as Window['maestro'];
}
