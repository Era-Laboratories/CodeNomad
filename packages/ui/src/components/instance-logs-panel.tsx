import { Component, For, createSignal, createEffect, Show, createMemo } from "solid-js"
import { getInstanceLogs, isInstanceLogStreaming, setInstanceLogStreaming } from "../stores/instances"
import { ChevronDown } from "lucide-solid"

interface InstanceLogsPanelProps {
  instanceId: string
}

const InstanceLogsPanel: Component<InstanceLogsPanelProps> = (props) => {
  let scrollRef: HTMLDivElement | undefined
  const [autoScroll, setAutoScroll] = createSignal(true)

  const logs = createMemo(() => getInstanceLogs(props.instanceId))
  const streamingEnabled = createMemo(() => isInstanceLogStreaming(props.instanceId))

  const handleEnableLogs = () => setInstanceLogStreaming(props.instanceId, true)
  const handleDisableLogs = () => setInstanceLogStreaming(props.instanceId, false)

  createEffect(() => {
    if (autoScroll() && scrollRef && logs().length > 0) {
      scrollRef.scrollTop = scrollRef.scrollHeight
    }
  })

  const handleScroll = () => {
    if (!scrollRef) return
    const isAtBottom = scrollRef.scrollHeight - scrollRef.scrollTop <= scrollRef.clientHeight + 50
    setAutoScroll(isAtBottom)
  }

  const scrollToBottom = () => {
    if (scrollRef) {
      scrollRef.scrollTop = scrollRef.scrollHeight
      setAutoScroll(true)
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return "log-level-error"
      case "warn":
        return "log-level-warn"
      case "debug":
        return "log-level-debug"
      default:
        return "log-level-default"
    }
  }

  return (
    <div class="instance-logs-panel">
      <div class="instance-logs-header">
        <Show
          when={streamingEnabled()}
          fallback={
            <button type="button" class="button-tertiary" onClick={handleEnableLogs}>
              Enable log streaming
            </button>
          }
        >
          <button type="button" class="button-tertiary" onClick={handleDisableLogs}>
            Disable log streaming
          </button>
        </Show>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} class="instance-logs-content">
        <Show
          when={streamingEnabled()}
          fallback={
            <div class="instance-logs-paused">
              <p class="text-sm">Log streaming is paused</p>
              <p class="text-xs text-muted">Enable streaming to view server activity</p>
              <button type="button" class="button-primary" onClick={handleEnableLogs}>
                Enable streaming
              </button>
            </div>
          }
        >
          <Show
            when={logs().length > 0}
            fallback={<div class="instance-logs-empty">Waiting for logs...</div>}
          >
            <For each={logs()}>
              {(entry) => (
                <div class="log-entry">
                  <span class="log-timestamp">{formatTime(entry.timestamp)}</span>
                  <span class={`log-message ${getLevelColor(entry.level)}`}>{entry.message}</span>
                </div>
              )}
            </For>
          </Show>
        </Show>
      </div>

      <Show when={!autoScroll() && streamingEnabled()}>
        <button onClick={scrollToBottom} class="instance-logs-scroll-button">
          <ChevronDown class="w-4 h-4" />
          Scroll to bottom
        </button>
      </Show>
    </div>
  )
}

export default InstanceLogsPanel
