/**
 * UsageDashboardModal
 *
 * Main modal container for the Usage Dashboard with Recharts visualizations.
 * Displays AI usage patterns across all sessions and agents with time-based filtering.
 *
 * Features:
 * - Time range selector (Day, Week, Month, Year, All Time)
 * - View mode tabs for different visualization focuses
 * - Summary stats cards
 * - Activity heatmap, agent comparison, source distribution charts
 * - Responsive grid layout
 * - Theme-aware styling
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, BarChart3, Calendar, Download, RefreshCw } from 'lucide-react';
import type { Theme } from '../../types';
import { useLayerStack } from '../../contexts/LayerStackContext';
import { MODAL_PRIORITIES } from '../../constants/modalPriorities';

// Stats time range type matching the backend API
type StatsTimeRange = 'day' | 'week' | 'month' | 'year' | 'all';

// Aggregation data shape from the stats API
interface StatsAggregation {
  totalQueries: number;
  totalDuration: number;
  avgDuration: number;
  byAgent: Record<string, { count: number; duration: number }>;
  bySource: { user: number; auto: number };
  byDay: Array<{ date: string; count: number; duration: number }>;
}

// View mode options for the dashboard
type ViewMode = 'overview' | 'agents' | 'activity' | 'autorun';

interface UsageDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
}

// Time range options for the dropdown
const TIME_RANGE_OPTIONS: { value: StatsTimeRange; label: string }[] = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

// View mode tabs
const VIEW_MODE_TABS: { value: ViewMode; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'agents', label: 'Agents' },
  { value: 'activity', label: 'Activity' },
  { value: 'autorun', label: 'Auto Run' },
];

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Format large numbers with K/M suffixes
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function UsageDashboardModal({
  isOpen,
  onClose,
  theme,
}: UsageDashboardModalProps) {
  const [timeRange, setTimeRange] = useState<StatsTimeRange>('week');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [data, setData] = useState<StatsAggregation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const { registerLayer, unregisterLayer } = useLayerStack();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Register with layer stack for proper Escape handling
  useEffect(() => {
    if (isOpen) {
      const id = registerLayer({
        type: 'modal',
        priority: MODAL_PRIORITIES.USAGE_DASHBOARD,
        blocksLowerLayers: true,
        capturesFocus: true,
        focusTrap: 'lenient',
        onEscape: () => onCloseRef.current(),
      });
      return () => unregisterLayer(id);
    }
  }, [isOpen, registerLayer, unregisterLayer]);

  // Fetch stats data when range changes
  const fetchStats = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const stats = await window.maestro.stats.getAggregation(timeRange);
      setData(stats);
    } catch (err) {
      console.error('Failed to fetch usage stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
      if (showRefresh) {
        // Keep refresh spinner visible briefly for visual feedback
        setTimeout(() => setIsRefreshing(false), 300);
      }
    }
  }, [timeRange]);

  // Initial fetch and real-time updates subscription
  useEffect(() => {
    if (!isOpen) return;

    fetchStats();

    // Subscribe to stats updates with debounce
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = window.maestro.stats.onStatsUpdate(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchStats(true);
      }, 1000); // 1 second debounce
    });

    return () => {
      unsubscribe();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [isOpen, fetchStats]);

  // Focus container on open
  useEffect(() => {
    if (isOpen) {
      containerRef.current?.focus();
    }
  }, [isOpen]);

  // Handle export to CSV
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const csv = await window.maestro.stats.exportCsv(timeRange);
      // Create and download file
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maestro-usage-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  // Calculate summary stats
  const mostActiveAgent = data?.byAgent
    ? Object.entries(data.byAgent).sort((a, b) => b[1].count - a[1].count)[0]
    : null;

  const interactiveVsAutoRatio = data?.bySource
    ? data.bySource.user + data.bySource.auto > 0
      ? `${Math.round((data.bySource.user / (data.bySource.user + data.bySource.auto)) * 100)}%`
      : 'N/A'
    : 'N/A';

  return (
    <div
      className="fixed inset-0 modal-overlay flex items-center justify-center z-[9999] animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Usage Dashboard"
        className="rounded-xl shadow-2xl border overflow-hidden flex flex-col outline-none"
        style={{
          backgroundColor: theme.colors.bgActivity,
          borderColor: theme.colors.border,
          width: '80vw',
          maxWidth: '1400px',
          height: '85vh',
          maxHeight: '900px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0"
          style={{ borderColor: theme.colors.border }}
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5" style={{ color: theme.colors.accent }} />
            <h2 className="text-lg font-semibold" style={{ color: theme.colors.textMain }}>
              Usage Dashboard
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Time Range Dropdown */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: theme.colors.textDim }} />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as StatsTimeRange)}
                className="px-3 py-1.5 rounded text-sm border cursor-pointer outline-none"
                style={{
                  backgroundColor: theme.colors.bgMain,
                  borderColor: theme.colors.border,
                  color: theme.colors.textMain,
                }}
              >
                {TIME_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchStats(true)}
              className="p-1.5 rounded hover:bg-opacity-10 transition-colors"
              style={{ color: theme.colors.textDim }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${theme.colors.accent}20`}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Refresh"
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm hover:bg-opacity-10 transition-colors"
              style={{
                color: theme.colors.textMain,
                backgroundColor: `${theme.colors.accent}15`,
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${theme.colors.accent}25`}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = `${theme.colors.accent}15`}
              disabled={isExporting}
            >
              <Download className={`w-4 h-4 ${isExporting ? 'animate-pulse' : ''}`} />
              Export CSV
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-opacity-10 transition-colors"
              style={{ color: theme.colors.textDim }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${theme.colors.accent}20`}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div
          className="px-6 py-2 border-b flex items-center gap-1 flex-shrink-0"
          style={{ borderColor: theme.colors.border }}
        >
          {VIEW_MODE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setViewMode(tab.value)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: viewMode === tab.value ? `${theme.colors.accent}20` : 'transparent',
                color: viewMode === tab.value ? theme.colors.accent : theme.colors.textDim,
              }}
              onMouseEnter={(e) => {
                if (viewMode !== tab.value) {
                  e.currentTarget.style.backgroundColor = `${theme.colors.accent}10`;
                }
              }}
              onMouseLeave={(e) => {
                if (viewMode !== tab.value) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
          {loading && !data ? (
            <div
              className="h-full flex items-center justify-center"
              style={{ color: theme.colors.textDim }}
            >
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Loading usage data...
            </div>
          ) : error ? (
            <div
              className="h-full flex flex-col items-center justify-center gap-4"
              style={{ color: theme.colors.textDim }}
            >
              <p>Failed to load usage data</p>
              <button
                onClick={() => fetchStats()}
                className="px-4 py-2 rounded text-sm"
                style={{
                  backgroundColor: theme.colors.accent,
                  color: theme.colors.bgMain,
                }}
              >
                Retry
              </button>
            </div>
          ) : !data || (data.totalQueries === 0 && data.bySource.user === 0 && data.bySource.auto === 0) ? (
            /* Empty State */
            <div
              className="h-full flex flex-col items-center justify-center gap-4"
              style={{ color: theme.colors.textDim }}
            >
              <BarChart3 className="w-16 h-16 opacity-30" />
              <div className="text-center">
                <p className="text-lg mb-2" style={{ color: theme.colors.textMain }}>
                  No usage data yet
                </p>
                <p className="text-sm">
                  Start using Maestro to see your stats!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-5 gap-4">
                {/* Total Queries */}
                <div
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: theme.colors.bgMain }}
                >
                  <div className="text-xs uppercase tracking-wide mb-1" style={{ color: theme.colors.textDim }}>
                    Total Queries
                  </div>
                  <div className="text-2xl font-bold" style={{ color: theme.colors.textMain }}>
                    {formatNumber(data.totalQueries)}
                  </div>
                </div>

                {/* Total Time */}
                <div
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: theme.colors.bgMain }}
                >
                  <div className="text-xs uppercase tracking-wide mb-1" style={{ color: theme.colors.textDim }}>
                    Total Time
                  </div>
                  <div className="text-2xl font-bold" style={{ color: theme.colors.textMain }}>
                    {formatDuration(data.totalDuration)}
                  </div>
                </div>

                {/* Average Duration */}
                <div
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: theme.colors.bgMain }}
                >
                  <div className="text-xs uppercase tracking-wide mb-1" style={{ color: theme.colors.textDim }}>
                    Avg Duration
                  </div>
                  <div className="text-2xl font-bold" style={{ color: theme.colors.textMain }}>
                    {formatDuration(data.avgDuration)}
                  </div>
                </div>

                {/* Most Active Agent */}
                <div
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: theme.colors.bgMain }}
                >
                  <div className="text-xs uppercase tracking-wide mb-1" style={{ color: theme.colors.textDim }}>
                    Top Agent
                  </div>
                  <div className="text-2xl font-bold truncate" style={{ color: theme.colors.textMain }}>
                    {mostActiveAgent ? mostActiveAgent[0] : 'N/A'}
                  </div>
                </div>

                {/* Interactive vs Auto Ratio */}
                <div
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: theme.colors.bgMain }}
                >
                  <div className="text-xs uppercase tracking-wide mb-1" style={{ color: theme.colors.textDim }}>
                    Interactive %
                  </div>
                  <div className="text-2xl font-bold" style={{ color: theme.colors.textMain }}>
                    {interactiveVsAutoRatio}
                  </div>
                </div>
              </div>

              {/* Charts Container */}
              <div className="grid grid-cols-2 gap-6">
                {/* Agent Comparison Chart Placeholder */}
                <div
                  className="p-4 rounded-lg min-h-[300px] flex flex-col"
                  style={{ backgroundColor: theme.colors.bgMain }}
                >
                  <h3 className="text-sm font-medium mb-4" style={{ color: theme.colors.textMain }}>
                    Time by Agent
                  </h3>
                  <div className="flex-1 flex items-center justify-center" style={{ color: theme.colors.textDim }}>
                    {Object.keys(data.byAgent).length > 0 ? (
                      <div className="w-full space-y-2">
                        {Object.entries(data.byAgent)
                          .sort((a, b) => b[1].duration - a[1].duration)
                          .slice(0, 5)
                          .map(([agent, stats]) => {
                            const maxDuration = Math.max(...Object.values(data.byAgent).map(s => s.duration));
                            const percentage = maxDuration > 0 ? (stats.duration / maxDuration) * 100 : 0;
                            return (
                              <div key={agent} className="flex items-center gap-3">
                                <div
                                  className="w-24 text-xs truncate"
                                  style={{ color: theme.colors.textMain }}
                                  title={agent}
                                >
                                  {agent}
                                </div>
                                <div className="flex-1 h-6 rounded overflow-hidden" style={{ backgroundColor: `${theme.colors.border}40` }}>
                                  <div
                                    className="h-full rounded transition-all duration-500"
                                    style={{
                                      width: `${percentage}%`,
                                      backgroundColor: theme.colors.accent,
                                    }}
                                  />
                                </div>
                                <div
                                  className="w-16 text-xs text-right"
                                  style={{ color: theme.colors.textDim }}
                                >
                                  {formatDuration(stats.duration)}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <span className="text-sm">No agent data</span>
                    )}
                  </div>
                </div>

                {/* Source Distribution Chart Placeholder */}
                <div
                  className="p-4 rounded-lg min-h-[300px] flex flex-col"
                  style={{ backgroundColor: theme.colors.bgMain }}
                >
                  <h3 className="text-sm font-medium mb-4" style={{ color: theme.colors.textMain }}>
                    Source Distribution
                  </h3>
                  <div className="flex-1 flex items-center justify-center">
                    {data.bySource.user + data.bySource.auto > 0 ? (
                      <div className="flex items-center gap-8">
                        {/* Simple donut visualization */}
                        <div className="relative w-32 h-32">
                          <svg viewBox="0 0 32 32" className="w-full h-full transform -rotate-90">
                            {/* Background circle */}
                            <circle
                              cx="16"
                              cy="16"
                              r="14"
                              fill="none"
                              stroke={`${theme.colors.border}40`}
                              strokeWidth="4"
                            />
                            {/* User segment */}
                            <circle
                              cx="16"
                              cy="16"
                              r="14"
                              fill="none"
                              stroke={theme.colors.accent}
                              strokeWidth="4"
                              strokeDasharray={`${(data.bySource.user / (data.bySource.user + data.bySource.auto)) * 87.96} 87.96`}
                            />
                          </svg>
                          <div
                            className="absolute inset-0 flex items-center justify-center text-lg font-bold"
                            style={{ color: theme.colors.textMain }}
                          >
                            {data.bySource.user + data.bySource.auto}
                          </div>
                        </div>
                        {/* Legend */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: theme.colors.accent }}
                            />
                            <span className="text-sm" style={{ color: theme.colors.textMain }}>
                              Interactive: {data.bySource.user}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: `${theme.colors.border}80` }}
                            />
                            <span className="text-sm" style={{ color: theme.colors.textMain }}>
                              Auto Run: {data.bySource.auto}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm" style={{ color: theme.colors.textDim }}>No source data</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Activity Timeline (full width) */}
              <div
                className="p-4 rounded-lg min-h-[200px]"
                style={{ backgroundColor: theme.colors.bgMain }}
              >
                <h3 className="text-sm font-medium mb-4" style={{ color: theme.colors.textMain }}>
                  Activity Over Time
                </h3>
                {data.byDay.length > 0 ? (
                  <div className="flex items-end gap-1 h-32">
                    {data.byDay.slice(-30).map((day, idx) => {
                      const maxCount = Math.max(...data.byDay.map(d => d.count));
                      const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                      return (
                        <div
                          key={day.date}
                          className="flex-1 min-w-[8px] rounded-t transition-all duration-300 cursor-default group relative"
                          style={{
                            height: `${Math.max(height, 4)}%`,
                            backgroundColor: day.count > 0 ? theme.colors.accent : `${theme.colors.border}40`,
                            opacity: day.count > 0 ? 0.6 + (height / 250) : 0.3,
                          }}
                          title={`${day.date}: ${day.count} queries`}
                        >
                          {/* Tooltip */}
                          <div
                            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                            style={{
                              backgroundColor: theme.colors.bgActivity,
                              color: theme.colors.textMain,
                              border: `1px solid ${theme.colors.border}`,
                            }}
                          >
                            {day.date}: {day.count} queries
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center" style={{ color: theme.colors.textDim }}>
                    <span className="text-sm">No activity data</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 border-t flex items-center justify-between text-xs flex-shrink-0"
          style={{
            borderColor: theme.colors.border,
            color: theme.colors.textDim,
          }}
        >
          <span>
            {data && data.totalQueries > 0
              ? `Showing ${TIME_RANGE_OPTIONS.find(o => o.value === timeRange)?.label.toLowerCase()} data`
              : 'No data for selected time range'}
          </span>
          <span style={{ opacity: 0.7 }}>Press Esc to close</span>
        </div>
      </div>
    </div>
  );
}
