import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { StackVariant } from './StaggeredStack'
import './TabButton.css'

type Props = {
  value: StackVariant
  onChange: (v: StackVariant) => void
}

type HighlightRect = { left: number; width: number }

export function TabButton({ value, onChange }: Props) {
  const squareRef = useRef<HTMLButtonElement>(null)
  const circleRef = useRef<HTMLButtonElement>(null)
  const [highlight, setHighlight] = useState<HighlightRect | null>(null)
  const [animate, setAnimate] = useState(false)

  // Measure the active button synchronously after each render so the
  // highlight's left/width always matches its position. useLayoutEffect runs
  // before paint so the highlight lands in the right place on first mount
  // with no flash.
  useLayoutEffect(() => {
    const active = value === 'square' ? squareRef.current : circleRef.current
    if (!active) return
    setHighlight({
      left: active.offsetLeft,
      width: active.offsetWidth,
    })
  }, [value])

  // Enable CSS transitions only after the first positioning pass — otherwise
  // the highlight would animate from (0, 0) to the active option on mount.
  useEffect(() => {
    setAnimate(true)
  }, [])

  return (
    <div className="tab-button" role="tablist">
      {highlight && (
        <div
          className={`tab-highlight${animate ? ' animate' : ''}`}
          style={{ left: highlight.left, width: highlight.width }}
          aria-hidden="true"
        />
      )}
      <button
        ref={squareRef}
        type="button"
        role="tab"
        aria-selected={value === 'square'}
        className={`tab-option${value === 'square' ? ' active' : ''}`}
        onClick={() => onChange('square')}
      >
        <span className="tab-icon-square" aria-hidden="true" />
        Square
      </button>
      <button
        ref={circleRef}
        type="button"
        role="tab"
        aria-selected={value === 'circle'}
        className={`tab-option${value === 'circle' ? ' active' : ''}`}
        onClick={() => onChange('circle')}
      >
        <span className="tab-icon-circle" aria-hidden="true" />
        Circle
      </button>
    </div>
  )
}
