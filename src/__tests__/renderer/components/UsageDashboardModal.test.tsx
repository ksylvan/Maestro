/**
 * @fileoverview Tests for UsageDashboardModal component
 * Tests: rendering, time range selection, view mode tabs, layer stack registration,
 * data loading states, and CSV export functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { UsageDashboardModal } from '../../../renderer/components/UsageDashboard/UsageDashboardModal';
import type { Theme } from '../../../renderer/types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <span data-testid="x-icon" className={className} style={style}>×</span>
  ),
  BarChart3: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <span data-testid="barchart-icon" className={className} style={style}>📊</span>
  ),
  Calendar: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <span data-testid="calendar-icon" className={className} style={style}>📅</span>
  ),
  Download: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <span data-testid="download-icon" className={className} style={style}>⬇️</span>
  ),
  RefreshCw: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <span data-testid="refresh-icon" className={className} style={style}>🔄</span>
  ),
}));

// Mock layer stack context
const mockRegisterLayer = vi.fn(() => 'layer-123');
const mockUnregisterLayer = vi.fn();

vi.mock('../../../renderer/contexts/LayerStackContext', () => ({
  useLayerStack: () => ({
    registerLayer: mockRegisterLayer,
    unregisterLayer: mockUnregisterLayer,
  }),
}));

// Mock maestro stats API
const mockGetAggregation = vi.fn();
const mockExportCsv = vi.fn();
const mockOnStatsUpdate = vi.fn(() => vi.fn()); // Returns unsubscribe function

const mockMaestro = {
  stats: {
    getAggregation: mockGetAggregation,
    exportCsv: mockExportCsv,
    onStatsUpdate: mockOnStatsUpdate,
  },
};

// Set up window.maestro mock
Object.defineProperty(window, 'maestro', {
  value: mockMaestro,
  writable: true,
});

// Create test theme
const createTheme = (): Theme => ({
  id: 'test-dark',
  name: 'Test Dark',
  mode: 'dark',
  colors: {
    bgMain: '#1a1a2e',
    bgSidebar: '#16213e',
    bgActivity: '#0f3460',
    textMain: '#e8e8e8',
    textDim: '#888888',
    accent: '#7b2cbf',
    border: '#333355',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    bgAccentHover: '#9333ea',
  },
});

// Sample aggregation data
const createSampleData = () => ({
  totalQueries: 150,
  totalDuration: 3600000, // 1 hour in ms
  avgDuration: 24000, // 24 seconds
  byAgent: {
    'claude-code': { count: 100, duration: 2400000 },
    'terminal': { count: 50, duration: 1200000 },
  },
  bySource: { user: 100, auto: 50 },
  byDay: [
    { date: '2024-01-15', count: 25, duration: 600000 },
    { date: '2024-01-16', count: 30, duration: 720000 },
    { date: '2024-01-17', count: 45, duration: 1080000 },
    { date: '2024-01-18', count: 50, duration: 1200000 },
  ],
});

describe('UsageDashboardModal', () => {
  const theme = createTheme();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAggregation.mockResolvedValue(createSampleData());
    mockExportCsv.mockResolvedValue('date,count\n2024-01-15,25');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(
        <UsageDashboardModal isOpen={false} onClose={onClose} theme={theme} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders modal when isOpen is true', async () => {
      render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('renders modal title', async () => {
      render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        expect(screen.getByText('Usage Dashboard')).toBeInTheDocument();
      });
    });

    it('renders time range selector with default value', async () => {
      render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();
        expect(select).toHaveValue('week');
      });
    });

    it('renders view mode tabs', async () => {
      render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('Agents')).toBeInTheDocument();
        expect(screen.getByText('Activity')).toBeInTheDocument();
        expect(screen.getByText('Auto Run')).toBeInTheDocument();
      });
    });

    it('renders Export CSV button', async () => {
      render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
      });
    });

    it('renders close button', async () => {
      render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        expect(screen.getByTitle('Close (Esc)')).toBeInTheDocument();
      });
    });
  });

  describe('Layer Stack Integration', () => {
    it('registers with layer stack when opened', async () => {
      render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        expect(mockRegisterLayer).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'modal',
            blocksLowerLayers: true,
            capturesFocus: true,
            focusTrap: 'lenient',
          })
        );
      });
    });

    it('unregisters from layer stack when closed', async () => {
      const { rerender } = render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        expect(mockRegisterLayer).toHaveBeenCalled();
      });

      rerender(
        <UsageDashboardModal isOpen={false} onClose={onClose} theme={theme} />
      );

      expect(mockUnregisterLayer).toHaveBeenCalledWith('layer-123');
    });
  });

  describe('Data Loading', () => {
    it('shows loading state initially', async () => {
      mockGetAggregation.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        expect(screen.getByText('Loading usage data...')).toBeInTheDocument();
      });
    });

    it('fetches stats on mount', async () => {
      render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        expect(mockGetAggregation).toHaveBeenCalledWith('week');
      });
    });

    it('displays summary stats after loading', async () => {
      render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      // Wait for stats to load
      await waitFor(() => {
        expect(screen.getByText('Total Queries')).toBeInTheDocument();
      }, { timeout: 3000 });

      // The number 150 should be rendered (may appear multiple times in different parts of the dashboard)
      const countElements = screen.getAllByText('150');
      expect(countElements.length).toBeGreaterThan(0);
    });

    it('shows empty state when no data', async () => {
      mockGetAggregation.mockResolvedValue({
        totalQueries: 0,
        totalDuration: 0,
        avgDuration: 0,
        byAgent: {},
        bySource: { user: 0, auto: 0 },
        byDay: [],
      });

      render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        expect(screen.getByText('No usage data yet')).toBeInTheDocument();
        expect(screen.getByText('Start using Maestro to see your stats!')).toBeInTheDocument();
      });
    });

    it('shows error state on fetch failure', async () => {
      mockGetAggregation.mockRejectedValue(new Error('Network error'));

      render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load usage data')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });
  });

  describe('Time Range Selection', () => {
    it('changes time range when dropdown value changes', async () => {
      render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        expect(mockGetAggregation).toHaveBeenCalledWith('week');
      });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'month' } });

      await waitFor(() => {
        expect(mockGetAggregation).toHaveBeenCalledWith('month');
      });
    });

    it('displays all time range options', async () => {
      render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        const select = screen.getByRole('combobox');
        const options = select.querySelectorAll('option');
        expect(options).toHaveLength(5);
        expect(options[0]).toHaveValue('day');
        expect(options[1]).toHaveValue('week');
        expect(options[2]).toHaveValue('month');
        expect(options[3]).toHaveValue('year');
        expect(options[4]).toHaveValue('all');
      });
    });
  });

  describe('View Mode Tabs', () => {
    it('switches view mode when tab is clicked', async () => {
      render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
      });

      const agentsTab = screen.getByText('Agents');
      fireEvent.click(agentsTab);

      // The tab should now be active (different styling)
      expect(agentsTab).toHaveStyle({ color: theme.colors.accent });
    });
  });

  describe('Close Behavior', () => {
    it('calls onClose when close button is clicked', async () => {
      render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        expect(screen.getByTitle('Close (Esc)')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Close (Esc)'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking overlay', async () => {
      render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click on the overlay (the parent div with modal-overlay class)
      const overlay = screen.getByRole('dialog').parentElement;
      fireEvent.click(overlay!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when clicking inside the modal', async () => {
      render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click inside the modal
      fireEvent.click(screen.getByRole('dialog'));

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('CSV Export', () => {
    it('calls exportCsv when export button is clicked', async () => {
      render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
      });

      // Mock the document.createElement and URL APIs before clicking
      const originalCreateElement = document.createElement.bind(document);
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {},
      };
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') {
          return mockAnchor as unknown as HTMLAnchorElement;
        }
        return originalCreateElement(tag);
      });
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockReturnValue(mockAnchor as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockReturnValue(mockAnchor as any);
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      fireEvent.click(screen.getByText('Export CSV'));

      await waitFor(() => {
        expect(mockExportCsv).toHaveBeenCalledWith('week');
      });

      // Cleanup spies
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('Stats Updates Subscription', () => {
    it('subscribes to stats updates when opened', async () => {
      render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        expect(mockOnStatsUpdate).toHaveBeenCalled();
      });
    });

    it('unsubscribes from stats updates when closed', async () => {
      const unsubscribe = vi.fn();
      mockOnStatsUpdate.mockReturnValue(unsubscribe);

      const { rerender } = render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        expect(mockOnStatsUpdate).toHaveBeenCalled();
      });

      rerender(
        <UsageDashboardModal isOpen={false} onClose={onClose} theme={theme} />
      );

      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Summary Cards', () => {
    it('displays formatted duration for total time', async () => {
      render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        expect(screen.getByText('Total Time')).toBeInTheDocument();
        expect(screen.getByText('1h 0m')).toBeInTheDocument(); // 3600000ms = 1 hour
      });
    });

    it('displays top agent label', async () => {
      render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        expect(screen.getByText('Top Agent')).toBeInTheDocument();
        // claude-code appears in multiple places (summary and chart)
        const claudeCodeElements = screen.getAllByText('claude-code');
        expect(claudeCodeElements.length).toBeGreaterThan(0);
      });
    });

    it('displays interactive percentage', async () => {
      render(
        <UsageDashboardModal isOpen={true} onClose={onClose} theme={theme} />
      );

      await waitFor(() => {
        expect(screen.getByText('Interactive %')).toBeInTheDocument();
        expect(screen.getByText('67%')).toBeInTheDocument(); // 100/150 = 66.67%
      });
    });
  });
});
