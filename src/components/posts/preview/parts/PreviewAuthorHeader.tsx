type Props = {
  name: string
  subtitle: string
  // Avatar background (platform brand color); falls back to neutral.
  accent?: string
  size?: number
}

// Generic avatar + name/subtitle row. Uses a placeholder identity until
// a real connected-account picker exists.
export function PreviewAuthorHeader({ name, subtitle, accent, size = 44 }: Props) {
  const initial = name.trim().charAt(0).toUpperCase() || '·'
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="rounded-full flex items-center justify-center text-white font-semibold shrink-0"
        style={{ width: size, height: size, backgroundColor: accent ?? '#9ca3af' }}
      >
        {initial}
      </div>
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-foreground leading-tight">
          {name}
        </div>
        <div className="text-[12px] text-tertiary-foreground leading-tight truncate">
          {subtitle}
        </div>
      </div>
    </div>
  )
}
