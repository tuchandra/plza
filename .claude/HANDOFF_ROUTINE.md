# Claude Handoff Routine

Run this checklist before ending each session or when user requests handoff.

## 1. Review Changes
```bash
git status
git diff
```
Identify what changed and why.

## 2. Create Atomic Commits

**Rules:**
- One commit = one logical change (feature, bugfix, refactor, etc.)
- No mixing unrelated changes
- Test before committing

**Commit message format:**
```
<type>: <concise description>

[optional body with details if needed]
```

**Types:** feat, fix, refactor, docs, style, chore

**Anti-patterns to avoid:**
- "The fix:", "The smoking gun:", "You're absolutely right!"
- Excessive detail in first line (keep it <50 chars)
- Multiple unrelated changes in one commit

## 3. Update Documentation

**Always update these files:**

### .claude/README.md
- Add new changes to "Recent Major Changes" section
- Update dataset stats if data changed
- Document any new files or important patterns
- Update "Next Steps / TODO" checklist
- Add verification commands for new features

### CLAUDE.md (if architecture changed)
- Update tech stack if dependencies added
- Document new file structure
- Add new data extraction steps
- Update deployment process if changed

## 4. Final Check
- [ ] All tests pass (if applicable)
- [ ] Dev server runs without errors
- [ ] Changes are in separate atomic commits
- [ ] Commit messages are clear and concise
- [ ] Documentation is updated
- [ ] No debug code left in

## 5. Handoff Summary

Provide brief summary to user:
- What was changed (bullet points)
- Commits made
- Any known issues or next steps
