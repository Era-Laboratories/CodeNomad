import { Component, JSX, createContext, createEffect, createMemo, createSignal, useContext, type Accessor } from "solid-js"
import type { Instance } from "../../types/instance"
import { instances } from "../../stores/instances"
import { getInstanceMetadata } from "../../stores/instance-metadata"
import { loadInstanceMetadata, hasMetadataLoaded } from "../hooks/use-instance-metadata"

interface InstanceMetadataContextValue {
  isLoading: Accessor<boolean>
  instance: Accessor<Instance>
  metadata: Accessor<Instance["metadata"] | undefined>
  refreshMetadata: () => Promise<void>
}

const InstanceMetadataContext = createContext<InstanceMetadataContextValue | null>(null)

interface InstanceMetadataProviderProps {
  instance: Instance
  children: JSX.Element
}

export const InstanceMetadataProvider: Component<InstanceMetadataProviderProps> = (props) => {
  const resolvedInstance = createMemo(() => instances().get(props.instance.id) ?? props.instance)
  const [isLoading, setIsLoading] = createSignal(true)

  const ensureMetadata = async (force = false) => {
    const current = resolvedInstance()
    if (!current) {
      setIsLoading(false)
      return
    }

    const cachedMetadata = getInstanceMetadata(current.id) ?? current.metadata
    if (!force && hasMetadataLoaded(cachedMetadata)) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    await loadInstanceMetadata(current, { force })
    setIsLoading(false)
  }

  createEffect(() => {
    const current = resolvedInstance()
    if (!current) {
      setIsLoading(false)
      return
    }

    const tracked = getInstanceMetadata(current.id) ?? current.metadata
    if (!tracked || !hasMetadataLoaded(tracked)) {
      void ensureMetadata()
      return
    }

    setIsLoading(false)
  })

  const contextValue: InstanceMetadataContextValue = {
    isLoading,
    instance: resolvedInstance,
    metadata: () => getInstanceMetadata(resolvedInstance().id) ?? resolvedInstance().metadata,
    refreshMetadata: () => ensureMetadata(true),
  }

  return (
    <InstanceMetadataContext.Provider value={contextValue}>
      {props.children}
    </InstanceMetadataContext.Provider>
  )
}

export function useInstanceMetadataContext(): InstanceMetadataContextValue {
  const ctx = useContext(InstanceMetadataContext)
  if (!ctx) {
    throw new Error("useInstanceMetadataContext must be used within InstanceMetadataProvider")
  }
  return ctx
}

export function useOptionalInstanceMetadataContext(): InstanceMetadataContextValue | null {
  return useContext(InstanceMetadataContext)
}
