# UI/UX Redesign Plan

## Overview

Comprehensive redesign of the Era Code UI focusing on:
1. Left sidebar restructure (Model selector, Conversation, Subagents, Plan)
2. Right sidebar → Workspace panel (Files Touched, Recent Actions, Git Status)
3. Bottom status bar with modal indicators (MCP, LSP, Directives, Instance)
4. Message styling improvements (headings, spacing, markdown rendering)
5. Subagent lifecycle management with archiving

---

## Current State Assessment

### Markdown/Message Rendering

**What's Working:**
- Syntax highlighting via `shiki` with `github-dark` theme
- GFM support (tables, task lists, strikethrough) via `marked`
- Code block copy button
- Basic message block separation

**Issues Identified:**
1. Heading hierarchy too subtle (+3px, +2.5px increments)
2. Strong/bold text uses amber color - may reduce readability
3. Messages blend together - need clearer separation
4. Inline code needs more distinct styling
5. Tables could use alternating rows
6. Blockquotes need better visual treatment
7. Line height/paragraph spacing too dense
8. No timestamps on messages

---

## Phase 1: Left Sidebar Restructure

### Current → Proposed Layout

```
CURRENT:                          PROPOSED:
┌─────────────────┐               ┌─────────────────┐
│ AGENT SESSIONS  │               │ MODEL SELECTOR  │ ← Dropdown
│ ├ main (IDLE)   │               ├─────────────────┤
│ ├ task-1 (IDLE) │               │ CONVERSATION    │ ← Collapsible
│ └ task-2 (RUN)  │               │ ├ main          │
│                 │               │ └ (context/cost)│
│                 │               ├─────────────────┤
│                 │               │ SUBAGENTS       │ ← Renamed
│                 │               │ ├ 🟢 task-2     │ ← Green=Running
│                 │               │ └ 🔵 task-1     │ ← Blue=Complete
│                 │               │                 │
│                 │               │ ▸ Archived (2)  │ ← Collapsible
│                 │               ├─────────────────┤
│                 │               │ PLAN            │ ← Moved from right
│                 │               │ □ Task 1        │
│                 │               │ ☑ Task 2        │
│                 │               └─────────────────┘
```

### Status Colors
- **Running**: Green (`#22c55e`)
- **Complete**: Blue (`#3b82f6`)
- **Error**: Red (`#ef4444`)
- **Idle**: Gray (`#6b7280`)

### Files to Modify

| File | Changes |
|------|---------|
| `packages/ui/src/components/session-list.tsx` | Restructure layout, add model selector position |
| `packages/ui/src/components/session-tabs.tsx` | Rename "Agent Sessions" → "Subagents" |
| `packages/ui/src/stores/session-state.ts` | Add archived state tracking, completion timestamps |
| `packages/ui/src/styles/panels/sessions.css` | Status colors, archived section styling |
| `packages/ui/src/styles/tokens.css` | Add status color tokens |

### Implementation Details

**Subagent Status Logic:**
```typescript
type SubagentStatus = "running" | "complete" | "error" | "idle"

function getSubagentStatus(session: Session): SubagentStatus {
  if (session.status === "error") return "error"
  if (session.status === "running" || session.status === "tool_use") return "running"
  if (session.completedAt) return "complete"
  return "idle"
}
```

**Archive Logic:**
- Track `parentMessageCountSinceComplete` per subagent
- When parent (main) sends 2+ messages after subagent completes → move to archived
- Archived section collapsed by default with count badge

---

## Phase 2: Right Sidebar → Workspace Panel

### Proposed Layout

```
┌─────────────────────────────────┐
│ WORKSPACE                       │
├─────────────────────────────────┤
│ FILES TOUCHED                   │
│ ├ src/App.tsx          (edited)│
│ ├ src/utils.ts         (read)  │
│ └ package.json         (edited)│
├─────────────────────────────────┤
│ RECENT ACTIONS                  │
│ ├ ✓ Edited App.tsx              │
│ ├ ✓ Ran npm install             │
│ └ ⋯ Running tests...            │
├─────────────────────────────────┤
│ GIT STATUS                      │
│ branch: feature/new-ui          │
│ +3 files, -1 file, ~2 modified  │
└─────────────────────────────────┘
```

### Files to Create

| File | Purpose |
|------|---------|
| `packages/ui/src/components/workspace-panel.tsx` | Main workspace container |
| `packages/ui/src/components/files-touched-list.tsx` | Track files read/edited |
| `packages/ui/src/components/recent-actions-list.tsx` | Action history feed |
| `packages/ui/src/components/git-status-widget.tsx` | Git integration display |
| `packages/ui/src/stores/workspace-state.ts` | State management for workspace |

### Files to Modify

| File | Changes |
|------|---------|
| `packages/ui/src/App.tsx` | Replace right sidebar content |
| `packages/server/src/server/routes/workspace.ts` | New route for git status |

### Data Sources

**Files Touched:**
- Extract from tool calls in messages (Read, Edit, Write tools)
- Track: filepath, action type (read/edit/write), timestamp

**Recent Actions:**
- Extract from tool calls: Bash commands, file operations
- Show last 10 actions with status (complete/running/error)

**Git Status:**
- New API endpoint: `GET /api/workspace/git-status?folder=...`
- Returns: branch, staged/unstaged counts, recent commits

---

## Phase 3: Bottom Status Bar

