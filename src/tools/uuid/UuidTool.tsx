import { useState } from 'react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { IoGrid, IoPanel } from '@/tools/shared/IoPanels'
import { generateUuids } from './logic'

export function UuidTool() {
  const [count, setCount] = useState(1)
  const [output, setOutput] = useState('')

  function run() {
    setOutput(generateUuids(count).join('\n'))
  }

  return (
    <div className="space-y-6">
      <IoGrid>
        <IoPanel title="Controls">
          <div className="flex flex-wrap items-center gap-4 p-4">
            <label className="flex items-center gap-2 text-sm">
              Count
              <Input
                type="number"
                min={1}
                max={100}
                aria-label="UUID count"
                className="w-24"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </label>
            <Button type="button" onClick={run}>
              Generate
            </Button>
          </div>
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
            aria-label="UUID output"
            readOnly
            rows={10}
            className="min-h-[300px] resize-none rounded-none border-0 bg-muted/30 font-mono focus-visible:ring-0 focus-visible:ring-offset-0"
            value={output}
          />
        </IoPanel>
      </IoGrid>
    </div>
  )
}

export default UuidTool
