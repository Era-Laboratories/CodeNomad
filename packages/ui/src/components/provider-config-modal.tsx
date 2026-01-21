import { Component, For, Show, createSignal, createMemo, createEffect } from "solid-js"
import { Dialog } from "@kobalte/core/dialog"
import { Search, Key, RefreshCw, Power } from "lucide-solid"
import { useConfig } from "../stores/preferences"
import { instances, stopInstance, createInstance } from "../stores/instances"
import { fetchProviders } from "../stores/sessions"
import { getProviderLogoUrl } from "../lib/models-api"

type ProviderCatalogEntry = {
  id: string
  name: string
  env: string[]
}

type ProviderCatalog = {
  all: ProviderCatalogEntry[]
  connected: string[]
  default: Record<string, string>
}

interface ProviderConfigModalProps {
  open: boolean
  onClose: () => void
  providerId?: string | null
}

const ProviderConfigModal: Component<ProviderConfigModalProps> = (props) => {
  const { preferences, updateEnvironmentVariables } = useConfig()

  const instanceOptions = createMemo(() =>
    Array.from(instances().values()).filter((i) => i.status === "ready" && i.client)
  )
  const [referenceInstanceId, setReferenceInstanceId] = createSignal<string | null>(null)
  const [catalog, setCatalog] = createSignal<ProviderCatalog | null>(null)
  const [loadingCatalog, setLoadingCatalog] = createSignal(false)
  const [draftKeys, setDraftKeys] = createSignal<Record<string, string>>({})
  const [saving, setSaving] = createSignal(false)

  const envVars = createMemo(() => preferences().environmentVariables ?? {})

  // Auto-select first instance
  createEffect(() => {
    if (!referenceInstanceId() && instanceOptions().length > 0) {
      setReferenceInstanceId(instanceOptions()[0].id)
    }
  })

  // Load catalog when instance changes
  const loadCatalog = async (instanceId: string) => {
    const instance = instances().get(instanceId)
    if (!instance?.client) return

    setLoadingCatalog(true)
    try {
      await fetchProviders(instanceId).catch(() => {})
      const response = await instance.client.provider.list()
      if (response.data) {
        setCatalog(response.data as unknown as ProviderCatalog)
      }
    } catch (error) {
      console.error("Failed to load provider catalog", { instanceId, error })
      setCatalog(null)
    } finally {
      setLoadingCatalog(false)
    }
  }

  createEffect(() => {
    const id = referenceInstanceId()
    if (!id) return
    void loadCatalog(id)
  })

  // Initialize draft keys when modal opens with a provider
  createEffect(() => {
    if (props.open && props.providerId) {
      const entry = providerById().get(props.providerId)
      if (entry) {
        const nextDraft: Record<string, string> = {}
        for (const key of entry.env ?? []) {
          nextDraft[key] = envVars()[key] ?? ""
        }
        setDraftKeys(nextDraft)
      }
    }
  })

  const providerById = createMemo(() => {
    const map = new Map<string, ProviderCatalogEntry>()
    for (const entry of catalog()?.all ?? []) {
      if (entry?.id) map.set(entry.id, entry)
    }
    return map
  })

  const selectedProvider = createMemo(() => {
    const id = props.providerId
    if (!id) return null
    return providerById().get(id) ?? null
  })

  const isConfigured = createMemo(() => {
    const entry = selectedProvider()
    if (!entry?.env?.length) return true
    const vars = envVars()
    return entry.env.every((key) => Boolean(vars[key]?.trim()))
  })

  const saveProviderKeys = async () => {
    const entry = selectedProvider()
    if (!entry) return

    setSaving(true)
    try {
      const next = { ...envVars() }
      for (const key of entry.env ?? []) {
        const value = (draftKeys()[key] ?? "").trim()
        if (value) next[key] = value
        else delete next[key]
      }

      updateEnvironmentVariables(next)

      // Close after short delay to show success
      setTimeout(() => {
        props.onClose()
        setSaving(false)
      }, 300)
    } catch (error) {
      console.error("Failed to save provider keys", { error })
      setSaving(false)
    }
  }

  const restartInstance = async () => {
    const id = referenceInstanceId()
    if (!id) return
    const instance = instances().get(id)
    if (!instance) return

    const folder = instance.folder
    await stopInstance(id)
    await createInstance(folder)
  }

  const handleClose = () => {
    setDraftKeys({})
    props.onClose()
  }

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay class="modal-overlay" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content class="modal-surface w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <header class="px-6 py-4 border-b" style={{ "border-color": "var(--border-base)" }}>
              <Dialog.Title class="text-lg font-semibold text-primary flex items-center gap-3">
                <Show when={selectedProvider()}>
                  <img
                    src={getProviderLogoUrl(props.providerId!)}
                    alt=""
                    class="w-6 h-6 object-contain rounded"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                </Show>
                Configure {selectedProvider()?.name ?? "Provider"}
              </Dialog.Title>
              <div class="text-xs text-secondary mt-1">
                Enter API keys to enable this provider
              </div>
            </header>

            <div class="p-6 flex flex-col gap-5 overflow-y-auto">
              <Show when={!referenceInstanceId()}>
                <div class="p-4 rounded-lg bg-surface-secondary border border-base">
                  <p class="text-sm text-secondary">
                    Start a coding session first to configure providers.
                  </p>
                </div>
              </Show>

              <Show when={referenceInstanceId() && selectedProvider()}>
                {(entry) => (
                  <>
                    <Show
                      when={(entry().env?.length ?? 0) > 0}
                      fallback={
                        <div class="p-4 rounded-lg bg-surface-secondary border border-base">
                          <p class="text-sm text-secondary">
                            No API keys required for this provider.
                          </p>
                        </div>
                      }
                    >
                      <div class="space-y-4">
                        <For each={entry().env}>
                          {(key) => (
                            <div class="flex flex-col gap-1.5">
                              <label class="text-xs font-medium text-secondary">{key}</label>
                              <input
                                type="password"
                                class="modal-input"
                                value={draftKeys()[key] ?? ""}
                                placeholder={envVars()[key] ? "••••••••" : "Enter API key"}
                                onInput={(e) => setDraftKeys((prev) => ({
                                  ...prev,
                                  [key]: e.currentTarget.value
                                }))}
                              />
                            </div>
                          )}
                        </For>
                      </div>
                    </Show>

                    <div class="p-3 rounded-lg bg-surface-secondary border border-base">
                      <p class="text-xs text-secondary">
                        After saving, restart your session to load the provider's models.
                      </p>
                    </div>
                  </>
                )}
              </Show>
            </div>

            <div class="px-6 py-4 border-t flex items-center justify-between gap-3" style={{ "border-color": "var(--border-base)" }}>
              <Show when={referenceInstanceId()}>
                <button
                  type="button"
                  class="modal-button modal-button--secondary"
                  onClick={() => void restartInstance()}
                  title="Restart session to apply changes"
                >
                  <Power class="w-3.5 h-3.5" />
                  Restart Session
                </button>
              </Show>
              <Show when={!referenceInstanceId()}>
                <div />
              </Show>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="modal-button modal-button--secondary"
                  onClick={handleClose}
                >
                  Cancel
                </button>
                <Show when={selectedProvider()?.env?.length}>
                  <button
                    type="button"
                    class="modal-button modal-button--primary"
                    onClick={() => void saveProviderKeys()}
                    disabled={saving()}
                  >
                    <Key class="w-3.5 h-3.5" />
                    {saving() ? "Saving..." : "Save Keys"}
                  </button>
                </Show>
              </div>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  )
}

export default ProviderConfigModal
