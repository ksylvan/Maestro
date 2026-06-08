import { PLAYBOOKS_DIR } from '../../../../../../shared/maestro-paths';

export interface ExistingDocsResult {
	exists: boolean;
	count: number;
}

export async function checkForExistingAutoRunDocs(
	dirPath: string,
	sshRemoteId?: string
): Promise<ExistingDocsResult> {
	try {
		const autoRunPath = `${dirPath}/${PLAYBOOKS_DIR}`;
		const result = await window.maestro.autorun.listDocs(autoRunPath, sshRemoteId);
		if (result.success && result.files && result.files.length > 0) {
			return { exists: true, count: result.files.length };
		}
		return { exists: false, count: 0 };
	} catch {
		return { exists: false, count: 0 };
	}
}
