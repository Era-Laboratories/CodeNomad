import { Component, For, Show, createSignal } from "solid-js"
import { Dialog } from "@kobalte/core"
import { X, HelpCircle } from "lucide-solid"
import Kbd from "./kbd"

interface ShortcutItem {
  keys: string
  description: string
}

interface ShortcutCategory {
  title: string
  shortcuts: ShortcutItem[]
}

const shortcutCategories: ShortcutCategory[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: "cmd+shift+[", description: "Previous session" },
      { keys: "cmd+shift+]", description: "Next session" },
      { keys: "cmd+[", description: "Previous instance" },
      { keys: "cmd+]", description: "Next instance" },
      { keys: "cmd+1-9", description: "Switch to instance N" },
      { keys: "cmd+shift+1-9", description: "Switch to session N" },
    ],
  },
  {
    title: "Sessions & Instances",
    shortcuts: [
      { keys: "cmd+n", description: "New instance" },
      { keys: "cmd+shift+n", description: "New session" },
      { keys: "cmd+w", description: "Close instance" },
      { keys: "cmd+shift+w", description: "Close session" },
      { keys: "cmd+shift+l", description: "Instance info" },
    ],
  },
  {
    title: "Agent & Model",
    shortcuts: [
      { keys: "cmd+shift+a", description: "Select agent" },
      { keys: "cmd+shift+m", description: "Select model" },
    ],
  },
  {
    title: "Input",
    shortcuts: [
      { keys: "enter", description: "New line" },
      { keys: "cmd+enter", description: "Send message" },
      { keys: "@", description: "Attach files or agents" },
      { keys: "up", description: "Previous prompt in history" },
      { keys: "down", description: "Next prompt in history" },
      { keys: "!", description: "Enter shell mode" },
      { keys: "esc", description: "Exit shell mode / Close dialogs" },
    ],
  },
  {
    title: "General",
    shortcuts: [
      { keys: "cmd+shift+p", description: "Command palette" },
    ],
  },
]

interface ShortcutsDialogProps {
  open: boolean
  onClose: () => void
}

const ShortcutsDialog: Component<ShortcutsDialogProps> = (props) => {
  return (
    <Dialog.Root open={props.open} onOpenChange={(isOpen) => !isOpen && props.onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay class="shortcuts-dialog-overlay" />
        <Dialog.Content class="shortcuts-dialog-content">
          <div class="shortcuts-dialog-header">
            <Dialog.Title class="shortcuts-dialog-title">Keyboard Shortcuts</Dialog.Title>
            <Dialog.CloseButton class="shortcuts-dialog-close">
              <X class="w-4 h-4" />
            </Dialog.CloseButton>
          </div>
          <div class="shortcuts-dialog-body">
            <For each={shortcutCategories}>
              {(category) => (
                <div class="shortcuts-category">
                  <h3 class="shortcuts-category-title">{category.title}</h3>
                  <div class="shortcuts-list">
                    <For each={category.shortcuts}>
                      {(shortcut) => (
                        <div class="shortcut-item">
                          <span class="shortcut-description">{shortcut.description}</span>
                          <Kbd shortcut={shortcut.keys} />
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default ShortcutsDialog
