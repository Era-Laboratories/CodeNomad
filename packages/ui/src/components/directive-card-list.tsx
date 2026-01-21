import { Component, For, Show, createSignal, createMemo } from "solid-js"
import { LayoutGrid, FileText, Plus, FileQuestion, Search, X, ChevronDown, ChevronRight } from "lucide-solid"
import DirectiveCard from "./directive-card"
import type { DirectiveSection, ParsedDirective } from "../lib/directive-parser"
import { getSectionColor } from "../lib/directive-parser"

export type ViewMode = "cards" | "raw"

interface DirectiveCardListProps {
  sections: DirectiveSection[]
  rawContent: string
  readOnly?: boolean
  onChange?: (sections: DirectiveSection[]) => void
  onRawChange?: (content: string) => void
  onAddToSection?: (sectionTitle: string) => void
  showViewToggle?: boolean
  showSearch?: boolean
  viewMode?: ViewMode
  onViewModeChange?: (mode: ViewMode) => void
}

const DirectiveCardList: Component<DirectiveCardListProps> = (props) => {
  // Internal view mode if not controlled externally
  const [internalViewMode, setInternalViewMode] = createSignal<ViewMode>("cards")
  const [searchQuery, setSearchQuery] = createSignal("")
  const [collapsedSections, setCollapsedSections] = createSignal<Set<string>>(new Set())

  const viewMode = () => props.viewMode ?? internalViewMode()
  const setViewMode = (mode: ViewMode) => {
    if (props.onViewModeChange) {
      props.onViewModeChange(mode)
    } else {
      setInternalViewMode(mode)
    }
  }

  // Filter sections based on search query
  const filteredSections = createMemo(() => {
    const query = searchQuery().toLowerCase().trim()
    if (!query) return props.sections

    return props.sections
      .map(section => ({
        ...section,
        directives: section.directives.filter(d =>
          d.text.toLowerCase().includes(query) ||
          section.title.toLowerCase().includes(query)
        ),
      }))
      .filter(section => section.directives.length > 0)
  })

  const totalDirectives = createMemo(() =>
    props.sections.reduce((sum, s) => sum + s.directives.length, 0)
  )

  const filteredCount = createMemo(() =>
    filteredSections().reduce((sum, s) => sum + s.directives.length, 0)
  )

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(title)) {
        next.delete(title)
      } else {
        next.add(title)
      }
      return next
    })
  }

  const isSectionCollapsed = (title: string) => collapsedSections().has(title)

  const expandAll = () => setCollapsedSections(new Set())
  const collapseAll = () => setCollapsedSections(new Set(props.sections.map(s => s.title)))

  const handleEdit = (id: string, newText: string) => {
    if (!props.onChange) return

    const updatedSections = props.sections.map(section => ({
      ...section,
      directives: section.directives.map(d =>
        d.id === id ? { ...d, text: newText, original: `- ${newText}` } : d
      ),
    }))
    props.onChange(updatedSections)
  }

  const handleDelete = (id: string) => {
    if (!props.onChange) return

    const updatedSections = props.sections
      .map(section => ({
        ...section,
        directives: section.directives.filter(d => d.id !== id),
      }))
      .filter(section => section.directives.length > 0)
    props.onChange(updatedSections)
  }

  return (
    <div class="directive-card-list">
      {/* Toolbar: View Toggle + Search */}
      <div class="directives-toolbar">
        <Show when={props.showViewToggle !== false}>
          <div class="directives-view-toggle">
            <button
              type="button"
              class={`directives-view-toggle-btn ${viewMode() === "cards" ? "active" : ""}`}
              onClick={() => setViewMode("cards")}
            >
              <LayoutGrid class="w-4 h-4" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              class={`directives-view-toggle-btn ${viewMode() === "raw" ? "active" : ""}`}
              onClick={() => setViewMode("raw")}
            >
              <FileText class="w-4 h-4" />
              <span>Raw</span>
            </button>
          </div>
        </Show>

        {/* Search - only show in card view */}
        <Show when={viewMode() === "cards" && props.showSearch !== false && totalDirectives() > 0}>
          <div class="directives-search">
            <Search class="w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search directives..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
            />
            <Show when={searchQuery()}>
              <button type="button" onClick={() => setSearchQuery("")} class="directives-search-clear">
                <X class="w-3 h-3" />
              </button>
            </Show>
          </div>
        </Show>

        {/* Expand/Collapse All - only show in card view with multiple sections */}
        <Show when={viewMode() === "cards" && filteredSections().length > 1}>
          <div class="directives-expand-collapse">
            <button type="button" onClick={expandAll} class="directives-expand-btn">
              Expand All
            </button>
            <button type="button" onClick={collapseAll} class="directives-expand-btn">
              Collapse All
            </button>
          </div>
        </Show>
      </div>

      {/* Search results count */}
      <Show when={searchQuery() && viewMode() === "cards"}>
        <div class="directives-search-results">
          Found {filteredCount()} {filteredCount() === 1 ? "directive" : "directives"}
          {filteredCount() !== totalDirectives() && ` (of ${totalDirectives()} total)`}
        </div>
      </Show>

      {/* Card View */}
      <Show when={viewMode() === "cards"}>
        <Show when={props.sections.length === 0}>
          <div class="directives-empty">
            <FileQuestion class="directives-empty-icon w-12 h-12" />
            <p class="directives-empty-title">No directives found</p>
            <p class="directives-empty-description">
              {props.readOnly
                ? "This document has no directives configured."
                : "Add your first directive to get started."}
            </p>
          </div>
        </Show>

        <Show when={props.sections.length > 0 && filteredSections().length === 0}>
          <div class="directives-empty">
            <Search class="directives-empty-icon w-12 h-12" />
            <p class="directives-empty-title">No matches found</p>
            <p class="directives-empty-description">
              No directives match "{searchQuery()}". Try a different search term.
            </p>
            <button
              type="button"
              class="directives-empty-btn"
              onClick={() => setSearchQuery("")}
            >
              Clear search
            </button>
          </div>
        </Show>

        <Show when={filteredSections().length > 0}>
          <div class="flex flex-col gap-4">
            <For each={filteredSections()}>
              {(section) => {
                const isCollapsed = () => isSectionCollapsed(section.title)
                return (
                  <div class="directive-section">
                    <button
                      type="button"
                      class="directive-section-header"
                      onClick={() => toggleSection(section.title)}
                    >
                      <div class="directive-section-header-info">
                        <span class="directive-section-chevron">
                          {isCollapsed() ? (
                            <ChevronRight class="w-4 h-4" />
                          ) : (
                            <ChevronDown class="w-4 h-4" />
                          )}
                        </span>
                        <div
                          class="directive-section-color"
                          data-color={getSectionColor(section.title)}
                        />
                        <span class="directive-section-title">{section.title}</span>
                        <span class="directive-section-count">
                          {section.directives.length}
                        </span>
                      </div>
                      <Show when={!props.readOnly && props.onAddToSection}>
                        <button
                          type="button"
                          class="directive-section-add-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            props.onAddToSection?.(section.title)
                          }}
                          title={`Add directive to ${section.title}`}
                        >
                          <Plus class="w-4 h-4" />
                        </button>
                      </Show>
                    </button>
                    <Show when={!isCollapsed()}>
                      <div class="directive-cards-grid">
                        <For each={section.directives}>
                          {(directive) => (
                            <DirectiveCard
                              directive={directive}
                              readOnly={props.readOnly}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                            />
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>
                )
              }}
            </For>
          </div>
        </Show>
      </Show>

      {/* Raw Markdown View */}
      <Show when={viewMode() === "raw"}>
        <Show when={props.readOnly}>
          <pre class="directives-raw-editor-readonly">{props.rawContent || "No content"}</pre>
        </Show>
        <Show when={!props.readOnly}>
          <textarea
            class="directives-raw-editor"
            value={props.rawContent}
            onInput={(e) => props.onRawChange?.(e.currentTarget.value)}
            placeholder="# Section Title

- Add your directives here
- One directive per line"
          />
        </Show>
      </Show>
    </div>
  )
}

export default DirectiveCardList
