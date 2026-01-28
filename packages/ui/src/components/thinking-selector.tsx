import { createMemo, Show } from "solid-js"
import { Select } from "@kobalte/core/select"
import { ChevronDown, Brain, Check } from "lucide-solid"
import {
  setModelThinkingMode,
  getEffectiveThinkingMode,
  getReasoningFlavor,
  type ThinkingMode,
  type ReasoningFlavor,
} from "../stores/preferences"
import { providers } from "../stores/session-state"

interface ThinkingSelectorProps {
  /** Current model identifier (e.g., "providerId/modelId") */
  currentModelId: string
  /** Instance ID used to look up provider data */
  instanceId: string
}

interface ThinkingOption {
  value: ThinkingMode
  label: string
  description: string
}

const EXTENDED_OPTIONS: ThinkingOption[] = [
  { value: "auto", label: "Auto", description: "Use model default behavior" },
  { value: "enabled", label: "Enabled", description: "Always use extended thinking" },
  { value: "disabled", label: "Disabled", description: "Never use extended thinking" },
]

const BUDGET_OPTIONS: ThinkingOption[] = [
  { value: "low", label: "Low", description: "Minimal reasoning effort" },
  { value: "medium", label: "Medium", description: "Balanced reasoning effort" },
  { value: "high", label: "High", description: "Maximum reasoning effort" },
]

const BOOLEAN_OPTIONS: ThinkingOption[] = [
  { value: "on", label: "On", description: "Enable reasoning" },
  { value: "off", label: "Off", description: "Disable reasoning" },
]

function getOptionsForFlavor(flavor: ReasoningFlavor): ThinkingOption[] {
  switch (flavor) {
    case "extended":
      return EXTENDED_OPTIONS
    case "budget":
      return BUDGET_OPTIONS
    case "boolean":
      return BOOLEAN_OPTIONS
  }
}

function getLabelForFlavor(flavor: ReasoningFlavor): string {
  switch (flavor) {
    case "extended":
      return "Extended Thinking"
    case "budget":
      return "Reasoning Effort"
    case "boolean":
      return "Reasoning"
  }
}

function getHintForMode(mode: ThinkingMode, flavor: ReasoningFlavor): string {
  if (flavor === "extended") {
    if (mode === "auto") return "Uses model default (enabled for Opus/Sonnet)"
    if (mode === "enabled") return "Extended thinking is always enabled"
    if (mode === "disabled") return "Extended thinking is disabled"
  }
  if (flavor === "budget") {
    if (mode === "low") return "Minimal reasoning for faster responses"
    if (mode === "medium") return "Balanced reasoning effort"
    if (mode === "high") return "Maximum reasoning for complex tasks"
  }
  if (flavor === "boolean") {
    if (mode === "on") return "Reasoning is enabled"
    if (mode === "off") return "Reasoning is disabled"
  }
  return ""
}

export default function ThinkingSelector(props: ThinkingSelectorProps) {
  const providerId = createMemo(() => {
    const parts = props.currentModelId.split("/")
    return parts.length >= 2 ? parts[0] : ""
  })

  const modelId = createMemo(() => {
    const parts = props.currentModelId.split("/")
    return parts.length >= 2 ? parts[1] : props.currentModelId
  })

  // Look up model from providers store to check reasoning capability
  const currentModel = createMemo(() => {
    const pid = providerId()
    const mid = modelId()
    if (!pid || !mid) return null
    const instanceProviders = providers().get(props.instanceId)
    if (!instanceProviders) return null
    const provider = instanceProviders.find((p) => p.id === pid)
    if (!provider) return null
    return provider.models.find((m) => m.id === mid) ?? null
  })

  const supportsReasoning = createMemo(() => {
    const model = currentModel()
    return model?.reasoning === true
  })

  const flavor = createMemo(() => getReasoningFlavor(providerId()))

  const options = createMemo(() => getOptionsForFlavor(flavor()))

  const currentMode = createMemo(() =>
    getEffectiveThinkingMode(props.currentModelId, providerId()),
  )

  const currentOption = createMemo(() =>
    options().find((opt) => opt.value === currentMode()) ?? options()[0],
  )

  const handleChange = (option: ThinkingOption | null) => {
    if (option) {
      setModelThinkingMode(props.currentModelId, option.value)
    }
  }

  return (
    <Show when={supportsReasoning()}>
      <div class="sidebar-selector thinking-selector">
        <label class="selector-label">
          <Brain class="w-3 h-3 inline-block mr-1 opacity-70" />
          {getLabelForFlavor(flavor())}
        </label>
        <Select<ThinkingOption>
          value={currentOption()}
          onChange={handleChange}
          options={options()}
          optionValue="value"
          optionTextValue="label"
          placeholder="Select thinking mode"
          itemComponent={(itemProps) => (
            <Select.Item
              item={itemProps.item}
              class="thinking-selector-item"
            >
              <Select.ItemLabel class="thinking-selector-item-content">
                <span class="thinking-selector-item-label">{itemProps.item.rawValue.label}</span>
                <span class="thinking-selector-item-description">{itemProps.item.rawValue.description}</span>
              </Select.ItemLabel>
              <Select.ItemIndicator class="thinking-selector-item-indicator">
                <Check class="w-3.5 h-3.5" />
              </Select.ItemIndicator>
            </Select.Item>
          )}
        >
          <Select.Trigger class="selector-trigger thinking-selector-trigger">
            <Select.Value<ThinkingOption>>
              {(state) => (
                <div class="selector-trigger-label">
                  <span class="selector-trigger-primary">{state.selectedOption()?.label ?? "Auto"}</span>
                </div>
              )}
            </Select.Value>
            <Select.Icon class="selector-trigger-icon">
              <ChevronDown class="w-3 h-3" />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content class="selector-popover thinking-selector-popover">
              <Select.Listbox class="thinking-selector-listbox" />
            </Select.Content>
          </Select.Portal>
        </Select>
        <p class="thinking-selector-hint">
          {getHintForMode(currentMode(), flavor())}
        </p>
      </div>
    </Show>
  )
}
