import { type ReactNode, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib'
import { Backdrop } from '@/components/ui/backdrop'
import { ZIndex } from '@/config/zIndex'
import { Button } from '@/components/ui/button'
import { XIcon } from '@phosphor-icons/react'

export interface ModalContainerProps {
  /**
   * Whether the modal is open/visible
   */
  isOpen: boolean

  /**
   * Callback when the modal should be closed
   */
  onClose: () => void

  /**
   * Whether the modal has padding inside or not
   */

  isContainer?: boolean

  /**
   * Modal title displayed in the header
   */
  title?: string

  /**
   * Modal content
   */
  children: ReactNode

  /**
   * Additional CSS classes for the modal content
   */
  className?: string

  /**
   * Whether to show the close button in header
   * @default true
   */
  showCloseButton?: boolean

  /**
   * Whether clicking the backdrop should close the modal
   * @default true
   */
  closeOnBackdropClick?: boolean

  /**
   * Whether pressing ESC should close the modal
   * @default true
   */
  closeOnEscape?: boolean

  /**
   * Modal size variant (width)
   * @default 'default'
   */
  size?: 'small' | 'default' | 'large' | 'xlarge' | 'full'

  /**
   * Modal height variant
   * @default 'auto'
   */
  height?: 'auto' | 'full' | 'large' | 'medium' | 'small'

  /**
   * Z-index level for the modal
   * Use 'default' (z-50) for regular modals
   * Use 'nested' (z-60) for modals that appear on top of the edit overlay
   * @default 'default'
   */
  zIndex?: 'default' | 'nested'

  /**
   * Explicit z-index numeric value that takes precedence over the `zIndex` preset.
   * Used by the overlay registry to assign computed z-index values.
   */
  zIndexOverride?: number
}

/**
 * Generic modal container component with:
 * - Smooth fade-in/fade-out transitions
 * - Background overlay with blur effect
 * - Header with title and close button
 * - Click outside to close
 * - ESC key to close
 * - Focus management and accessibility
 * - Multiple size variants
 * - Portal rendering for proper z-index handling
 */
export function ModalContainer({
  isOpen,
  onClose,
  title,
  children,
  className,
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  isContainer = false,
  size = 'default',
  height = 'auto',
  zIndex = 'default',
  zIndexOverride,
}: ModalContainerProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<Element | null>(null)

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape, onClose])

  // Handle focus management
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement

      // Pull focus into the modal — but only if nothing inside it has already
      // claimed it. React applies a child's `autoFocus` during commit, before
      // this effect runs, so focusing the container unconditionally would take
      // focus straight back off the field the modal meant to start on.
      if (
        modalRef.current &&
        !modalRef.current.contains(document.activeElement)
      ) {
        modalRef.current.focus()
      }

      // Prevent body scroll
      document.body.style.overflow = 'hidden'
    } else {
      // Restore focus to the previously focused element
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus()
      }

      // Restore body scroll
      document.body.style.overflow = ''
    }

    return () => {
      // Cleanup on unmount
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && event.target === event.currentTarget) {
      onClose()
    }
  }

  // Size variants (width)
  const sizeClasses = {
    small: 'max-w-md',
    default: 'max-w-lg',
    large: 'max-w-2xl',
    xlarge: 'max-w-4xl',
    full: 'max-w-[95vw]',
  }

  // Height variants
  const heightClasses = {
    auto: '',
    small: 'max-h-[40vh]',
    medium: 'max-h-[60vh]',
    large: 'max-h-[80vh]',
    full: 'h-full',
  }

  // Backdrop alignment classes based on height
  const backdropAlignmentClasses = {
    auto: 'items-center justify-center',
    small: 'items-center justify-center',
    medium: 'items-center justify-center',
    large: 'items-center justify-center',
    full: 'items-stretch justify-center lg:py-20',
  }

  // Z-index values from centralized config
  const zIndexValues = {
    default: ZIndex.modalOverlay,
    nested: ZIndex.modalNested,
  }

  const resolvedZIndex = zIndexOverride ?? zIndexValues[zIndex]

  if (!isOpen) return null

  return createPortal(
    <Backdrop
      open={isOpen}
      onClick={handleBackdropClick}
      zIndex={resolvedZIndex}
      role="dialog"
      aria-modal={true}
      aria-labelledby={title ? 'modal-title' : undefined}
      className={cn(
        'flex',
        'animate-in fade-in-0 duration-300',
        backdropAlignmentClasses[height],
      )}
    >
      <div
        ref={modalRef}
        className={cn(
          'relative w-full bg-popover rounded-none',
          'animate-in zoom-in-95 duration-300',
          'focus:outline-none',
          sizeClasses[size],
          heightClasses[height],
          // A modal with a height budget stacks header and body as flex items
          // so the body can be told what it has left to work with. Auto-height
          // modals are untouched — they grow with their content, and a flex
          // column would change nothing except what can go wrong.
          height !== 'auto' && 'flex flex-col',
          className,
        )}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="flex flex-col gap-1.5 px-6 py-4 border-b">
            <h2
              id="modal-title"
              className="font-semibold text-foreground leading-7"
            >
              {title}
            </h2>
          </div>
        )}

        {/* Close button — positioned to match SheetContent */}
        {showCloseButton && (
          <Button
            variant="ghost"
            size="smIcon"
            onClick={onClose}
            className="absolute top-4 right-4"
            aria-label="Close modal"
          >
            <XIcon className="size-5" />
            <span className="sr-only">Close</span>
          </Button>
        )}

        {/* Content — a height-bounded modal hands its body whatever the header
            left over and lets the body decide what scrolls inside it, so a
            form can pin its buttons while only the long part moves. */}
        <div
          className={cn(
            isContainer ? 'h-full' : 'p-6',
            height !== 'auto' && 'min-h-0 flex-1',
          )}
        >
          {children}
        </div>
      </div>
    </Backdrop>,
    document.body,
  )
}
