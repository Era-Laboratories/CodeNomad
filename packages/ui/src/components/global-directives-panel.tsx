import { Component, createSignal, createMemo, createEffect, onMount, Show } from "solid-js"
import { Globe, RefreshCw, AlertTriangle, Plus, Save, Check } from "lucide-solid"
import DirectiveCardList from "./directive-card-list"
import AddDirectiveModal from "./add-directive-modal"
import type { ViewMode } from "./directive-card-list"
import {
  parseDirectivesMarkdown,
  directivesToMarkdown,
  addDirective,
  type DirectiveSection,
} from "../lib/directive-parser"
import {
  fetchDirectives,
  globalDirectives,
  isDirectivesLoading,
  saveDirectives,
} from "../stores/era-directives"
import { isEraInstalled } from "../stores/era-status"
import { showToastNotification } from "../lib/notifications"

interface GlobalDirectivesPanelProps {
  folder?: string
}

const GlobalDirectivesPanel: Component<GlobalDirectivesPanelProps> = (props) => {
  const [viewMode, setViewMode] = createSignal<ViewMode>("cards")
  const [isAddModalOpen, setIsAddModalOpen] = createSignal(false)
  const [addToSection, setAddToSection] = createSignal<string | undefined>()
  const [isSaving, setIsSaving] = createSignal(false)
  const [saveStatus, setSaveStatus] = createSignal<{ type: "success" | "error"; message: string } | null>(null)
  const [localContent, setLocalContent] = createSignal<string | null>(null)
  const [hasChanges, setHasChanges] = createSignal(false)

  onMount(() => {
    fetchDirectives(props.folder)
  })

  createEffect(() => {
    if (props.folder) {
      fetchDirectives(props.folder)
    }
  })

  // Reset local content when global directives change from server
  createEffect(() => {
    const serverContent = globalDirectives()?.content
    if (serverContent !== undefined && localContent() === null) {
      setLocalContent(serverContent || "")
    }
  })

  const currentContent = () => localContent() ?? globalDirectives()?.content ?? ""

  const parsedSections = createMemo(() => {
    return parseDirectivesMarkdown(currentContent())
  })

  const handleSectionsChange = (sections: DirectiveSection[]) => {
    const newContent = directivesToMarkdown(sections)
    setLocalContent(newContent)
    setHasChanges(true)
    setSaveStatus(null)
  }

  const handleRawChange = (content: string) => {
    setLocalContent(content)
    setHasChanges(true)
    setSaveStatus(null)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus(null)

    try {
      const result = await saveDirectives("", "global", currentContent())
      if (result.success) {
        setSaveStatus({ type: "success", message: "Saved successfully" })
        setHasChanges(false)
        // Refresh to get the latest from server
        await fetchDirectives(props.folder)
        setLocalContent(null)
        showToastNotification({
          variant: "success",
          title: "Saved",
          message: "Global directives saved successfully",
          duration: 3000,
        })
        setTimeout(() => setSaveStatus(null), 3000)
      } else {
        setSaveStatus({ type: "error", message: result.error || "Failed to save" })
        showToastNotification({
          variant: "error",
          title: "Save Failed",
          message: result.error || "Failed to save global directives",
          duration: 5000,
        })
      }
    } catch {
      setSaveStatus({ type: "error", message: "Failed to save" })
      showToastNotification({
        variant: "error",
        title: "Save Failed",
        message: "An unexpected error occurred while saving",
        duration: 5000,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddDirective = (text: string, section?: string) => {
    const sections = parsedSections()
    const newSections = addDirective(sections, text, section)
    handleSectionsChange(newSections)
    setIsAddModalOpen(false)
    setAddToSection(undefined)
  }

  const openAddModal = (sectionTitle?: string) => {
    setAddToSection(sectionTitle)
    setIsAddModalOpen(true)
  }

  const existingSections = createMemo(() => parsedSections().map(s => s.title))

  return (
    <div class="directives-panel">
      {/* Header */}
      <div class="directives-panel-header">
        <div>
          <h2 class="flex items-center gap-2">
            <Globe class="w-5 h-5 text-blue-400" />
            Global Directives
          </h2>
          <p>Your personal preferences that apply across all projects</p>
        </div>
        <div class="directives-panel-actions">
          <Show when={hasChanges()}>
            <button
              type="button"
              class="directives-add-btn"
              onClick={handleSave}
              disabled={isSaving()}
            >
              {isSaving() ? (
                <RefreshCw class="w-4 h-4 animate-spin" />
              ) : (
                <Save class="w-4 h-4" />
              )}
              Save Changes
            </button>
          </Show>
          <Show when={saveStatus()}>
            <span class={`directives-save-status ${saveStatus()?.type}`}>
              <Show when={saveStatus()?.type === "success"}>
                <Check class="w-4 h-4" />
              </Show>
              <Show when={saveStatus()?.type === "error"}>
                <AlertTriangle class="w-4 h-4" />
              </Show>
              {saveStatus()?.message}
            </span>
          </Show>
          <button
            type="button"
            class="directives-add-btn"
            onClick={() => openAddModal()}
          >
            <Plus class="w-4 h-4" />
            Add Directive
          </button>
        </div>
      </div>

      <Show when={!isEraInstalled()}>
        <div class="governance-notice governance-notice-warning">
          <AlertTriangle class="w-5 h-5" />
          <div>
            <strong>Era Code Not Installed</strong>
            <p>Install Era Code to manage global directives.</p>
          </div>
        </div>
      </Show>

      <Show when={isDirectivesLoading()}>
        <div class="directives-loading">
          <RefreshCw class="w-5 h-5 animate-spin" />
          <span>Loading directives...</span>
        </div>
      </Show>

      <Show when={!isDirectivesLoading() && isEraInstalled()}>
        <DirectiveCardList
          sections={parsedSections()}
          rawContent={currentContent()}
          readOnly={false}
          showViewToggle={true}
          viewMode={viewMode()}
          onViewModeChange={setViewMode}
          onChange={handleSectionsChange}
          onRawChange={handleRawChange}
          onAddToSection={openAddModal}
        />
      </Show>

      {/* Add Directive Modal */}
      <Show when={isAddModalOpen()}>
        <AddDirectiveModal
          open={isAddModalOpen()}
          onClose={() => {
            setIsAddModalOpen(false)
            setAddToSection(undefined)
          }}
          type="global"
          existingSections={existingSections()}
          defaultSection={addToSection()}
          onAdd={handleAddDirective}
        />
      </Show>
    </div>
  )
}

export default GlobalDirectivesPanel
