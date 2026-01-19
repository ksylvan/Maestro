import React, { useRef, useCallback, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import type { Theme } from '../types';
import { MODAL_PRIORITIES } from '../constants/modalPriorities';
import { Modal } from './ui/Modal';

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
  const [confirmationText, setConfirmationText] = useState('');

  // Check if the confirmation input matches the agent name (case-insensitive, trimmed)
  const isAgentNameMatch =
    confirmationText.trim().toLowerCase() === agentName.trim().toLowerCase();

  const handleConfirm = useCallback(() => {
    onConfirm();
    onClose();
  }, [onConfirm, onClose]);

  const handleConfirmAndErase = useCallback(() => {
    if (isAgentNameMatch) {
      onConfirmAndErase();
      onClose();
    }
  }, [isAgentNameMatch, onConfirmAndErase, onClose]);

  // Stop Enter key propagation to prevent parent handlers from triggering after modal closes
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      action();
    }
  };

  // Reference for the Agent + Work Directory button (used for Tab order)
  const agentAndWorkDirButtonRef = useRef<HTMLButtonElement>(null);
  const confirmationInputRef = useRef<HTMLInputElement>(null);

  // Handle Enter key on confirmation input to trigger Agent + Work Directory
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isAgentNameMatch) {
      e.preventDefault();
      e.stopPropagation();
      handleConfirmAndErase();
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
            tabIndex={0}
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
            tabIndex={0}
            className="px-4 py-2 rounded transition-colors outline-none focus:ring-2 focus:ring-offset-1"
            style={{
              backgroundColor: `${theme.colors.error}99`,
              color: '#ffffff',
            }}
          >
            Agent Only
          </button>
          <button
            ref={agentAndWorkDirButtonRef}
            type="button"
            onClick={handleConfirmAndErase}
            onKeyDown={(e) => {
              if (isAgentNameMatch) {
                handleKeyDown(e, handleConfirmAndErase);
              }
            }}
            disabled={!isAgentNameMatch}
            aria-disabled={!isAgentNameMatch}
            tabIndex={0}
            className="px-4 py-2 rounded transition-colors outline-none focus:ring-2 focus:ring-offset-1"
            style={{
              backgroundColor: theme.colors.error,
              color: '#ffffff',
              opacity: isAgentNameMatch ? 1 : 0.5,
              cursor: isAgentNameMatch ? 'pointer' : 'not-allowed',
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
          style={{ backgroundColor: 'rgba(255, 165, 0, 0.2)' }}
        >
          <AlertTriangle className="w-5 h-5" style={{ color: '#ffa500' }} />
        </div>
        <div className="flex flex-col">
          <p
            id="delete-agent-warning"
            className="leading-relaxed"
            style={{ color: '#ffffff' }}
          >
            <span className="font-semibold" style={{ color: '#ffd700' }}>Danger:</span>{' '}
            You are about to delete the agent "{agentName}". This action cannot be undone.
          </p>
          <p
            className="text-sm leading-relaxed mt-4"
            style={{ color: theme.colors.textDim }}
          >
            <strong style={{ color: '#ffffff' }}>Agent + Work Directory</strong> will also move the working directory to the trash:
          </p>
          <code
            className="block text-xs px-2 py-1 rounded break-all mt-2"
            style={{
              backgroundColor: theme.colors.bgActivity,
              color: '#ffffff',
              border: `1px solid ${theme.colors.border}`,
            }}
          >
            {workingDirectory}
          </code>
          <input
            ref={confirmationInputRef}
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type the agent name here to confirm directory deletion."
            maxLength={256}
            aria-label={`Type ${agentName} to confirm directory deletion`}
            aria-describedby="delete-agent-warning"
            tabIndex={0}
            className="w-full text-sm px-2 py-2 rounded outline-none focus:ring-2 focus:ring-offset-1 placeholder:text-gray-500 mt-2.5"
            style={{
              backgroundColor: theme.colors.bgActivity,
              color: '#ffffff',
              border: `1px solid ${theme.colors.border}`,
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
