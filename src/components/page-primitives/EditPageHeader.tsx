import { Link } from '@tanstack/react-router'
import { PageHeader } from './PageHeader'
import { SaveStatus } from './SaveStatus'

type Breadcrumb = {
  label: string
  to: string
}

type EditPageHeaderProps = {
  title: string
  breadcrumbs?: Breadcrumb[]
  unsaved?: boolean
}

/**
 * Header for edit pages: a breadcrumb trail ending in the current title, with
 * the autosave state centred, composed on the PageHeader chrome.
 *
 * The save state used to be a pulsing dot tucked after the title, which meant
 * this page reported the same thing in a different shape and a different place
 * from the post editor. It is the shared `SaveStatus` now — one glyph,
 * top-centre, everywhere something autosaves.
 */
export function EditPageHeader({ title, breadcrumbs = [], unsaved = false }: EditPageHeaderProps) {
  return (
    <PageHeader center={<SaveStatus saving={unsaved} />}>
      <nav className="flex items-center gap-1.5 text-[13px] leading-4 font-medium font-sans tracking-tight truncate">
        {breadcrumbs.map((crumb) => (
          <span key={crumb.to} className="flex items-center gap-1.5">
            <Link to={crumb.to} className="text-tertiary-foreground hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
            <span className="text-tertiary-foreground">/</span>
          </span>
        ))}
        <span className="truncate">{title}</span>
      </nav>
    </PageHeader>
  )
}
