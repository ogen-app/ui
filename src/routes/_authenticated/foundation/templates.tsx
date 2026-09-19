import { createFileRoute, redirect } from '@tanstack/react-router'

/** `/foundation/templates` — platform × ratio. Closed for now; see `./look`. */
export const Route = createFileRoute('/_authenticated/foundation/templates')({
  beforeLoad: () => {
    throw redirect({ to: '/foundation' })
  },
})
