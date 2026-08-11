import { useState } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ActionBar, IoGrid, IoPanel } from '@/tools/shared/IoPanels'
import {
  decodeUtf,
  encodeUtf,
  type UtfEncoding,
} from './logic'

export type UtfMode = 'encode' | 'decode'

export function UtfEncodingTool() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<UtfMode>('encode')
  const [encoding, setEncoding] = useState<UtfEncoding>('utf-8')
  const [bom, setBom] = useState(false)
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const bomEnabled = encoding === 'utf-16le' || encoding === 'utf-32le'

  function run() {
    if (mode === 'encode') {
      setOutput(encodeUtf(input, encoding, bomEnabled && bom))
      setError(null)
    } else {
      const r = decodeUtf(input, encoding, bomEnabled && bom)
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
    <div className="space-y-6">
      <IoGrid>
        <IoPanel
          title="Input"
          actions={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setInput('')
                setOutput('')
                setError(null)
              }}
            >
              <Trash2 /> Clear
            </Button>
          }
        >
          <Textarea
            aria-label="UTF encoding input"
            className="min-h-[300px] resize-none rounded-none border-0 font-mono focus-visible:ring-0 focus-visible:ring-offset-0"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </IoPanel>
        <IoPanel
          title="Output"
          actions={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!output}
              onClick={async () => {
                await navigator.clipboard.writeText(output)
                toast.success('Copied to clipboard')
              }}
            >
              <Copy /> Copy
            </Button>
          }
        >
          <Textarea
            aria-label="UTF encoding output"
            readOnly
            className="min-h-[300px] resize-none rounded-none border-0 bg-muted/30 font-mono focus-visible:ring-0 focus-visible:ring-offset-0"
            value={output}
          />
        </IoPanel>
      </IoGrid>
      {error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : null}
      <ActionBar>
        <label className="flex items-center gap-2 text-sm">
          Mode
          <select
            className="rounded-md border border-input bg-background px-2 py-1"
            value={mode}
            onChange={(e) => setMode(e.target.value as UtfMode)}
          >
            <option value="encode">Encode</option>
            <option value="decode">Decode</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Encoding
          <select
            className="rounded-md border border-input bg-background px-2 py-1"
            value={encoding}
            onChange={(e) => setEncoding(e.target.value as UtfEncoding)}
          >
            <option value="utf-8">UTF-8</option>
            <option value="utf-16le">UTF-16LE</option>
            <option value="utf-32le">UTF-32LE</option>
            <option value="code-points">Code points</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={bomEnabled && bom}
            disabled={!bomEnabled}
            onChange={(e) => setBom(e.target.checked)}
          />
          BOM
        </label>
        <Button type="button" onClick={run} disabled={!input.trim()}>
          Run
        </Button>
      </ActionBar>
    </div>
  )
}

export default UtfEncodingTool
