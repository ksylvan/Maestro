import { useState, useEffect, useRef } from 'react';
import {
	ChevronRight,
	Settings,
	Copy,
	Bookmark,
	FolderInput,
	FolderPlus,
	Folder,
	GitBranch,
	GitPullRequest,
	Trash2,
	Edit3,
	Zap,
	Fingerprint,
	AppWindow,
	Plus,
} from 'lucide-react';
import type { Group, Session, Theme } from '../../types';
import { useClickOutside, useContextMenuPosition } from '../../hooks';
import { safeClipboardWrite } from '../../utils/clipboard';
import { flashCopiedToClipboard } from '../../utils/flashCopiedToClipboard';
import type { WindowMoveTarget } from '../../utils/windowTargets';

interface SessionContextMenuProps {
	x: number;
	y: number;
	theme: Theme;
	session: Session;
	groups: Group[];
	hasWorktreeChildren: boolean;
	onRename: () => void;
	onEdit: () => void;
	onDuplicate: () => void;
	onToggleBookmark: () => void;
	onMoveToGroup: (groupId: string) => void;
	onDelete: () => void;
	onDismiss: () => void;
	onCreatePR?: () => void;
	onQuickCreateWorktree?: () => void;
	onConfigureWorktrees?: () => void;
	onDeleteWorktree?: () => void;
	onCreateGroup?: () => void;
	onConfigureCue?: () => void;
	/**
	 * Multi-window: every window this agent can move into, labeled by lead agent
	 * ("Main Window" for the primary), with the current owner flagged. Omitted or
	 * empty in a single-window app, where the "Move to Window" submenu is hidden.
	 */
	windowTargets?: WindowMoveTarget[];
	/** Detach this agent into a brand-new window. */
	onMoveToNewWindow?: () => void;
	/** Move this agent into the given existing window. */
	onMoveToWindow?: (windowId: string) => void;
}

/**
 * Hover/focus flyout state for a nested context-menu submenu: open/close with a
 * grace timeout and a viewport-aware above/below + left/right flip. `itemCount`
 * is the flyout's approximate row count, used only to decide the flip. Shared by
 * the Move-to-Group and Move-to-Window submenus so neither reimplements it.
 * The return type is inferred so `containerRef` stays exactly `useRef`'s type
 * (directly ref-assignable, avoiding a null-variance mismatch on the JSX ref).
 */
function useFlyoutSubmenu(itemCount: number) {
	const containerRef = useRef<HTMLDivElement>(null);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [show, setShow] = useState(false);
	const [position, setPosition] = useState<{
		vertical: 'below' | 'above';
		horizontal: 'right' | 'left';
	}>({ vertical: 'below', horizontal: 'right' });

	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}
		};
	}, []);

	const open = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		setShow(true);
		if (containerRef.current) {
			const rect = containerRef.current.getBoundingClientRect();
			const itemHeight = 28;
			const submenuHeight = itemCount * itemHeight + 16;
			const submenuWidth = 160;
			const spaceBelow = window.innerHeight - rect.top;
			const spaceRight = window.innerWidth - rect.right;
			const vertical = spaceBelow < submenuHeight && rect.top > submenuHeight ? 'above' : 'below';
			const horizontal = spaceRight < submenuWidth && rect.left > submenuWidth ? 'left' : 'right';
			setPosition({ vertical, horizontal });
		}
	};

	const scheduleClose = () => {
		if (timeoutRef.current) clearTimeout(timeoutRef.current);
		timeoutRef.current = setTimeout(() => {
			setShow(false);
			timeoutRef.current = null;
		}, 300);
	};

	const close = () => setShow(false);

	return { containerRef, show, position, open, scheduleClose, close };
}

