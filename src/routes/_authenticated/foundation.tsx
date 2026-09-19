import { createFileRoute, Outlet } from '@tanstack/react-router'

/**
 * Brand — the workspace-level material every campaign writes from (CON-227).
 *
 * **A pathless layout, and nothing else.** It used to own a header and a tab
 * bar; it owns no chrome at all now, because Brand is a hub and five drilldowns
 * rather than one screen with five tabs (see `lib/brandSections`). Each child
 * is a whole page — its own header, its own way back — and a shared frame
 * around them would be a frame that has to be right for the Overview, for a
 * library, and for the template compositor at once.
 *
 * So it exists to give the section a parent, and renders its child. The voice
 * and audience editors escape it deliberately (`foundation_/…`) to draw
 * fullscreen.
 */
export const Route = createFileRoute('/_authenticated/foundation')({
  component: Outlet,
})
