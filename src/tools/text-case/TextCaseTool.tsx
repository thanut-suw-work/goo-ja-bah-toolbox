import { useState } from 'react'
import { transformCase, type CaseMode } from './logic'

export function TextCaseTool() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<CaseMode>('lower')
  const [output, setOutput] = useState('')

  function run() {
    setOutput(transformCase(input, mode))
  }

  return (
    <div>
      <label>
        Mode
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as CaseMode)}
        >
          <option value="lower">lower</option>
          <option value="upper">UPPER</option>
          <option value="title">Title Case</option>
          <option value="camel">camelCase</option>
          <option value="snake">snake_case</option>
        </select>
      </label>
      <textarea
        aria-label="Text case input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={10}
      />
      <button type="button" onClick={run}>
        Transform
      </button>
      <textarea aria-label="Text case output" value={output} readOnly rows={10} />
    </div>
  )
}

export default TextCaseTool
