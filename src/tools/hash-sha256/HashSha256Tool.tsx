import { useState } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ActionBar, IoGrid, IoPanel } from '@/tools/shared/IoPanels'
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
            aria-label="SHA-256 input"
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
            aria-label="SHA-256 output"
            readOnly
            className="min-h-[120px] resize-none rounded-none border-0 bg-muted/30 font-mono focus-visible:ring-0 focus-visible:ring-offset-0"
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
        <Button type="button" onClick={run} disabled={!input.trim()}>
          Hash
        </Button>
      </ActionBar>
    </div>
  )
}

export default HashSha256Tool
