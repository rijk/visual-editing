import type { ChannelStatus } from '@sanity/channels'
import type { ContentSourceMapDocuments } from '@sanity/client'
import {
  isHTMLAnchorElement,
  isHTMLElement,
  studioTheme,
  ThemeProvider,
} from '@sanity/ui'
import {
  isAltKey,
  isHotkey,
  type SanityNode,
} from '@sanity/visual-editing-helpers'
import {
  type FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import styled from 'styled-components'

import type {
  HistoryAdapter,
  OverlayEventHandler,
  VisualEditingChannel,
} from '../types'
import { ElementOverlay } from './ElementOverlay'
import { overlayStateReducer } from './overlayStateReducer'
import { useController } from './useController'

const Root = styled.div<{
  $zIndex?: string | number
}>`
  background-color: transparent;
  direction: ltr;
  inset: 0;
  pointer-events: none;
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: ${({ $zIndex }) => $zIndex ?? '9999999'};
`

function raf2(fn: () => void) {
  let r0: number | undefined = undefined
  let r1: number | undefined = undefined

  r0 = requestAnimationFrame(() => {
    r1 = requestAnimationFrame(fn)
  })

  return () => {
    if (r0 !== undefined) cancelAnimationFrame(r0)
    if (r1 !== undefined) cancelAnimationFrame(r1)
  }
}

function isEqualSets(a: Set<string>, b: Set<string>) {
  if (a === b) return true
  if (a.size !== b.size) return false
  for (const value of a) if (!b.has(value)) return false
  return true
}

/**
 * @internal
 */
export const Overlays: FunctionComponent<{
  channel: VisualEditingChannel
  history?: HistoryAdapter
  zIndex?: string | number
}> = (props) => {
  const { channel, history, zIndex } = props

  const [status, setStatus] = useState<ChannelStatus>()

  const [{ elements, wasMaybeCollapsed }, dispatch] = useReducer(
    overlayStateReducer,
    undefined,
    () => ({
      elements: [],
      focusPath: '',
      wasMaybeCollapsed: false,
    }),
  )
  const [rootElement, setRootElement] = useState<HTMLElement | null>(null)
  const [overlayEnabled, setOverlayEnabled] = useState(true)

  useEffect(() => {
    const unsubscribeFromStatus = channel.onStatusUpdate(setStatus)
    const unsubscribeFromEvents = channel.subscribe((type, data) => {
      if (type === 'presentation/focus' && data.path?.length) {
        dispatch({ type, data })
      } else if (type === 'presentation/blur') {
        dispatch({ type, data })
      } else if (type === 'presentation/navigate') {
        history?.update(data)
      } else if (type === 'presentation/toggleOverlay') {
        setOverlayEnabled((enabled) => !enabled)
      }
    })

    return () => {
      unsubscribeFromEvents()
      unsubscribeFromStatus()
    }
  }, [channel, history])

  const nodeIdsRef = useRef<Set<string>>(new Set())

  const reportDocuments = useCallback(
    (documents: ContentSourceMapDocuments) => {
      channel?.send('visual-editing/documents', {
        perspective: 'previewDrafts',
        documents,
      })
    },
    [channel],
  )

  useEffect(() => {
    // Report only `SanityNode`, if a node is untransformed (`SanityStegaNode`)
    // at this stage it will not contain the necessary document data
    const nodes = elements
      .map((e) => e.sanity)
      .filter((s) => 'id' in s) as SanityNode[]

    const nodeIds = new Set<string>(nodes.map((e) => e.id))
    // Only report documents if some document IDs have changed
    if (!isEqualSets(nodeIds, nodeIdsRef.current)) {
      const documentsOnPage: ContentSourceMapDocuments = Array.from(
        nodeIds,
      ).map((_id) => {
        const {
          type,
          projectId: _projectId,
          dataset: _dataset,
        } = nodes.find((node) => node.id === _id)!
        return _projectId && _dataset
          ? { _id, _type: type!, _projectId, _dataset }
          : { _id, _type: type! }
      })
      nodeIdsRef.current = nodeIds
      reportDocuments(documentsOnPage)
    }
  }, [elements, reportDocuments])

  const overlayEventHandler: OverlayEventHandler = useCallback(
    (message) => {
      if (message.type === 'element/click') {
        channel.send('overlay/focus', message.sanity)
      } else if (message.type === 'overlay/activate') {
        channel.send('overlay/toggle', { enabled: true })
      } else if (message.type === 'overlay/deactivate') {
        channel.send('overlay/toggle', { enabled: false })
      }
      dispatch(message)
    },
    [channel],
  )

  const controller = useController(
    rootElement,
    overlayEventHandler,
    !!channel.inFrame,
  )

  useEffect(() => {
    if (overlayEnabled) {
      controller.current?.activate()
    } else {
      controller.current?.deactivate()
    }
  }, [channel, controller, overlayEnabled])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target

      // We only need to modify the default behavior if the target is a link
      const targetsLink = Boolean(
        isHTMLAnchorElement(target) ||
          (isHTMLElement(target) && target.closest('a')),
      )

      if (targetsLink && event.altKey) {
        event.preventDefault()
        event.stopPropagation()
        const newEvent = new MouseEvent(event.type, {
          ...event,
          altKey: false,
          bubbles: true,
          cancelable: true,
        })
        event.target?.dispatchEvent(newEvent)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isAltKey(e)) {
        setOverlayEnabled((enabled) => !enabled)
      }
    }

    const handleKeydown = (e: KeyboardEvent) => {
      if (isAltKey(e)) {
        setOverlayEnabled((enabled) => !enabled)
      }

      if (isHotkey(['mod', '\\'], e)) {
        setOverlayEnabled((enabled) => !enabled)
      }
    }

    window.addEventListener('click', handleClick)
    window.addEventListener('keydown', handleKeydown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('click', handleClick)
      window.removeEventListener('keydown', handleKeydown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [setOverlayEnabled])

  useEffect(() => {
    if (history) {
      return history.subscribe((update) => {
        update.title = update.title || document.title
        channel.send('overlay/navigate', update)
      })
    }
    return
  }, [channel, history])

  const [overlaysFlash, setOverlaysFlash] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)
  const fadeOutTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Flash overlays when they are enabled
  useEffect(() => {
    if (overlayEnabled) {
      return raf2(() => {
        setOverlaysFlash(true)
        raf2(() => {
          setFadingOut(true)
          fadeOutTimeoutRef.current = setTimeout(() => {
            setFadingOut(false)
            setOverlaysFlash(false)
          }, 1500)
        })
      })
    } else if (fadeOutTimeoutRef.current) {
      clearTimeout(fadeOutTimeoutRef.current)
      setOverlaysFlash(false)
      setFadingOut(false)
    }

    return
  }, [overlayEnabled])

  const elementsToRender = useMemo(() => {
    if (!channel || (channel.inFrame && status !== 'connected')) {
      return []
    }
    return elements.filter((e) => e.activated || e.focused)
  }, [channel, elements, status])

  return (
    <ThemeProvider theme={studioTheme} tone="transparent">
      <Root
        data-fading-out={fadingOut ? '' : undefined}
        data-overlays={overlaysFlash ? '' : undefined}
        ref={setRootElement}
        $zIndex={zIndex}
      >
        {elementsToRender.map(({ id, focused, hovered, rect, sanity }) => {
          return (
            <ElementOverlay
              key={id}
              rect={rect}
              focused={focused}
              hovered={hovered}
              showActions={!channel.inFrame}
              sanity={sanity}
              wasMaybeCollapsed={focused && wasMaybeCollapsed}
            />
          )
        })}
      </Root>
    </ThemeProvider>
  )
}
