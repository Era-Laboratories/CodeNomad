import { Component, Show, Switch, Match, createMemo, createSignal, createEffect } from "solid-js"
import type { Instance } from "../../types/instance"
import type { Session } from "../../types/session"
import type { Command } from "../../lib/commands"
import { activeMobileTab, setActiveMobileTab } from "../../stores/mobile-nav"
import {
  activeParentSessionId,
  activeSessionId as activeSessionMap,
  getSessionFamily,
  setActiveSession,
  setActiveParentSession,
  getParentSessions,
} from "../../stores/sessions"
import { getSessionStatus } from "../../stores/session-status"
import { messageStoreBus } from "../../stores/message-v2/bus"
import { showCommandPalette } from "../../stores/command-palette"
import { getPermissionQueueLength } from "../../stores/instances"
import MobileHeader from "./mobile-header"
import type { MobileHeaderStatus } from "./mobile-header"
import MobileBottomNav from "./mobile-bottom-nav"
import MobileOverflowMenu from "./mobile-overflow-menu"
import MobileSessionList from "./mobile-session-list"
import MobileWorkspacePanel from "./mobile-workspace-panel"
import MobileSettingsView from "./mobile-settings-view"
import MobilePermissionCard from "./mobile-permission-card"
import MobileProjectSwitcher from "./mobile-project-switcher"
import SessionView from "../session/session-view"
import InstanceWelcomeView from "../instance-welcome-view"
import { sseManager } from "../../lib/sse-manager"
import { getLogger } from "../../lib/logger"

const log = getLogger("mobile-shell")

interface MobileShellProps {
  instance: Instance
  escapeInDebounce: boolean
  onCloseSession: (sessionId: string) => Promise<void> | void
  onNewSession: () => Promise<void> | void
  handleSidebarAgentChange: (sessionId: string, agent: string) => Promise<void>
  handleSidebarModelChange: (sessionId: string, model: { providerId: string; modelId: string }) => Promise<void>
  onExecuteCommand: (command: Command) => void
  // Callbacks for settings view to open modals in App.tsx
  onOpenMcpSettings?: () => void
  onOpenLspSettings?: () => void
  onOpenGovernance?: () => void
  onOpenDirectives?: () => void
  onOpenFullSettings?: () => void
  onOpenInstanceInfo?: () => void
  onOpenProjectSwitcher?: () => void
}

