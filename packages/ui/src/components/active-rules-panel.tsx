import { Component, createSignal, createMemo, createEffect, onMount, For, Show } from "solid-js"
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  X,
  RefreshCw,
  AlertTriangle,
  Lock,
  ToggleLeft,
  ToggleRight,
  GitBranch,
  Code2,
  Terminal,
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
import { isEraInstalled } from "../stores/era-status"

interface ActiveRulesPanelProps {
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

const ActiveRulesPanel: Component<ActiveRulesPanelProps> = (props) => {
  const [searchQuery, setSearchQuery] = createSignal("")
  const [selectedCategory, setSelectedCategory] = createSignal<RuleCategory | "all">("all")
  const [selectedSource, setSelectedSource] = createSignal<"all" | "hardcoded" | "default" | "project">("all")
  const [togglingRules, setTogglingRules] = createSignal<Set<string>>(new Set())

  onMount(() => {
    refreshGovernanceRules(props.folder)
  })

  createEffect(() => {
    if (props.folder) {
      refreshGovernanceRules(props.folder)
    }
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

  const totalRules = () => governanceRules().length
  const activeBlocks = () => governanceRules().filter(r => r.action === "deny").length
  const overrideCount = () => defaultRules().filter(r => r.action === "allow").length

  return (
    <div class="active-rules-panel">
      {/* Header */}
      <div class="directives-panel-header">
        <div>
          <h2 class="flex items-center gap-2">
            <ShieldCheck class="w-5 h-5 text-accent" />
            Active Rules
          </h2>
          <p>Runtime rules that control what actions the AI can perform</p>
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
            <p>Install Era Code to view and manage governance rules.</p>
          </div>
        </div>
      </Show>

      <Show when={isEraInstalled()}>
        {/* Filters */}
        <div class="governance-rules-filters mb-4">
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
                                      <span title="Cannot be overridden">
                                        <Lock class="w-3 h-3 text-red-400" />
                                      </span>
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
      </Show>
    </div>
  )
}

export default ActiveRulesPanel
