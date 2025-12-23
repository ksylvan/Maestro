/**
 * Tests for the Git IPC handlers
 *
 * These tests verify the Git-related IPC handlers that provide
 * git operations used across the application.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain } from 'electron';
import { registerGitHandlers } from '../../../../main/ipc/handlers/git';
import * as execFile from '../../../../main/utils/execFile';

// Mock electron's ipcMain
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
}));

// Mock the execFile module
vi.mock('../../../../main/utils/execFile', () => ({
  execFileNoThrow: vi.fn(),
}));

// Mock the logger
vi.mock('../../../../main/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock the cliDetection module
vi.mock('../../../../main/utils/cliDetection', () => ({
  resolveGhPath: vi.fn().mockResolvedValue('gh'),
  getCachedGhStatus: vi.fn().mockReturnValue(null),
  setCachedGhStatus: vi.fn(),
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    access: vi.fn(),
    readdir: vi.fn(),
    rmdir: vi.fn(),
  },
}));

// Mock chokidar
vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      close: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

describe('Git IPC handlers', () => {
  let handlers: Map<string, Function>;

  beforeEach(() => {
    // Clear mocks
    vi.clearAllMocks();

    // Capture all registered handlers
    handlers = new Map();
    vi.mocked(ipcMain.handle).mockImplementation((channel, handler) => {
      handlers.set(channel, handler);
    });

    // Register handlers
    registerGitHandlers();
  });

  afterEach(() => {
    handlers.clear();
  });

  describe('registration', () => {
    it('should register all 24 git handlers', () => {
      const expectedChannels = [
        'git:status',
        'git:diff',
        'git:isRepo',
        'git:numstat',
        'git:branch',
        'git:remote',
        'git:branches',
        'git:tags',
        'git:info',
        'git:log',
        'git:commitCount',
        'git:show',
        'git:showFile',
        'git:worktreeInfo',
        'git:getRepoRoot',
        'git:worktreeSetup',
        'git:worktreeCheckout',
        'git:createPR',
        'git:checkGhCli',
        'git:getDefaultBranch',
        'git:listWorktrees',
        'git:scanWorktreeDirectory',
        'git:watchWorktreeDirectory',
        'git:unwatchWorktreeDirectory',
      ];

      expect(handlers.size).toBe(24);
      for (const channel of expectedChannels) {
        expect(handlers.has(channel)).toBe(true);
      }
    });
  });

  describe('git:status', () => {
    it('should return stdout from execFileNoThrow on success', async () => {
      vi.mocked(execFile.execFileNoThrow).mockResolvedValue({
        stdout: 'M  file.txt\nA  new.txt\n',
        stderr: '',
        exitCode: 0,
      });

      const handler = handlers.get('git:status');
      const result = await handler!({} as any, '/test/repo');

      expect(execFile.execFileNoThrow).toHaveBeenCalledWith(
        'git',
        ['status', '--porcelain'],
        '/test/repo'
      );
      expect(result).toEqual({
        stdout: 'M  file.txt\nA  new.txt\n',
        stderr: '',
      });
    });

    it('should return stderr when not a git repo', async () => {
      vi.mocked(execFile.execFileNoThrow).mockResolvedValue({
        stdout: '',
        stderr: 'fatal: not a git repository',
        exitCode: 128,
      });

      const handler = handlers.get('git:status');
      const result = await handler!({} as any, '/not/a/repo');

      expect(result).toEqual({
        stdout: '',
        stderr: 'fatal: not a git repository',
      });
    });

    it('should pass cwd parameter correctly', async () => {
      vi.mocked(execFile.execFileNoThrow).mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

      const handler = handlers.get('git:status');
      await handler!({} as any, '/custom/path');

      expect(execFile.execFileNoThrow).toHaveBeenCalledWith(
        'git',
        ['status', '--porcelain'],
        '/custom/path'
      );
    });

    it('should return empty stdout for clean repository', async () => {
      vi.mocked(execFile.execFileNoThrow).mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

      const handler = handlers.get('git:status');
      const result = await handler!({} as any, '/clean/repo');

      expect(result).toEqual({
        stdout: '',
        stderr: '',
      });
    });
  });

  describe('git:diff', () => {
    it('should return diff output for unstaged changes', async () => {
      const diffOutput = `diff --git a/file.txt b/file.txt
index abc1234..def5678 100644
--- a/file.txt
+++ b/file.txt
@@ -1,3 +1,4 @@
 line 1
+new line
 line 2
 line 3`;

      vi.mocked(execFile.execFileNoThrow).mockResolvedValue({
        stdout: diffOutput,
        stderr: '',
        exitCode: 0,
      });

      const handler = handlers.get('git:diff');
      const result = await handler!({} as any, '/test/repo');

      expect(execFile.execFileNoThrow).toHaveBeenCalledWith(
        'git',
        ['diff'],
        '/test/repo'
      );
      expect(result).toEqual({
        stdout: diffOutput,
        stderr: '',
      });
    });

    it('should return diff for specific file when file path is provided', async () => {
      const fileDiff = `diff --git a/specific.txt b/specific.txt
index 1234567..abcdefg 100644
--- a/specific.txt
+++ b/specific.txt
@@ -1 +1 @@
-old content
+new content`;

      vi.mocked(execFile.execFileNoThrow).mockResolvedValue({
        stdout: fileDiff,
        stderr: '',
        exitCode: 0,
      });

      const handler = handlers.get('git:diff');
      const result = await handler!({} as any, '/test/repo', 'specific.txt');

      expect(execFile.execFileNoThrow).toHaveBeenCalledWith(
        'git',
        ['diff', 'specific.txt'],
        '/test/repo'
      );
      expect(result).toEqual({
        stdout: fileDiff,
        stderr: '',
      });
    });

    it('should return empty diff when no changes exist', async () => {
      vi.mocked(execFile.execFileNoThrow).mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

      const handler = handlers.get('git:diff');
      const result = await handler!({} as any, '/test/repo');

      expect(result).toEqual({
        stdout: '',
        stderr: '',
      });
    });

    it('should return stderr when not a git repo', async () => {
      vi.mocked(execFile.execFileNoThrow).mockResolvedValue({
        stdout: '',
        stderr: 'fatal: not a git repository',
        exitCode: 128,
      });

      const handler = handlers.get('git:diff');
      const result = await handler!({} as any, '/not/a/repo');

      expect(result).toEqual({
        stdout: '',
        stderr: 'fatal: not a git repository',
      });
    });
  });

  describe('git:isRepo', () => {
    it('should return true when directory is inside a git work tree', async () => {
      vi.mocked(execFile.execFileNoThrow).mockResolvedValue({
        stdout: 'true\n',
        stderr: '',
        exitCode: 0,
      });

      const handler = handlers.get('git:isRepo');
      const result = await handler!({} as any, '/valid/git/repo');

      expect(execFile.execFileNoThrow).toHaveBeenCalledWith(
        'git',
        ['rev-parse', '--is-inside-work-tree'],
        '/valid/git/repo'
      );
      expect(result).toBe(true);
    });

    it('should return false when not a git repository', async () => {
      vi.mocked(execFile.execFileNoThrow).mockResolvedValue({
        stdout: '',
        stderr: 'fatal: not a git repository (or any of the parent directories): .git',
        exitCode: 128,
      });

      const handler = handlers.get('git:isRepo');
      const result = await handler!({} as any, '/not/a/repo');

      expect(execFile.execFileNoThrow).toHaveBeenCalledWith(
        'git',
        ['rev-parse', '--is-inside-work-tree'],
        '/not/a/repo'
      );
      expect(result).toBe(false);
    });

    it('should return false for non-zero exit codes', async () => {
      // Test with different non-zero exit code
      vi.mocked(execFile.execFileNoThrow).mockResolvedValue({
        stdout: '',
        stderr: 'error',
        exitCode: 1,
      });

      const handler = handlers.get('git:isRepo');
      const result = await handler!({} as any, '/some/path');

      expect(result).toBe(false);
    });
  });

  describe('git:numstat', () => {
    it('should return parsed numstat output for changed files', async () => {
      const numstatOutput = `10\t5\tfile1.ts
3\t0\tfile2.ts
0\t20\tfile3.ts`;

      vi.mocked(execFile.execFileNoThrow).mockResolvedValue({
        stdout: numstatOutput,
        stderr: '',
        exitCode: 0,
      });

      const handler = handlers.get('git:numstat');
      const result = await handler!({} as any, '/test/repo');

      expect(execFile.execFileNoThrow).toHaveBeenCalledWith(
        'git',
        ['diff', '--numstat'],
        '/test/repo'
      );
      expect(result).toEqual({
        stdout: numstatOutput,
        stderr: '',
      });
    });

    it('should return empty stdout when no changes exist', async () => {
      vi.mocked(execFile.execFileNoThrow).mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

      const handler = handlers.get('git:numstat');
      const result = await handler!({} as any, '/test/repo');

      expect(result).toEqual({
        stdout: '',
        stderr: '',
      });
    });

    it('should return stderr when not a git repo', async () => {
      vi.mocked(execFile.execFileNoThrow).mockResolvedValue({
        stdout: '',
        stderr: 'fatal: not a git repository',
        exitCode: 128,
      });

      const handler = handlers.get('git:numstat');
      const result = await handler!({} as any, '/not/a/repo');

      expect(result).toEqual({
        stdout: '',
        stderr: 'fatal: not a git repository',
      });
    });

    it('should handle binary files in numstat output', async () => {
      // Git uses "-\t-\t" for binary files
      const numstatOutput = `10\t5\tfile1.ts
-\t-\timage.png`;

      vi.mocked(execFile.execFileNoThrow).mockResolvedValue({
        stdout: numstatOutput,
        stderr: '',
        exitCode: 0,
      });

      const handler = handlers.get('git:numstat');
      const result = await handler!({} as any, '/test/repo');

      expect(result).toEqual({
        stdout: numstatOutput,
        stderr: '',
      });
    });
  });
});
