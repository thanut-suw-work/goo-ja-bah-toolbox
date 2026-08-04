import { useState } from 'react'
import { decodeBase64, encodeBase64 } from './logic'

export type Base64Mode = 'encode' | 'decode'

export function Base64Tool() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<Base64Mode>('encode')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)

  function run() {
    if (mode === 'encode') {
      setOutput(encodeBase64(input))
      setError(null)
    } else {
      const r = decodeBase64(input)
      if (r.ok) {
        setOutput(r.text)
        setError(null)
      } else {
        setOutput('')
        setError(r.error)
      }
    }
  }

  return (
    <div>
      <label>
        Mode
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as Base64Mode)}
        >
          <option value="encode">Encode</option>
          <option value="decode">Decode</option>
        </select>
      </label>
      <textarea
        aria-label="Base64 input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={10}
      />
      <button type="button" onClick={run}>
        Run
      </button>
      {error ? <p role="alert">{error}</p> : null}
      <textarea aria-label="Base64 output" value={output} readOnly rows={10} />
    </div>
  )
}

export default Base64Tool
