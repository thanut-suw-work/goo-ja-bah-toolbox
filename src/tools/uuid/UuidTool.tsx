import { useState } from 'react'
import { generateUuids } from './logic'

export function UuidTool() {
  const [count, setCount] = useState(1)
  const [output, setOutput] = useState('')

  function run() {
    setOutput(generateUuids(count).join('\n'))
  }

  return (
    <div>
      <label>
        Count
        <input
          type="number"
          min={1}
          max={100}
          aria-label="UUID count"
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
        />
      </label>
      <button type="button" onClick={run}>
        Generate
      </button>
      <textarea aria-label="UUID output" value={output} readOnly rows={10} />
    </div>
  )
}

export default UuidTool