const MobileShell: Component<MobileShellProps> = (props) => {
  const [overflowOpen, setOverflowOpen] = createSignal(false)
  const [settingsSubView, setSettingsSubView] = createSignal<"main" | "project-switcher">("main")

  // Derived state
  const parentSessionId = createMemo(() => activeParentSessionId().get(props.instance.id) || null)
  const activeSessionId = createMemo(() => activeSessionMap().get(props.instance.id) || null)

  const activeSessions = createMemo(() => {
    const parentId = parentSessionId()
    if (!parentId) return new Map<string, Session>()
    const sessionFamily = getSessionFamily(props.instance.id, parentId)
    return new Map(sessionFamily.map((s) => [s.id, s]))
  })

  const activeSession = createMemo(() => {
    const sessionId = activeSessionId()
    if (!sessionId || sessionId === "info") return null
    return activeSessions().get(sessionId) ?? null
  })

  const allParentSessions = createMemo(() => {
    const parents = getParentSessions(props.instance.id)
    return new Map(parents.map((s) => [s.id, s]))
  })

  const hasSessions = createMemo(() => allParentSessions().size > 0)

  // Header state
  const projectName = createMemo(() => {
    const folder = props.instance.folder.replace(/\/+$/, "")
    return folder.split("/").pop() || props.instance.folder
  })

  const sessionTitle = createMemo(() => {
    const session = activeSession()
    return session?.title || ""
  })

  const headerStatus = createMemo<MobileHeaderStatus>(() => {
    const connStatus = sseManager.getStatus(props.instance.id)
    if (connStatus === "error" || connStatus === "disconnected") return "error"

    const sessionId = activeSessionId()
    if (!sessionId) return "idle"

    const status = getSessionStatus(props.instance.id, sessionId)
    if (status === "working" || status === "compacting") return "working"

    const session = activeSession()
    if (session?.pendingPermission) return "warning"

    return "connected"
  })

  // Badge computations
  const chatBadge = createMemo(() => {
    return getPermissionQueueLength(props.instance.id) > 0
  })

  const sessionsBadge = createMemo(() => {
    let count = 0
    for (const session of allParentSessions().values()) {
      if (session.pendingPermission) count++
    }
    return count
  })

  const workBadge = createMemo(() => {
    const store = messageStoreBus.getOrCreate(props.instance.id)
    const sessionId = activeSessionId()
    if (!sessionId || sessionId === "info" || !store) return 0
    const snapshot = store.state.latestTodos[sessionId]
    if (!snapshot) return 0
    const message = store.getMessage(snapshot.messageId)
    if (!message) return 0
    const partRecord = message.parts?.[snapshot.partId]
    const part = partRecord?.data as any
    if (!part?.state?.todos) return 0
    return part.state.todos.filter((t: any) => t.status !== "completed").length
  })

  // Reset settings sub-view when leaving the settings tab
  createEffect(() => {
    if (activeMobileTab() !== "settings") {
      setSettingsSubView("main")
    }
  })

  // Handlers
  const handleSessionSelect = (sessionId: string) => {
    setActiveSession(props.instance.id, sessionId)
  }

  const handleNewSession = () => {
    const result = props.onNewSession()
    if (result instanceof Promise) {
      result.catch((error) => log.error("Failed to create session:", error))
    }
  }

  return (
    <div class="flex flex-col h-full w-full" data-mobile-shell>
      <MobileHeader
        projectName={projectName()}
        sessionTitle={sessionTitle()}
        status={headerStatus()}
        onOverflowClick={() => setOverflowOpen((v) => !v)}
      />

      <MobileOverflowMenu
        open={overflowOpen()}
        onClose={() => setOverflowOpen(false)}
        onCommandPalette={() => showCommandPalette(props.instance.id)}
        onInstanceInfo={() => props.onOpenInstanceInfo?.()}
        onSwitchProject={() => {
          setSettingsSubView("project-switcher")
          setActiveMobileTab("settings")
        }}
      />

      {/* Tab content area */}
      <div class="flex-1 min-h-0 overflow-hidden">
        <Show
          when={hasSessions()}
          fallback={<InstanceWelcomeView instance={props.instance} />}
        >
          <Switch>
            <Match when={activeMobileTab() === "chat"}>
              <div class="flex flex-col h-full min-h-0">
                <Show
                  when={activeSessionId() && activeSessionId() !== "info"}
                  fallback={
                    <div class="flex items-center justify-center h-full text-muted-foreground text-sm">
                      Select a session to begin
                    </div>
                  }
                >
                  <SessionView
                    sessionId={activeSessionId()!}
                    activeSessions={activeSessions()}
                    instanceId={props.instance.id}
                    instanceFolder={props.instance.folder}
                    escapeInDebounce={props.escapeInDebounce}
                    showSidebarToggle={false}
                    forceCompactStatusLayout={true}
                    isActive={activeMobileTab() === "chat"}
                  />
                  <MobilePermissionCard
                    instanceId={props.instance.id}
                    sessionId={activeSessionId()!}
                  />
                </Show>
              </div>
            </Match>

            <Match when={activeMobileTab() === "sessions"}>
              <MobileSessionList
                instanceId={props.instance.id}
                sessions={allParentSessions()}
                activeSessionId={parentSessionId()}
                onSelect={(sessionId) => {
                  setActiveParentSession(props.instance.id, sessionId)
                  handleSessionSelect(sessionId)
                }}
                onNew={handleNewSession}
                onClose={(sessionId) => props.onCloseSession(sessionId)}
              />
            </Match>

            <Match when={activeMobileTab() === "work"}>
              <MobileWorkspacePanel
                instanceId={props.instance.id}
                instanceFolder={props.instance.folder}
              />
            </Match>

            <Match when={activeMobileTab() === "settings"}>
              <Show
                when={settingsSubView() === "main"}
                fallback={
                  <MobileProjectSwitcher
                    onBack={() => setSettingsSubView("main")}
                    onNewProject={() => props.onOpenProjectSwitcher?.()}
                  />
                }
              >
                <MobileSettingsView
                  instance={props.instance}
                  activeSession={activeSession()}
                  onAgentChange={(sessionId, agent) => props.handleSidebarAgentChange(sessionId, agent)}
                  onModelChange={(sessionId, model) => props.handleSidebarModelChange(sessionId, model)}
                  onOpenMcpSettings={() => props.onOpenMcpSettings?.()}
                  onOpenLspSettings={() => props.onOpenLspSettings?.()}
                  onOpenGovernance={() => props.onOpenGovernance?.()}
                  onOpenDirectives={() => props.onOpenDirectives?.()}
                  onOpenFullSettings={() => props.onOpenFullSettings?.()}
                  onOpenProjectSwitcher={() => setSettingsSubView("project-switcher")}
                  onOpenInstanceInfo={() => props.onOpenInstanceInfo?.()}
                />
              </Show>
            </Match>
          </Switch>
        </Show>
      </div>

      <MobileBottomNav
        chatBadge={chatBadge()}
        sessionsBadge={sessionsBadge()}
        workBadge={workBadge()}
      />
    </div>
  )
}

export default MobileShell
