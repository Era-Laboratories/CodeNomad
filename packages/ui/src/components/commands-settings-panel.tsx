import { Component, Show, For, createSignal, createMemo, createEffect, onMount } from "solid-js"
import { Dialog } from "@kobalte/core/dialog"
import { X, Plus, Trash2, Edit2, Check, ChevronDown, ChevronRight, Zap, Save, AlertCircle } from "lucide-solid"
import type { Command as SDKCommand } from "@opencode-ai/sdk"
import { getCommands, fetchCommands } from "../stores/commands"
import { instances } from "../stores/instances"
import { getLogger } from "../lib/logger"

const log = getLogger("commands-settings")

interface CustomCommand {
  name: string
  template: string
  description?: string
  agent?: string
  model?: string
  subtask?: boolean
}

interface CommandsSettingsPanelProps {
  open: boolean
  onClose: () => void
  instanceId: string | null
}

const BUILT_IN_COMMANDS = ["init", "undo", "redo", "share", "help", "compact", "cost", "bug", "config", "doctor", "model", "context"]

const CommandsSettingsPanel: Component<CommandsSettingsPanelProps> = (props) => {
  const [showBuiltIn, setShowBuiltIn] = createSignal(true)
  const [showCustom, setShowCustom] = createSignal(true)
  const [isAddingCommand, setIsAddingCommand] = createSignal(false)
  const [editingCommand, setEditingCommand] = createSignal<string | null>(null)
  const [saveError, setSaveError] = createSignal<string | null>(null)
  const [saveSuccess, setSaveSuccess] = createSignal(false)

  // Form state for new/editing command
  const [formName, setFormName] = createSignal("")
  const [formTemplate, setFormTemplate] = createSignal("")
  const [formDescription, setFormDescription] = createSignal("")
  const [formAgent, setFormAgent] = createSignal("")
  const [formModel, setFormModel] = createSignal("")
  const [formSubtask, setFormSubtask] = createSignal(false)

  const allCommands = createMemo(() => {
    if (!props.instanceId) return []
    return getCommands(props.instanceId)
  })

  const builtInCommands = createMemo(() => {
    return allCommands().filter((cmd) => BUILT_IN_COMMANDS.includes(cmd.name))
  })

  const customCommands = createMemo(() => {
    return allCommands().filter((cmd) => !BUILT_IN_COMMANDS.includes(cmd.name))
  })

  const getInstance = () => {
    if (!props.instanceId) return null
    return instances().get(props.instanceId)
  }

  const resetForm = () => {
    setFormName("")
    setFormTemplate("")
    setFormDescription("")
    setFormAgent("")
    setFormModel("")
    setFormSubtask(false)
  }

  const startAddCommand = () => {
    resetForm()
    setEditingCommand(null)
    setIsAddingCommand(true)
    setSaveError(null)
  }

  const startEditCommand = (cmd: SDKCommand) => {
    setFormName(cmd.name)
    setFormTemplate(cmd.template)
    setFormDescription(cmd.description || "")
    setFormAgent(cmd.agent || "")
    setFormModel(cmd.model || "")
    setFormSubtask(cmd.subtask || false)
    setIsAddingCommand(false)
    setEditingCommand(cmd.name)
    setSaveError(null)
  }

  const cancelEdit = () => {
    resetForm()
    setIsAddingCommand(false)
    setEditingCommand(null)
    setSaveError(null)
  }

  const saveCommand = async () => {
    const instance = getInstance()
    if (!instance?.client) {
      setSaveError("No active instance")
      return
    }

    const name = formName().trim()
    const template = formTemplate().trim()

    if (!name) {
      setSaveError("Command name is required")
      return
    }

    if (!template) {
      setSaveError("Template is required")
      return
    }

    if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(name)) {
      setSaveError("Command name must start with a letter and contain only letters, numbers, hyphens, and underscores")
      return
    }

    try {
      // Build the command config
      const newCommand: Record<string, unknown> = {
        template,
      }

      if (formDescription().trim()) {
        newCommand.description = formDescription().trim()
      }
      if (formAgent().trim()) {
        newCommand.agent = formAgent().trim()
      }
      if (formModel().trim()) {
        newCommand.model = formModel().trim()
      }
      if (formSubtask()) {
        newCommand.subtask = true
      }

      // Get current config and update it
      const configResponse = await instance.client.config.get({})
      const currentConfig = configResponse.data || {}

      const updatedConfig = {
        ...currentConfig,
        command: {
          ...(currentConfig.command || {}),
          [name]: newCommand,
        },
      }

      // Save the updated config
      await instance.client.config.update({
        body: updatedConfig,
      })

      // Refresh commands list
      await fetchCommands(props.instanceId!, instance.client)

      // Show success and reset
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
      cancelEdit()

      log.info("Command saved successfully", { name })
    } catch (error) {
      log.error("Failed to save command", error)
      setSaveError(error instanceof Error ? error.message : "Failed to save command")
    }
  }

  const deleteCommand = async (commandName: string) => {
    const instance = getInstance()
    if (!instance?.client) return

    try {
      // Get current config
      const configResponse = await instance.client.config.get({})
      const currentConfig = configResponse.data || {}

      if (!currentConfig.command?.[commandName]) {
        setSaveError("Command not found in config")
        return
      }

      // Remove the command
      const { [commandName]: _, ...remainingCommands } = currentConfig.command

      const updatedConfig = {
        ...currentConfig,
        command: remainingCommands,
      }

      // Save the updated config
      await instance.client.config.update({
        body: updatedConfig,
      })

      // Refresh commands list
      await fetchCommands(props.instanceId!, instance.client)

      log.info("Command deleted successfully", { commandName })
    } catch (error) {
      log.error("Failed to delete command", error)
      setSaveError(error instanceof Error ? error.message : "Failed to delete command")
    }
  }

  const isEditing = () => isAddingCommand() || editingCommand() !== null

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()} modal>
      <Dialog.Portal>
        <Dialog.Overlay class="commands-panel-overlay" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content class="commands-panel">
            <div class="commands-panel-header">
              <Dialog.Title class="commands-panel-title">
                <Zap class="w-5 h-5" />
                Slash Commands
              </Dialog.Title>
              <Dialog.CloseButton class="commands-panel-close">
                <X class="w-4 h-4" />
              </Dialog.CloseButton>
            </div>

            <div class="commands-panel-content">
              {/* Success/Error Messages */}
              <Show when={saveSuccess()}>
                <div class="commands-alert commands-alert-success">
                  <Check class="w-4 h-4" />
                  Command saved successfully
                </div>
              </Show>

              <Show when={saveError()}>
                <div class="commands-alert commands-alert-error">
                  <AlertCircle class="w-4 h-4" />
                  {saveError()}
                </div>
              </Show>

              {/* Add/Edit Form */}
              <Show when={isEditing()}>
                <div class="commands-form">
                  <h3 class="commands-form-title">
                    {isAddingCommand() ? "Add Custom Command" : `Edit /${editingCommand()}`}
                  </h3>

                  <div class="commands-form-field">
                    <label class="commands-form-label">Command Name</label>
                    <input
                      type="text"
                      class="commands-form-input"
                      placeholder="e.g., test, deploy, review"
                      value={formName()}
                      onInput={(e) => setFormName(e.currentTarget.value)}
                      disabled={editingCommand() !== null}
                    />
                    <span class="commands-form-hint">Used as /{formName() || "command"}</span>
                  </div>

                  <div class="commands-form-field">
                    <label class="commands-form-label">Template *</label>
                    <textarea
                      class="commands-form-textarea"
                      placeholder="The prompt sent to the LLM. Use $ARGUMENTS for user input, $1, $2 for positional args."
                      value={formTemplate()}
                      onInput={(e) => setFormTemplate(e.currentTarget.value)}
                      rows={4}
                    />
                    <span class="commands-form-hint">
                      Supports: $ARGUMENTS, $1 $2 etc., `!command` for shell output, @filename for file content
                    </span>
                  </div>

                  <div class="commands-form-field">
                    <label class="commands-form-label">Description</label>
                    <input
                      type="text"
                      class="commands-form-input"
                      placeholder="Brief explanation shown in the picker"
                      value={formDescription()}
                      onInput={(e) => setFormDescription(e.currentTarget.value)}
                    />
                  </div>

                  <div class="commands-form-row">
                    <div class="commands-form-field flex-1">
                      <label class="commands-form-label">Agent</label>
                      <input
                        type="text"
                        class="commands-form-input"
                        placeholder="e.g., build, code"
                        value={formAgent()}
                        onInput={(e) => setFormAgent(e.currentTarget.value)}
                      />
                    </div>

                    <div class="commands-form-field flex-1">
                      <label class="commands-form-label">Model</label>
                      <input
                        type="text"
                        class="commands-form-input"
                        placeholder="e.g., anthropic/claude-sonnet"
                        value={formModel()}
                        onInput={(e) => setFormModel(e.currentTarget.value)}
                      />
                    </div>
                  </div>

                  <div class="commands-form-checkbox">
                    <input
                      type="checkbox"
                      id="subtask-checkbox"
                      checked={formSubtask()}
                      onChange={(e) => setFormSubtask(e.currentTarget.checked)}
                    />
                    <label for="subtask-checkbox">Run as subtask (spawns subagent)</label>
                  </div>

                  <div class="commands-form-actions">
                    <button class="commands-btn commands-btn-secondary" onClick={cancelEdit}>
                      Cancel
                    </button>
                    <button class="commands-btn commands-btn-primary" onClick={saveCommand}>
                      <Save class="w-4 h-4" />
                      Save Command
                    </button>
                  </div>
                </div>
              </Show>

              {/* Commands List */}
              <Show when={!isEditing()}>
                {/* Add Command Button */}
                <button class="commands-add-btn" onClick={startAddCommand}>
                  <Plus class="w-4 h-4" />
                  Add Custom Command
                </button>

                {/* Custom Commands Section */}
                <div class="commands-section">
                  <button
                    class="commands-section-toggle"
                    onClick={() => setShowCustom(!showCustom())}
                  >
                    {showCustom() ? <ChevronDown class="w-4 h-4" /> : <ChevronRight class="w-4 h-4" />}
                    <span>Custom Commands</span>
                    <span class="commands-section-count">{customCommands().length}</span>
                  </button>

                  <Show when={showCustom()}>
                    <div class="commands-list">
                      <Show when={customCommands().length === 0}>
                        <div class="commands-empty">
                          No custom commands defined. Click "Add Custom Command" to create one.
                        </div>
                      </Show>
                      <For each={customCommands()}>
                        {(cmd) => (
                          <div class="commands-item">
                            <div class="commands-item-main">
                              <div class="commands-item-name">/{cmd.name}</div>
                              <Show when={cmd.description}>
                                <div class="commands-item-desc">{cmd.description}</div>
                              </Show>
                              <div class="commands-item-meta">
                                <Show when={cmd.agent}>
                                  <span class="commands-item-badge">agent: {cmd.agent}</span>
                                </Show>
                                <Show when={cmd.model}>
                                  <span class="commands-item-badge">model: {cmd.model}</span>
                                </Show>
                                <Show when={cmd.subtask}>
                                  <span class="commands-item-badge">subtask</span>
                                </Show>
                              </div>
                            </div>
                            <div class="commands-item-actions">
                              <button
                                class="commands-item-action"
                                onClick={() => startEditCommand(cmd)}
                                title="Edit command"
                              >
                                <Edit2 class="w-4 h-4" />
                              </button>
                              <button
                                class="commands-item-action commands-item-action-danger"
                                onClick={() => deleteCommand(cmd.name)}
                                title="Delete command"
                              >
                                <Trash2 class="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>

                {/* Built-in Commands Section */}
                <div class="commands-section">
                  <button
                    class="commands-section-toggle"
                    onClick={() => setShowBuiltIn(!showBuiltIn())}
                  >
                    {showBuiltIn() ? <ChevronDown class="w-4 h-4" /> : <ChevronRight class="w-4 h-4" />}
                    <span>Built-in Commands</span>
                    <span class="commands-section-count">{builtInCommands().length}</span>
                  </button>

                  <Show when={showBuiltIn()}>
                    <div class="commands-list">
                      <For each={builtInCommands()}>
                        {(cmd) => (
                          <div class="commands-item commands-item-builtin">
                            <div class="commands-item-main">
                              <div class="commands-item-name">/{cmd.name}</div>
                              <Show when={cmd.description}>
                                <div class="commands-item-desc">{cmd.description}</div>
                              </Show>
                            </div>
                            <div class="commands-item-badge-builtin">built-in</div>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>

                {/* Documentation Link */}
                <div class="commands-docs">
                  <a
                    href="https://opencode.ai/docs/commands/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="commands-docs-link"
                  >
                    Learn more about slash commands
                  </a>
                </div>
              </Show>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  )
}

export default CommandsSettingsPanel
