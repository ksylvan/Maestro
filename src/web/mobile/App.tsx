/**
 * Maestro Mobile Web App
 *
 * Lightweight remote control interface for mobile devices.
 * Focused on quick command input and session monitoring.
 *
 * Phase 1 implementation will expand this component.
 */

import React, { useEffect, useCallback } from 'react';
import { useThemeColors } from '../components/ThemeProvider';
import { useWebSocket, type WebSocketState } from '../hooks/useWebSocket';
import { Badge, type BadgeVariant } from '../components/Badge';

/**
 * Map WebSocket state to display properties
 */
interface ConnectionStatusConfig {
  label: string;
  variant: BadgeVariant;
  pulse: boolean;
}

const CONNECTION_STATUS_CONFIG: Record<WebSocketState, ConnectionStatusConfig> = {
  disconnected: {
    label: 'Disconnected',
    variant: 'error',
    pulse: false,
  },
  connecting: {
    label: 'Connecting...',
    variant: 'connecting',
    pulse: true,
  },
  authenticating: {
    label: 'Authenticating...',
    variant: 'connecting',
    pulse: true,
  },
  connected: {
    label: 'Connected',
    variant: 'success',
    pulse: false,
  },
  authenticated: {
    label: 'Connected',
    variant: 'success',
    pulse: false,
  },
};

/**
 * Header component for the mobile app
 * Displays app title and connection status indicator
 */
interface MobileHeaderProps {
  connectionState: WebSocketState;
  onRetry?: () => void;
}

function MobileHeader({ connectionState, onRetry }: MobileHeaderProps) {
  const colors = useThemeColors();
  const statusConfig = CONNECTION_STATUS_CONFIG[connectionState];

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bgSidebar,
        minHeight: '56px',
      }}
    >
      <h1
        style={{
          fontSize: '18px',
          fontWeight: 600,
          margin: 0,
          color: colors.textMain,
        }}
      >
        Maestro
      </h1>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Badge
          variant={statusConfig.variant}
          badgeStyle="subtle"
          size="sm"
          pulse={statusConfig.pulse}
          onClick={connectionState === 'disconnected' ? onRetry : undefined}
          style={{
            cursor: connectionState === 'disconnected' ? 'pointer' : 'default',
          }}
        >
          {statusConfig.label}
        </Badge>
      </div>
    </header>
  );
}

/**
 * Main mobile app component with WebSocket connection management
 */
export default function MobileApp() {
  const colors = useThemeColors();

  const { state: connectionState, connect, error, reconnectAttempts } = useWebSocket({
    autoReconnect: true,
    maxReconnectAttempts: 10,
    reconnectDelay: 2000,
    handlers: {
      onConnectionChange: (newState) => {
        console.log('[Mobile] Connection state:', newState);
      },
      onError: (err) => {
        console.error('[Mobile] WebSocket error:', err);
      },
    },
  });

  // Connect on mount
  useEffect(() => {
    connect();
  }, [connect]);

  // Retry connection handler
  const handleRetry = useCallback(() => {
    connect();
  }, [connect]);

  // Determine content based on connection state
  const renderContent = () => {
    if (connectionState === 'disconnected') {
      return (
        <div
          style={{
            marginBottom: '24px',
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: colors.bgSidebar,
            border: `1px solid ${colors.border}`,
            maxWidth: '300px',
          }}
        >
          <h2 style={{ fontSize: '16px', marginBottom: '8px', color: colors.textMain }}>
            Connection Lost
          </h2>
          <p style={{ fontSize: '14px', color: colors.textDim, marginBottom: '12px' }}>
            {error || 'Unable to connect to Maestro desktop app.'}
          </p>
          {reconnectAttempts > 0 && (
            <p style={{ fontSize: '12px', color: colors.textDim, marginBottom: '12px' }}>
              Reconnection attempts: {reconnectAttempts}
            </p>
          )}
          <button
            onClick={handleRetry}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: colors.accent,
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Retry Connection
          </button>
        </div>
      );
    }

    if (connectionState === 'connecting' || connectionState === 'authenticating') {
      return (
        <div
          style={{
            marginBottom: '24px',
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: colors.bgSidebar,
            border: `1px solid ${colors.border}`,
            maxWidth: '300px',
          }}
        >
          <h2 style={{ fontSize: '16px', marginBottom: '8px', color: colors.textMain }}>
            Connecting to Maestro...
          </h2>
          <p style={{ fontSize: '14px', color: colors.textDim }}>
            Please wait while we establish a connection to your desktop app.
          </p>
        </div>
      );
    }

    // Connected or authenticated state
    return (
      <div
        style={{
          marginBottom: '24px',
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: colors.bgSidebar,
          border: `1px solid ${colors.border}`,
          maxWidth: '300px',
        }}
      >
        <h2 style={{ fontSize: '16px', marginBottom: '8px', color: colors.textMain }}>
          Mobile Remote Control
        </h2>
        <p style={{ fontSize: '14px', color: colors.textDim }}>
          Send commands to your AI assistants from anywhere. Session selector
          and command input will be added next.
        </p>
      </div>
    );
  };

  // CSS variable for dynamic viewport height with fallback
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100dvh',
    backgroundColor: colors.bgMain,
    color: colors.textMain,
  };

  return (
    <div style={containerStyle}>
      {/* Header with connection status */}
      <MobileHeader
        connectionState={connectionState}
        onRetry={handleRetry}
      />

      {/* Main content area */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          textAlign: 'center',
          overflow: 'auto',
        }}
      >
        {renderContent()}
        <p style={{ fontSize: '12px', color: colors.textDim }}>
          Make sure Maestro desktop app is running
        </p>
      </main>

      {/* Bottom input bar placeholder */}
      <footer
        style={{
          padding: '12px 16px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: colors.bgSidebar,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            placeholder="Enter command..."
            disabled={connectionState !== 'authenticated' && connectionState !== 'connected'}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: colors.bgMain,
              border: `1px solid ${colors.border}`,
              color: connectionState === 'authenticated' || connectionState === 'connected'
                ? colors.textMain
                : colors.textDim,
              fontSize: '14px',
              opacity: connectionState === 'authenticated' || connectionState === 'connected' ? 1 : 0.5,
            }}
          />
          <button
            disabled={connectionState !== 'authenticated' && connectionState !== 'connected'}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: colors.accent,
              color: '#fff',
              opacity: connectionState === 'authenticated' || connectionState === 'connected' ? 1 : 0.5,
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: connectionState === 'authenticated' || connectionState === 'connected'
                ? 'pointer'
                : 'default',
            }}
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}
