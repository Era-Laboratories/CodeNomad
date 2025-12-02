import { JSX, Show, Accessor, children as resolveChildren, createEffect, createMemo, createSignal, onCleanup } from "solid-js"

const sizeCache = new Map<string, number>()
const DEFAULT_MARGIN_PX = 600
const MIN_PLACEHOLDER_HEIGHT = 32

interface VirtualItemProps {
  cacheKey: string
  children: JSX.Element
  scrollContainer?: Accessor<HTMLElement | undefined | null>
  threshold?: number
  minPlaceholderHeight?: number
  class?: string
  contentClass?: string
  placeholderClass?: string
  virtualizationEnabled?: Accessor<boolean>
}

export default function VirtualItem(props: VirtualItemProps) {
  const resolved = resolveChildren(() => props.children)
  const [isIntersecting, setIsIntersecting] = createSignal(true)
  const [measuredHeight, setMeasuredHeight] = createSignal(sizeCache.get(props.cacheKey) ?? 0)
  const [hasMeasured, setHasMeasured] = createSignal(sizeCache.has(props.cacheKey))
  const virtualizationEnabled = () => (props.virtualizationEnabled ? props.virtualizationEnabled() : true)

  let wrapperRef: HTMLDivElement | undefined
  let contentRef: HTMLDivElement | undefined
  let resizeObserver: ResizeObserver | undefined
  let intersectionObserver: IntersectionObserver | undefined

  function cleanupResizeObserver() {
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = undefined
    }
  }

  function cleanupIntersectionObserver() {
    if (intersectionObserver) {
      intersectionObserver.disconnect()
      intersectionObserver = undefined
    }
  }

  function persistMeasurement(nextHeight: number) {
    if (!Number.isFinite(nextHeight) || nextHeight < 0) {
      return
    }
    const normalized = nextHeight
    if (normalized > 0) {
      sizeCache.set(props.cacheKey, normalized)
      setHasMeasured(true)
    }
    setMeasuredHeight(normalized)
  }

  function updateMeasuredHeight() {
    if (!contentRef) return
    const next = contentRef.offsetHeight
    if (next === measuredHeight()) return
    persistMeasurement(next)
  }

  function setupResizeObserver() {
    if (!contentRef) return
    cleanupResizeObserver()
    if (typeof ResizeObserver === "undefined") {
      updateMeasuredHeight()
      return
    }
    resizeObserver = new ResizeObserver(() => updateMeasuredHeight())
    resizeObserver.observe(contentRef)
  }

  function refreshIntersectionObserver(targetRoot: Element | Document | null) {
    cleanupIntersectionObserver()
    if (!wrapperRef || typeof IntersectionObserver === "undefined") {
      setIsIntersecting(true)
      return
    }
    const margin = props.threshold ?? DEFAULT_MARGIN_PX
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === wrapperRef) {
            setIsIntersecting(entry.isIntersecting)
          }
        }
      },
      {
        root: targetRoot,
        rootMargin: `${margin}px 0px ${margin}px 0px`,
      },
    )
    intersectionObserver.observe(wrapperRef)
  }

  function setWrapperRef(element: HTMLDivElement | null) {
    wrapperRef = element ?? undefined
    const root = props.scrollContainer ? props.scrollContainer() : null
    refreshIntersectionObserver(root ?? null)
  }

  function setContentRef(element: HTMLDivElement | null) {
    contentRef = element ?? undefined
    if (contentRef) {
      queueMicrotask(() => {
        updateMeasuredHeight()
        setupResizeObserver()
      })
    } else {
      cleanupResizeObserver()
    }
  }

  createEffect(() => {
    const key = props.cacheKey
    const cached = sizeCache.get(key)
    if (cached !== undefined) {
      setMeasuredHeight(cached)
      setHasMeasured(true)
    } else {
      setMeasuredHeight(0)
      setHasMeasured(false)
    }
  })

  createEffect(() => {
    const root = props.scrollContainer ? props.scrollContainer() : null
    refreshIntersectionObserver(root ?? null)
  })

  const shouldHideContent = createMemo(() => {
    if (!virtualizationEnabled()) return false
    if (!hasMeasured()) return false
    return !isIntersecting()
  })
 
  const placeholderHeight = createMemo(() => {
    const seenHeight = measuredHeight()
    if (seenHeight > 0) {
      return seenHeight
    }
    return props.minPlaceholderHeight ?? MIN_PLACEHOLDER_HEIGHT
  })
 
  onCleanup(() => {
    cleanupResizeObserver()
    cleanupIntersectionObserver()
  })
 
  const wrapperClass = () => ["virtual-item-wrapper", props.class].filter(Boolean).join(" ")
  const contentClass = () => {
    const classes = ["virtual-item-content", props.contentClass]
    if (shouldHideContent()) {
      classes.push("virtual-item-content-hidden")
    }
    return classes.filter(Boolean).join(" ")
  }
  const placeholderClass = () => ["virtual-item-placeholder", props.placeholderClass].filter(Boolean).join(" ")
 
  return (
    <div ref={setWrapperRef} class={wrapperClass()} style={{ width: "100%" }}>
      <div
        class={placeholderClass()}
        style={{
          width: "100%",
          height: shouldHideContent() ? `${placeholderHeight()}px` : undefined,
          "min-height": hasMeasured() ? undefined : `${props.minPlaceholderHeight ?? MIN_PLACEHOLDER_HEIGHT}px`,
        }}
      >
        <div ref={setContentRef} class={contentClass()}>
          {resolved()}
        </div>
      </div>
    </div>
  )
}