export function SessionContextMenu({
	x,
	y,
	theme,
	session,
	groups,
	hasWorktreeChildren,
	onRename,
	onEdit,
	onDuplicate,
	onToggleBookmark,
	onMoveToGroup,
	onDelete,
	onDismiss,
	onCreatePR,
	onQuickCreateWorktree,
	onConfigureWorktrees,
	onDeleteWorktree,
	onCreateGroup,
	onConfigureCue,
	windowTargets,
	onMoveToNewWindow,
	onMoveToWindow,
}: SessionContextMenuProps) {
	const menuRef = useRef<HTMLDivElement>(null);

	const onDismissRef = useRef(onDismiss);
	onDismissRef.current = onDismiss;

	useClickOutside(menuRef, onDismiss);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onDismissRef.current();
			}
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, []);

	const { left, top, ready } = useContextMenuPosition(menuRef, x, y);

	// One flyout state machine per submenu (Move to Group, Move to Window). Item
	// count feeds the above/below flip decision. Extracted so the two flyouts do
	// not duplicate the hover/timeout/positioning logic.
	const moveToGroup = useFlyoutSubmenu(groups.length + 2);
	const moveToWindow = useFlyoutSubmenu((windowTargets?.length ?? 0) + 2);

	// "Move to Window" appears only in a multi-window-capable app: a mover handler
	// plus at least one enumerated window (empty before the registry hydrates).
	const showMoveToWindow = !!onMoveToNewWindow && !!windowTargets && windowTargets.length > 0;

	// Compute visibility for worktree sections to avoid rendering dividers without buttons
	const showWorktreeParentSection =
		(hasWorktreeChildren || session.isGitRepo) &&
		!session.parentSessionId &&
		((onQuickCreateWorktree && session.worktreeConfig) || onConfigureWorktrees);

	const showWorktreeChildSection =
		session.parentSessionId && session.worktreeBranch && (onCreatePR || onDeleteWorktree);

	return (
		<div
			ref={menuRef}
			className="fixed z-50 py-1 rounded-md shadow-xl border whitespace-nowrap"
			style={{
				left,
				top,
				opacity: ready ? 1 : 0,
				backgroundColor: theme.colors.bgSidebar,
				borderColor: theme.colors.border,
				minWidth: '10rem',
			}}
		>
			<button
				type="button"
				onClick={() => {
					onRename();
					onDismiss();
				}}
				className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors flex items-center gap-2"
				style={{ color: theme.colors.textMain }}
			>
				<Edit3 className="w-3.5 h-3.5" />
				Rename
			</button>

			<button
				type="button"
				onClick={() => {
					onEdit();
					onDismiss();
				}}
				className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors flex items-center gap-2"
				style={{ color: theme.colors.textMain }}
			>
				<Settings className="w-3.5 h-3.5" />
				Edit Agent...
			</button>

			<button
				type="button"
				onClick={() => {
					onDuplicate();
					onDismiss();
				}}
				className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors flex items-center gap-2"
				style={{ color: theme.colors.textMain }}
			>
				<Copy className="w-3.5 h-3.5" />
				Duplicate...
			</button>

			{!session.parentSessionId && (
				<button
					type="button"
					onClick={() => {
						onToggleBookmark();
						onDismiss();
					}}
					className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors flex items-center gap-2"
					style={{ color: theme.colors.textMain }}
				>
					<Bookmark className="w-3.5 h-3.5" fill={session.bookmarked ? 'currentColor' : 'none'} />
					{session.bookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
				</button>
			)}

			{!session.parentSessionId && (
				<div
					ref={moveToGroup.containerRef}
					className="relative"
					tabIndex={0}
					onMouseEnter={moveToGroup.open}
					onMouseLeave={moveToGroup.scheduleClose}
					onFocus={moveToGroup.open}
					onBlur={moveToGroup.scheduleClose}
					onKeyDown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							moveToGroup.open();
						} else if (e.key === 'Escape' && moveToGroup.show) {
							e.stopPropagation();
							moveToGroup.close();
						}
					}}
				>
					<button
						type="button"
						className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors flex items-center justify-between"
						style={{ color: theme.colors.textMain }}
					>
						<span className="flex items-center gap-2">
							<FolderInput className="w-3.5 h-3.5" />
							Move to Group
						</span>
						<ChevronRight className="w-3 h-3" />
					</button>

					{moveToGroup.show && (
						<div
							className="absolute py-1 rounded-md shadow-xl border whitespace-nowrap"
							style={{
								backgroundColor: theme.colors.bgSidebar,
								borderColor: theme.colors.border,
								minWidth: '8.75rem',
								...(moveToGroup.position.vertical === 'above' ? { bottom: 0 } : { top: 0 }),
								...(moveToGroup.position.horizontal === 'left'
									? { right: '100%', marginRight: 4 }
									: { left: '100%', marginLeft: 4 }),
							}}
						>
							<button
								type="button"
								onClick={() => {
									onMoveToGroup('');
									onDismiss();
								}}
								className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors flex items-center gap-2 ${!session.groupId ? 'opacity-50' : ''}`}
								style={{ color: theme.colors.textMain }}
								disabled={!session.groupId}
							>
								<Folder className="w-3.5 h-3.5" />
								Ungrouped
								{!session.groupId && <span className="text-[10px] opacity-50">(current)</span>}
							</button>

							{groups.length > 0 && (
								<div className="my-1 border-t" style={{ borderColor: theme.colors.border }} />
							)}

							{groups.map((group) => (
								<button
									type="button"
									key={group.id}
									onClick={() => {
										onMoveToGroup(group.id);
										onDismiss();
									}}
									className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors flex items-center gap-2 ${session.groupId === group.id ? 'opacity-50' : ''}`}
									style={{ color: theme.colors.textMain }}
									disabled={session.groupId === group.id}
								>
									<span>{group.emoji}</span>
									<span className="truncate">{group.name}</span>
									{session.groupId === group.id && (
										<span className="text-[10px] opacity-50">(current)</span>
									)}
								</button>
							))}

							{onCreateGroup && (
								<div className="my-1 border-t" style={{ borderColor: theme.colors.border }} />
							)}

							{onCreateGroup && (
								<button
									type="button"
									onClick={() => {
										onCreateGroup();
										onDismiss();
									}}
									className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors flex items-center gap-2"
									style={{ color: theme.colors.accent }}
								>
									<FolderPlus className="w-3.5 h-3.5" />
									Create New Group
								</button>
							)}
						</div>
					)}
				</div>
			)}

			{showMoveToWindow && (
				<div
					ref={moveToWindow.containerRef}
					className="relative"
					tabIndex={0}
					onMouseEnter={moveToWindow.open}
					onMouseLeave={moveToWindow.scheduleClose}
					onFocus={moveToWindow.open}
					onBlur={moveToWindow.scheduleClose}
					onKeyDown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							moveToWindow.open();
						} else if (e.key === 'Escape' && moveToWindow.show) {
							e.stopPropagation();
							moveToWindow.close();
						}
					}}
				>
					<button
						type="button"
						className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors flex items-center justify-between"
						style={{ color: theme.colors.textMain }}
					>
						<span className="flex items-center gap-2">
							<AppWindow className="w-3.5 h-3.5" />
							Move to Window
						</span>
						<ChevronRight className="w-3 h-3" />
					</button>

					{moveToWindow.show && (
						<div
							className="absolute py-1 rounded-md shadow-xl border whitespace-nowrap"
							style={{
								backgroundColor: theme.colors.bgSidebar,
								borderColor: theme.colors.border,
								minWidth: '8.75rem',
								...(moveToWindow.position.vertical === 'above' ? { bottom: 0 } : { top: 0 }),
								...(moveToWindow.position.horizontal === 'left'
									? { right: '100%', marginRight: 4 }
									: { left: '100%', marginLeft: 4 }),
							}}
						>
							<button
								type="button"
								onClick={() => {
									onMoveToNewWindow?.();
									onDismiss();
								}}
								className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors flex items-center gap-2"
								style={{ color: theme.colors.accent }}
							>
								<Plus className="w-3.5 h-3.5" />
								New Window
							</button>

							<div className="my-1 border-t" style={{ borderColor: theme.colors.border }} />

							{windowTargets?.map((target) => (
								<button
									type="button"
									key={target.windowId}
									onClick={() => {
										onMoveToWindow?.(target.windowId);
										onDismiss();
									}}
									className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors flex items-center gap-2 ${target.isCurrentOwner ? 'opacity-50' : ''}`}
									style={{ color: theme.colors.textMain }}
									disabled={target.isCurrentOwner}
								>
									<AppWindow className="w-3.5 h-3.5" />
									<span className="truncate">{target.label}</span>
									{target.isCurrentOwner && (
										<span className="text-[10px] opacity-50">(current)</span>
									)}
								</button>
							))}
						</div>
					)}
				</div>
			)}

			{showWorktreeParentSection && (
				<>
					<div className="my-1 border-t" style={{ borderColor: theme.colors.border }} />
					{onQuickCreateWorktree && session.worktreeConfig && (
						<button
							type="button"
							onClick={() => {
								onQuickCreateWorktree();
								onDismiss();
							}}
							className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors flex items-center gap-2"
							style={{ color: theme.colors.accent }}
						>
							<GitBranch className="w-3.5 h-3.5" />
							Create Worktree
						</button>
					)}
					{onConfigureWorktrees && (
						<button
							type="button"
							onClick={() => {
								onConfigureWorktrees();
								onDismiss();
							}}
							className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors flex items-center gap-2"
							style={{ color: theme.colors.accent }}
						>
							<Settings className="w-3.5 h-3.5" />
							Configure Worktrees
						</button>
					)}
				</>
			)}

			{onConfigureCue && (
				<>
					{!showWorktreeParentSection && (
						<div className="my-1 border-t" style={{ borderColor: theme.colors.border }} />
					)}
					<button
						type="button"
						onClick={() => {
							onConfigureCue();
							onDismiss();
						}}
						className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors flex items-center gap-2"
						style={{ color: '#06b6d4' }}
					>
						<Zap className="w-3.5 h-3.5" />
						Configure Maestro Cue
					</button>
				</>
			)}

			{showWorktreeChildSection && (
				<>
					<div className="my-1 border-t" style={{ borderColor: theme.colors.border }} />
					{onCreatePR && (
						<button
							type="button"
							onClick={() => {
								onCreatePR();
								onDismiss();
							}}
							className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors flex items-center gap-2"
							style={{ color: theme.colors.accent }}
						>
							<GitPullRequest className="w-3.5 h-3.5" />
							Create Pull Request
						</button>
					)}
					{onDeleteWorktree && (
						<button
							type="button"
							onClick={() => {
								onDeleteWorktree();
								onDismiss();
							}}
							className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors flex items-center gap-2"
							style={{ color: theme.colors.error }}
						>
							<Trash2 className="w-3.5 h-3.5" />
							Remove Worktree
						</button>
					)}
				</>
			)}

			<div className="my-1 border-t" style={{ borderColor: theme.colors.border }} />

			<button
				type="button"
				onClick={async () => {
					if (await safeClipboardWrite(session.id)) {
						flashCopiedToClipboard(session.id, 'Agent GUID Copied');
					}
					onDismiss();
				}}
				className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors flex items-center gap-2"
				style={{ color: theme.colors.textMain }}
			>
				<Fingerprint className="w-3.5 h-3.5" />
				Copy Agent GUID to Clipboard
			</button>

			{!session.parentSessionId && (
				<button
					type="button"
					onClick={() => {
						onDelete();
						onDismiss();
					}}
					className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors flex items-center gap-2"
					style={{ color: theme.colors.error }}
				>
					<Trash2 className="w-3.5 h-3.5" />
					Remove Agent
				</button>
			)}
		</div>
	);
}
