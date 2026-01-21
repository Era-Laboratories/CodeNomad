import { Component, createSignal, Show } from "solid-js"
import { Edit2, Trash2, Check, X } from "lucide-solid"
import type { ParsedDirective } from "../lib/directive-parser"
import { getSectionColor } from "../lib/directive-parser"

interface DirectiveCardProps {
  directive: ParsedDirective
  readOnly?: boolean
  onEdit?: (id: string, newText: string) => void
  onDelete?: (id: string) => void
}

const DirectiveCard: Component<DirectiveCardProps> = (props) => {
  const [isEditing, setIsEditing] = createSignal(false)
  const [editText, setEditText] = createSignal("")

  const color = () => getSectionColor(props.directive.section || "")

  const startEdit = () => {
    setEditText(props.directive.text)
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditText("")
  }

  const saveEdit = () => {
    const newText = editText().trim()
    if (newText && newText !== props.directive.text) {
      props.onEdit?.(props.directive.id, newText)
    }
    setIsEditing(false)
    setEditText("")
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && e.metaKey) {
      saveEdit()
    } else if (e.key === "Escape") {
      cancelEdit()
    }
  }

  return (
    <div
      class={`directive-card ${isEditing() ? "editing" : ""}`}
      data-color={color()}
    >
      <Show when={!isEditing()}>
        <div class="directive-card-content">
          <span class={props.readOnly ? "directive-card-text-readonly" : "directive-card-text"}>
            {props.directive.text}
          </span>
          <Show when={!props.readOnly}>
            <div class="directive-card-actions">
              <button
                type="button"
                class="directive-card-action-btn"
                onClick={startEdit}
                title="Edit directive"
              >
                <Edit2 class="w-4 h-4" />
              </button>
              <button
                type="button"
                class="directive-card-action-btn delete"
                onClick={() => props.onDelete?.(props.directive.id)}
                title="Delete directive"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </Show>
        </div>
      </Show>

      <Show when={isEditing()}>
        <div class="directive-card-edit">
          <textarea
            class="directive-card-edit-input"
            value={editText()}
            onInput={(e) => setEditText(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            autofocus
            placeholder="Enter directive text..."
          />
          <div class="directive-card-edit-actions">
            <button
              type="button"
              class="directive-card-edit-btn directive-card-edit-btn-cancel"
              onClick={cancelEdit}
            >
              <X class="w-3 h-3" />
              <span>Cancel</span>
            </button>
            <button
              type="button"
              class="directive-card-edit-btn directive-card-edit-btn-save"
              onClick={saveEdit}
              disabled={!editText().trim()}
            >
              <Check class="w-3 h-3" />
              <span>Save</span>
            </button>
          </div>
        </div>
      </Show>
    </div>
  )
}

export default DirectiveCard
