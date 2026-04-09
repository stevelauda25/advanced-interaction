import { useEffect, useRef, type PointerEvent } from 'react'
import squareShape from './assets/base-shape.svg'
import circleShape from './assets/circle-shape.svg'
import './StaggeredStack.css'

export type StackVariant = 'square' | 'circle'

type Config = {
  count: number
  width: number
  height: number
  step: number
  maxPush: number
  maxPushY: number
  verticalDeadZone: number
  falloff: number
  src: string
}

// Per-variant geometry + interaction tuning. Values for each variant are
// lifted directly from the Figma hover snapshots (peak push, layer spacing,
// shape dimensions) so both variants match their reference visuals.
const CONFIGS: Record<StackVariant, Config> = {
  square: {
    count: 22,
    width: 278,
    height: 160,
    step: 20,
    maxPush: 50,
    maxPushY: 0,
    verticalDeadZone: 0,
    falloff: 90,
    src: squareShape,
  },
  circle: {
    count: 30,
    width: 198,
    height: 93,
    step: 12,
    maxPush: 32,
    maxPushY: 22,
    verticalDeadZone: 10,
    falloff: 60,
    src: circleShape,
  },
}

const LERP = 0.22
const REST_EPSILON = 0.05

const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

export function StaggeredStack({ variant }: { variant: StackVariant }) {
  const {
    count,
    width,
    height,
    step,
    maxPush,
    maxPushY,
    verticalDeadZone,
    falloff,
    src,
  } = CONFIGS[variant]

  const stackRef = useRef<HTMLDivElement>(null)
  const layerRefs = useRef<Array<HTMLImageElement | null>>([])
  const targets = useRef<number[]>(new Array(count).fill(0))
  const currents = useRef<number[]>(new Array(count).fill(0))
  const targetsY = useRef<number[]>(new Array(count).fill(0))
  const currentsY = useRef<number[]>(new Array(count).fill(0))
  const rafId = useRef<number | null>(null)

  const ensureRunning = () => {
    if (rafId.current != null) return
    const tick = () => {
      let stillMoving = false
      for (let i = 0; i < count; i++) {
        const cur = currents.current[i]
        const tgt = targets.current[i]
        const next = cur + (tgt - cur) * LERP
        currents.current[i] = next
        const curY = currentsY.current[i]
        const tgtY = targetsY.current[i]
        const nextY = curY + (tgtY - curY) * LERP
        currentsY.current[i] = nextY
        const el = layerRefs.current[i]
        if (el) {
          el.style.setProperty('--dx', `${next}px`)
          el.style.setProperty('--dy', `${nextY}px`)
        }
        if (Math.abs(tgt - next) > REST_EPSILON || Math.abs(tgtY - nextY) > REST_EPSILON) stillMoving = true
      }
      if (stillMoving) {
        rafId.current = requestAnimationFrame(tick)
      } else {
        for (let i = 0; i < count; i++) {
          currents.current[i] = targets.current[i]
          currentsY.current[i] = targetsY.current[i]
          const el = layerRefs.current[i]
          if (el) {
            el.style.setProperty('--dx', `${targets.current[i]}px`)
            el.style.setProperty('--dy', `${targetsY.current[i]}px`)
          }
        }
        rafId.current = null
      }
    }
    rafId.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    return () => {
      if (rafId.current != null) cancelAnimationFrame(rafId.current)
    }
  }, [])

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const stack = stackRef.current
    if (!stack) return
    const rect = stack.getBoundingClientRect()
    const mouseX = e.clientX
    const mouseY = e.clientY

    // The push "dead zone" is only the narrow center of the stack (±20% of
    // the width from stackCenterX). When the cursor is inside that center
    // band the push targets collapse to 0 and the shapes lerp back to their
    // default position. Outside the center — including the left and right
    // edges of the stack itself — the push is active with the direction
    // determined by which side of the center band the cursor is on.
    const stackCenterX = rect.left + width / 2
    const centerHalfWidth = width * 0.2
    const dirX =
      mouseX < stackCenterX - centerHalfWidth
        ? 1
        : mouseX > stackCenterX + centerHalfWidth
          ? -1
          : 0

    for (let i = 0; i < count; i++) {
      const layerCenterY = rect.top + i * step + height / 2
      const absDy = Math.abs(mouseY - layerCenterY)
      const t = Math.max(0, 1 - absDy / falloff)
      const eased = smootherstep(t)
      targets.current[i] = dirX * eased * maxPush

      if (dirX === 0 || maxPushY === 0 || absDy <= verticalDeadZone) {
        targetsY.current[i] = 0
        continue
      }

      const dirY = layerCenterY >= mouseY ? 1 : -1
      targetsY.current[i] = dirY * eased * maxPushY
    }

    ensureRunning()
  }

  const handlePointerLeave = () => {
    for (let i = 0; i < count; i++) {
      targets.current[i] = 0
      targetsY.current[i] = 0
    }
    ensureRunning()
  }

  return (
    <div
      className="staggered-stack"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div
        className="stack"
        ref={stackRef}
        style={{
          width,
          height: height + (count - 1) * step,
        }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <img
            key={i}
            src={src}
            alt=""
            className="stack-layer"
            ref={(el) => {
              layerRefs.current[i] = el
            }}
            style={{
              top: i * step,
              width,
              height,
              zIndex: count - i,
            }}
          />
        ))}
      </div>
    </div>
  )
}
