export type PageStatusFooterProps = {
  message?: string
}

/**
 * The word set as a texture, not as a label — which is why it is uppercased
 * here rather than in the copy (callers pass the same string they use in
 * sentence case elsewhere) and why it sits at half opacity on top of the
 * already-quiet senary token. It should read as a watermark behind the page,
 * never as something to look at.
 */
const WORD =
  'font-display font-black uppercase tracking-[0.05em] opacity-50 text-senary-foreground text-center text-[140px] leading-none pt-2'

export function PageStatusFooter({ message = 'ERROR' }: PageStatusFooterProps) {
  return (
    <div
      className={
        'relative flex-shrink-0 h-[140px] bottom-0 left-0 right-0 flex flex-col gap-0 overflow-hidden'
      }
    >
      <div className={'flex h-[140px] gap-24 justify-center items-center relative'}>
        {/* Three copies so the row reads as a repeating band rather than one
            centred word; the fader over them takes the outer two down at the
            edges, so they never look cropped. */}
        <div className={WORD}>{message}</div>
        <div className={WORD}>{message}</div>
        <div className={WORD}>{message}</div>
        <div className={'absolute inset-0 background-fader-2'} />
      </div>
    </div>
  )
}
