import { useState } from 'react'
import { StaggeredStack, type StackVariant } from './StaggeredStack'
import { TabButton } from './TabButton'

export default function App() {
  const [variant, setVariant] = useState<StackVariant>('square')
  return (
    <>
      {/* key={variant} remounts the stack on switch so ref-backed arrays
          (targets, currents, layerRefs) get fresh sizing for the new count */}
      <StaggeredStack key={variant} variant={variant} />
      <TabButton value={variant} onChange={setVariant} />
    </>
  )
}
