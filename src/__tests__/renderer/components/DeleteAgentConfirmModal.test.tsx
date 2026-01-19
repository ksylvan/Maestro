/**
 * Tests for DeleteAgentConfirmModal component
 *
 * Tests the core behavior of the delete agent confirmation dialog:
 * - Rendering with agent name, working directory, and three buttons
 * - Button click handlers (Cancel, Agent Only, Agent + Work Directory)
 * - Confirmation input for enabling destructive action
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
      expect(screen.getByRole('button', { name: 'Agent Only' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Agent + Work Directory' })).toBeInTheDocument();
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

    it('renders danger warning text with agent name', () => {
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

      // Check the danger warning text (now split into "Danger:" label and message)
      expect(screen.getByText('Danger:')).toBeInTheDocument();
      expect(screen.getByText(/You are about to delete the agent/)).toBeInTheDocument();
    });

    it('renders explanatory text about Agent + Work Directory', () => {
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

      // Check the explanatory text
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

  describe('confirmation input', () => {
    it('renders confirmation input with correct placeholder', () => {
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

      const input = screen.getByPlaceholderText('Type the agent name here to confirm directory deletion.');
      expect(input).toBeInTheDocument();
    });

    it('input value updates on change', () => {
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

      const input = screen.getByPlaceholderText('Type the agent name here to confirm directory deletion.');
      fireEvent.change(input, { target: { value: 'Test' } });
      expect(input).toHaveValue('Test');
    });

    it('"Agent + Work Directory" button is disabled by default', () => {
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

      const eraseButton = screen.getByRole('button', { name: 'Agent + Work Directory' });
      expect(eraseButton).toBeDisabled();
    });

    it('"Agent + Work Directory" button remains disabled with partial input', () => {
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

      const input = screen.getByPlaceholderText('Type the agent name here to confirm directory deletion.');
      fireEvent.change(input, { target: { value: 'Test' } });

      const eraseButton = screen.getByRole('button', { name: 'Agent + Work Directory' });
      expect(eraseButton).toBeDisabled();
    });

    it('"Agent + Work Directory" button remains disabled with wrong input', () => {
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

      const input = screen.getByPlaceholderText('Type the agent name here to confirm directory deletion.');
      fireEvent.change(input, { target: { value: 'WrongName' } });

      const eraseButton = screen.getByRole('button', { name: 'Agent + Work Directory' });
      expect(eraseButton).toBeDisabled();
    });

    it('"Agent + Work Directory" button becomes enabled when exact agent name is typed', () => {
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

      const input = screen.getByPlaceholderText('Type the agent name here to confirm directory deletion.');
      fireEvent.change(input, { target: { value: 'TestAgent' } });

      const eraseButton = screen.getByRole('button', { name: 'Agent + Work Directory' });
      expect(eraseButton).not.toBeDisabled();
    });

    it('"Agent + Work Directory" button becomes enabled with case-insensitive match', () => {
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

      const input = screen.getByPlaceholderText('Type the agent name here to confirm directory deletion.');
      fireEvent.change(input, { target: { value: 'testagent' } });

      const eraseButton = screen.getByRole('button', { name: 'Agent + Work Directory' });
      expect(eraseButton).not.toBeDisabled();
    });

    it('"Agent + Work Directory" button becomes enabled with trimmed input', () => {
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

      const input = screen.getByPlaceholderText('Type the agent name here to confirm directory deletion.');
      fireEvent.change(input, { target: { value: '  TestAgent  ' } });

      const eraseButton = screen.getByRole('button', { name: 'Agent + Work Directory' });
      expect(eraseButton).not.toBeDisabled();
    });
  });

  describe('focus management', () => {
    it('focuses Agent Only button on mount (not Agent + Work Directory)', async () => {
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
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Agent Only' }));
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

    it('"Agent Only" button is always enabled and calls onConfirm', () => {
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

      const agentOnlyButton = screen.getByRole('button', { name: 'Agent Only' });
      expect(agentOnlyButton).not.toBeDisabled();

      fireEvent.click(agentOnlyButton);
      expect(callOrder).toEqual(['confirm', 'close']);
      expect(onConfirmAndErase).not.toHaveBeenCalled();
    });

    it('calls onConfirmAndErase then onClose when Agent + Work Directory is clicked (after confirmation)', () => {
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

      // First type the agent name to enable the button
      const input = screen.getByPlaceholderText('Type the agent name here to confirm directory deletion.');
      fireEvent.change(input, { target: { value: 'TestAgent' } });

      fireEvent.click(screen.getByRole('button', { name: 'Agent + Work Directory' }));
      expect(callOrder).toEqual(['confirmAndErase', 'close']);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('does not call onConfirmAndErase when Agent + Work Directory is clicked while disabled', () => {
      const onConfirmAndErase = vi.fn();
      const onClose = vi.fn();

      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onConfirmAndErase={onConfirmAndErase}
          onClose={onClose}
        />
      );

      // Click without typing the agent name
      fireEvent.click(screen.getByRole('button', { name: 'Agent + Work Directory' }));
      expect(onConfirmAndErase).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
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

    it('closes modal when Escape key is pressed', async () => {
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

      // Escape key is handled globally via LayerStackContext
      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onClose when Enter is pressed on Cancel button', () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();
      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={onConfirm}
          onConfirmAndErase={vi.fn()}
          onClose={onClose}
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.keyDown(cancelButton, { key: 'Enter' });

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('calls onConfirm when Enter is pressed on Agent Only button', () => {
      const callOrder: string[] = [];
      const onClose = vi.fn(() => callOrder.push('close'));
      const onConfirm = vi.fn(() => callOrder.push('confirm'));
      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={onConfirm}
          onConfirmAndErase={vi.fn()}
          onClose={onClose}
        />
      );

      const agentOnlyButton = screen.getByRole('button', { name: 'Agent Only' });
      fireEvent.keyDown(agentOnlyButton, { key: 'Enter' });

      expect(callOrder).toEqual(['confirm', 'close']);
    });

    it('does not trigger Agent + Work Directory when Enter is pressed while disabled', () => {
      const onConfirmAndErase = vi.fn();
      const onClose = vi.fn();
      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onConfirmAndErase={onConfirmAndErase}
          onClose={onClose}
        />
      );

      const eraseButton = screen.getByRole('button', { name: 'Agent + Work Directory' });
      fireEvent.keyDown(eraseButton, { key: 'Enter' });

      expect(onConfirmAndErase).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('triggers Agent + Work Directory when Enter is pressed after confirmation input matches', () => {
      const callOrder: string[] = [];
      const onClose = vi.fn(() => callOrder.push('close'));
      const onConfirmAndErase = vi.fn(() => callOrder.push('confirmAndErase'));
      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onConfirmAndErase={onConfirmAndErase}
          onClose={onClose}
        />
      );

      // First type the agent name to enable the button
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'TestAgent' } });

      // Now Enter should work on the Agent + Work Directory button
      const eraseButton = screen.getByRole('button', { name: 'Agent + Work Directory' });
      fireEvent.keyDown(eraseButton, { key: 'Enter' });

      expect(callOrder).toEqual(['confirmAndErase', 'close']);
    });

    it('Tab key navigates through interactive elements in expected order', async () => {
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

      // Wait for initial focus on Agent Only button
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Agent Only' }));
      });

      // Tab to next element: Agent + Work Directory button
      fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
      // Note: In real browser, Tab navigation is handled natively.
      // In JSDOM, we simulate by checking tabIndex values are correct.

      // Verify all interactive elements have correct tabIndex for keyboard access
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      const agentOnlyButton = screen.getByRole('button', { name: 'Agent Only' });
      const eraseButton = screen.getByRole('button', { name: 'Agent + Work Directory' });
      const input = screen.getByRole('textbox');
      const closeButton = screen.getByTestId('x-icon').closest('button');

      // All interactive elements should be focusable (tabIndex 0 or no tabIndex which defaults to natural order)
      expect(cancelButton).toHaveAttribute('tabIndex', '0');
      expect(agentOnlyButton).toHaveAttribute('tabIndex', '0');
      expect(eraseButton).toHaveAttribute('tabIndex', '0');
      expect(input).toHaveAttribute('tabIndex', '0');
      // Close button uses default tab order (no explicit tabIndex needed)
      expect(closeButton).toBeInTheDocument();
    });

    it('all buttons are keyboard focusable', () => {
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

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      const agentOnlyButton = screen.getByRole('button', { name: 'Agent Only' });
      const eraseButton = screen.getByRole('button', { name: 'Agent + Work Directory' });

      // Focus each button programmatically and verify it receives focus
      cancelButton.focus();
      expect(document.activeElement).toBe(cancelButton);

      agentOnlyButton.focus();
      expect(document.activeElement).toBe(agentOnlyButton);

      eraseButton.focus();
      expect(document.activeElement).toBe(eraseButton);
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

    it('has semantic button elements and input (5 interactive elements total)', () => {
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

      // X close, Cancel, Agent Only, Agent + Work Directory = 4 buttons
      expect(screen.getAllByRole('button')).toHaveLength(4);
      // Plus 1 text input
      expect(screen.getByRole('textbox')).toBeInTheDocument();
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

    it('confirmation input has aria-label with agent name', () => {
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

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label', 'Type TestAgent to confirm directory deletion');
    });

    it('confirmation input has aria-describedby linking to danger warning', () => {
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

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'delete-agent-warning');

      // Verify the referenced element exists
      const warningElement = document.getElementById('delete-agent-warning');
      expect(warningElement).toBeInTheDocument();
      expect(warningElement).toHaveTextContent(/Danger:/);
    });

    it('"Agent + Work Directory" button has aria-disabled when disabled', () => {
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

      const eraseButton = screen.getByRole('button', { name: 'Agent + Work Directory' });
      expect(eraseButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('"Agent + Work Directory" button has aria-disabled=false when enabled', () => {
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

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'TestAgent' } });

      const eraseButton = screen.getByRole('button', { name: 'Agent + Work Directory' });
      expect(eraseButton).toHaveAttribute('aria-disabled', 'false');
    });

    it('pressing Enter on confirmation input triggers Agent + Work Directory when name matches', () => {
      const callOrder: string[] = [];
      const onClose = vi.fn(() => callOrder.push('close'));
      const onConfirmAndErase = vi.fn(() => callOrder.push('confirmAndErase'));

      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onConfirmAndErase={onConfirmAndErase}
          onClose={onClose}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'TestAgent' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(callOrder).toEqual(['confirmAndErase', 'close']);
    });

    it('pressing Enter on confirmation input does nothing when name does not match', () => {
      const onConfirmAndErase = vi.fn();
      const onClose = vi.fn();

      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onConfirmAndErase={onConfirmAndErase}
          onClose={onClose}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'WrongName' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onConfirmAndErase).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('pressing non-Enter keys on confirmation input does not trigger action', () => {
      const onConfirmAndErase = vi.fn();
      const onClose = vi.fn();

      renderWithLayerStack(
        <DeleteAgentConfirmModal
          theme={testTheme}
          agentName="TestAgent"
          workingDirectory="/home/user/project"
          onConfirm={vi.fn()}
          onConfirmAndErase={onConfirmAndErase}
          onClose={onClose}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'TestAgent' } });
      fireEvent.keyDown(input, { key: 'Tab' });
      fireEvent.keyDown(input, { key: 'Escape' });
      fireEvent.keyDown(input, { key: 'a' });

      expect(onConfirmAndErase).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    describe('long agent names', () => {
      it('handles very long agent names (50+ characters)', () => {
        const longAgentName =
          'ThisIsAVeryLongAgentNameThatExceedsFiftyCharactersForTestingPurposes';
        renderWithLayerStack(
          <DeleteAgentConfirmModal
            theme={testTheme}
            agentName={longAgentName}
            workingDirectory="/home/user/project"
            onConfirm={vi.fn()}
            onConfirmAndErase={vi.fn()}
            onClose={vi.fn()}
          />
        );

        // Verify the long name is displayed
        expect(screen.getByText(new RegExp(longAgentName))).toBeInTheDocument();
      });

      it('enables button when long agent name is typed correctly', () => {
        const longAgentName =
          'ThisIsAVeryLongAgentNameThatExceedsFiftyCharactersForTestingPurposes';
        renderWithLayerStack(
          <DeleteAgentConfirmModal
            theme={testTheme}
            agentName={longAgentName}
            workingDirectory="/home/user/project"
            onConfirm={vi.fn()}
            onConfirmAndErase={vi.fn()}
            onClose={vi.fn()}
          />
        );

        const input = screen.getByPlaceholderText(
          'Type the agent name here to confirm directory deletion.'
        );
        fireEvent.change(input, { target: { value: longAgentName } });

        const eraseButton = screen.getByRole('button', { name: 'Agent + Work Directory' });
        expect(eraseButton).not.toBeDisabled();
      });
    });

    describe('long directory paths', () => {
      it('renders very long directory paths with break-all class', () => {
        const longPath =
          '/home/user/very/deeply/nested/project/directory/structure/that/goes/on/and/on/and/on/forever/and/ever';
        renderWithLayerStack(
          <DeleteAgentConfirmModal
            theme={testTheme}
            agentName="TestAgent"
            workingDirectory={longPath}
            onConfirm={vi.fn()}
            onConfirmAndErase={vi.fn()}
            onClose={vi.fn()}
          />
        );

        const codeElement = screen.getByText(longPath);
        expect(codeElement).toBeInTheDocument();
        expect(codeElement).toHaveClass('break-all');
      });
    });

    describe('special characters in agent name', () => {
      it('handles agent names with quotes', () => {
        const agentNameWithQuotes = 'Agent"Test"Name';
        renderWithLayerStack(
          <DeleteAgentConfirmModal
            theme={testTheme}
            agentName={agentNameWithQuotes}
            workingDirectory="/home/user/project"
            onConfirm={vi.fn()}
            onConfirmAndErase={vi.fn()}
            onClose={vi.fn()}
          />
        );

        const input = screen.getByPlaceholderText(
          'Type the agent name here to confirm directory deletion.'
        );
        fireEvent.change(input, { target: { value: agentNameWithQuotes } });

        const eraseButton = screen.getByRole('button', { name: 'Agent + Work Directory' });
        expect(eraseButton).not.toBeDisabled();
      });

      it('handles agent names with ampersands', () => {
        const agentNameWithAmpersand = 'Agent&Test&Name';
        renderWithLayerStack(
          <DeleteAgentConfirmModal
            theme={testTheme}
            agentName={agentNameWithAmpersand}
            workingDirectory="/home/user/project"
            onConfirm={vi.fn()}
            onConfirmAndErase={vi.fn()}
            onClose={vi.fn()}
          />
        );

        const input = screen.getByPlaceholderText(
          'Type the agent name here to confirm directory deletion.'
        );
        fireEvent.change(input, { target: { value: agentNameWithAmpersand } });

        const eraseButton = screen.getByRole('button', { name: 'Agent + Work Directory' });
        expect(eraseButton).not.toBeDisabled();
      });

      it('handles agent names with angle brackets', () => {
        const agentNameWithBrackets = 'Agent<Test>Name';
        renderWithLayerStack(
          <DeleteAgentConfirmModal
            theme={testTheme}
            agentName={agentNameWithBrackets}
            workingDirectory="/home/user/project"
            onConfirm={vi.fn()}
            onConfirmAndErase={vi.fn()}
            onClose={vi.fn()}
          />
        );

        const input = screen.getByPlaceholderText(
          'Type the agent name here to confirm directory deletion.'
        );
        fireEvent.change(input, { target: { value: agentNameWithBrackets } });

        const eraseButton = screen.getByRole('button', { name: 'Agent + Work Directory' });
        expect(eraseButton).not.toBeDisabled();
      });

      it('handles agent names with Unicode characters', () => {
        const agentNameWithUnicode = 'Agent🤖Test名前';
        renderWithLayerStack(
          <DeleteAgentConfirmModal
            theme={testTheme}
            agentName={agentNameWithUnicode}
            workingDirectory="/home/user/project"
            onConfirm={vi.fn()}
            onConfirmAndErase={vi.fn()}
            onClose={vi.fn()}
          />
        );

        const input = screen.getByPlaceholderText(
          'Type the agent name here to confirm directory deletion.'
        );
        fireEvent.change(input, { target: { value: agentNameWithUnicode } });

        const eraseButton = screen.getByRole('button', { name: 'Agent + Work Directory' });
        expect(eraseButton).not.toBeDisabled();
      });
    });

    describe('whitespace handling', () => {
      it('enables button when agent name prop has leading/trailing whitespace and input matches trimmed name', () => {
        renderWithLayerStack(
          <DeleteAgentConfirmModal
            theme={testTheme}
            agentName="  TestAgent  "
            workingDirectory="/home/user/project"
            onConfirm={vi.fn()}
            onConfirmAndErase={vi.fn()}
            onClose={vi.fn()}
          />
        );

        const input = screen.getByPlaceholderText(
          'Type the agent name here to confirm directory deletion.'
        );
        fireEvent.change(input, { target: { value: 'TestAgent' } });

        const eraseButton = screen.getByRole('button', { name: 'Agent + Work Directory' });
        expect(eraseButton).not.toBeDisabled();
      });

      it('enables button when input has whitespace and agent name has whitespace', () => {
        renderWithLayerStack(
          <DeleteAgentConfirmModal
            theme={testTheme}
            agentName="  TestAgent  "
            workingDirectory="/home/user/project"
            onConfirm={vi.fn()}
            onConfirmAndErase={vi.fn()}
            onClose={vi.fn()}
          />
        );

        const input = screen.getByPlaceholderText(
          'Type the agent name here to confirm directory deletion.'
        );
        fireEvent.change(input, { target: { value: '  TestAgent  ' } });

        const eraseButton = screen.getByRole('button', { name: 'Agent + Work Directory' });
        expect(eraseButton).not.toBeDisabled();
      });
    });

    describe('input constraints', () => {
      it('has maxLength attribute of 256 characters', () => {
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

        const input = screen.getByPlaceholderText(
          'Type the agent name here to confirm directory deletion.'
        );
        expect(input).toHaveAttribute('maxLength', '256');
      });
    });
  });
});
