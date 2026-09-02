import { useEffect, useState, type ReactNode } from 'react'
import LogoFull from '@/assets/logo-full.svg?react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/styles'
import { OGENWAVES_LQIP, OGENWAVES_SRC } from './authBackdrop'

/**
 * How long the card will wait for the photograph before coming up regardless.
 *
 * The card follows the photo in so the two don't animate over each other, but
 * a background is never allowed to hold a login form hostage: on a slow
 * connection the ~570 KB image can take seconds, and the person is here to
 * sign in, not to look at the sea. Past this point the card comes up over the
 * blurred stand-in and the photo fades in behind it whenever it arrives.
 */
const CARD_REVEAL_TIMEOUT_MS = 600

/**
 * Whether the entrance has already played in this document.
 *
 * Login, register, forgot and reset each render their own `AppAuth`, so moving
 * between them unmounts one shell and mounts the next — and replaying the
 * entrance there would say "the page just loaded" about a card the user is
 * already looking at. The intro belongs to *arriving at the auth screens*, not
 * to each screen, so it latches for the life of the module: navigation between
 * the four swaps the card's contents and nothing moves.
 *
 * Module scope rather than a store because that is exactly the lifetime wanted
 * — one document. A real page load gets a fresh module and a fresh intro.
 */
let introPlayed = false

type AppAuthProps = {
  title?: string
  subtitle?: string
  form: ReactNode
  bottomNav: ReactNode | undefined
}

export function AppAuth({ title, subtitle, form, bottomNav }: AppAuthProps) {
  // Read once, at mount: the latch closes immediately below, and this shell
  // has to keep animating for as long as it is the one that opened.
  const [animate] = useState(!introPlayed)
  /** The photograph has either loaded or failed — either way it is done. */
  const [photoSettled, setPhotoSettled] = useState(!animate)
  const [cardRevealed, setCardRevealed] = useState(!animate)

  useEffect(() => {
    introPlayed = true
  }, [])

  useEffect(() => {
    if (photoSettled) {
      setCardRevealed(true)
      return
    }
    const timer = window.setTimeout(
      () => setCardRevealed(true),
      CARD_REVEAL_TIMEOUT_MS,
    )
    return () => window.clearTimeout(timer)
  }, [photoSettled])

  return (
    // `overflow-hidden` because the blurred stand-in below is scaled past the
    // viewport on purpose; without it that overhang would raise scrollbars.
    <div className="min-h-screen min-w-screen bg-background relative overflow-hidden">
      {/* The 13×18 thumbnail of the photograph, inline in the bundle so it is
          painted on the first frame. Scaled up and blurred it is the colour and
          light of the real image; `scale-110` pushes the blur's soft edge off
          screen, which is otherwise visible as a pale border. It stays mounted
          under the photo — it costs nothing there and it is what remains on
          screen if the photo never arrives. */}
      <div
        aria-hidden
        className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl"
        style={{ backgroundImage: `url("${OGENWAVES_LQIP}")` }}
      />
      {/* The photograph the auth screens sit on. Purely decorative — every word
          on this screen is inside the opaque card above it — so it is hidden
          from assistive tech and carries no alt text. It only becomes visible
          from `md` up, where the card stops being full-bleed. */}
      <img
        src={OGENWAVES_SRC}
        alt=""
        aria-hidden
        decoding="async"
        // A cached photo can finish before React attaches `onLoad`, which would
        // leave the card waiting out the timeout for an image already on
        // screen. `complete` is how that case reports itself.
        ref={(node) => {
          if (node?.complete) setPhotoSettled(true)
        }}
        onLoad={() => setPhotoSettled(true)}
        // A missing photo settles too. The blurred stand-in stays, and the card
        // must not be held back by a file that is never coming.
        onError={() => setPhotoSettled(true)}
        className={cn(
          'absolute inset-0 h-full w-full object-cover',
          !photoSettled && 'opacity-0',
          photoSettled && animate && 'auth-photo-motion',
        )}
      />
      <div className="absolute inset-0 md:inset-12 xl:top-12 xl:bottom-12">
        {/* `auth-card-motion` (index.css) rises 24px and fades over 500ms,
            after a 100ms delay that is exactly the photograph's fade — the card
            starts up as that finishes rather than crossing it. Arriving from
            another auth screen it carries no motion class at all: same card,
            new contents. */}
        <div
          className={cn(
            'w-full md:max-w-[528px] xl:w-[528px] mx-auto h-full bg-primary px-6 py-8 md:px-10 md:py-12 flex flex-col',
            !cardRevealed && 'opacity-0',
            cardRevealed && animate && 'auth-card-motion',
          )}
        >
          <div className="flex h-0 flex-1 flex-col gap-4 md:gap-10 overflow-y-auto">
            <div className="shrink-0">
              <Link to={'/'}>
                <LogoFull className={'h-6 w-auto md:h-8'} />
              </Link>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className={'flex flex-col gap-6'}>
                {title && (
                  <div>
                    <h1
                      className={
                        'text-[1.5rem] leading-10 md:text-[2rem] md:leading-12 font-medium font-display tracking-tight'
                      }
                    >
                      {title}
                    </h1>
                    {/* Shown at every width. It used to be desktop-only, which
                        was defensible while it only ever held a tagline — but
                        the login screen now says *why* it appeared here (an
                        expired session, a finished reset), and a phone is
                        exactly where being logged out without explanation is
                        most alarming. */}
                    {subtitle && (
                      <div className="text-[13px] pt-1 leading-4 text-secondary-foreground">
                        {subtitle}
                      </div>
                    )}
                  </div>
                )}
                {form}
              </div>
            </div>
            {/* `leading-5`, not the `leading-4` the subtitle uses. This row is
                flush with the bottom of the scroller, and 13px type in a 16px
                line box is tighter than the font's own content area (~17px) —
                so the inline link inside it spilled half a pixel past the line
                box, which was enough to make the card permanently scrollable
                with a screenful of empty space above it. */}
            {bottomNav && (
              <div className="shrink-0 mt-auto text-[13px] leading-5 text-secondary-foreground">
                {bottomNav}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
