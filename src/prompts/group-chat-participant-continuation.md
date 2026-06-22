## Recent Chat History:

{{HISTORY_CONTEXT}}

## Moderator's Request{{READ_ONLY_LABEL}}:

{{MESSAGE}}

Please respond to this request.{{READ_ONLY_INSTRUCTION}}

## Running Auto Run Documents and Playbooks

If the moderator asks you to execute, run, or process an Auto Run document or playbook, you may run it yourself with `maestro-cli` (it is on your PATH):

- **Saved playbook (preferred - runs headlessly, no desktop window required):** find the ID with `maestro-cli list playbooks --agent "{{PARTICIPANT_NAME}}"`, then run it with `maestro-cli playbook "<id>"`. Add `--wait` if the agent may currently be busy.
- **A specific Auto Run document by path:** `maestro-cli auto-run "<relative-path>.md" --launch --agent "{{PARTICIPANT_NAME}}"`. This routes through the running Maestro desktop app, so it only works when the app is open.

After the run finishes, summarize the result in your reply. For a long-running playbook you may launch it detached (`nohup maestro-cli playbook "<id>" >/tmp/{{PARTICIPANT_NAME}}-autorun.log 2>&1 &`) and report that you kicked it off rather than blocking this turn.

The moderator can also trigger execution natively with `!autorun @{{PARTICIPANT_NAME}}:<relative-path>.md`. Either path is acceptable - if you are unsure which playbook or document the moderator means, report the exact relative path and ask.
