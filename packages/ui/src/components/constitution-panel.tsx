import { Component, createSignal, createMemo, createEffect, onMount, Show } from "solid-js"
import { Lock, RefreshCw, AlertTriangle, FileQuestion, FolderOpen, Folder } from "lucide-solid"
import DirectiveCardList from "./directive-card-list"
import type { ViewMode } from "./directive-card-list"
import { parseDirectivesMarkdown } from "../lib/directive-parser"
import {
  fetchDirectives,
  constitution,
  isDirectivesLoading,
} from "../stores/era-directives"
import { isEraInstalled } from "../stores/era-status"

interface ConstitutionPanelProps {
  folder?: string
}

/**
 * Extract project name from folder path
 */
function getProjectName(folder: string): string {
  const parts = folder.split("/")
  return parts[parts.length - 1] || folder
}

const ConstitutionPanel: Component<ConstitutionPanelProps> = (props) => {
  const [viewMode, setViewMode] = createSignal<ViewMode>("cards")

  onMount(() => {
    if (props.folder) {
      fetchDirectives(props.folder)
    }
  })

  createEffect(() => {
    if (props.folder) {
      fetchDirectives(props.folder)
    }
  })

  const parsedSections = createMemo(() => {
    const content = constitution()?.content
    if (!content) return []
    return parseDirectivesMarkdown(content)
  })

  const rawContent = () => constitution()?.content || ""

  return (
    <div class="constitution-panel">
      {/* Header */}
      <div class="directives-panel-header">
        <div>
          <h2 class="flex items-center gap-2">
            <Lock class="w-5 h-5 text-red-400" />
            Constitution
          </h2>
          <p>Foundational safety rules that cannot be overridden</p>
        </div>
      </div>

      {/* Project indicator */}
      <Show when={props.folder}>
        <div class="project-selector">
          <label class="project-selector-label">Project:</label>
          <div class="project-selector-single">
            <Folder class="w-4 h-4 text-green-400" />
            <span class="project-selector-name">{getProjectName(props.folder)}</span>
            <span class="project-selector-path" title={props.folder}>{props.folder}</span>
          </div>
        </div>
      </Show>

      {/* No project open */}
      <Show when={!props.folder}>
        <div class="directives-empty">
          <FolderOpen class="directives-empty-icon w-12 h-12" />
          <p class="directives-empty-title">No Project Open</p>
          <p class="directives-empty-description">
            Open a project to view its constitution. The constitution defines
            immutable safety rules that govern AI behavior in your project.
          </p>
        </div>
      </Show>

      <Show when={props.folder}>
        {/* Read-only notice */}
        <div class="constitution-readonly-notice">
          <Lock class="constitution-readonly-notice-icon w-5 h-5" />
          <div class="constitution-readonly-notice-text">
            <strong>Immutable Document</strong>
            The constitution cannot be modified through the UI. It contains core principles
            that govern all AI behavior and can only be changed through a formal review process.
          </div>
        </div>

        <Show when={!isEraInstalled()}>
          <div class="governance-notice governance-notice-warning">
            <AlertTriangle class="w-5 h-5" />
            <div>
              <strong>Era Code Not Installed</strong>
              <p>Install Era Code to view the constitution.</p>
            </div>
          </div>
        </Show>

        <Show when={isDirectivesLoading()}>
          <div class="directives-loading">
            <RefreshCw class="w-5 h-5 animate-spin" />
            <span>Loading constitution...</span>
          </div>
        </Show>

        <Show when={!isDirectivesLoading() && isEraInstalled()}>
          <Show when={!constitution()?.exists}>
            <div class="directives-empty">
              <FileQuestion class="directives-empty-icon w-12 h-12" />
              <p class="directives-empty-title">No Constitution Found</p>
              <p class="directives-empty-description">
                Create a constitution file at <code>.era/memory/constitution.md</code> to
                establish foundational rules for your project.
              </p>
            </div>
          </Show>

          <Show when={constitution()?.exists}>
            <DirectiveCardList
              sections={parsedSections()}
              rawContent={rawContent()}
              readOnly={true}
              showViewToggle={true}
              viewMode={viewMode()}
              onViewModeChange={setViewMode}
            />
          </Show>
        </Show>
      </Show>
    </div>
  )
}

export default ConstitutionPanel
