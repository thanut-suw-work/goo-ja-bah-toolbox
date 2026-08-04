import { useState } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ActionBar, IoGrid, IoPanel } from '@/tools/shared/IoPanels'
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
            aria-label="JSON input"
            className="min-h-[300px] resize-none rounded-none border-0 font-mono focus-visible:ring-0"
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
            aria-label="JSON output"
            readOnly
            className="min-h-[300px] resize-none rounded-none border-0 bg-muted/30 font-mono focus-visible:ring-0"
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
            onChange={(e) => setMode(e.target.value as FormatMode)}
          >
            <option value="pretty">Pretty</option>
            <option value="minify">Minify</option>
          </select>
        </label>
        <Button type="button" onClick={run} disabled={!input.trim()}>
          Format
        </Button>
      </ActionBar>
    </div>
  )
}

export default JsonFormatterTool
