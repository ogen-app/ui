import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * `twMerge`, told about the font sizes `src/index.css` adds to the theme.
 * It only knows Tailwind's own scale, and files any other `text-*` it meets
 * as a colour — so `text-display` beside `text-primary-foreground` was
 * merged away as the losing colour, and the page title fell back to the body
 * size. Every `--text-*` step added to the theme belongs in this list.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['display'],
    },
  },
})

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
