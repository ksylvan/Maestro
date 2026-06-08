import type { SerializableWizardState, WizardState } from './types';

export function buildSerializableWizardState(state: WizardState): SerializableWizardState {
	return {
		currentStep: state.currentStep,
		selectedAgent: state.selectedAgent,
		agentName: state.agentName,
		directoryPath: state.directoryPath,
		isGitRepo: state.isGitRepo,
		conversationHistory: state.conversationHistory,
		confidenceLevel: state.confidenceLevel,
		isReadyToProceed: state.isReadyToProceed,
		generatedDocuments: state.generatedDocuments,
		editedPhase1Content: state.editedPhase1Content,
		autoRunMode: state.autoRunMode,
		wantsTour: state.wantsTour,
		sessionSshRemoteConfig: state.sessionSshRemoteConfig,
	};
}

export function isResumeStateLoadable(saved: unknown): saved is SerializableWizardState {
	if (!saved || typeof saved !== 'object') return false;
	const state = saved as Partial<SerializableWizardState>;
	return !!state.currentStep && state.currentStep !== 'agent-selection';
}

export function hasSavedResumeState(saved: unknown): boolean {
	return saved !== undefined && saved !== null && typeof saved === 'object';
}
