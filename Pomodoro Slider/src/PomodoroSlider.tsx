import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './PomodoroSlider.css'

const TICK_COUNT = 80
const MAX_SECONDS = 25 * 60 // 25 minutes (classic pomodoro range)
const SNAP_SECONDS = 1 // snap to whole seconds while dragging

// Bell curve for the drag hump (index = distance from drag center).
const HUMP_HEIGHTS = [32, 28, 24, 20, 18]
const HUMP_OPACITIES = [0.7, 0.5, 0.4, 0.3, 0.2]
const HUMP_RADIUS = HUMP_HEIGHTS.length - 1 // 4 ticks each side

const DEFAULT_TICK = {
  height: 16,
  width: 1,
  opacity: 0.2,
}

const tickStyle = (
  i: number,
  isDragging: boolean,
  dragTickIndex: number | null,
  valueTickIndex: number | null,
) => {
  if (isDragging && dragTickIndex !== null) {
    const dist = Math.abs(i - dragTickIndex)
    if (dist <= HUMP_RADIUS) {
      return {
        height: HUMP_HEIGHTS[dist],
        width: 1.5,
        opacity: HUMP_OPACITIES[dist],
      }
    }
    return DEFAULT_TICK
  }
  if (!isDragging && valueTickIndex !== null && i === valueTickIndex) {
    return { height: 32, width: 1.5, opacity: 0.4 }
  }
  return DEFAULT_TICK
}

export function PomodoroSlider() {
  const [seconds, setSeconds] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragTickIndex, setDragTickIndex] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPlayHover, setIsPlayHover] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  // Countdown
  useEffect(() => {
    if (!isPlaying) return
    if (seconds <= 0) {
      setIsPlaying(false)
      return
    }
    const id = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setIsPlaying(false)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [isPlaying, seconds])

  const updateFromPointer = useCallback((clientX: number) => {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const tickIndex = Math.round(ratio * (TICK_COUNT - 1))
    setDragTickIndex(tickIndex)
    const raw = ratio * MAX_SECONDS
    const snapped = Math.round(raw / SNAP_SECONDS) * SNAP_SECONDS
    setSeconds(snapped)
  }, [])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsPlaying(false)
    setIsDragging(true)
    updateFromPointer(e.clientX)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    updateFromPointer(e.clientX)
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    setIsDragging(false)
    setDragTickIndex(null)
  }

  // Time formatting
  const mm = Math.floor(seconds / 60)
  const ss = seconds % 60
  const timeString = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  const digitChars = timeString.split('') // ['0','0',':','0','0']

  // First non-zero digit (skipping the colon) drives the dim/active rule.
  let firstNonZero = -1
  for (let i = 0; i < digitChars.length; i++) {
    const c = digitChars[i]
    if (c !== ':' && c !== '0') {
      firstNonZero = i
      break
    }
  }
  const isActive = (i: number) => firstNonZero !== -1 && i >= firstNonZero

  const valueTickIndex =
    seconds > 0 ? Math.round((seconds / MAX_SECONDS) * (TICK_COUNT - 1)) : null

  const canPlay = seconds > 0
  const iconDim = !canPlay || (!isPlayHover && !isPlaying)

  return (
    <div className="pomodoro-card-outer">
      <div className="pomodoro-card-inner">
        <div className="top-row">
          <div className="timer-display" aria-label={`Timer ${timeString}`}>
            {digitChars.map((char, i) => {
              if (char === ':') {
                return (
                  <span
                    key={`colon-${i}`}
                    className={`colon ${isActive(i) ? 'active' : ''}`}
                  >
                    :
                  </span>
                )
              }
              return (
                <DigitSlot
                  key={`slot-${i}`}
                  value={char}
                  position={i}
                  active={isActive(i)}
                />
              )
            })}
          </div>

          <button
            className="play-btn-outer"
            onClick={() => canPlay && setIsPlaying((p) => !p)}
            disabled={!canPlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onMouseEnter={() => setIsPlayHover(true)}
            onMouseLeave={() => setIsPlayHover(false)}
            onPointerLeave={() => setIsPlayHover(false)}
          >
            <div className="play-btn-inner">
              <PlayPauseIcon playing={isPlaying} dim={iconDim} />
            </div>
          </button>
        </div>

        <div className="slider-section">
          <div
            className="slider-track"
            ref={trackRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {Array.from({ length: TICK_COUNT }, (_, i) => {
              const style = tickStyle(i, isDragging, dragTickIndex, valueTickIndex)
              return (
                <motion.div
                  key={i}
                  className="tick"
                  animate={{
                    height: style.height,
                    width: style.width,
                    backgroundColor: `rgba(0, 0, 0, ${style.opacity})`,
                  }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.5 }}
                />
              )
            })}
          </div>
          <div className="slider-labels">
            <span>min</span>
            <span>max</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function DigitSlot({
  value,
  position,
  active,
}: {
  value: string
  position: number
  active: boolean
}) {
  // Bump a counter every time the displayed char changes, so React
  // remounts the motion.span and the enter animation re-fires. Computed
  // during render via a ref — no AnimatePresence means no exit-pile-up
  // when the user drags fast.
  const lastValue = useRef(value)
  const lastChangeAt = useRef(0)
  const epoch = useRef(0)
  // When two consecutive changes happen within the animation window,
  // skip the vertical lift on the new mount so the digit baseline stays
  // pinned to the row instead of "floating" above its neighbors.
  const skipLift = useRef(false)

  if (lastValue.current !== value) {
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now()
    skipLift.current = now - lastChangeAt.current < 240
    lastChangeAt.current = now
    lastValue.current = value
    epoch.current += 1
  }

  return (
    <span className="digit-slot">
      <motion.span
        key={epoch.current}
        className={`digit ${active ? 'active' : ''}`}
        initial={{
          opacity: 0.35,
          y: skipLift.current ? 0 : -6,
          filter: 'blur(3px)',
        }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{
          duration: 0.22,
          delay: position * 0.025,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {value}
      </motion.span>
    </span>
  )
}

function PlayPauseIcon({ playing, dim }: { playing: boolean; dim: boolean }) {
  const fill = dim ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.9)'
  return (
    <div
      style={{
        width: 20,
        height: 20,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {playing ? (
          <motion.svg
            key="pause"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            initial={{ opacity: 0, scale: 0.6, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.6, filter: 'blur(4px)' }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <rect x="5.25" y="3.5" width="3" height="13" rx="1" fill={fill} />
            <rect x="11.75" y="3.5" width="3" height="13" rx="1" fill={fill} />
          </motion.svg>
        ) : (
          <motion.svg
            key="play"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            initial={{ opacity: 0, scale: 0.6, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.6, filter: 'blur(4px)' }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <path
              d="M5.7 3.5 L16.2 9.55 a0.52 0.52 0 0 1 0 0.9 L5.7 16.5 a0.52 0.52 0 0 1 -0.78 -0.45 L4.92 3.95 a0.52 0.52 0 0 1 0.78 -0.45 Z"
              fill={fill}
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </div>
  )
}
