import { EyeIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

export type PostView = 'edit' | 'preview'

type Props = {
  value: PostView
  onChange: (view: PostView) => void
}

// Single toggle that flips the composer between edit and preview.
export function PostPreviewToggle({ value, onChange }: Props) {
  const active = value === 'preview'
  return (
    <Button
      variant="ghost"
      size="sm"
      active={active}
      aria-pressed={active}
      onClick={() => onChange(active ? 'edit' : 'preview')}
    >
      <EyeIcon className="size-4" />
      Preview
    </Button>
  )
}
