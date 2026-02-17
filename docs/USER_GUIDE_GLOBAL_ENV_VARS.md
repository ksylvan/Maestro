---
type: guide
title: Global Environment Variables - User Guide
created: 2026-02-17
tags:
  - user-guide
  - settings
  - environment-variables
  - agents
related:
  - '[[ARCHITECTURE_ENV_VARS.md]]'
  - '[[MIGRATION_GLOBAL_ENV_VARS.md]]'
---

# Global Environment Variables - User Guide

## Quick Start

### Set Global Environment Variables

1. Open **Settings** (⚙️ icon or Cmd/Ctrl+,)
2. Navigate to **General** tab
3. Scroll to **Shell Configuration** section
4. Click to expand the section
5. Find **Environment Variables** area
6. Enter variables in `KEY=VALUE` format (one per line)
7. Variables are saved automatically

### Example

```
ANTHROPIC_API_KEY=sk-proj-xxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
PROXY_URL=http://proxy.company.com:8080
DEBUG=maestro:*
WORKSPACE=/Users/yourname/projects
```

### Verification

After saving, your environment variables are immediately available to:

- All new terminal sessions
- All new agent sessions (Claude Code, Codex, Factory Droid, etc.)
- Command-line tools spawned from Maestro

---

## Real-World Use Cases

### 1. API Authentication

**Scenario**: You use multiple AI services and need to manage API keys.

**Solution**: Set global API key variables:

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
OPENAI_API_KEY=sk-org-xxxxxxxxxxxxx
COHERE_API_KEY=xxxxxxxxxxxxx
```

**Benefit**:

- All agents automatically access the correct API keys
- No need to reconfigure each agent individually
- Keys are persisted securely in Maestro settings
- Easy to rotate keys in one place

---

### 2. Proxy Configuration

**Scenario**: Your organization requires traffic through a corporate proxy.

**Solution**: Set proxy variables:

```
HTTP_PROXY=http://proxy.corp.local:8080
HTTPS_PROXY=https://proxy.corp.local:8080
NO_PROXY=localhost,127.0.0.1,.corp.local
```

**Benefit**:

- All tools (git, npm, curl, agents) respect proxy settings
- Single configuration point
- Works across all agent types

---

### 3. Build Environment

**Scenario**: Your project requires specific build settings for CI/CD.

**Solution**: Set build variables:

```
NODE_ENV=development
VITE_API_URL=http://localhost:3000
BUILD_TARGET=web
DEBUG=vite:*
```

**Benefit**:

- Tools build correctly regardless of shell
- Environment-specific variables available everywhere
- Consistent behavior across team

---

### 4. Custom Tool Paths

**Scenario**: You have custom tools installed in non-standard locations.

**Solution**: Extend PATH or set custom tool variables:

```
# Expand PATH for custom tools
PATH=/opt/custom-tools/bin:/opt/company-tools/bin:$PATH

# Or use custom variables
CUSTOM_TOOL_PATH=/opt/custom-tools
COMPANY_TOOL_PATH=/opt/company-tools
```

**Benefit**:

- Tools discoverable from any location
- Agents can access company-specific tools
- No need for shell profile configuration

---

### 5. Debug Logging

**Scenario**: You need to debug Maestro or tools, but debug logging varies by tool.

**Solution**: Set debug variables:

```
DEBUG=maestro:*
LOGLEVEL=debug
NODE_DEBUG=http,https
RUST_LOG=debug
```

**Benefit**:

- Debug output visible across all sessions
- Easier troubleshooting
- Can be quickly disabled by removing/commenting

---

### 6. Local Development Environment

**Scenario**: You're developing an application with multiple services.

**Solution**: Set development variables:

```
DATABASE_URL=postgres://localhost:5432/mydb_dev
REDIS_URL=redis://localhost:6379/0
SMTP_HOST=localhost
SMTP_PORT=1025
LOG_LEVEL=debug
ENABLE_PROFILING=true
```

**Benefit**:

- All services use consistent configuration
- Tools and agents access the same environment
- Easy switching between dev/prod by changing this file

---

### 7. Git Configuration

**Scenario**: You need to customize git behavior across all sessions.

**Solution**: Set git variables:

```
GIT_AUTHOR_NAME=John Developer
GIT_AUTHOR_EMAIL=john@company.com
GIT_SSH_COMMAND=ssh -i ~/.ssh/company_key
GIT_CREDENTIAL_CACHE_DAEMON_TIMEOUT=10000
```

**Benefit**:

- All git operations use correct author info
- SSH key configuration centralized
- Consistent git behavior in all terminals

---

### 8. Language-Specific Settings

**Scenario**: You develop in Python and need consistent Python environment.

**Solution**: Set Python variables:

```
PYTHONPATH=/opt/my-lib:$PYTHONPATH
PYTHONDONTWRITEBYTECODE=1
PIP_INDEX_URL=https://pypi.company.com/simple
PIP_EXTRA_INDEX_URL=https://pypi.org/simple
```

**Benefit**:

- Python finds modules consistently
- Package manager uses correct index
- Works across all Python tools and agents

---

## How It Works: The Environment Chain

### Priority Order

When Maestro spawns a process, environment variables are applied in this order (last wins):

```
1. System defaults (Windows: full environment, Unix: minimal)
   ↓
