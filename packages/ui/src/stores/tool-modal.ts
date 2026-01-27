import { createSignal } from "solid-js"
import type { ClientPart } from "../types/message"

type ToolCallPart = Extract<ClientPart, { type: "tool" }>

export interface ToolModalItem {
  key: string
  toolPart: ToolCallPart
  messageId: string
  messageVersion: number
  partVersion: number
  displayPath?: string
  toolName: string
}

type DiffViewMode = "split" | "unified"

interface ToolModalState {
  isOpen: boolean
  currentItem: ToolModalItem | null
  siblingItems: ToolModalItem[]
  currentIndex: number
  instanceId: string
  sessionId: string
  diffViewMode: DiffViewMode
}

const [modalState, setModalState] = createSignal<ToolModalState>({
  isOpen: false,
  currentItem: null,
  siblingItems: [],
  currentIndex: 0,
  instanceId: "",
  sessionId: "",
  diffViewMode: "split",
})

export function useToolModal() {
  return {
    state: modalState,
    isOpen: () => modalState().isOpen,
    currentItem: () => modalState().currentItem,
    siblingItems: () => modalState().siblingItems,
    currentIndex: () => modalState().currentIndex,
    instanceId: () => modalState().instanceId,
    sessionId: () => modalState().sessionId,
    diffViewMode: () => modalState().diffViewMode,
    hasPrev: () => modalState().currentIndex > 0,
    hasNext: () => modalState().currentIndex < modalState().siblingItems.length - 1,
  }
}

export function setModalDiffViewMode(mode: DiffViewMode) {
  setModalState((prev) => ({ ...prev, diffViewMode: mode }))
}

export function openToolModal(
  item: ToolModalItem,
  siblings: ToolModalItem[] = [],
  index: number = 0,
  instanceId: string = "",
  sessionId: string = ""
) {
  setModalState((prev) => ({
    ...prev,
    isOpen: true,
    currentItem: item,
    siblingItems: siblings.length > 0 ? siblings : [item],
    currentIndex: siblings.length > 0 ? index : 0,
    instanceId,
    sessionId,
  }))
}

export function closeToolModal() {
  setModalState((prev) => ({
    ...prev,
    isOpen: false,
  }))
}

export function navigateNext() {
  setModalState((prev) => {
    if (prev.currentIndex >= prev.siblingItems.length - 1) return prev
    const nextIndex = prev.currentIndex + 1
    return {
      ...prev,
      currentIndex: nextIndex,
      currentItem: prev.siblingItems[nextIndex],
    }
  })
}

export function navigatePrev() {
  setModalState((prev) => {
    if (prev.currentIndex <= 0) return prev
    const prevIndex = prev.currentIndex - 1
    return {
      ...prev,
      currentIndex: prevIndex,
      currentItem: prev.siblingItems[prevIndex],
    }
  })
}

export function navigateToIndex(index: number) {
  setModalState((prev) => {
    if (index < 0 || index >= prev.siblingItems.length) return prev
    return {
      ...prev,
      currentIndex: index,
      currentItem: prev.siblingItems[index],
    }
  })
}
