import { useState } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ActionBar, IoGrid, IoPanel } from '@/tools/shared/IoPanels'
import { transformCase, type CaseMode } from './logic'

export function TextCaseTool() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<CaseMode>('lower')
  const [output, setOutput] = useState('')

  function run() {
    setOutput(transformCase(input, mode))
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
              }}
            >
              <Trash2 /> Clear
            </Button>
          }
        >
          <Textarea
            aria-label="Text case input"
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
            aria-label="Text case output"
            readOnly
            className="min-h-[300px] resize-none rounded-none border-0 bg-muted/30 font-mono focus-visible:ring-0 focus-visible:ring-offset-0"
            value={output}
          />
        </IoPanel>
      </IoGrid>
      <ActionBar>
        <label className="flex items-center gap-2 text-sm">
          Mode
          <select
            className="rounded-md border border-input bg-background px-2 py-1"
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
        <Button type="button" onClick={run} disabled={!input.trim()}>
          Transform
        </Button>
      </ActionBar>
    </div>
  )
}

export default TextCaseTool
