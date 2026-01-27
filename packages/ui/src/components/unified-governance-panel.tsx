import { Component, createSignal, createMemo, createEffect, For, Show, onMount } from "solid-js"
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Globe,
  Folder,
  ChevronDown,
  ChevronRight,
  Search,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  AlertTriangle,
  Lock,
  Unlock,
  Edit3,
  X,
  Plus,
  Filter,
  BookOpen,
  Terminal,
  GitBranch,
  Code2,
  Server,
  Eye,
} from "lucide-solid"
import {
  governanceRules,
  governanceSummary,
  hardcodedRules,
  defaultRules,
  projectRules,
  isGovernanceLoading,
  governanceError,
  isAuditMode,
  refreshGovernanceRules,
  setRuleOverride,
  removeRuleOverride,
  type GovernanceRule,
} from "../stores/era-governance"
import {
  fetchDirectives,
  projectDirectives,
  globalDirectives,
  constitution,
  isDirectivesLoading,
  saveDirectives,
} from "../stores/era-directives"
import { isEraInstalled } from "../stores/era-status"

interface UnifiedGovernancePanelProps {
  folder?: string
}

// Rule categories for grouping
type RuleCategory = "security" | "git" | "code" | "system" | "other"

function categorizeRule(rule: GovernanceRule): RuleCategory {
  const id = rule.id.toLowerCase()
  const pattern = rule.pattern.toLowerCase()

  if (id.includes("secret") || id.includes("env") || id.includes("credential") ||
      pattern.includes(".env") || pattern.includes("password") || pattern.includes("api_key")) {
    return "security"
  }
  if (id.includes("git") || pattern.includes("git ") || pattern.includes("push") ||
      pattern.includes("force") || pattern.includes("branch")) {
    return "git"
  }
  if (id.includes("code") || id.includes("lint") || id.includes("format") ||
      pattern.includes("npm") || pattern.includes("yarn") || pattern.includes("pnpm")) {
    return "code"
  }
  if (id.includes("system") || id.includes("rm ") || id.includes("sudo") ||
      pattern.includes("rm -rf") || pattern.includes("sudo")) {
    return "system"
  }
  return "other"
}

const categoryConfig: Record<RuleCategory, { label: string; icon: typeof Shield; color: string }> = {
  security: { label: "Security", icon: ShieldAlert, color: "text-red-400" },
  git: { label: "Git", icon: GitBranch, color: "text-purple-400" },
  code: { label: "Code", icon: Code2, color: "text-blue-400" },
  system: { label: "System", icon: Terminal, color: "text-orange-400" },
  other: { label: "Other", icon: Server, color: "text-gray-400" },
}

