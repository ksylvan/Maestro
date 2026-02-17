---
type: guide
title: Global Environment Variables - Migration Guide
created: 2026-02-17
tags:
  - migration
  - environment-variables
  - agents
  - upgrade
related:
  - '[[USER_GUIDE_GLOBAL_ENV_VARS.md]]'
  - '[[ARCHITECTURE_ENV_VARS.md]]'
---

# Global Environment Variables - Migration Guide

## Overview

This guide is for users updating to the latest version of Maestro that now supports **global environment variables for AI agents**.

### What's New

Previously, environment variables only worked for terminal sessions. Now they also apply to all AI agents (Claude Code, Codex, Factory Droid, OpenCode, etc.).

**Before**: Had to configure API keys separately in each agent  
**After**: Set API keys once, all agents access them automatically

---

## What Changed?

### For Terminal Users ✓ (No Change)

Terminal sessions already supported global environment variables. No action needed.

### For Agent Users ✓ (New Feature)

Environment variables from **Settings → General → Shell Configuration** now automatically apply to all AI agents.

**This is automatic** - no configuration changes required.

---

## Action Required

**None.** This is a non-breaking, fully backward-compatible feature.

- ✅ Existing configurations continue to work unchanged
- ✅ No settings need to be updated
- ✅ No breaking changes to the API or workflows
- ✅ Agent-specific environment variables still take precedence if set

---

## Benefits

### 1. Eliminate Duplication

**Before**:

```
Agent: Claude Code
  - ANTHROPIC_API_KEY=sk-proj-xxxxx
  - OPENAI_API_KEY=sk-org-xxxxx

Agent: Codex
  - ANTHROPIC_API_KEY=sk-proj-xxxxx
  - OPENAI_API_KEY=sk-org-xxxxx

Agent: OpenCode
  - ANTHROPIC_API_KEY=sk-proj-xxxxx
  - OPENAI_API_KEY=sk-org-xxxxx
```

**After**:

```
Settings → General → Shell Configuration
  - ANTHROPIC_API_KEY=sk-proj-xxxxx
  - OPENAI_API_KEY=sk-org-xxxxx

All agents automatically receive these values
```

### 2. Simplified Configuration

**Before**:

1. Open Settings
2. Find Claude Code agent configuration
3. Add API keys
4. Repeat for Codex
5. Repeat for Factory Droid
6. Repeat for OpenCode
7. (4 × repetition per variable)

**After**:

1. Open Settings
2. Scroll to Shell Configuration
3. Add API keys once
4. Done!

### 3. Easier Onboarding

New team members now only need to set environment variables in one place to get all agents working.

### 4. Better Secret Management

- API keys managed centrally
- Easier to audit what credentials are in use
- Single location to update or revoke credentials

---

## Migration Scenarios

### Scenario 1: You Have No Environment Variables Set

**Action**: Optional - Consider setting up global environment variables now for API keys and proxy settings.

**Example**: Set these global variables:

```
ANTHROPIC_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here
PROXY_URL=your-proxy-here
```

---

### Scenario 2: You Set Variables in Terminal but Not Agents

**Action**: No change needed. Your terminal environment variables continue to work.

**Note**: Agents now also receive these variables automatically (new behavior, beneficial).

---

### Scenario 3: You Set Different Values for Terminal vs. Agents

**Action**: If you intentionally set different values for agents vs. terminals:

1. Remove agent-specific settings
2. Set the desired value in global Shell Configuration
3. If you need different values for specific agents, you can still use agent-level configuration (which takes precedence over global)

---

### Scenario 4: You Use Team-Wide Settings

**Action**: No change needed. Team members' settings automatically apply to agents.

---

## Verification: Is It Working?

### For Terminals

```bash
# Open a new terminal in Maestro
env | grep YOURKEY
# Should show your global variable value
```

### For Agents

1. Set a test variable in Settings:

   ```
   TEST_GLOBAL_VAR=hello123
   ```

2. Spawn a new agent session

3. Ask the agent:

   > "What is the value of the TEST_GLOBAL_VAR environment variable?"

4. Agent should respond with: `hello123`

---

## Troubleshooting

### Variables Work in Terminal But Not Agent

**Cause**: You may need to restart Maestro or spawn a new agent session after saving settings.

**Solution**:

1. Check that you spawned a **new** agent session (not resumed)
2. Close Maestro completely
3. Restart Maestro
4. Try again with a fresh agent session

---

### Variables Still Not Appearing

**Debug Steps**:

1. **Check Settings Saved**
   - Settings → General → Shell Configuration
   - Variables should be visible
   - Check for unsaved indicator

2. **Verify Format**
   - Format should be: `KEY=VALUE`
   - No extra spaces around `=`
   - One variable per line

3. **Check Agent Type**
   - Some agent types may have their own settings
   - Check if agent has agent-specific env var overrides
   - Global vars should still apply unless overridden

4. **Restart Application**
   - Close Maestro completely
   - Clear cache (optional): Delete `~/.config/Maestro/` (Linux/Mac) or `%APPDATA%\Maestro\` (Windows)
   - Restart Maestro
   - Re-enter variables

---

## FAQ

### Q: Do I need to move my agent env vars to global settings?

**A**: No, you don't have to. Agent-specific settings still work and take precedence. However, if you have the same variables across multiple agents, you can now set them globally for simpler management.

### Q: What if I have both global and agent-specific values?

**A**: Agent-specific values take precedence. This lets you:

- Set sensible defaults globally
- Override specific values per-agent when needed

### Q: Will this break my existing agent configurations?

**A**: No. This is fully backward compatible. Existing agent configurations continue to work unchanged.

### Q: Can I still use agent-specific environment variables?

**A**: Yes. Agent-specific settings still work and take priority over global settings. The precedence is:

```
Agent-Specific > Global > Defaults
```

### Q: What about SSH remote agents?

**A**: SSH remote agents also receive global environment variables. They work the same as local agents.

### Q: If I remove a global variable, do agents keep seeing it?

**A**: No. Once you remove a global variable from Settings, new agent sessions won't see it. Running agents won't be affected (they already have the environment).

### Q: Can I have the same variable name in global and agent-specific settings with different values?

**A**: Yes. The agent-specific value will be used (higher precedence). This is useful for:

- Setting global `DEBUG=off`
- Setting agent-specific `DEBUG=on` for debugging a particular agent

---

## Next Steps

1. **Verify It Works**
   - Set a test variable
   - Check it appears in terminal: `env | grep TESTVAR`
   - Verify agent receives it

2. **Clean Up If Desired**
   - If you have duplicate vars across agents, remove them
   - Keep only in global Shell Configuration

3. **Update Team Documentation**
   - Let your team know variables are now global
   - Point them to [[USER_GUIDE_GLOBAL_ENV_VARS.md]]

4. **For Developers**
   - See [[ARCHITECTURE_ENV_VARS.md]] for technical details
   - Check commit messages for implementation details

---

## Support

If you encounter issues:

1. Check [[USER_GUIDE_GLOBAL_ENV_VARS.md]] for common issues
2. Review [[ARCHITECTURE_ENV_VARS.md]] for technical understanding
3. Check Maestro logs: Help → View System Logs

---

## Summary

✅ **No breaking changes**  
✅ **Fully backward compatible**  
✅ **Automatic for all agents**  
✅ **Agent-specific settings still available**  
✅ **Simplified configuration**

You can now confidently manage environment variables once for your entire Maestro setup!
