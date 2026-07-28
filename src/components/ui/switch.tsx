import { cn } from '@/lib'

type SwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  ...rest
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={rest['aria-label']}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        // 22×10 pill with a 1px inset border; the 4×4 pin travels the 20px
        // of track left inside that border.
        'relative inline-flex h-[10px] w-[22px] shrink-0 cursor-pointer items-center',
        'rounded-full border border-foreground transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary-foreground' : 'bg-transparent',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-block size-1 rounded-full transition-transform',
          checked
            ? 'bg-primary translate-x-[14px]'
            : 'bg-foreground translate-x-[2px]',
        )}
      />
    </button>
  )
}
