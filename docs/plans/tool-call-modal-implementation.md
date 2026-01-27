# Tool Call Modal Implementation Plan

## Overview
Convert inline tool call expansions into modals to keep the message thread clean and provide better space for viewing diffs/code.

## Status: COMPLETE - All 4 Phases Done

---

## Phase 1: Modal Infrastructure
**Status: COMPLETE**

### Tasks
- [x] Create `ToolCallModal` component (`src/components/tool-call-modal.tsx`)
- [x] Add modal state management (`src/stores/tool-modal.ts`)
- [x] Create modal CSS with animations (`src/styles/components/tool-call-modal.css`)
- [x] Wire up keyboard shortcuts (Esc, ←, →)
- [x] Integrate with GroupedToolsSummary (opens modal on file click)
- [x] Add ToolCallModal to App.tsx
- [x] Playwright test: Modal opens/closes correctly (6 tests passed)

### Files Created
- `packages/ui/src/components/tool-call-modal.tsx`
- `packages/ui/src/stores/tool-modal.ts`
- `packages/ui/src/styles/components/tool-call-modal.css`

### Files Modified
- `packages/ui/src/components/grouped-tools-summary.tsx` (uses modal instead of inline)
- `packages/ui/src/styles/components/grouped-tools-summary.css` (new button styles)
- `packages/ui/src/styles/controls.css` (import modal CSS)
- `packages/ui/src/App.tsx` (render ToolCallModal)

---

## Phase 2: Enhanced Diff Viewer
**Status: COMPLETE**

### Tasks
- [x] Add split/unified toggle to modal header
- [x] Add diff view mode state to modal store
- [x] Add change stats display (additions/deletions) in footer
- [x] Add copy button for content
- [x] Syntax highlighting (existing from @git-diff-view)
- [x] Playwright test: All 9 tests passing (3 new Phase 2 tests)

### Files Modified
- `packages/ui/src/stores/tool-modal.ts` - Added diffViewMode state
- `packages/ui/src/components/tool-call-modal.tsx` - Added toggle, copy, stats
- `packages/ui/src/styles/components/tool-call-modal.css` - New styles

---

## Phase 3: Integration Polish
**Status: COMPLETE**

### Tasks
- [x] Update `GroupedToolsSummary` to open modal instead of inline expansion
- [x] Pass file list context for prev/next navigation
- [x] Add "View →" button styling (arrow appears on hover)
- [x] Add status indicators (✓ completed, ⏳ running, ✗ error, ○ pending)
- [x] Add slideDown animation for group expansion
- [x] Playwright tests: 6 new Phase 3 tests (15 total passing)

### Files Modified
- `packages/ui/src/components/grouped-tools-summary.tsx` - Status indicators, modal integration
- `packages/ui/src/styles/components/grouped-tools-summary.css` - Status colors, animations
- `packages/ui/tests/e2e/tool-call-modal.spec.ts` - 6 new Phase 3 tests

---

## Phase 4: Final Polish
**Status: COMPLETE**

### Tasks
- [x] Transition animations (fadeIn, slideUp, shimmer)
- [x] Mobile responsive (media query at 768px)
- [x] Copy button (implemented in Phase 2)
- [x] Status indicators (implemented in Phase 3)
- [x] Improve modal content rendering for different tool types (data-tool-type attribute)
- [x] Add loading skeleton while tool content loads (shimmer animation)
- [x] Add empty state for when no content is available
- [x] Playwright tests: 4 new Phase 4 tests (19 total passing)

---

## Technical Design

### Modal State Store (`tool-modal.ts`)
```typescript
interface ToolModalState {
  isOpen: boolean
  currentItem: ToolDisplayItem | null
  siblingItems: ToolDisplayItem[]
  currentIndex: number
}

// Actions
openToolModal(item: ToolDisplayItem, siblings: ToolDisplayItem[], index: number)
closeToolModal()
navigateNext()
navigatePrev()
```

### Modal Component Props
```typescript
interface ToolCallModalProps {
  // Reactive from store
}
```

### Keyboard Shortcuts
- `Escape` - Close modal
- `←` / `ArrowLeft` - Previous file in group
- `→` / `ArrowRight` - Next file in group
- `Tab` - Cycle focus within modal

### Content Types by Tool
| Tool | Modal Content |
|------|---------------|
| Edit | Split/unified diff view |
| Write | Full file content (or diff if replacing) |
| Read | File content with syntax highlighting |
| Bash | Command + ANSI-rendered output |
| Glob/Grep | Search results list |
| Task | Sub-agent summary |

---

## Testing Strategy

### Playwright Test Port
Use port `3099` for isolated testing to avoid conflicts with dev server.

### Test Cases (per phase)
1. **Phase 1**: Modal opens, closes with Esc, keyboard nav works
2. **Phase 2**: Split/unified toggle, diff renders correctly
3. **Phase 3**: Click file in grouped summary → modal opens with correct content
4. **Phase 4**: Animations, copy button, responsive layout

---

## Progress Log

### 2025-01-25
- Created implementation plan
- **Phase 1 Complete:**
  - Created `tool-modal.ts` store with state management (isOpen, currentItem, siblings, navigation)
  - Created `ToolCallModal` component with keyboard shortcuts (Esc, ←, →)
  - Created CSS with animations (fadeIn, slideUp), responsive styles
  - Updated `GroupedToolsSummary` to open modal instead of inline expansion
  - Added `ToolCallModal` to App.tsx
  - All 6 Playwright tests passing

- **Phase 2 Complete:**
  - Added split/unified toggle to modal header
  - Added diffViewMode state to modal store
  - Added change stats display (additions/deletions) in footer
  - Added copy button for content
  - 9 Playwright tests passing (3 new)

- **Phase 3 Complete:**
  - Added status indicators (✓ completed, ⏳ running, ✗ error, ○ pending)
  - Added "View →" arrow on hover
  - Added slideDown animation for group expansion
  - 15 Playwright tests passing (6 new)

- **Phase 4 Complete:**
  - Added loading skeleton with shimmer animation
  - Added empty state for missing content
  - Added tool type specific styling via data-tool-type attribute
  - 19 Playwright tests passing (4 new)

## Summary
All phases complete. The tool call modal feature is fully implemented with:
- Modal infrastructure with keyboard navigation (Esc, ←, →)
- Split/unified diff view toggle
- Copy button with success feedback
- Change stats (additions/deletions)
- Status indicators and badges
- Loading skeleton with shimmer animation
- Empty state handling
- Tool type specific styling
- Responsive mobile layout
- Full Playwright test coverage (19 tests)
