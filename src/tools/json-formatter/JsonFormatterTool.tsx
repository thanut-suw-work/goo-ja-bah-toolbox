import { useState } from 'react'
import { formatJson, type FormatMode } from './logic'

export function JsonFormatterTool() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<FormatMode>('pretty')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)

  function run() {
    const r = formatJson(input, mode)
    if (r.ok) {
      setOutput(r.text)
      setError(null)
    } else {
      setError(r.error)
    }
  }

  return (
    <div>
      <label>
        Mode
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as FormatMode)}
        >
          <option value="pretty">Pretty</option>
          <option value="minify">Minify</option>
        </select>
      </label>
      <textarea
        aria-label="JSON input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={10}
      />
      <button type="button" onClick={run}>
        Format
      </button>
      {error ? <p role="alert">{error}</p> : null}
      <textarea aria-label="JSON output" value={output} readOnly rows={10} />
    </div>
  )
}

export default JsonFormatterTool