### Proposed Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🔌 MCP (3)  │ 📡 LSP (2)  │ 📋 Directives  │ ⚙️ Instance │  $0.42  │
└──────────────────────────────────────────────────────────────────────┘
```

### Modal Triggers

| Indicator | Modal Content |
|-----------|---------------|
| MCP (count) | Server list, status badges, connect/disconnect buttons |
| LSP (count) | Language servers, connection status |
| Directives | Project directives preview, edit button |
| Instance | Port, binary, health, auto-approve toggle |
| Cost | Session cost breakdown |

### Files to Modify

| File | Changes |
|------|---------|
| `packages/ui/src/components/bottom-status-bar.tsx` | Add clickable indicators |
| `packages/ui/src/components/mcp-status-modal.tsx` | New modal for MCP |
| `packages/ui/src/components/lsp-status-modal.tsx` | New modal for LSP |
| `packages/ui/src/components/directives-modal.tsx` | New modal for directives |
| `packages/ui/src/components/instance-info-modal.tsx` | New modal for instance |

### Implementation Notes

- Each indicator shows count/status at a glance
- Click opens full modal with details and controls
- Modals should be consistent in styling and behavior
- Close on backdrop click or escape key

---

## Phase 4: Message Styling Improvements

### Heading Hierarchy

```css
/* More distinct heading sizes */
.markdown-body h1 {
  font-size: 1.75em;
  font-weight: 700;
  border-bottom: 1px solid var(--border-muted);
  padding-bottom: 0.3em;
  margin-top: 1.5em;
  margin-bottom: 0.75em;
}

.markdown-body h2 {
  font-size: 1.5em;
  font-weight: 600;
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: 0.2em;
  margin-top: 1.25em;
  margin-bottom: 0.5em;
}

.markdown-body h3 {
  font-size: 1.25em;
  font-weight: 600;
  margin-top: 1em;
  margin-bottom: 0.5em;
}

.markdown-body h4 {
  font-size: 1.1em;
  font-weight: 600;
}
```

### Message Block Structure

```
┌─────────────────────────────────────────┐
│ 👤 You                          2:34 PM │
│─────────────────────────────────────────│
│ Message content here...                 │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🤖 Claude • claude-opus-4-5    2:35 PM │
│─────────────────────────────────────────│
│ Response with better spacing...         │
│                                         │
│ ## Heading Example                      │
│                                         │
│ Paragraph with 1.6 line height.         │
└─────────────────────────────────────────┘
```

### CSS Improvements

```css
/* Inline code */
.markdown-body code:not(pre code) {
  background: var(--surface-elevated);
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-size: 0.9em;
  color: var(--text-accent);
}

/* Blockquotes */
.markdown-body blockquote {
  border-left: 4px solid var(--accent-primary);
  background: var(--surface-subtle);
  padding: 0.5em 1em;
  margin: 1em 0;
  color: var(--text-secondary);
}

/* Tables */
.markdown-body table tr:nth-child(even) {
  background: var(--surface-subtle);
}

.markdown-body table th {
  background: var(--surface-elevated);
  font-weight: 600;
}

/* Spacing */
.markdown-body p {
  line-height: 1.6;
  margin-bottom: 1em;
}

.markdown-body li {
  margin-bottom: 0.25em;
}
```

### Files to Modify

| File | Changes |
|------|---------|
| `packages/ui/src/styles/markdown.css` | All CSS improvements above |
| `packages/ui/src/components/message-block.tsx` | Add header with timestamp, model badge |
| `packages/ui/src/styles/tokens.css` | Add semantic tokens for messages |

---

## Phase 5: Subagent Lifecycle & Archiving

### State Management

```typescript
interface SubagentState {
  sessionId: string
  status: "running" | "complete" | "error" | "idle"
  completedAt?: number
  parentMessageCountSinceComplete: number
  archived: boolean
}

// Archive threshold
const ARCHIVE_AFTER_MESSAGES = 2
```

### Archive Logic

1. When subagent completes, set `completedAt = Date.now()`
2. On each parent message, increment `parentMessageCountSinceComplete` for all complete subagents
3. When count >= 2, set `archived = true`
4. Archived subagents move to collapsible "Archived" section

### UI Behavior

- Active subagents shown in main list with status colors
- Archived section at bottom, collapsed by default
- Badge shows count: "Archived (3)"
- Click to expand and view archived subagents
- Can manually archive/unarchive via context menu

### Files to Modify

| File | Changes |
|------|---------|
| `packages/ui/src/stores/session-state.ts` | Add archive tracking state |
| `packages/ui/src/components/session-list.tsx` | Implement archive UI |
| `packages/ui/src/styles/panels/sessions.css` | Archived section styling |

---

## Implementation Order

1. **Phase 4: Message Styling** - Quick wins, improves readability immediately
2. **Phase 1: Left Sidebar** - Core structural change
3. **Phase 5: Subagent Archiving** - Depends on Phase 1
4. **Phase 3: Bottom Status Bar** - Independent, can parallelize
5. **Phase 2: Workspace Panel** - Most complex, requires new APIs

---

## Design Tokens to Add

```css
:root {
  /* Status colors */
  --status-running: #22c55e;
  --status-complete: #3b82f6;
  --status-error: #ef4444;
  --status-idle: #6b7280;

  /* Message-specific */
  --message-header-bg: var(--surface-elevated);
  --message-timestamp: var(--text-tertiary);
  --message-model-badge: var(--accent-secondary);

  /* Workspace panel */
  --workspace-section-border: var(--border-muted);
  --workspace-action-success: var(--status-complete);
  --workspace-action-running: var(--status-running);
}
```

---

## Testing Checklist

- [ ] Heading hierarchy visually distinct
- [ ] Code blocks render with syntax highlighting
- [ ] Tables display with alternating rows
- [ ] Blockquotes visually separated
- [ ] Message timestamps display correctly
- [ ] Subagent status colors accurate
- [ ] Archive logic triggers after 2 messages
- [ ] Bottom bar indicators clickable
- [ ] Modals open/close properly
- [ ] Workspace panel updates in real-time
- [ ] Git status fetches correctly
