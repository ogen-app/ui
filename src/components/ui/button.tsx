import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { IconContext } from '@phosphor-icons/react'

import { cn } from '@/lib'
import { Spinner } from '@/components/ui/spinner'

/**
 * Phosphor draws its outline weights as real strokes, so "thicker" is a
 * `weight`, not a CSS stroke-width. Buttons default their icons to `bold`;
 * an explicit `weight` prop on the icon still wins over this context.
 */
const buttonIconContext = { weight: 'bold' as const }

const buttonVariants = cva(
  'relative inline-flex items-center cursor-pointer whitespace-nowrap shrink-0 outline-none ' +
    'gap-2 rounded-button text-control font-medium select-none transition-all ' +
    'disabled:pointer-events-none ' +
    // Icon sizing is owned by the `size` variant below (16px everywhere except
    // the 16px-tall xsIcon); an explicit `size-*` on the icon still wins.
    "[&_svg:not([class*='stroke-'])]:stroke-[2] [&_svg]:shrink-0 " +
    'focus-visible:inset-ring-[2px] focus-visible:inset-ring-ring aria-invalid:ring-destructive/20 aria-invalid:border-destructive ' +
    '[&_[data-spinner-container]]:rounded-button',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary-foreground hover:text-primary ' +
          'data-[active=true]:bg-secondary data-[active=true]:inset-ring-[2px] data-[active=true]:inset-ring-ring ' +
          'data-[active=true]:hover:text-primary-foreground data-[active=true]:hover:bg-primary ' +
          '[&_[data-spinner-container]]:bg-primary [&_[data-spinner]]:bg-primary-foreground/20 [&_[data-spinner]:before]:bg-primary-foreground ' +
          'disabled:text-senary-foreground',
        defaultInverted:
          'bg-primary-foreground text-primary hover:bg-primary-foreground-elevated ' +
          'data-[active=true]:bg-primary-foreground-elevated ' +
          '[&_[data-spinner-container]]:bg-primary-foreground ' +
          'disabled:bg-senary',
        tableHeader:
          'bg-transparent rounded-none text-tertiary-foreground font-regular text-xs hover:bg-table-row hover:text-primary-foreground ' +
          'data-[active=true]:text-primary-foreground',
        tableRow:
          'bg-transparent text-secondary-foreground hover:text-primary-foreground hover:bg-primary ' +
          'data-[active=true]:text-primary-foreground data-[active=true]:bg-primary',
        // A destructive button is red in its body (`destructiveInverted`, the
        // step that does it) or in its icon (this one, the way in): `outline`
        // with the glyph in the danger colour. Never tinted, and never without
        // an icon — without one nothing on it says danger.
        destructive:
          'bg-transparent text-primary-foreground border hover:bg-quaternary hover:border-quaternary ' +
          'data-[active=true]:bg-quaternary data-[active=true]:border-quaternary [&_svg]:text-destructive ' +
          'data-[loading]:text-primary-foreground/0 [&_[data-spinner]]:bg-destructive/20 [&_[data-spinner]:before]:bg-destructive ',
        destructiveInverted:
          'bg-destructive text-primary hover:bg-destructive/80 ' +
          'data-[active=true]:bg-destructive/80 ' +
          '[&_[data-spinner-container]]:bg-destructive',
        outline:
          'bg-transparent text-primary-foreground border hover:bg-quaternary hover:border-quaternary ' +
          'data-[active=true]:bg-quaternary data-[active=true]:border-quaternary ' +
          'data-[loading]:text-primary-foreground/0 [&_[data-spinner]]:bg-primary-foreground/20 [&_[data-spinner]:before]:bg-primary-foreground',
        secondary:
          'bg-primary text-primary-foreground hover:bg-secondary ' +
          'data-[active=true]:bg-secondary ' +
          '[&_[data-spinner-container]]:bg-primary [&_[data-spinner]]:bg-primary-foreground/20 [&_[data-spinner]:before]:bg-primary-foreground',
        // A filled button for a white surface. `secondary` is `bg-primary`,
        // which *is* white — right on the grey app canvas, invisible inside a
        // modal. This is the same weight one step darker, so a dialog's
        // actions read as objects rather than as words.
        neutral:
          'bg-tertiary text-primary-foreground hover:bg-quaternary ' +
          'data-[active=true]:bg-quaternary ' +
          'disabled:text-quaternary-foreground ' +
          '[&_[data-spinner-container]]:bg-tertiary [&_[data-spinner]]:bg-primary-foreground/20 [&_[data-spinner]:before]:bg-primary-foreground',
        // The brand teal, filled. For the one action on a screen that is worth
        // colouring — never for a second button beside it, which would make
        // the colour mean "a button" rather than "this one".
        accent:
          'bg-accent text-primary hover:bg-accent/90 ' +
          'data-[active=true]:bg-accent/90 ' +
          '[&_[data-spinner-container]]:bg-accent [&_[data-spinner]]:bg-primary/20 [&_[data-spinner]:before]:bg-primary',
        // `accent` with the sweep in place of the teal, for the one action a
        // screen that already speaks in the sweep is selling. Blue to green
        // only: white on the orange tip falls short of legible.
        sweep:
          'bg-linear-to-r from-sweep-from to-sweep-to text-primary hover:opacity-90 ' +
          'data-[active=true]:opacity-90 ' +
          '[&_[data-spinner-container]]:bg-sweep-to [&_[data-spinner]]:bg-primary/20 [&_[data-spinner]:before]:bg-primary',
        // Accented without a fill: the default surface, with the ink drawn by
        // `GradientButton` (ui/gradient-button), which puts the sweep on the
        // mark and the label. It hovers to a grey rather than to `default`'s
        // black, which the gradient cannot be read on.
        gradient:
          'bg-primary hover:bg-secondary data-[active=true]:bg-secondary ' +
          '[&_[data-spinner-container]]:bg-primary [&_[data-spinner]]:bg-sweep-to/20 [&_[data-spinner]:before]:bg-sweep-to',
        ghost:
          'bg-transparent text-secondary-foreground hover:text-primary-foreground ' +
          'data-[active=true]:text-primary-foreground data-[active=true]:bg-quaternary ' +
          'data-[loading]:text-secondary-foreground/0 [&_[data-spinner]]:bg-secondary-foreground/20 [&_[data-spinner]:before]:bg-secondary-foreground',
        link: 'text-primary-foreground data-[active=true]:underline',

        headerIcon:
          'bg-transparent p-0 m-0 gap-0 rounded-none justify-center text-header-icon hover:text-primary-foreground ' +
          'data-[active=true]:text-primary-foreground',

        container: '',
        menu:
          // The rail's row, as the prototype draws it: 36px, 8px in, grey
          // until pointed at or current, then the tertiary fill and ink.
          'bg-transparent h-9 px-2 w-full gap-2.5 justify-start rounded-button text-secondary-foreground overflow-hidden ' +
          'hover:bg-tertiary hover:text-primary-foreground ' +
          // The chrome's one type rule: 14px, regular for anything you press,
          // in sentence case — the same voice as the page under it.
          'text-sm/6 font-normal whitespace-nowrap ' +
          'data-[active=true]:bg-tertiary data-[active=true]:text-primary-foreground ' +
          // Collapsed, the row is 36px square and the 24px slot sits centred.
          'group-data-[collapsible=icon]:px-1.5 ' +
          // The text container keeps a static width so labels never reflow while
          // the sidebar collapses — the button just clips them via overflow-hidden.
          '[&>div]:w-[200px] [&>div]:flex-none [&>div]:flex [&>div]:items-center [&>div]:gap-2.5',
      },

      // Heights are fixed and `items-center` centres the row, so the padding is
      // horizontal only. The sizes used to carry 3px more on top than below —
      // an optical nudge for the face before CON-390 — which under Plex Sans
      // put every label and icon 1.4px low.
      size: {
        default: "h-10 px-4 [&_svg:not([class*='size-'])]:size-4",
        defaultIcon:
          "h-10 p-0 w-10 justify-center [&_svg:not([class*='size-'])]:size-4",
        // The × inside a chip or a pill: 16px square, a 12px glyph.
        xsIcon:
          "h-4 w-4 p-0 justify-center [&_svg:not([class*='size-'])]:size-3",
        // An icon button in a line of text or a card's head — close, refresh —
        // where a 32px box would push the line taller than its words.
        rowIcon:
          "h-6 w-6 p-0 justify-center [&_svg:not([class*='size-'])]:size-4",
        // A small card's own action (a calendar slot's Compile and Draft),
        // where 32px would be taller than the card's lines.
        xs: "h-6 px-2 gap-1 [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 px-3 [&_svg:not([class*='size-'])]:size-4",
        // The top bar's buttons (Help, Work with Ogen): 36px, centred on the
        // 56px bar with the switcher beside them.
        bar: "h-9 px-3 [&_svg:not([class*='size-'])]:size-4",
        smIcon:
          "h-8 p-0 w-8 justify-center [&_svg:not([class*='size-'])]:size-4",
        lg: "h-10 px-4 [&_svg:not([class*='size-'])]:size-4",
        lgIcon:
          "h-10 p-0 w-10 justify-center [&_svg:not([class*='size-'])]:size-4",
        xl: "h-11 px-6 [&_svg:not([class*='size-'])]:size-4",
        xlIcon:
          "h-11 p-0 w-11 justify-center [&_svg:not([class*='size-'])]:size-4",
        excluded: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean
      loading?: boolean
      active?: boolean
      showEllipse?: boolean
    }
