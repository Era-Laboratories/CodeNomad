# Task 042 - Style Token Scaffolding

## Goal
Create the shared token stylesheet placeholder and wire it into the app without defining actual variables yet.

## Prerequisites
- Task 041 complete (Tailwind theme hooks ready).
- Local dev server can be run (`npm run dev`).

## Acceptance Criteria
- [ ] New file `src/styles/tokens.css` exists with section headings for light and dark palettes plus TODO comments for future tokens.
- [ ] `src/index.css` imports `src/styles/tokens.css` near the top of the file.
- [ ] No CSS variables are defined yet (only structure and comments).
- [ ] App compiles and renders as before.

## Steps
1. Create `src/styles/` if missing and add `tokens.css` with placeholders:
   ```css
   :root {
     /* TODO: surface, text, accent, status tokens */
   }

   [data-theme="dark"] {
     /* TODO: dark-mode overrides */
   }
   ```
2. Import `./styles/tokens.css` from `src/index.css` after the Tailwind directives.
3. Ensure no existing CSS variables are removed yet.

## Testing Checklist
- [ ] Run `npm run dev` and confirm the renderer starts without warnings.
- [ ] Visually spot-check a session view in light and dark mode for unchanged styling.

## Dependencies
- Blocks Task 043 (color variable migration).

## Estimated Time
0.25 hours

## Notes
- Branch name suggestion: `feature/task-042-style-token-scaffolding`.
- Keep the file ASCII-only and avoid trailing spaces.
