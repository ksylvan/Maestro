/**
 * Pinned controls for Pianola's tab bar. Pianola uses the standard multi-type
 * TabBar (chat / file / terminal / browser tabs, same "+" menu as every other
 * agent); these two buttons are slotted into its sticky-left group so they stay
 * visible while tabs overflow:
 *
 * - PianolaDashboardTab: switches to the pinned manager Dashboard view.
 * - PianolaClearChatButton: resets the active chat conversation.
 */

import React from 'react';
import { LayoutDashboard, Eraser } from 'lucide-react';
import type { Theme } from '../../types';

export function PianolaDashboardTab({
	theme,
	active,
	needsInputCount,
	onClick,
}: {
	theme: Theme;
	active: boolean;
	/** Agents awaiting input, badged on the Dashboard button (0 = no badge). */
	needsInputCount: number;
	onClick: () => void;
}): React.ReactElement {
	return (
		<button
			type="button"
			data-testid="pianola-tab-dashboard"
			aria-pressed={active}
			onClick={onClick}
			title="Pianola Dashboard"
			className="flex items-center gap-1.5 px-2.5 py-1 rounded text-sm shrink-0 transition-colors"
			style={{
				color: active ? theme.colors.accentForeground : theme.colors.textDim,
				backgroundColor: active ? theme.colors.accent : undefined,
				fontWeight: active ? 600 : 400,
			}}
		>
			<LayoutDashboard className="w-4 h-4" />
			<span>Dashboard</span>
			{needsInputCount > 0 && (
				<span
					className="ml-0.5 px-1.5 rounded-full text-xs font-bold"
					style={{ backgroundColor: theme.colors.warning, color: theme.colors.accentForeground }}
				>
					{needsInputCount}
				</span>
			)}
		</button>
	);
}

export function PianolaClearChatButton({
	theme,
	disabled,
	onClick,
}: {
	theme: Theme;
	disabled: boolean;
	onClick: () => void;
}): React.ReactElement {
	return (
		<button
			type="button"
			data-testid="pianola-clear-chat"
			disabled={disabled}
			onClick={onClick}
			title={
				disabled
					? 'Pianola is busy — interrupt it before clearing'
					: 'Clear this chat and start a fresh conversation'
			}
			className="flex items-center gap-1.5 px-2 py-1 rounded text-sm shrink-0 transition-colors hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
			style={{ color: theme.colors.textDim }}
		>
			<Eraser className="w-4 h-4" />
			<span>Clear chat</span>
		</button>
	);
}
