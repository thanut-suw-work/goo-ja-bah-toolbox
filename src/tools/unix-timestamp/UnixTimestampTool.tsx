import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { IoGrid, IoPanel } from '@/tools/shared/IoPanels'
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
    <div className="space-y-6">
      <IoGrid>
        <IoPanel title="Unix seconds → ISO UTC">
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                type="number"
                aria-label="Unix timestamp seconds"
                className="w-48"
                value={secondsInput}
                onChange={(e) => setSecondsInput(e.target.value)}
              />
              <Button type="button" onClick={convertToIso}>
                Convert
              </Button>
            </div>
            {tsError ? (
              <p role="alert" className="text-sm text-destructive">
                {tsError}
              </p>
            ) : null}
            <Textarea
              aria-label="ISO UTC output"
              readOnly
              rows={3}
              className="resize-none bg-muted/30 font-mono"
              value={isoOutput}
            />
          </div>
        </IoPanel>
        <IoPanel title="ISO UTC → Unix seconds">
          <div className="space-y-3 p-4">
            <Textarea
              aria-label="ISO UTC input"
              rows={3}
              className="resize-none font-mono"
              value={isoInput}
              onChange={(e) => setIsoInput(e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={convertToSeconds}>
                Convert
              </Button>
            </div>
            {isoError ? (
              <p role="alert" className="text-sm text-destructive">
                {isoError}
              </p>
            ) : null}
            <Input
              type="text"
              aria-label="Unix seconds output"
              readOnly
              className="bg-muted/30 font-mono"
              value={secondsOutput}
            />
          </div>
        </IoPanel>
      </IoGrid>
    </div>
  )
}

export default UnixTimestampTool