>(function Button(
  {
    className,
    variant,
    size,
    asChild = false,
    loading = false,
    active = false,
    disabled,
    children,
    showEllipse = false,
    ...props
  },
  ref,
) {
  // When using asChild with loading, force it to render as a button
  const Comp = asChild && !loading ? Slot : 'button'

  // For asChild without loading, render as normal (single child for Slot)
  if (asChild && !loading) {
    return (
      <IconContext.Provider value={buttonIconContext}>
        <Comp
          ref={ref}
          data-slot="button"
          data-loading={loading ? 'true' : undefined}
          data-active={active ? 'true' : undefined}
          className={cn(buttonVariants({ variant, size, className }))}
          disabled={disabled}
          {...props}
        >
          {children}
        </Comp>
      </IconContext.Provider>
    )
  }

  // For normal button or loading state
  return (
    <IconContext.Provider value={buttonIconContext}>
      <Comp
        ref={ref}
        data-slot="button"
        data-loading={loading ? 'true' : undefined}
        data-active={active ? 'true' : undefined}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {children}
        {showEllipse && (
          <div className="absolute top-3 right-3 pointer-events-none">
            <div className="w-2 h-2 rounded-full bg-positive border border-primary" />
          </div>
        )}
        {loading && (
          <span
            data-spinner-container
            className="absolute inset-0 flex items-center justify-center"
          >
            <Spinner />
          </span>
        )}
      </Comp>
    </IconContext.Provider>
  )
})

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants }
