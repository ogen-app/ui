import { createFileRoute, redirect } from '@tanstack/react-router'

/** `/brand/templates` — platform × ratio. Closed for now; see `./look`. */
export const Route = createFileRoute('/_authenticated/brand/templates')({
  beforeLoad: () => {
    throw redirect({ to: '/brand' })
  },
})
