/**
 * Pianola workspace tabs - Pianola's header bar. A pinned Dashboard view (the
 * agent status board) sits on the left; to its right is a strip of chat tabs.
 * Unlike a coding workspace, Pianola has no file/terminal/browser tabs — only
 * the manager Dashboard and one-or-more chat conversations.
 *
 * Chat tabs are the session's normal `aiTabs`, so add/select/close reuse the
 * standard tab handlers. A visible "Clear chat" resets the ACTIVE chat only
 * (its logs + agent session), distinct from the Left-Bar "Clear all chats".
 */

import React from 'react';
import { LayoutDashboard, MessageSquare, Plus, X, Eraser } from 'lucide-react';
import type { Theme, AITab } from '../../types';

interface PianolaWorkspaceTabsProps {
	theme: Theme;
	activeView: 'chat' | 'dashboard';
	/** Switch the pinned view (Dashboard board vs the chat conversations). */
	onSelectView: (view: 'chat' | 'dashboard') => void;
	/** Count of agents needing input, badged on the Dashboard tab (0 = no badge). */
	needsInputCount: number;
	/** The Pianola session's chat tabs. */
	tabs: AITab[];
	/** Which chat tab is active (only meaningful while activeView === 'chat'). */
	activeTabId: string | undefined;
	/** Select a chat tab (also switches the view to chat). */
	onSelectTab: (tabId: string) => void;
	/** Open a new chat tab (also switches the view to chat). */
	onNewTab: () => void;
	/** Close a chat tab. */
	onCloseTab: (tabId: string) => void;
	/** Reset the active chat (clear its transcript + start a fresh conversation). */
	onClearActiveChat: () => void;
	/** Disable the clear action while the active chat is busy. */
	clearDisabled: boolean;
}

function ViewTab({
	theme,
	active,
	icon,
	label,
	badge,
	onClick,
	testId,
}: {
	theme: Theme;
	active: boolean;
	icon: React.ReactNode;
	label: string;
	badge?: number;
	onClick: () => void;
	testId: string;
}): React.ReactElement {
	return (
		<button
			type="button"
			data-testid={testId}
			aria-pressed={active}
			onClick={onClick}
			className="flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors"
			style={{
				color: active ? theme.colors.textMain : theme.colors.textDim,
				borderBottom: `2px solid ${active ? theme.colors.accent : 'transparent'}`,
				fontWeight: active ? 600 : 400,
			}}
		>
			{icon}
			<span>{label}</span>
			{badge !== undefined && badge > 0 && (
				<span
					className="ml-0.5 px-1.5 rounded-full text-xs font-bold"
					style={{ backgroundColor: theme.colors.warning, color: theme.colors.accentForeground }}
				>
					{badge}
				</span>
			)}
		</button>
	);
}

function ChatTab({
	theme,
	active,
	label,
	closable,
	onSelect,
	onClose,
}: {
	theme: Theme;
	active: boolean;
	label: string;
	closable: boolean;
	onSelect: () => void;
	onClose: () => void;
}): React.ReactElement {
	return (
		<div
			data-testid="pianola-chat-tab"
			aria-selected={active}
			className="group flex items-center gap-1 pl-3 pr-1.5 py-1.5 text-sm transition-colors"
			style={{
				color: active ? theme.colors.textMain : theme.colors.textDim,
				borderBottom: `2px solid ${active ? theme.colors.accent : 'transparent'}`,
				fontWeight: active ? 600 : 400,
			}}
		>
			<button
				type="button"
				onClick={onSelect}
				className="flex items-center gap-1.5 max-w-[12rem] truncate"
				title={label}
			>
				<MessageSquare className="w-4 h-4 shrink-0" />
				<span className="truncate">{label}</span>
			</button>
			{closable && (
				<button
					type="button"
					data-testid="pianola-close-chat"
					aria-label={`Close ${label}`}
					title="Close chat"
					onClick={onClose}
					className="shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-opacity"
					style={{ color: theme.colors.textDim }}
				>
					<X className="w-3.5 h-3.5" />
				</button>
			)}
		</div>
	);
}

export function PianolaWorkspaceTabs({
	theme,
	activeView,
	onSelectView,
	needsInputCount,
	tabs,
	activeTabId,
	onSelectTab,
	onNewTab,
	onCloseTab,
	onClearActiveChat,
	clearDisabled,
}: PianolaWorkspaceTabsProps): React.ReactElement {
	const multiple = tabs.length > 1;
	return (
		<div
			data-testid="pianola-workspace-tabs"
			className="flex items-center gap-1 px-2 shrink-0 border-b overflow-x-auto"
			style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.bgSidebar }}
		>
			<ViewTab
				theme={theme}
				active={activeView === 'dashboard'}
				icon={<LayoutDashboard className="w-4 h-4" />}
				label="Dashboard"
				badge={needsInputCount}
				onClick={() => onSelectView('dashboard')}
				testId="pianola-tab-dashboard"
			/>

			{/* Divider between the pinned Dashboard and the chat conversations. */}
			<span
				aria-hidden="true"
				className="mx-1 h-4 w-px shrink-0"
				style={{ backgroundColor: theme.colors.border }}
			/>

			{tabs.map((tab, i) => (
				<ChatTab
					key={tab.id}
					theme={theme}
					active={activeView === 'chat' && activeTabId === tab.id}
					label={tab.name?.trim() || `Chat ${i + 1}`}
					closable={multiple}
					onSelect={() => onSelectTab(tab.id)}
					onClose={() => onCloseTab(tab.id)}
				/>
			))}

			<button
				type="button"
				data-testid="pianola-add-chat"
				aria-label="New chat"
				title="New chat"
				onClick={onNewTab}
				className="shrink-0 rounded p-1.5 hover:bg-white/10 transition-colors"
				style={{ color: theme.colors.textDim }}
			>
				<Plus className="w-4 h-4" />
			</button>

			<button
				type="button"
				data-testid="pianola-clear-chat"
				disabled={clearDisabled}
				title={
					clearDisabled
						? 'Pianola is busy — interrupt it before clearing'
						: 'Clear this chat and start a fresh conversation'
				}
				onClick={onClearActiveChat}
				className="ml-auto shrink-0 flex items-center gap-1.5 rounded px-2 py-1.5 text-sm transition-colors hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
				style={{ color: theme.colors.textDim }}
			>
				<Eraser className="w-4 h-4" />
				<span>Clear chat</span>
			</button>
		</div>
	);
}
