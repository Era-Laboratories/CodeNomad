import { Component, createSignal, createMemo, Show, For } from "solid-js"
import { X, Sparkles, RefreshCw, Plus, ChevronDown } from "lucide-solid"
import {
  formatDirectiveRuleBased,
  validateDirective,
  getSuggestedSections,
  type FormatResult,
} from "../lib/directive-formatter"

interface AddDirectiveModalProps {
  open: boolean
  onClose: () => void
  type: "project" | "global"
  existingSections: string[]
  defaultSection?: string
  onAdd: (text: string, section?: string) => void
}

const AddDirectiveModal: Component<AddDirectiveModalProps> = (props) => {
  const [input, setInput] = createSignal("")
  const [selectedSection, setSelectedSection] = createSignal<string>(props.defaultSection || "")
  const [isNewSection, setIsNewSection] = createSignal(false)
  const [newSectionName, setNewSectionName] = createSignal("")
  const [formatResult, setFormatResult] = createSignal<FormatResult | null>(null)
  const [isFormatting, setIsFormatting] = createSignal(false)
  const [validationError, setValidationError] = createSignal<string | null>(null)

  // Combine existing sections with suggested sections
  const allSections = createMemo(() => {
    const existing = props.existingSections
    const suggested = getSuggestedSections()
    const combined = new Set([...existing, ...suggested])
    return Array.from(combined).sort()
  })

  const handleInputChange = (value: string) => {
    setInput(value)
    setFormatResult(null)
    setValidationError(null)
  }

  const handleFormat = async () => {
    const text = input().trim()
    const validation = validateDirective(text)

    if (!validation.valid) {
      setValidationError(validation.error || "Invalid directive")
      return
    }

    setIsFormatting(true)
    setValidationError(null)

    try {
      // Use rule-based formatting (AI can be added later)
      const result = formatDirectiveRuleBased(text, props.existingSections)
      setFormatResult(result)

      // Auto-select the suggested section if none is selected
      if (!selectedSection()) {
        setSelectedSection(result.suggestedSection)
      }
    } finally {
      setIsFormatting(false)
    }
  }

  const handleAdd = () => {
    const formatted = formatResult()
    const text = formatted?.formatted || input().trim()

    const validation = validateDirective(text)
    if (!validation.valid) {
      setValidationError(validation.error || "Invalid directive")
      return
    }

    const section = isNewSection() ? newSectionName().trim() : selectedSection()
    props.onAdd(text, section || undefined)

    // Reset form
    setInput("")
    setSelectedSection("")
    setNewSectionName("")
    setIsNewSection(false)
    setFormatResult(null)
    setValidationError(null)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      props.onClose()
    }
    if (e.key === "Enter" && e.metaKey) {
      e.preventDefault()
      if (formatResult()) {
        handleAdd()
      } else {
        handleFormat()
      }
    }
  }

  const canAdd = () => {
    const text = formatResult()?.formatted || input().trim()
    return text.length >= 5 && (isNewSection() ? newSectionName().trim() : true)
  }

  return (
    <Show when={props.open}>
      <div class="add-directive-modal-overlay" onClick={props.onClose} onKeyDown={handleKeyDown}>
        <div class="add-directive-modal" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div class="add-directive-modal-header">
            <h3>
              {props.type === "project" ? "Add Project Directive" : "Add Global Directive"}
            </h3>
            <button type="button" class="add-directive-modal-close" onClick={props.onClose}>
              <X class="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div class="add-directive-modal-body">
            {/* Input */}
            <div class="add-directive-field">
              <label class="add-directive-label">Directive</label>
              <textarea
                class="add-directive-input"
                value={input()}
                onInput={(e) => handleInputChange(e.currentTarget.value)}
                placeholder="Describe your directive in natural language, e.g., 'Always use TypeScript for new files' or 'Never commit API keys to the repository'"
                autofocus
              />
              <p class="add-directive-hint">
                Type your directive in natural language. It will be formatted automatically.
              </p>
            </div>

            {/* Validation Error */}
            <Show when={validationError()}>
              <div class="governance-notice governance-notice-error text-sm">
                {validationError()}
              </div>
            </Show>

            {/* Format Button - now optional, shown as secondary action */}
            <Show when={!formatResult() && input().trim().length >= 5}>
              <div class="flex gap-2">
                <button
                  type="button"
                  class="add-directive-btn add-directive-btn-format flex-1"
                  onClick={handleFormat}
                  disabled={isFormatting()}
                >
                  {isFormatting() ? (
                    <>
                      <RefreshCw class="w-4 h-4 animate-spin" />
                      Formatting...
                    </>
                  ) : (
                    <>
                      <Sparkles class="w-4 h-4" />
                      Preview & Choose Section
                    </>
                  )}
                </button>
              </div>
              <p class="add-directive-hint text-center">
                Or add directly to the default section
              </p>
            </Show>

            {/* Format Preview */}
            <Show when={formatResult()}>
              <div class="add-directive-preview">
                <div class="add-directive-preview-label">Formatted Directive</div>
                <div class="add-directive-preview-content">{formatResult()?.formatted}</div>
                <div class="add-directive-preview-section">
                  Suggested section: <strong>{formatResult()?.suggestedSection}</strong>
                </div>
              </div>

              {/* Section Selection */}
              <div class="add-directive-field">
                <label class="add-directive-label">Section</label>
                <Show when={!isNewSection()}>
                  <div class="flex gap-2">
                    <select
                      class="add-directive-select flex-1"
                      value={selectedSection()}
                      onChange={(e) => setSelectedSection(e.currentTarget.value)}
                    >
                      <option value="">Select a section...</option>
                      <For each={allSections()}>
                        {(section) => (
                          <option value={section}>{section}</option>
                        )}
                      </For>
                    </select>
                    <button
                      type="button"
                      class="add-directive-btn add-directive-btn-secondary"
                      onClick={() => setIsNewSection(true)}
                      title="Create new section"
                    >
                      <Plus class="w-4 h-4" />
                    </button>
                  </div>
                </Show>
                <Show when={isNewSection()}>
                  <div class="flex gap-2">
                    <input
                      type="text"
                      class="add-directive-select flex-1"
                      value={newSectionName()}
                      onInput={(e) => setNewSectionName(e.currentTarget.value)}
                      placeholder="Enter new section name..."
                      autofocus
                    />
                    <button
                      type="button"
                      class="add-directive-btn add-directive-btn-secondary"
                      onClick={() => {
                        setIsNewSection(false)
                        setNewSectionName("")
                      }}
                    >
                      <ChevronDown class="w-4 h-4" />
                    </button>
                  </div>
                </Show>
              </div>
            </Show>
          </div>

          {/* Footer */}
          <div class="add-directive-modal-footer">
            <button
              type="button"
              class="add-directive-btn add-directive-btn-secondary"
              onClick={props.onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              class="add-directive-btn add-directive-btn-primary"
              onClick={() => {
                // Auto-format if not already formatted
                if (!formatResult() && input().trim().length >= 5) {
                  const result = formatDirectiveRuleBased(input().trim(), props.existingSections)
                  setFormatResult(result)
                  if (!selectedSection()) {
                    setSelectedSection(result.suggestedSection)
                  }
                }
                handleAdd()
              }}
              disabled={input().trim().length < 5}
            >
              <Plus class="w-4 h-4" />
              Add Directive
            </button>
          </div>
        </div>
      </div>
    </Show>
  )
}

export default AddDirectiveModal
