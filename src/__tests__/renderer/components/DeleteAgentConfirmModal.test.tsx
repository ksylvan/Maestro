/**
 * Tests for DeleteAgentConfirmModal component
 *
 * Tests the core behavior of the delete agent confirmation dialog:
 * - Rendering with agent name, working directory, and three buttons
 * - Button click handlers (Cancel, Confirm, Confirm and Erase)
 * - Secondary confirmation modal for directory erasure (type-to-confirm)
 * - Focus management
 * - Layer stack integration
 * - Accessibility
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeleteAgentConfirmModal } from '../../../renderer/components/DeleteAgentConfirmModal';
import { LayerStackProvider } from '../../../renderer/contexts/LayerStackContext';
import type { Theme } from '../../../renderer/types';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  X: () => <svg data-testid="x-icon" />,
  AlertTriangle: () => <svg data-testid="alert-triangle-icon" />,
  AlertOctagon: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg data-testid="alert-octagon-icon" className={className} style={style} />
  ),
  Trash2: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg data-testid="trash2-icon" className={className} style={style} />
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

describe('DeleteAgentConfirmModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders with agent name and three action buttons', () => {
      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onConfirmAndErase={vi.fn()}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/TestAgent/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirm and Erase' })).toBeInTheDocument();
    });

    it('renders working directory path', () => {
      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onConfirmAndErase={vi.fn()}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText('/home/user/project')).toBeInTheDocument();
    });

    it('renders explanatory text about Confirm and Erase', () => {
      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onConfirmAndErase={vi.fn()}
          onClose={vi.fn()}
        />
      );

      // Check the explanatory text (in a <strong> tag within a <p>)
      expect(screen.getByText(/will also move the working directory to the trash/)).toBeInTheDocument();
    });

    it('renders header with title and close button', () => {
      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onConfirmAndErase={vi.fn()}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });

    it('has correct ARIA attributes', () => {
      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onConfirmAndErase={vi.fn()}
          onClose={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-label', 'Confirm Delete');
    });
  });

  describe('focus management', () => {
    it('focuses Confirm button on mount (not Confirm and Erase)', async () => {
      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onConfirmAndErase={vi.fn()}
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Confirm' }));
      });
    });
  });

  describe('button handlers', () => {
    it('calls onClose when X button is clicked', () => {
      const onClose = vi.fn();
      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onConfirmAndErase={vi.fn()}
          onClose={onClose}
        />
      );

      const closeButton = screen.getByTestId('x-icon').closest('button');
      fireEvent.click(closeButton!);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Cancel is clicked', () => {
      const onClose = vi.fn();
      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onConfirmAndErase={vi.fn()}
          onClose={onClose}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onConfirm then onClose when Confirm is clicked', () => {
      const callOrder: string[] = [];
      const onClose = vi.fn(() => callOrder.push('close'));
      const onConfirm = vi.fn(() => callOrder.push('confirm'));
      const onConfirmAndErase = vi.fn();

      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={onConfirm}
          onConfirmAndErase={onConfirmAndErase}
          onClose={onClose}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
      expect(callOrder).toEqual(['confirm', 'close']);
      expect(onConfirmAndErase).not.toHaveBeenCalled();
    });

    it('opens secondary confirmation modal when Confirm and Erase is clicked', () => {
      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onConfirmAndErase={vi.fn()}
          onClose={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Confirm and Erase' }));

      // Secondary modal should be visible
      expect(screen.getByText('Confirm Directory Erasure')).toBeInTheDocument();
      expect(screen.getByText('To confirm, type the session name:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Yes, Erase Directory' })).toBeInTheDocument();
    });

    it('calls onConfirmAndErase then onClose after typing session name and confirming', async () => {
      const callOrder: string[] = [];
      const onClose = vi.fn(() => callOrder.push('close'));
      const onConfirm = vi.fn();
      const onConfirmAndErase = vi.fn(() => callOrder.push('confirmAndErase'));

      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={onConfirm}
          onConfirmAndErase={onConfirmAndErase}
          onClose={onClose}
        />
      );

      // Click Confirm and Erase to show secondary modal
      fireEvent.click(screen.getByRole('button', { name: 'Confirm and Erase' }));

      // Type the session name using fireEvent.change
      const input = screen.getByTestId('erase-confirm-input').querySelector('input')!;
      fireEvent.change(input, { target: { value: 'TestAgent' } });

      // Click Yes, Erase Directory
      fireEvent.click(screen.getByRole('button', { name: 'Yes, Erase Directory' }));

      expect(callOrder).toEqual(['confirmAndErase', 'close']);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('returns to first modal when Cancel is clicked in secondary modal', () => {
      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onConfirmAndErase={vi.fn()}
          onClose={vi.fn()}
        />
      );

      // Click Confirm and Erase to show secondary modal
      fireEvent.click(screen.getByRole('button', { name: 'Confirm and Erase' }));
      expect(screen.getByText('Confirm Directory Erasure')).toBeInTheDocument();

      // Click Cancel in secondary modal
      // There are now two Cancel buttons - one in each modal. Get the one in the secondary modal
      const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
      // The second one is in the secondary modal (appears after the first modal's Cancel)
      fireEvent.click(cancelButtons[1]);

      // Secondary modal should be gone
      expect(screen.queryByText('Confirm Directory Erasure')).not.toBeInTheDocument();
      // First modal should still be there
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });

    it('disables Yes, Erase Directory button when session name does not match', async () => {
      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onConfirmAndErase={vi.fn()}
          onClose={vi.fn()}
        />
      );

      // Click Confirm and Erase to show secondary modal
      fireEvent.click(screen.getByRole('button', { name: 'Confirm and Erase' }));

      const eraseButton = screen.getByRole('button', { name: 'Yes, Erase Directory' });

      // Button should be disabled initially
      expect(eraseButton).toBeDisabled();

      // Type wrong name
      const input = screen.getByTestId('erase-confirm-input').querySelector('input')!;
      fireEvent.change(input, { target: { value: 'WrongName' } });

      // Button should still be disabled
      expect(eraseButton).toBeDisabled();

      // Clear and type correct name
      fireEvent.change(input, { target: { value: 'TestAgent' } });

      // Button should now be enabled
      expect(eraseButton).toBeEnabled();
    });

    it('Cancel does not call onConfirm or onConfirmAndErase', () => {
      const onConfirm = vi.fn();
      const onConfirmAndErase = vi.fn();
      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={onConfirm}
          onConfirmAndErase={onConfirmAndErase}
          onClose={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onConfirm).not.toHaveBeenCalled();
      expect(onConfirmAndErase).not.toHaveBeenCalled();
    });
  });

  describe('keyboard interaction', () => {
    it('stops propagation of keydown events', () => {
      const parentHandler = vi.fn();

      render(
        <div onKeyDown={parentHandler}>
          <LayerStackProvider>
            <DeleteAgentConfirmModal
              theme={testTheme}
              agentName="TestAgent"
              workingDirectory="/home/user/project"
              onConfirm={vi.fn()}
              onConfirmAndErase={vi.fn()}
              onClose={vi.fn()}
            />
          </LayerStackProvider>
        </div>
      );

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'a' });
      expect(parentHandler).not.toHaveBeenCalled();
    });
  });

  describe('layer stack integration', () => {
    it('registers and unregisters without errors', () => {
      const { unmount } = renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onConfirmAndErase={vi.fn()}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('accessibility', () => {
    it('has tabIndex on dialog for focus', () => {
      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onConfirmAndErase={vi.fn()}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByRole('dialog')).toHaveAttribute('tabIndex', '-1');
    });

    it('has semantic button elements', () => {
      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onConfirmAndErase={vi.fn()}
          onClose={vi.fn()}
        />
      );

      // X, Cancel, Confirm, Confirm and Erase
      expect(screen.getAllByRole('button')).toHaveLength(4);
    });

    it('has heading for modal title', () => {
      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onConfirmAndErase={vi.fn()}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByRole('heading', { name: 'Confirm Delete' })).toBeInTheDocument();
    });
  });
});
