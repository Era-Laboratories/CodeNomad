import { Component, For, Show, createSignal, createMemo, onMount } from "solid-js"
import { Search, Brain, Wrench, Eye, Zap, Star, Filter, ChevronRight, Settings } from "lucide-solid"
import {
  fetchModelsData,
  getAllProviders,
  getProviderModels,
  getProviderLogoUrl,
  formatModelCost,
  formatModelLimit,
  type ModelsDevProvider,
  type ModelsDevModel,
} from "../lib/models-api"

interface ModelCatalogPanelProps {
  connectedProviderIds: Set<string>
  onSelectModel?: (providerId: string, modelId: string) => void
  onConfigureProvider?: (providerId: string) => void
}

const ModelCatalogPanel: Component<ModelCatalogPanelProps> = (props) => {
  const [selectedProviderId, setSelectedProviderId] = createSignal<string | null>(null)
  const [searchQuery, setSearchQuery] = createSignal("")
  const [showConnectedOnly, setShowConnectedOnly] = createSignal(false)

  onMount(() => {
    fetchModelsData()
  })

  // Get all providers, filtered by search query and optionally to connected only
  const providers = createMemo(() => {
    let all = getAllProviders()

    // Filter by search query (matches provider name or any model name)
    const query = searchQuery().toLowerCase().trim()
    if (query) {
      all = all.filter(p => {
        // Match provider name
        if (p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query)) {
          return true
        }
        // Match any model in this provider
        const models = Object.values(p.models || {})
        return models.some(m =>
          m.name.toLowerCase().includes(query) ||
          m.id.toLowerCase().includes(query)
        )
      })
    }

    // Filter to connected only if enabled
    if (showConnectedOnly()) {
      all = all.filter(p => props.connectedProviderIds.has(p.id))
    }

    return all
  })

  // Auto-select first provider if none selected
  createMemo(() => {
    if (!selectedProviderId() && providers().length > 0) {
      setSelectedProviderId(providers()[0].id)
    }
  })

  // Get models for selected provider, filtered by search
  const models = createMemo(() => {
    const providerId = selectedProviderId()
    if (!providerId) return []

    const allModels = getProviderModels(providerId)
    const query = searchQuery().toLowerCase().trim()

    if (!query) return allModels

    return allModels.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.id.toLowerCase().includes(query) ||
      m.family?.toLowerCase().includes(query)
    )
  })

  const selectedProvider = createMemo(() => {
    const id = selectedProviderId()
    return providers().find(p => p.id === id)
  })

  const getModelCount = (provider: ModelsDevProvider) => {
    return Object.keys(provider.models || {}).length
  }

  const isProviderConnected = (providerId: string) => {
    return props.connectedProviderIds.has(providerId)
  }

  // Format price with color coding
  const getPriceClass = (cost: { input: number; output: number } | undefined) => {
    if (!cost) return "model-price-unknown"
    const avgCost = (cost.input + cost.output) / 2
    if (avgCost === 0) return "model-price-free"
    if (avgCost < 1) return "model-price-cheap"
    if (avgCost < 10) return "model-price-moderate"
    return "model-price-expensive"
  }

  const connectedCount = createMemo(() => {
    return getAllProviders().filter(p => props.connectedProviderIds.has(p.id)).length
  })

  return (
    <div class="model-catalog">
      {/* Header with search and filter */}
      <div class="model-catalog-header">
        <div class="model-catalog-search">
          <Search class="model-catalog-search-icon" />
          <input
            type="text"
            class="model-catalog-search-input"
            placeholder="Search providers or models..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
          />
        </div>

        <button
          type="button"
          class={`model-catalog-filter-toggle ${showConnectedOnly() ? 'active' : ''}`}
          onClick={() => setShowConnectedOnly(!showConnectedOnly())}
          title={showConnectedOnly() ? "Showing connected providers only" : "Showing all providers"}
        >
          <Filter class="w-3.5 h-3.5" />
          <span>My Providers</span>
          <Show when={showConnectedOnly()}>
            <span class="model-catalog-filter-badge">{connectedCount()}</span>
          </Show>
        </button>
      </div>

      {/* Main content: sidebar + list */}
      <div class="model-catalog-content">
        {/* Provider sidebar */}
        <div class="model-catalog-sidebar">
          <div class="model-catalog-sidebar-header">
            <span class="text-xs font-medium text-muted uppercase tracking-wide">Providers</span>
            <span class="text-xs text-secondary">{providers().length}</span>
          </div>

          <div class="model-catalog-provider-list">
            <For each={providers()}>
              {(provider) => {
                const isSelected = () => selectedProviderId() === provider.id
                const isConnected = () => isProviderConnected(provider.id)

                return (
                  <button
                    type="button"
                    class={`model-catalog-provider-item ${isSelected() ? 'selected' : ''} ${isConnected() ? 'connected' : ''}`}
                    onClick={() => setSelectedProviderId(provider.id)}
                  >
                    <div class="model-catalog-provider-logo">
                      <img
                        src={getProviderLogoUrl(provider.id)}
                        alt=""
                        class="model-catalog-logo-img"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    </div>
                    <div class="model-catalog-provider-info">
                      <span class="model-catalog-provider-name">{provider.name}</span>
                      <span class="model-catalog-provider-count">{getModelCount(provider)} models</span>
                    </div>
                    <Show when={isConnected()}>
                      <span class="model-catalog-provider-connected" title="Connected">
                        <Zap class="w-3 h-3" />
                      </span>
                    </Show>
                    <Show when={isSelected()}>
                      <ChevronRight class="w-3.5 h-3.5 text-accent-primary" />
                    </Show>
                  </button>
                )
              }}
            </For>
          </div>
        </div>

        {/* Model list */}
        <div class="model-catalog-models">
          <Show when={selectedProvider()}>
            <div class="model-catalog-models-header">
              <div class="model-catalog-models-title">
                <img
                  src={getProviderLogoUrl(selectedProvider()!.id)}
                  alt=""
                  class="model-catalog-models-logo"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
                <span>{selectedProvider()!.name}</span>
              </div>
              <div class="model-catalog-models-actions">
                <span class="text-xs text-secondary">{models().length} models</span>
                <Show
                  when={isProviderConnected(selectedProvider()!.id)}
                  fallback={
                    <button
                      type="button"
                      class="model-catalog-configure-badge"
                      onClick={() => props.onConfigureProvider?.(selectedProvider()!.id)}
                      title="Configure this provider"
                    >
                      <Settings class="w-3 h-3" /> Configure
                    </button>
                  }
                >
                  <button
                    type="button"
                    class="model-catalog-connected-badge clickable"
                    onClick={() => props.onConfigureProvider?.(selectedProvider()!.id)}
                    title="Edit provider configuration"
                  >
                    <Zap class="w-3 h-3" /> Connected
                  </button>
                </Show>
              </div>
            </div>

            {/* Column headers */}
            <div class="model-catalog-table-header">
              <div class="model-catalog-col-name">Model</div>
              <div class="model-catalog-col-context">Context</div>
              <div class="model-catalog-col-output">Output</div>
              <div class="model-catalog-col-price">Price (per 1M)</div>
              <div class="model-catalog-col-caps">Capabilities</div>
            </div>

            {/* Model rows */}
            <div class="model-catalog-table-body">
              <For each={models()}>
                {(model) => (
                  <button
                    type="button"
                    class="model-catalog-model-row"
                    onClick={() => props.onSelectModel?.(selectedProviderId()!, model.id)}
                  >
                    <div class="model-catalog-col-name">
                      <div class="model-catalog-model-name">{model.name}</div>
                      <div class="model-catalog-model-id">{model.id}</div>
                    </div>

                    <div class="model-catalog-col-context">
                      <Show when={model.limit?.context} fallback="—">
                        {formatTokenCount(model.limit!.context)}
                      </Show>
                    </div>

                    <div class="model-catalog-col-output">
                      <Show when={model.limit?.output} fallback="—">
                        {formatTokenCount(model.limit!.output)}
                      </Show>
                    </div>

                    <div class={`model-catalog-col-price ${getPriceClass(model.cost)}`}>
                      <Show when={model.cost} fallback="—">
                        <span class="model-price-input">${model.cost!.input}</span>
                        <span class="model-price-sep">/</span>
                        <span class="model-price-output">${model.cost!.output}</span>
                      </Show>
                    </div>

                    <div class="model-catalog-col-caps">
                      <Show when={model.reasoning}>
                        <span class="model-cap-badge model-cap-reasoning" title="Reasoning" aria-label="Reasoning">
                          <Brain class="w-3 h-3" aria-hidden="true" />
                        </span>
                      </Show>
                      <Show when={model.tool_call}>
                        <span class="model-cap-badge model-cap-tools" title="Tools" aria-label="Tools">
                          <Wrench class="w-3 h-3" aria-hidden="true" />
                        </span>
                      </Show>
                      <Show when={model.attachment}>
                        <span class="model-cap-badge model-cap-vision" title="Vision" aria-label="Vision">
                          <Eye class="w-3 h-3" aria-hidden="true" />
                        </span>
                      </Show>
                    </div>
                  </button>
                )}
              </For>

              <Show when={models().length === 0}>
                <div class="model-catalog-empty">
                  <Show when={searchQuery()}>
                    No models match "{searchQuery()}"
                  </Show>
                  <Show when={!searchQuery()}>
                    No models available
                  </Show>
                </div>
              </Show>
            </div>
          </Show>

          <Show when={!selectedProvider()}>
            <div class="model-catalog-empty">
              Select a provider to view models
            </div>
          </Show>
        </div>
      </div>

      {/* Legend */}
      <div class="model-catalog-legend">
        <span class="model-catalog-legend-item">
          <Brain class="w-3 h-3" /> Reasoning
        </span>
        <span class="model-catalog-legend-item">
          <Wrench class="w-3 h-3" /> Tools
        </span>
        <span class="model-catalog-legend-item">
          <Eye class="w-3 h-3" /> Vision
        </span>
        <span class="model-catalog-legend-sep">|</span>
        <span class="model-catalog-legend-item model-price-free">Free</span>
        <span class="model-catalog-legend-item model-price-cheap">&lt;$1</span>
        <span class="model-catalog-legend-item model-price-moderate">$1-10</span>
        <span class="model-catalog-legend-item model-price-expensive">&gt;$10</span>
      </div>
    </div>
  )
}

// Helper to format token counts
function formatTokenCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(0)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return n.toString()
}

export default ModelCatalogPanel
