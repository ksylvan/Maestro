import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { WizardSessionSshRemoteConfig } from '../../../WizardContext';
import { logger } from '../../../../../utils/logger';
import { checkForExistingAutoRunDocs } from '../utils/existingDocs';
import { getWizardSshRemoteId } from '../utils/sshRemote';

interface UseDirectoryValidationParams {
	existingDocsChoice: 'continue' | 'fresh' | null;
	sessionSshRemoteConfig: WizardSessionSshRemoteConfig | undefined;
	setDirectoryPath: (path: string) => void;
	setIsGitRepo: (isGitRepo: boolean) => void;
	setDirectoryError: (error: string | null) => void;
	setHasExistingAutoRunDocs: (hasExisting: boolean, count: number) => void;
	setInitRepoError: (error: string | null) => void;
	announce: (message: string) => void;
}

export function useDirectoryValidation({
	existingDocsChoice,
	sessionSshRemoteConfig,
	setDirectoryPath,
	setIsGitRepo,
	setDirectoryError,
	setHasExistingAutoRunDocs,
	setInitRepoError,
	announce,
}: UseDirectoryValidationParams) {
	const [isValidating, setIsValidating] = useState(false);
	const validationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const getSshRemoteId = useCallback(
		() => getWizardSshRemoteId(sessionSshRemoteConfig),
		[sessionSshRemoteConfig]
	);

	const validateDirectory = useCallback(
		async (
			path: string,
			shouldAnnounce: boolean = true,
			skipExistingDocsCheck: boolean = false
		) => {
			if (!path.trim()) {
				setDirectoryError(null);
				setIsGitRepo(false);
				setHasExistingAutoRunDocs(false, 0);
				return;
			}

			setIsValidating(true);
			setDirectoryError(null);

			try {
				const sshRemoteId = getSshRemoteId();
				try {
					await window.maestro.fs.readDir(path, sshRemoteId);
				} catch (dirError) {
					logger.error('Directory does not exist:', undefined, dirError);
					setDirectoryError('Directory not found. Please check the path exists.');
					setIsGitRepo(false);
					setHasExistingAutoRunDocs(false, 0);

					if (shouldAnnounce) {
						announce('Error: Directory not found. Please check the path exists.');
					}
					setIsValidating(false);
					return;
				}

				const isRepo = await window.maestro.git.isRepo(path, sshRemoteId);
				setIsGitRepo(isRepo);
				setDirectoryError(null);

				if (!skipExistingDocsCheck && !existingDocsChoice) {
					const existingDocs = await checkForExistingAutoRunDocs(path, sshRemoteId);
					setHasExistingAutoRunDocs(existingDocs.exists, existingDocs.count);
				}

				if (shouldAnnounce) {
					announce(
						isRepo
							? 'Directory validated. Git repository detected.'
							: 'Directory validated. Not a Git repository.'
					);
				}
			} catch (error) {
				logger.error('Directory validation error:', undefined, error);
				setDirectoryError('Unable to access this directory. Please check the path exists.');
				setIsGitRepo(false);
				setHasExistingAutoRunDocs(false, 0);

				if (shouldAnnounce) {
					announce('Error: Unable to access this directory. Please check the path exists.');
				}
			}

			setIsValidating(false);
		},
		[
			announce,
			existingDocsChoice,
			getSshRemoteId,
			setDirectoryError,
			setHasExistingAutoRunDocs,
			setIsGitRepo,
		]
	);

	const handlePathChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const newPath = e.target.value;
			setDirectoryPath(newPath);

			if (validationTimeoutRef.current) {
				clearTimeout(validationTimeoutRef.current);
				validationTimeoutRef.current = null;
			}

			if (newPath.trim()) {
				setIsValidating(true);
				setInitRepoError(null);
				validationTimeoutRef.current = setTimeout(() => {
					validateDirectory(newPath);
					validationTimeoutRef.current = null;
				}, 800);
			} else {
				setIsValidating(false);
				setDirectoryError(null);
				setIsGitRepo(false);
				setHasExistingAutoRunDocs(false, 0);
			}
		},
		[
			setDirectoryPath,
			setDirectoryError,
			setIsGitRepo,
			setHasExistingAutoRunDocs,
			setInitRepoError,
			validateDirectory,
		]
	);

	useEffect(() => {
		return () => {
			if (validationTimeoutRef.current) {
				clearTimeout(validationTimeoutRef.current);
			}
		};
	}, []);

	return {
		isValidating,
		setIsValidating,
		getSshRemoteId,
		validateDirectory,
		handlePathChange,
	};
}
