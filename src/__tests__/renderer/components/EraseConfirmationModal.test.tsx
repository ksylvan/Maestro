/**
 * Tests for EraseConfirmationModal component
 *
 * Tests the secondary confirmation dialog for directory erasure:
 * - Rendering with session name and working directory
 * - Button state management (disabled when input doesn't match)
 * - Button handlers (Cancel, Confirm)
 * - Keyboard interaction (Enter key submits when enabled)
 * - Focus management (input auto-focuses)
 * - Accessibility (ARIA labels, semantic HTML)
 * - Error feedback
 * - Edge cases (special characters, unicode)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EraseConfirmationModal } from '../../../renderer/components/EraseConfirmationModal';
import { LayerStackProvider } from '../../../renderer/contexts/LayerStackContext';
import type { Theme } from '../../../renderer/types';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  X: () => <svg data-testid="x-icon" />,
  AlertTriangle: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg data-testid="alert-triangle-icon" className={className} style={style} />
  ),
}));

// Create a test theme
const testTheme: Theme = {
  id: 'test-theme',
  name: 'Test Theme',
  mode: 'dark',
  colors: {
    bgMain: '#1e1e1e',
    bgSidebar: '#252526',
    bgActivity: '#333333',
    textMain: '#d4d4d4',
    textDim: '#808080',
    accent: '#007acc',
    accentDim: '#007acc80',
    accentText: '#ffffff',
    accentForeground: '#ffffff',
    border: '#404040',
    error: '#f14c4c',
    warning: '#cca700',
    success: '#89d185',
  },
};

// Helper to render with LayerStackProvider
const renderWithLayerStack = (ui: React.ReactElement) => {
  return render(<LayerStackProvider>{ui}</LayerStackProvider>);
};

describe('EraseConfirmationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders with session name displayed', () => {
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="MyTestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByText('MyTestAgent')).toBeInTheDocument();
    });

    it('renders working directory path', () => {
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="MyTestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByText('/home/user/project')).toBeInTheDocument();
    });

    it('renders with correct title', () => {
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="MyTestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByText('Confirm Directory Erasure')).toBeInTheDocument();
    });

    it('renders warning text about directory deletion', () => {
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="MyTestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(
        screen.getByText(/This will permanently move the following directory to the trash/)
      ).toBeInTheDocument();
    });

    it('renders Cancel and Yes, Erase Directory buttons', () => {
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="MyTestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Yes, Erase Directory' })).toBeInTheDocument();
    });

    it('renders warning icons', () => {
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="MyTestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // There are multiple AlertTriangle icons (header + warning section)
      const alertIcons = screen.getAllByTestId('alert-triangle-icon');
      expect(alertIcons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('button state management', () => {
    it('disables confirm button when input is empty', () => {
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: 'Yes, Erase Directory' })).toBeDisabled();
    });

    it('disables confirm button when input does not match session name', () => {
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const input = screen.getByTestId('erase-confirm-input').querySelector('input')!;
      fireEvent.change(input, { target: { value: 'WrongName' } });

      expect(screen.getByRole('button', { name: 'Yes, Erase Directory' })).toBeDisabled();
    });

    it('enables confirm button when input exactly matches session name', () => {
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const input = screen.getByTestId('erase-confirm-input').querySelector('input')!;
      fireEvent.change(input, { target: { value: 'TestAgent' } });

      expect(screen.getByRole('button', { name: 'Yes, Erase Directory' })).toBeEnabled();
    });

    it('disables confirm button for partial matches', () => {
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const input = screen.getByTestId('erase-confirm-input').querySelector('input')!;
      fireEvent.change(input, { target: { value: 'Test' } });

      expect(screen.getByRole('button', { name: 'Yes, Erase Directory' })).toBeDisabled();
    });

    it('disables confirm button for case mismatch', () => {
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const input = screen.getByTestId('erase-confirm-input').querySelector('input')!;
      fireEvent.change(input, { target: { value: 'testagent' } });

      expect(screen.getByRole('button', { name: 'Yes, Erase Directory' })).toBeDisabled();
    });

    it('disables confirm button for extra whitespace', () => {
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const input = screen.getByTestId('erase-confirm-input').querySelector('input')!;
      fireEvent.change(input, { target: { value: ' TestAgent ' } });

      expect(screen.getByRole('button', { name: 'Yes, Erase Directory' })).toBeDisabled();
    });
  });

  describe('button handlers', () => {
    it('calls onCancel when Cancel button is clicked', () => {
      const onCancel = vi.fn();
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onCancel={onCancel}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when X button is clicked', () => {
      const onCancel = vi.fn();
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onCancel={onCancel}
        />
      );

      const closeButton = screen.getByTestId('x-icon').closest('button');
      fireEvent.click(closeButton!);
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onConfirm when confirm button is clicked with matching input', () => {
      const onConfirm = vi.fn();
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />
      );

      const input = screen.getByTestId('erase-confirm-input').querySelector('input')!;
      fireEvent.change(input, { target: { value: 'TestAgent' } });
      fireEvent.click(screen.getByRole('button', { name: 'Yes, Erase Directory' }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('does not call onConfirm when confirm button is clicked with non-matching input', () => {
      const onConfirm = vi.fn();
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />
      );

      const input = screen.getByTestId('erase-confirm-input').querySelector('input')!;
      fireEvent.change(input, { target: { value: 'WrongName' } });

      // The button is disabled, but let's verify clicking doesn't work
      const confirmButton = screen.getByRole('button', { name: 'Yes, Erase Directory' });
      fireEvent.click(confirmButton);

      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('keyboard interaction', () => {
    it('submits on Enter key when input matches', () => {
      const onConfirm = vi.fn();
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />
      );

      const input = screen.getByTestId('erase-confirm-input').querySelector('input')!;
      fireEvent.change(input, { target: { value: 'TestAgent' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('does not submit on Enter key when input does not match', () => {
      const onConfirm = vi.fn();
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />
      );

      const input = screen.getByTestId('erase-confirm-input').querySelector('input')!;
      fireEvent.change(input, { target: { value: 'Wrong' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('stops propagation of keydown events', () => {
      const parentHandler = vi.fn();

      render(
        <div onKeyDown={parentHandler}>
          <LayerStackProvider>
            <EraseConfirmationModal
              theme={testTheme}
              sessionName="TestAgent"
              workingDirectory="/home/user/project"
              onConfirm={vi.fn()}
              onCancel={vi.fn()}
            />
          </LayerStackProvider>
        </div>
      );

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'a' });
      expect(parentHandler).not.toHaveBeenCalled();
    });
  });

  describe('focus management', () => {
    it('auto-focuses on the input field', async () => {
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      await waitFor(() => {
        const input = screen.getByTestId('erase-confirm-input').querySelector('input')!;
        expect(document.activeElement).toBe(input);
      });
    });
  });

  describe('accessibility', () => {
    it('has correct ARIA attributes on dialog', () => {
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-label', 'Confirm Directory Erasure');
    });

    it('has semantic button elements', () => {
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // X, Cancel, Yes Erase Directory
      expect(screen.getAllByRole('button')).toHaveLength(3);
    });

    it('has heading for modal title', () => {
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByRole('heading', { name: 'Confirm Directory Erasure' })).toBeInTheDocument();
    });

    it('has tabIndex on dialog for focus', () => {
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByRole('dialog')).toHaveAttribute('tabIndex', '-1');
    });

    it('shows placeholder with session name format', () => {
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const input = screen.getByTestId('erase-confirm-input').querySelector('input')!;
      expect(input).toHaveAttribute('placeholder', 'Type "TestAgent" to confirm');
    });
  });

  describe('layer stack integration', () => {
    it('registers and unregisters without errors', () => {
      const { unmount } = renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('handles session names with special characters', () => {
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="Test-Agent_2.0 (beta)"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByText('Test-Agent_2.0 (beta)')).toBeInTheDocument();

      const input = screen.getByTestId('erase-confirm-input').querySelector('input')!;
      fireEvent.change(input, { target: { value: 'Test-Agent_2.0 (beta)' } });

      expect(screen.getByRole('button', { name: 'Yes, Erase Directory' })).toBeEnabled();
    });

    it('handles long working directory paths', () => {
      const longPath =
        '/Users/developer/Documents/Projects/MyCompany/Applications/ClientProjects/2024/Q1/ProjectAlpha/src/main';

      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="TestAgent"
          workingDirectory={longPath}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByText(longPath)).toBeInTheDocument();
    });

    it('handles session names with unicode characters', () => {
      const onConfirm = vi.fn();
      renderWithLayerStack(
        <EraseConfirmationModal
          theme={testTheme}
          sessionName="テスト-Agent-🤖"
          workingDirectory="/home/user/project"
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByText('テスト-Agent-🤖')).toBeInTheDocument();

      const input = screen.getByTestId('erase-confirm-input').querySelector('input')!;
      fireEvent.change(input, { target: { value: 'テスト-Agent-🤖' } });

      expect(screen.getByRole('button', { name: 'Yes, Erase Directory' })).toBeEnabled();

      fireEvent.click(screen.getByRole('button', { name: 'Yes, Erase Directory' }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });
});
