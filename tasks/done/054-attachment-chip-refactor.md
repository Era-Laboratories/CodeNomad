# Task 054 - Attachment & Misc Chip Refactor

## Goal
Standardize attachment chips and any remaining inline badge styles to use the shared token helpers.

## Prerequisites
- Task 053 complete (markdown styling moved).

## Acceptance Criteria
- [ ] `src/components/attachment-chip.tsx` uses the `.attachment-chip` and `.attachment-remove` helpers (or equivalent token-backed utilities) instead of hardcoded Tailwind color stacks.
- [ ] Any other chip/badge helpers introduced in earlier tasks reference the same token palette (audit `folder-selection-view.tsx`, `unified-picker.tsx`, etc.).
- [ ] No component contains inline `bg-blue-*` / `dark:bg-blue-*` combinations after the refactor.
- [ ] Interaction states (hover, focus) remain consistent in both themes.

## Steps
1. Update `attachment-chip.tsx` to import and use the shared helper classes.
2. Search the codebase for remaining `bg-blue-`, `bg-gray-900`, `dark:bg-blue-` patterns; convert them to tokenized utilities or helpers.
3. Adjust `components.css` helpers if needed (e.g., expose variations for neutral vs accent chips).
4. Verify attachments display correctly in the prompt input and message list.

## Testing Checklist
- [ ] Run `npm run build`.
- [ ] Manually add/remove attachments via the prompt input, confirming chip styling survives theme toggle.

## Dependencies
- Depends on Task 053.
- Finalizes legacy styling removal.

## Estimated Time
0.5 hours

## Notes
- Branch suggestion: `feature/task-054-attachment-chip-refactor`.
- Document any new helper names in the task PR for traceability.
