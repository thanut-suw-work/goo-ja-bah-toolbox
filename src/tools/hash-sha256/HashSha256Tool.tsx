import { useState } from 'react'
import { sha256Hex } from './logic'

export function HashSha256Tool() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function run() {
    try {
      setOutput(await sha256Hex(input))
      setError(null)
    } catch (e) {
      setOutput('')
      setError(e instanceof Error ? e.message : 'Hash failed')
    }
  }

  return (
    <div>
      <textarea
        aria-label="SHA-256 input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={10}
      />
      <button type="button" onClick={run}>
        Hash
      </button>
      {error ? <p role="alert">{error}</p> : null}
      <textarea aria-label="SHA-256 output" value={output} readOnly rows={4} />
    </div>
  )
}

export default HashSha256Tool
