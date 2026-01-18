import React, { useState, useRef, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Theme } from '../types';
import { MODAL_PRIORITIES } from '../constants/modalPriorities';
import { Modal } from './ui/Modal';
import { FormInput } from './ui/FormInput';

interface EraseConfirmationModalProps {
  theme: Theme;
  sessionName: string;
  workingDirectory: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function EraseConfirmationModal({
  theme,
  sessionName,
  workingDirectory,
  onConfirm,
  onCancel,
}: EraseConfirmationModalProps) {
  const [typedName, setTypedName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isMatch = typedName === sessionName;

  const handleConfirm = useCallback(() => {
    if (isMatch) {
      onConfirm();
    }
  }, [isMatch, onConfirm]);

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
      title="Confirm Directory Erasure"
      priority={MODAL_PRIORITIES.ERASE_CONFIRM}
      onClose={onCancel}
      headerIcon={<AlertTriangle className="w-4 h-4" style={{ color: theme.colors.error }} />}
      width={500}
      zIndex={10001}
      initialFocusRef={inputRef}
      footer={
        <div className="flex justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onCancel}
            onKeyDown={(e) => handleKeyDown(e, onCancel)}
            className="px-4 py-2 rounded border hover:bg-white/5 transition-colors outline-none focus:ring-2 focus:ring-offset-1"
            style={{
              borderColor: theme.colors.border,
              color: theme.colors.textMain,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            onKeyDown={(e) => isMatch && handleKeyDown(e, handleConfirm)}
            disabled={!isMatch}
            className="px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-offset-1"
            style={{
              backgroundColor: theme.colors.error,
              color: '#ffffff',
            }}
          >
            Yes, Erase Directory
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div
          className="flex items-start gap-3 p-3 rounded-lg"
          style={{ backgroundColor: `${theme.colors.error}15` }}
        >
          <AlertTriangle
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            style={{ color: theme.colors.error }}
          />
          <div className="space-y-2">
            <p
              className="text-sm font-semibold leading-relaxed"
              style={{ color: theme.colors.error }}
            >
              This will permanently move the following directory to the trash:
            </p>
            <code
              className="block text-xs px-2 py-1 rounded break-all"
              style={{
                backgroundColor: theme.colors.bgActivity,
                color: theme.colors.textMain,
                border: `1px solid ${theme.colors.error}40`,
              }}
            >
              {workingDirectory}
            </code>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm" style={{ color: theme.colors.textMain }}>
            To confirm, type the session name:{' '}
            <strong style={{ color: theme.colors.warning }}>{sessionName}</strong>
          </p>
          <FormInput
            ref={inputRef}
            theme={theme}
            value={typedName}
            onChange={setTypedName}
            onSubmit={handleConfirm}
            submitEnabled={isMatch}
            placeholder={`Type "${sessionName}" to confirm`}
            autoFocus
            testId="erase-confirm-input"
          />
        </div>
      </div>
    </Modal>
  );
}
