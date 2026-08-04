import { useState } from 'react'
import { timestampToIsoUtc, isoToUnixSeconds } from './logic'

export function UnixTimestampTool() {
  const [secondsInput, setSecondsInput] = useState('')
  const [isoInput, setIsoInput] = useState('')
  const [isoOutput, setIsoOutput] = useState('')
  const [secondsOutput, setSecondsOutput] = useState('')
  const [tsError, setTsError] = useState<string | null>(null)
  const [isoError, setIsoError] = useState<string | null>(null)

  function convertToIso() {
    const r = timestampToIsoUtc(Number(secondsInput))
    if (r.ok) {
      setIsoOutput(r.iso)
      setTsError(null)
    } else {
      setIsoOutput('')
      setTsError(r.error)
    }
  }

  function convertToSeconds() {
    const r = isoToUnixSeconds(isoInput)
    if (r.ok) {
      setSecondsOutput(String(r.seconds))
      setIsoError(null)
    } else {
      setSecondsOutput('')
      setIsoError(r.error)
    }
  }

  return (
    <div>
      <section>
        <h2>Unix seconds → ISO UTC</h2>
        <input
          type="number"
          aria-label="Unix timestamp seconds"
          value={secondsInput}
          onChange={(e) => setSecondsInput(e.target.value)}
        />
        <button type="button" onClick={convertToIso}>
          Convert
        </button>
        {tsError ? <p role="alert">{tsError}</p> : null}
        <textarea
          aria-label="ISO UTC output"
          value={isoOutput}
          readOnly
          rows={3}
        />
      </section>
      <section>
        <h2>ISO UTC → Unix seconds</h2>
        <textarea
          aria-label="ISO UTC input"
          value={isoInput}
          onChange={(e) => setIsoInput(e.target.value)}
          rows={3}
        />
        <button type="button" onClick={convertToSeconds}>
          Convert
        </button>
        {isoError ? <p role="alert">{isoError}</p> : null}
        <input
          type="text"
          aria-label="Unix seconds output"
          value={secondsOutput}
          readOnly
        />
      </section>
    </div>
  )
}

export default UnixTimestampTool
