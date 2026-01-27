# Sub-Agent Display Redesign

## Information Architecture

### Hierarchy (3 levels)

```
Level 1: Group Container (when multiple sub-agents)
├── "4 Sub-Agents"  [3 done, 1 running]  ▼
│
│   Level 2: Individual Sub-Agent Rows (expanded from L1)
│   ├── 🤖 Explore repo structure       8 tools  ✓  [Session] ▼
│   │
│   │   Level 3: Tool Details (expanded from L2)
│   │   ├── Shell — List commands directory
│   │   ├── Read — src/cli/program.ts
│   │   └── ...
│   │
│   ├── 🤖 Explore memory/session       5 tools  ✓  [Session] ▶
│   ├── 🤖 Explore config handling      3 tools  ⏳ [Session] ▶
│   └── 🤖 Explore API routes           6 tools  ✓  [Session] ▶
```

### Single Sub-Agent (simpler)

```
Level 1: Sub-Agent Row
├── 🤖 Explore repo structure       8 tools  ✓  [Session] ▼
│
│   Level 2: Tool Details (expanded)
│   ├── Shell — List commands directory
│   ├── Read — src/cli/program.ts
│   └── ...
```

---

## Expand Behavior

| State | What's Visible | Click Action |
|-------|---------------|--------------|
| Group collapsed | "4 Sub-Agents [status]" | Expand to show sub-agent list |
| Group expanded | List of sub-agent summaries | Click individual to expand tools |
| Sub-agent collapsed | Task name + tool count + status | Expand to show tool list |
| Sub-agent expanded | Full tool list | Collapse back to summary |

**Key UX Principles:**
1. Only one sub-agent expanded at a time within a group (accordion)
2. Group auto-expands if any sub-agent is still running
3. Clicking "Go to Session" navigates without toggling expand state
4. Status indicators always visible at every level

---

## Component Structure

### New Components

```
SubAgentGroup (groups consecutive sub-agents)
├── props: tools[], instanceId, sessionId
├── state: isExpanded, expandedSubAgentKey
└── renders: group header + SubAgentRow for each

SubAgentRow (single sub-agent, collapsible)
├── props: toolPart, instanceId, sessionId, isExpanded, onToggle
├── renders: summary row + tool details when expanded
└── handles: "Go to Session" navigation
```

### Modified Files

1. `message-block.tsx` - Detect consecutive sub-agents, render via SubAgentGroup
2. `tool-call-group.tsx` - Keep for regular tools only (no changes needed)
3. NEW: `subagent-group.tsx` - Group container component
4. NEW: `subagent-row.tsx` - Individual collapsible sub-agent
5. NEW: `styles/components/subagent.css` - Styling

---

## Visual Design

### Group Header (collapsed)
```
┌──────────────────────────────────────────────────────────────┐
│ ▶  🤖 4 Sub-Agents                          3 done, 1 running │
└──────────────────────────────────────────────────────────────┘
```

### Group Header (expanded)
```
┌──────────────────────────────────────────────────────────────┐
│ ▼  🤖 4 Sub-Agents                          3 done, 1 running │
├──────────────────────────────────────────────────────────────┤
│   ▶ Explore repo structure          8 tools   ✓   [Session]  │
│   ▼ Explore memory/session          5 tools   ✓   [Session]  │
│   │  ├─ Read — session-store.ts                        ✓     │
│   │  ├─ Read — memory-flush.ts                         ✓     │
│   │  └─ Read — agent-runner-memory.ts                  ✓     │
│   ▶ Explore config handling         3 tools   ⏳  [Session]  │
│   ▶ Explore API routes              6 tools   ✓   [Session]  │
└──────────────────────────────────────────────────────────────┘
```

### Single Sub-Agent (collapsed)
```
┌──────────────────────────────────────────────────────────────┐
│ ▶  🤖 Explore repo structure        8 tools   ✓   [Session]  │
└──────────────────────────────────────────────────────────────┘
```

### Single Sub-Agent (expanded)
```
┌──────────────────────────────────────────────────────────────┐
│ ▼  🤖 Explore repo structure        8 tools   ✓   [Session]  │
├──────────────────────────────────────────────────────────────┤
│   ├─ Shell — List commands directory                   ✓     │
│   ├─ Shell — List gateway directory                    ✓     │
│   ├─ Read — src/cli/program.ts                         ✓     │
│   └─ ...                                                     │
└──────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: SubAgentRow Component
- Create collapsible single sub-agent display
- Extract task description from tool input
- Show tool count and status
- Integrate existing tool detail rendering

### Phase 2: SubAgentGroup Component
- Detect consecutive sub-agents in message-block.tsx
- Create group container with aggregate status
- Accordion behavior (one expanded at a time)
- Auto-expand group if any sub-agent is running

### Phase 3: Integration
- Update message-block.tsx to use new components
- Remove old sub-agent rendering code
- Add CSS styling

### Phase 4: Polish
- Smooth animations for expand/collapse
- Hover states
- Keyboard accessibility
