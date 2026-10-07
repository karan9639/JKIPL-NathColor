import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Printer, QrCode } from 'lucide-react'
import { api } from '@/lib/services'
import { errorMessage } from '@/lib/api'
import { downloadBlob } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { PageHeader, Panel, PanelHeader } from '@/components/ui/panel'

export default function QrPage() {
  const [value, setValue] = useState('')
  const [image, setImage] = useState<{ url: string; blob: Blob; value: string } | null>(null)

  useEffect(() => () => {
    if (image) URL.revokeObjectURL(image.url)
  }, [image])

  const generate = useMutation({
    mutationFn: (v: string) => api.generateQr(v),
    onSuccess: (blob, v) => setImage({ url: URL.createObjectURL(blob), blob, value: v }),
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <>
      <PageHeader title="Generate QR Code" description="Create a printable QR label for a job card, lot or order number." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Content" />
          <form
            className="flex flex-col gap-4 p-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (value.trim()) generate.mutate(value.trim())
            }}
          >
            <Field label="Text to encode" htmlFor="qr-value">
              <Input id="qr-value" autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 24581" className="h-11" />
            </Field>
            <Button type="submit" size="lg" disabled={!value.trim()} loading={generate.isPending} className="self-start">
              <QrCode aria-hidden="true" />
              Generate
            </Button>
          </form>
        </Panel>
        <Panel className="print-area">
          <PanelHeader
            title="Label"
            actions={
              image && (
                <div className="flex gap-2 print:hidden">
                  <Button size="sm" variant="outline" onClick={() => downloadBlob(image.blob, `qr-${image.value}.${image.blob.type.includes('svg') ? 'svg' : 'png'}`)}>
                    <Download aria-hidden="true" />
                    Download
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.print()}>
                    <Printer aria-hidden="true" />
                    Print
                  </Button>
                </div>
              )
            }
          />
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 p-6">
            {image ? (
              <>
                <img src={image.url} alt={`QR code for ${image.value}`} className="size-56 [image-rendering:pixelated]" />
                <p className="tabular text-lg font-semibold">{image.value}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Your QR code will appear here.</p>
            )}
          </div>
        </Panel>
      </div>
    </>
  )
}
