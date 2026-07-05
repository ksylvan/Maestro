/**
 * App lifecycle module exports.
 * Provides window management, error handling, CLI watching, and quit handling.
 */

export { setupGlobalErrorHandlers } from './error-handlers';
export { createCliWatcher, type CliWatcher, type CliWatcherDependencies } from './cli-watcher';
export {
	createWindowManager,
	type WindowManager,
	type WindowManagerDependencies,
} from './window-manager';
export {
	ensureSatelliteHudWindow,
	deliverSatelliteToHud,
	getSatelliteHudWindow,
	closeSatelliteHudWindow,
	type SatelliteHudWindowDeps,
} from './satellite-hud-window';
export { createQuitHandler, type QuitHandler, type QuitHandlerDependencies } from './quit-handler';
export {
	createSettingsWatcher,
	type SettingsWatcher,
	type SettingsWatcherDependencies,
} from './settings-watcher';
