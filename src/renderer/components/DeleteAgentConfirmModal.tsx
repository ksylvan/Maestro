import React, { useRef, useCallback, useState, useEffect } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import type { Theme } from '../types';
import { MODAL_PRIORITIES } from '../constants/modalPriorities';
import { Modal } from './ui/Modal';
import { FormInput } from './ui/FormInput';

interface DeleteAgentConfirmModalProps {
	theme: Theme;
	agentName: string;
	workingDirectory: string;
	onConfirm: () => void;
	onConfirmAndErase: () => void;
	onClose: () => void;
}

export function DeleteAgentConfirmModal({
	theme,
	agentName,
	workingDirectory,
	onConfirm,
	onConfirmAndErase,
	onClose,
}: DeleteAgentConfirmModalProps) {
	const agentOnlyButtonRef = useRef<HTMLButtonElement>(null);
	const [confirmationInput, setConfirmationInput] = useState('');

	// Reset confirmation input when modal opens
	useEffect(() => {
		setConfirmationInput('');
	}, []);

	// Check if confirmation input exactly matches agent name (case-sensitive)
	const isConfirmationValid = confirmationInput === agentName;

	const handleConfirm = useCallback(() => {
		onConfirm();
		onClose();
	}, [onConfirm, onClose]);

	const handleConfirmAndErase = useCallback(() => {
		onConfirmAndErase();
		onClose();
	}, [onConfirmAndErase, onClose]);

	// Stop Enter key propagation to prevent parent handlers from triggering after modal closes
	const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
		if (e.key === 'Enter') {
			e.stopPropagation();
			action();
		}
	};

	return (
		<Modal
			theme={theme}
			title="Confirm Delete"
			priority={MODAL_PRIORITIES.CONFIRM}
			onClose={onClose}
			headerIcon={<Trash2 className="w-4 h-4" style={{ color: theme.colors.error }} />}
			width={500}
			zIndex={10000}
			initialFocusRef={agentOnlyButtonRef}
			footer={
				<div className="flex justify-end gap-2 w-full">
					<button
						type="button"
						onClick={onClose}
						onKeyDown={(e) => handleKeyDown(e, onClose)}
						className="px-4 py-2 rounded border hover:bg-white/5 transition-colors outline-none focus:ring-2 focus:ring-offset-1"
						style={{
							borderColor: theme.colors.border,
							color: theme.colors.textMain,
						}}
					>
						Cancel
					</button>
					<button
						ref={agentOnlyButtonRef}
						type="button"
						onClick={handleConfirm}
						onKeyDown={(e) => handleKeyDown(e, handleConfirm)}
						className="px-4 py-2 rounded transition-colors outline-none focus:ring-2 focus:ring-offset-1"
						style={{
							backgroundColor: `${theme.colors.error}99`,
							color: '#ffffff',
						}}
					>
						Agent Only
					</button>
					<button
						type="button"
						onClick={handleConfirmAndErase}
						onKeyDown={(e) => handleKeyDown(e, handleConfirmAndErase)}
						disabled={!isConfirmationValid}
						className="px-4 py-2 rounded transition-colors outline-none focus:ring-2 focus:ring-offset-1"
						style={{
							backgroundColor: isConfirmationValid ? theme.colors.error : `${theme.colors.error}40`,
							color: '#ffffff',
							cursor: isConfirmationValid ? 'pointer' : 'not-allowed',
							opacity: isConfirmationValid ? 1 : 0.6,
						}}
					>
						Agent + Work Directory
					</button>
				</div>
			}
		>
			<div className="flex gap-4">
				<div
					className="flex-shrink-0 p-2 rounded-full h-fit"
					style={{ backgroundColor: `${theme.colors.error}20` }}
				>
					<AlertTriangle className="w-5 h-5" style={{ color: theme.colors.error }} />
				</div>
				<div className="space-y-3">
					<p className="leading-relaxed" style={{ color: theme.colors.textMain }}>
						Are you sure you want to delete the agent "{agentName}"? This action cannot be undone.
					</p>
					<p className="text-sm leading-relaxed" style={{ color: theme.colors.textDim }}>
						<span style={{ color: theme.colors.warning, fontWeight: 'bold' }}>Danger:</span>{' '}
						<strong>Agent + Work Directory</strong> will also move the working directory to the
						trash:
					</p>
					<code
						className="block text-xs px-2 py-1 rounded break-all"
						style={{
							backgroundColor: theme.colors.bgActivity,
							color: theme.colors.textDim,
							border: `1px solid ${theme.colors.border}`,
						}}
					>
						{workingDirectory}
					</code>
					<FormInput
						theme={theme}
						value={confirmationInput}
						onChange={setConfirmationInput}
						placeholder="Type the agent name here to confirm directory deletion."
						monospace
						testId="confirmation-input"
					/>
				</div>
			</div>
		</Modal>
	);
}
