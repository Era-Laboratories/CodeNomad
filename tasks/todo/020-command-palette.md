---
title: Command Palette
description: Implement VSCode-style command palette with Cmd+Shift+P
---

# Implement Command Palette

Build a VSCode-style command palette that opens as a centered modal dialog.

---

## Requirements

### Visual Design

- **Trigger**: Keyboard shortcut `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
- **Appearance**: Modal dialog centered on screen with backdrop overlay
- **Size**: ~600px wide, auto height with max height
- **Components**:
  - Search/filter input at top
  - Scrollable list of commands below
  - Each command shows: name, description, keyboard shortcut (if any)

### Behavior

- Opens on `Cmd+Shift+P`
- Closes on `Escape` or clicking outside
- Search input is auto-focused when opened
- Filter commands as user types (fuzzy search preferred)
- Arrow keys navigate through filtered list
- Enter executes selected command
- Mouse click on command also executes it
- Closes automatically after command execution

---

## Commands to Include

### Essential Commands (MVP)

1. **Initialize AGENTS.md** (`/init`)
   - Description: "Create or update AGENTS.md file"
   - Action: Call `client.session.init()`

2. **Compact Session** (`/compact`)
   - Description: "Summarize and compact the current session"
   - Action: Call `client.session.summarize()`

3. **Undo Last Message** (`/undo`)
   - Description: "Revert the last message"
   - Action: Call `client.session.revert()`

4. **Toggle Thinking Blocks** (`/thinking`)
   - Description: "Show/hide AI thinking process"
   - Action: Toggle UI state (placeholder for now)

5. **Show Help** (`/help`)
   - Description: "Display keyboard shortcuts and help"
   - Action: Open help modal (placeholder for now)

### Navigation Commands (Trigger Existing Shortcuts)

6. **New Session**
   - Description: "Create a new session"
   - Shortcut: `Cmd+Shift+N`
   - Action: Trigger existing `new-session` keyboard shortcut

7. **Open Model Selector**
   - Description: "Choose a different model"
   - Shortcut: `Cmd+P`
   - Action: Focus model selector input

8. **Open Agent Selector**
   - Description: "Choose a different agent"
   - Action: Click agent selector to open dropdown

---

## Implementation Details

### File Structure

```
src/
  components/
    command-palette.tsx          # Main command palette component
  lib/
    commands.ts                  # Command registry and definitions
  stores/
    command-palette.ts           # State for showing/hiding palette
```

### Command Registry Structure

```typescript
interface Command {
  id: string
  label: string
  description: string
  keywords?: string[] // For fuzzy search
  shortcut?: KeyboardShortcut
  action: () => void | Promise<void>
  category?: string // Group commands by category
}
```

### Integration Points

1. **Register global keyboard shortcut** in App.tsx:

   ```typescript
   keyboardRegistry.register({
     id: "command-palette",
     key: "p",
     modifiers: { meta: true, shift: true },
     handler: () => setShowCommandPalette(true),
   })
   ```

2. **Pass necessary props** to command palette:
   - Current instance ID
   - Current session ID
   - SDK client reference
   - Handler functions for UI actions

3. **Execute commands** based on type:
   - API calls: Use SDK client
   - UI actions: Call selector focus/click
   - Shortcuts: Trigger registered keyboard shortcuts

---

## UI Component Details

### Layout

```
┌──────────────────────────────────────────────────────┐
│                   Command Palette                     │
├──────────────────────────────────────────────────────┤
│  🔍 Type a command or search...                      │
├──────────────────────────────────────────────────────┤
│  › Initialize AGENTS.md                              │
│    Create or update AGENTS.md file                   │
│                                                       │
│    Compact Session                                   │
│    Summarize and compact the current session         │
│                                                       │
│    New Session                            ⌘⇧N        │
│    Create a new session                              │
│                                                       │
│    Open Model Selector                    ⌘P         │
│    Choose a different model                          │
└──────────────────────────────────────────────────────┘
```

### Styling

- Use Kobalte Dialog for modal foundation
- Dark/light mode support matching app theme
- Highlight selected command with blue background
- Show keyboard shortcuts right-aligned in gray
- Smooth animations for open/close

### Keyboard Navigation

- `Cmd+Shift+P`: Open palette
- `Escape`: Close palette
- `ArrowUp`: Previous command
- `ArrowDown`: Next command
- `Enter`: Execute selected command
- Type to filter

---

## Acceptance Criteria

- [ ] Palette opens with `Cmd+Shift+P`
- [ ] Search input is auto-focused
- [ ] All 8 commands are listed
- [ ] Typing filters commands (case-insensitive substring match)
- [ ] Arrow keys navigate through list
- [ ] Enter executes selected command
- [ ] Click executes command
- [ ] Escape or click outside closes palette
- [ ] Palette closes after command execution
- [ ] Keyboard shortcuts display correctly (⌘⇧N, ⌘P, etc.)
- [ ] Commands execute their intended actions:
  - `/init` calls API
  - `/compact` calls API
  - `/undo` calls API
  - New Session creates a session
  - Model/Agent selectors open
- [ ] Works in both light and dark mode
- [ ] Smooth open/close animations

---

## Future Enhancements (Post-MVP)

- Fuzzy search algorithm (not just substring)
- Command history (recently used commands first)
- Command categories/grouping
- Custom user-defined commands
- Command arguments/parameters
- Command aliases
- Search by keyboard shortcut
- Quick switch between sessions/instances

---

## Notes

- This replaces the slash command (`/command`) approach
- Command palette is more discoverable and flexible
- Provides a foundation for adding more commands in the future
- Similar to VSCode Cmd+Shift+P, Sublime Text Cmd+Shift+P, etc.