2. Global shell environment variables (Settings)
   ↓
3. Session-specific variables (if set per-session)
   ↓ (highest priority)
4. Final environment passed to process
```

### Example: Understanding Precedence

**Scenario**: You have overlapping variable definitions:

```
Global Setting:  DEBUG=global-value
Session Override: DEBUG=session-value
Result:          DEBUG=session-value  (session wins)
```

**Use Cases**:

- Set `API_KEY=production` globally
- Override with `API_KEY=development` for a specific test session
- Session value temporarily overrides global for that session only

---

## Troubleshooting

### Environment Variables Not Working

**Symptom**: Set variables in Settings, but they don't appear in terminal.

**Checklist**:

1. ✅ Did you save the settings? (should auto-save, check for unsaved indicator)
2. ✅ Did you spawn a **new** terminal/agent after saving?
3. ✅ Is the variable name spelled correctly? (case-sensitive on Unix)
4. ✅ Is the format correct? (`KEY=VALUE`, no spaces around `=`)

**Debug Steps**:

1. In terminal, type: `env | grep YOURKEY`
2. If empty: Variable not applied
3. Try restarting Maestro completely
4. Check Settings → General is visible in UI

---

### Agent Not Receiving Environment Variables

**Symptom**: Global env vars work in terminals but not in agents.

**Checklist**:

1. ✅ Are you spawning a **new** agent session (not resuming)?
2. ✅ Did you wait for Settings to save before spawning?
3. ✅ Are there agent-specific env var overrides? (those take precedence)

**Debug Steps**:

1. Add a test variable: `TEST_GLOBAL=hello123`
2. Spawn a new agent session
3. In agent chat, ask: "What is the value of TEST_GLOBAL environment variable?"
4. If agent doesn't know it, variable isn't reaching the agent

---

### Special Characters Not Working

**Symptom**: Variables with special characters (quotes, spaces, etc.) don't work.

**Solutions**:

- **Spaces in values**: Use quotes in the value, don't include them in key/value

  ```
  WORKSPACE_NAME="My Project"   ← Include quotes
  WORKSPACE_NAME=My Project      ← DON'T do this
  ```

- **Paths with spaces**: Quote the path when used in shell

  ```
  # Good:
  PROJECT_DIR="/Users/John Doe/Projects"

  # In shell: "$PROJECT_DIR" (with quotes)
  ```

- **Special characters**: Escape or quote as needed
  ```
  API_TOKEN='sk-abc$def&123'     ← Single quotes in settings
  ```

---

### Variables Disappear After Restart

**Symptom**: Settings look correct, but after restarting Maestro, variables are gone.

**Likely Causes**:

1. Settings UI crashed before saving
2. Permissions issue on settings file
3. Corrupted settings storage

**Solution**:

1. Backup your variables
2. Close Maestro completely
3. Delete settings file: `~/.config/Maestro/` (Linux/Mac) or `%APPDATA%\Maestro\` (Windows)
4. Restart Maestro
5. Re-enter variables
6. Verify they persist through restart

---

## Format Reference

### Valid Variable Names

✅ **Valid**:

```
API_KEY              (uppercase, underscore)
apiKey               (camelCase)
api_key_v2           (numbers ok)
MY_VAR_123           (numbers anywhere)
PROXY_URL            (multiple underscores)
```

❌ **Invalid**:

```
API-KEY              (hyphens not allowed)
123_START            (can't start with number)
API KEY              (spaces not allowed)
API@KEY              (special characters)
```

### Value Format

**Simple values**:

```
VARIABLE=value
VARIABLE=value with spaces
VARIABLE=/path/to/file
```

**JSON values**:

```
# Not recommended (use simplified key-value instead)
CONFIG={"key":"value"}
```

**Home directory expansion**:

```
WORKSPACE_PATH=~/projects          ← Expands to /Users/name/projects
HOME_BIN=~/bin                     ← Expands to /Users/name/bin
```

**Quotes in values**:

```
DESCRIPTION="My value"             ← Will be stored as: My value
COMMAND='echo "hello"'              ← Single quotes OK
```

---

## Best Practices

### 1. Use Descriptive Names

✅ **Good**: `ANTHROPIC_API_KEY`, `PROXY_URL`, `DEBUG`  
❌ **Bad**: `KEY1`, `URL`, `D`

### 2. Group Related Variables with Prefixes

```
# Good organization
OPENAI_API_KEY=...
OPENAI_ORG_ID=...
ANTHROPIC_API_KEY=...
PROXY_URL=...
PROXY_PORT=...
```

### 3. Keep Sensitive Variables Secure

- ✅ Store API keys as env vars (more secure than hardcoded)
- ✅ Use Maestro settings (encrypted by electron-store)
- ⚠️ Don't share your settings file
- ⚠️ Don't commit env var to version control

### 4. Document Why Variables Are Needed

Consider leaving a note for teammates:

```
# ANTHROPIC_API_KEY: Required for Claude integration
# OPENAI_API_KEY: Required for GPT models
# PROXY_URL: Required by corporate network (change to your proxy)
```

### 5. Use Defaults for Non-Sensitive Values

For non-sensitive values, consider if they should be in:

- `.env` file (version controlled)
- Settings (user-specific, synced)
- Environment variables (global in Maestro)

### 6. Separate Production and Development

If you switch between environments:

```
# Option 1: Quick manual override
# Just change values before session spawn

# Option 2: Comment out in Settings
# Use # prefix (if supported) to disable

# Option 3: Use ENVIRONMENT variable
ENVIRONMENT=development
# Then reference this in scripts
```

---

## Common Questions

### Q: Can I use variables in variable values?

**A**: Not directly. Each value is treated as a literal string.

```
NOT SUPPORTED:
VAR1=value
VAR2=$VAR1/extra     ← Won't expand to "value/extra"

WORKAROUND:
Full path in VAR2:
VAR2=value/extra
```

### Q: Do these variables affect Maestro itself?

**A**: Not significantly. They're passed to **spawned processes** (agents, terminals, commands), not to Maestro's main process. However, setting problematic values (like `NODE_ENV`) might affect tool behavior.

### Q: Can I have empty variables?

**A**: Yes, but they're rarely useful:

```
EMPTY_VAR=       ← Valid, but usually not needed
```

### Q: Are changes immediate?

**A**: Yes, but only for **new** processes:

- ✅ Changed settings are immediately available to new terminals/agents
- ❌ Already-running terminals/agents won't see the change
- **Solution**: Close existing session and spawn new one

### Q: Can I override variables per-agent?

**A**: Not in the global settings. However:

- Agents may have their own env var settings
- Session-level overrides take precedence
- Check agent-specific documentation

### Q: What if two variables have the same name?

**A**: Impossible - keys must be unique. If you try to add a duplicate, it overwrites the previous value.

---

## Next Steps

1. **Quick Start**: Set 2-3 variables and test
2. **Verify**: Check they appear in `env` command output
3. **Expand**: Add more as needed
4. **Document**: Note why each is needed for your workflow
5. **Share**: See Migration Guide for onboarding others

For technical details, see: [[ARCHITECTURE_ENV_VARS.md]]
