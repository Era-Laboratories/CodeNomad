---
title: Symbol Attachments
description: Attach code symbols with LSP integration.
---

Implement Symbol Attachments

---

### LSP Integration

Integrate with the Language Server Protocol (LSP) to get a list of symbols in the current project.

---

### @ Symbol Autocomplete

When a user types `@` followed by a symbol-like pattern, trigger an autocomplete with relevant code symbols.

Include symbols from various file types supported by LSP.

---

### Attach and Navigate Symbols

Allow users to select a symbol from the autocomplete list to attach it to the prompt.

Display attached symbols as interactive chips. Optionally, implement functionality to jump to the symbol definition in an editor.

---

### Acceptance Criteria

- Typing `@` followed by a partial symbol name displays matching symbol suggestions.
- Selecting a symbol creates an attachment chip.
- Attached symbols are correctly formatted for submission.
- (Optional) Clicking a symbol chip navigates to its definition.