const UnifiedGovernancePanel: Component<UnifiedGovernancePanelProps> = (props) => {
  const [searchQuery, setSearchQuery] = createSignal("")
  const [selectedCategory, setSelectedCategory] = createSignal<RuleCategory | "all">("all")
  const [selectedSource, setSelectedSource] = createSignal<"all" | "hardcoded" | "default" | "project">("all")
  const [togglingRules, setTogglingRules] = createSignal<Set<string>>(new Set())
  const [expandedSection, setExpandedSection] = createSignal<"constitution" | "global" | "project" | null>(null)
  const [editingDirective, setEditingDirective] = createSignal<"project" | "global" | null>(null)
  const [editContent, setEditContent] = createSignal("")
  const [isSaving, setIsSaving] = createSignal(false)
  const [saveMessage, setSaveMessage] = createSignal<{ type: "success" | "error"; text: string } | null>(null)

  // Load data on mount
  onMount(() => {
    refreshGovernanceRules(props.folder)
    fetchDirectives(props.folder)
  })

  createEffect(() => {
    if (props.folder) {
      refreshGovernanceRules(props.folder)
      fetchDirectives(props.folder)
    }
  })

  // Categorized and filtered rules
  const categorizedRules = createMemo(() => {
    const rules = governanceRules()
    const categories: Record<RuleCategory, GovernanceRule[]> = {
      security: [],
      git: [],
      code: [],
      system: [],
      other: [],
    }

    for (const rule of rules) {
      const category = categorizeRule(rule)
      categories[category].push(rule)
    }

    return categories
  })

  const filteredRules = createMemo(() => {
    let rules = governanceRules()

    // Filter by search
    const query = searchQuery().toLowerCase()
    if (query) {
      rules = rules.filter(r =>
        r.id.toLowerCase().includes(query) ||
        r.pattern.toLowerCase().includes(query) ||
        r.reason.toLowerCase().includes(query)
      )
    }

    // Filter by category
    const category = selectedCategory()
    if (category !== "all") {
      rules = rules.filter(r => categorizeRule(r) === category)
    }

    // Filter by source
    const source = selectedSource()
    if (source !== "all") {
      rules = rules.filter(r => r.source === source)
    }

    return rules
  })

  // Group filtered rules by category for display
  const groupedFilteredRules = createMemo(() => {
    const rules = filteredRules()
    const groups: Record<RuleCategory, GovernanceRule[]> = {
      security: [],
      git: [],
      code: [],
      system: [],
      other: [],
    }

    for (const rule of rules) {
      const category = categorizeRule(rule)
      groups[category].push(rule)
    }

    return groups
  })

  const handleRuleToggle = async (rule: GovernanceRule) => {
    if (!props.folder || !rule.overridable) return

    setTogglingRules(prev => new Set(prev).add(rule.id))
    try {
      if (rule.action === "deny") {
        await setRuleOverride(rule.id, "allow", "Enabled via UI toggle", props.folder)
      } else {
        await removeRuleOverride(rule.id, props.folder)
      }
    } finally {
      setTogglingRules(prev => {
        const next = new Set(prev)
        next.delete(rule.id)
        return next
      })
    }
  }

  const startEditDirective = (type: "project" | "global") => {
    const content = type === "project"
      ? projectDirectives()?.content || ""
      : globalDirectives()?.content || ""
    setEditContent(content)
    setEditingDirective(type)
    setSaveMessage(null)
  }

  const cancelEditDirective = () => {
    setEditingDirective(null)
    setEditContent("")
    setSaveMessage(null)
  }

  const handleSaveDirective = async () => {
    const type = editingDirective()
    if (!type) return

    setIsSaving(true)
    setSaveMessage(null)

    try {
      const result = await saveDirectives(props.folder || "", type, editContent())
      if (result.success) {
        setSaveMessage({ type: "success", text: "Saved successfully" })
        await fetchDirectives(props.folder)
        setTimeout(() => {
          setEditingDirective(null)
          setSaveMessage(null)
        }, 1500)
      } else {
        setSaveMessage({ type: "error", text: result.error || "Failed to save" })
      }
    } catch (error) {
      setSaveMessage({ type: "error", text: "Failed to save" })
    } finally {
      setIsSaving(false)
    }
  }

  const totalRules = () => governanceRules().length
  const activeBlocks = () => governanceRules().filter(r => r.action === "deny").length
  const overrideCount = () => defaultRules().filter(r => r.action === "allow").length

  // Extract summary from directives
  const getDirectiveSummary = (content: string | undefined, maxLines = 3): string[] => {
    if (!content) return []
    const lines = content.split("\n")
      .filter(l => l.trim() && !l.startsWith("#"))
      .slice(0, maxLines)
    return lines
  }

  return (
    <div class="governance-unified">
      {/* Header */}
      <div class="governance-header">
        <div class="governance-header-title">
          <Shield class="w-6 h-6 text-accent" />
          <div>
            <h2>Governance</h2>
            <p class="text-muted text-sm">Rules and directives that control AI behavior</p>
          </div>
        </div>

        <Show when={!isGovernanceLoading() && !governanceError()}>
          <div class="governance-stats">
            <div class="governance-stat">
              <span class="governance-stat-value">{totalRules()}</span>
              <span class="governance-stat-label">Rules</span>
            </div>
            <div class="governance-stat">
              <span class="governance-stat-value text-red-400">{activeBlocks()}</span>
              <span class="governance-stat-label">Blocking</span>
            </div>
            <div class="governance-stat">
              <span class="governance-stat-value text-green-400">{overrideCount()}</span>
              <span class="governance-stat-label">Overrides</span>
            </div>
            <Show when={isAuditMode()}>
              <span class="governance-audit-badge">
                <Eye class="w-3 h-3" /> Audit Mode
              </span>
            </Show>
          </div>
        </Show>
      </div>

      <Show when={!isEraInstalled()}>
        <div class="governance-notice governance-notice-warning">
          <AlertTriangle class="w-5 h-5" />
          <div>
            <strong>Era Code Not Installed</strong>
            <p>Install Era Code to enable governance rules and enforcement.</p>
          </div>
        </div>
      </Show>

      <Show when={isEraInstalled()}>
        {/* Hierarchy Section */}
        <div class="governance-hierarchy">
          <h3 class="governance-section-title">Hierarchy</h3>
          <p class="governance-section-desc">Rules are applied in order: Constitution → Global → Project</p>

          <div class="governance-hierarchy-cards">
            {/* Constitution Card */}
            <div class="governance-hierarchy-card governance-hierarchy-constitution">
              <div class="governance-hierarchy-card-header">
                <div class="governance-hierarchy-card-icon">
                  <Lock class="w-5 h-5" />
                </div>
                <div class="governance-hierarchy-card-info">
                  <h4>Constitution</h4>
                  <span class="governance-hierarchy-badge governance-hierarchy-badge-immutable">Immutable</span>
                </div>
                <button
                  type="button"
                  class="governance-hierarchy-expand"
                  onClick={() => setExpandedSection(s => s === "constitution" ? null : "constitution")}
                >
                  {expandedSection() === "constitution" ? <ChevronDown class="w-4 h-4" /> : <ChevronRight class="w-4 h-4" />}
                </button>
              </div>
              <p class="governance-hierarchy-card-desc">
                Foundational safety rules that cannot be overridden
              </p>
              <Show when={expandedSection() === "constitution"}>
                <div class="governance-hierarchy-content">
                  <Show when={constitution()?.exists && constitution()?.content}>
                    <pre class="governance-directive-preview">{constitution()!.content}</pre>
                  </Show>
                  <Show when={!constitution()?.exists}>
                    <p class="text-muted text-sm">No constitution file found</p>
                  </Show>
                </div>
              </Show>
            </div>

            {/* Global Directives Card */}
            <div class="governance-hierarchy-card governance-hierarchy-global">
              <div class="governance-hierarchy-card-header">
                <div class="governance-hierarchy-card-icon">
                  <Globe class="w-5 h-5" />
                </div>
                <div class="governance-hierarchy-card-info">
                  <h4>Global Directives</h4>
                  <span class="governance-hierarchy-badge governance-hierarchy-badge-user">User</span>
                </div>
                <div class="governance-hierarchy-actions">
                  <button
                    type="button"
                    class="governance-action-btn"
                    onClick={() => startEditDirective("global")}
                    title="Edit global directives"
                  >
                    <Edit3 class="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    class="governance-hierarchy-expand"
                    onClick={() => setExpandedSection(s => s === "global" ? null : "global")}
                  >
                    {expandedSection() === "global" ? <ChevronDown class="w-4 h-4" /> : <ChevronRight class="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <p class="governance-hierarchy-card-desc">
                Your personal preferences across all projects
              </p>
              <Show when={globalDirectives()?.exists}>
                <div class="governance-directive-summary">
                  <For each={getDirectiveSummary(globalDirectives()?.content)}>
                    {(line) => <span class="governance-directive-line">{line}</span>}
                  </For>
                </div>
              </Show>
              <Show when={!globalDirectives()?.exists}>
                <button
                  type="button"
                  class="governance-create-btn"
                  onClick={() => startEditDirective("global")}
                >
                  <Plus class="w-4 h-4" /> Create Global Directives
                </button>
              </Show>
              <Show when={expandedSection() === "global" && globalDirectives()?.content}>
                <div class="governance-hierarchy-content">
                  <pre class="governance-directive-preview">{globalDirectives()!.content}</pre>
                </div>
              </Show>
            </div>

            {/* Project Directives Card */}
            <div class="governance-hierarchy-card governance-hierarchy-project">
              <div class="governance-hierarchy-card-header">
                <div class="governance-hierarchy-card-icon">
                  <Folder class="w-5 h-5" />
                </div>
                <div class="governance-hierarchy-card-info">
                  <h4>Project Directives</h4>
                  <span class="governance-hierarchy-badge governance-hierarchy-badge-project">Project</span>
                </div>
                <div class="governance-hierarchy-actions">
                  <Show when={props.folder}>
                    <button
                      type="button"
                      class="governance-action-btn"
                      onClick={() => startEditDirective("project")}
                      title="Edit project directives"
                    >
                      <Edit3 class="w-4 h-4" />
                    </button>
                  </Show>
                  <button
                    type="button"
                    class="governance-hierarchy-expand"
                    onClick={() => setExpandedSection(s => s === "project" ? null : "project")}
                  >
                    {expandedSection() === "project" ? <ChevronDown class="w-4 h-4" /> : <ChevronRight class="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <p class="governance-hierarchy-card-desc">
                Conventions specific to this codebase
              </p>
              <Show when={!props.folder}>
                <p class="text-muted text-sm italic">Open a project to manage project directives</p>
              </Show>
              <Show when={props.folder && projectDirectives()?.exists}>
                <div class="governance-directive-summary">
                  <For each={getDirectiveSummary(projectDirectives()?.content)}>
                    {(line) => <span class="governance-directive-line">{line}</span>}
                  </For>
                </div>
              </Show>
              <Show when={props.folder && !projectDirectives()?.exists}>
                <button
                  type="button"
                  class="governance-create-btn"
                  onClick={() => startEditDirective("project")}
                >
                  <Plus class="w-4 h-4" /> Create Project Directives
                </button>
              </Show>
              <Show when={expandedSection() === "project" && projectDirectives()?.content}>
                <div class="governance-hierarchy-content">
                  <pre class="governance-directive-preview">{projectDirectives()!.content}</pre>
                </div>
              </Show>
            </div>
          </div>
        </div>

        {/* Rules Section */}
        <div class="governance-rules-section">
          <div class="governance-rules-header">
            <h3 class="governance-section-title">Active Rules</h3>
            <div class="governance-rules-filters">
              {/* Search */}
              <div class="governance-search">
                <Search class="w-4 h-4 text-muted" />
                <input
                  type="text"
                  placeholder="Search rules..."
                  value={searchQuery()}
                  onInput={(e) => setSearchQuery(e.currentTarget.value)}
                />
                <Show when={searchQuery()}>
                  <button type="button" onClick={() => setSearchQuery("")}>
                    <X class="w-3 h-3" />
                  </button>
                </Show>
              </div>

              {/* Category Filter */}
              <select
                class="governance-filter-select"
                value={selectedCategory()}
                onChange={(e) => setSelectedCategory(e.currentTarget.value as RuleCategory | "all")}
              >
                <option value="all">All Categories</option>
                <option value="security">Security</option>
                <option value="git">Git</option>
                <option value="code">Code</option>
                <option value="system">System</option>
                <option value="other">Other</option>
              </select>

              {/* Source Filter */}
              <select
                class="governance-filter-select"
                value={selectedSource()}
                onChange={(e) => setSelectedSource(e.currentTarget.value as "all" | "hardcoded" | "default" | "project")}
              >
                <option value="all">All Sources</option>
                <option value="hardcoded">Hardcoded</option>
                <option value="default">Default</option>
                <option value="project">Project</option>
              </select>
            </div>
          </div>

          <Show when={isGovernanceLoading()}>
            <div class="governance-loading">
              <RefreshCw class="w-5 h-5 animate-spin" />
              <span>Loading rules...</span>
            </div>
          </Show>

          <Show when={governanceError()}>
            <div class="governance-notice governance-notice-error">
              <AlertTriangle class="w-5 h-5" />
              <span>{governanceError()}</span>
            </div>
          </Show>

          <Show when={!isGovernanceLoading() && !governanceError()}>
            <Show when={filteredRules().length === 0}>
              <div class="governance-empty">
                <Shield class="w-8 h-8 text-muted" />
                <p>No rules match your filters</p>
              </div>
            </Show>

            <div class="governance-rules-list">
              <For each={Object.entries(groupedFilteredRules()).filter(([_, rules]) => rules.length > 0)}>
                {([category, rules]) => {
                  const config = categoryConfig[category as RuleCategory]
                  const CategoryIcon = config.icon
                  return (
                    <div class="governance-rule-group">
                      <div class="governance-rule-group-header">
                        <CategoryIcon class={`w-4 h-4 ${config.color}`} />
                        <span>{config.label}</span>
                        <span class="governance-rule-count">{rules.length}</span>
                      </div>
                      <div class="governance-rule-items">
                        <For each={rules}>
                          {(rule) => {
                            const isToggling = () => togglingRules().has(rule.id)
                            const isBlocking = () => rule.action === "deny"

                            return (
                              <div class={`governance-rule-item ${!isBlocking() ? "governance-rule-allowed" : ""}`}>
                                <div class="governance-rule-main">
                                  <div class="governance-rule-info">
                                    <div class="governance-rule-name">
                                      <span class="font-mono text-xs">{rule.id}</span>
                                      <Show when={rule.source === "hardcoded"}>
                                        <Lock class="w-3 h-3 text-red-400" title="Cannot be overridden" />
                                      </Show>
                                    </div>
                                    <p class="governance-rule-reason">{rule.reason}</p>
                                    <code class="governance-rule-pattern">{rule.pattern}</code>
                                  </div>
                                  <div class="governance-rule-controls">
                                    <span class={`governance-rule-status ${isBlocking() ? "governance-rule-status-deny" : "governance-rule-status-allow"}`}>
                                      {isBlocking() ? "Block" : "Allow"}
                                    </span>
                                    <Show when={rule.overridable && props.folder}>
                                      <button
                                        type="button"
                                        class={`governance-rule-toggle ${!isBlocking() ? "governance-rule-toggle-on" : ""}`}
                                        onClick={() => handleRuleToggle(rule)}
                                        disabled={isToggling()}
                                        title={isBlocking() ? "Click to allow" : "Click to block"}
                                      >
                                        <Show when={isToggling()}>
                                          <RefreshCw class="w-5 h-5 animate-spin" />
                                        </Show>
                                        <Show when={!isToggling()}>
                                          {isBlocking() ? <ToggleLeft class="w-5 h-5" /> : <ToggleRight class="w-5 h-5" />}
                                        </Show>
                                      </button>
                                    </Show>
                                  </div>
                                </div>
                              </div>
                            )
                          }}
                        </For>
                      </div>
                    </div>
                  )
                }}
              </For>
            </div>
          </Show>
        </div>

        {/* Edit Directive Modal */}
        <Show when={editingDirective()}>
          <div class="governance-modal-overlay" onClick={cancelEditDirective}>
            <div class="governance-modal" onClick={(e) => e.stopPropagation()}>
              <div class="governance-modal-header">
                <h3>
                  {editingDirective() === "project" ? "Edit Project Directives" : "Edit Global Directives"}
                </h3>
                <button type="button" onClick={cancelEditDirective}>
                  <X class="w-5 h-5" />
                </button>
              </div>
              <div class="governance-modal-body">
                <textarea
                  class="governance-editor"
                  value={editContent()}
                  onInput={(e) => setEditContent(e.currentTarget.value)}
                  placeholder={`# ${editingDirective() === "project" ? "Project" : "Global"} Directives\n\nAdd your guidelines here...`}
                />
              </div>
              <div class="governance-modal-footer">
                <Show when={saveMessage()}>
                  <span class={`governance-save-message ${saveMessage()?.type === "error" ? "text-red-400" : "text-green-400"}`}>
                    {saveMessage()?.text}
                  </span>
                </Show>
                <button type="button" class="governance-btn governance-btn-secondary" onClick={cancelEditDirective}>
                  Cancel
                </button>
                <button
                  type="button"
                  class="governance-btn governance-btn-primary"
                  onClick={handleSaveDirective}
                  disabled={isSaving()}
                >
                  {isSaving() ? <RefreshCw class="w-4 h-4 animate-spin" /> : "Save"}
                </button>
              </div>
            </div>
          </div>
        </Show>
      </Show>
    </div>
  )
}

export default UnifiedGovernancePanel
