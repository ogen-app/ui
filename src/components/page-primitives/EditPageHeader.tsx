import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib'
import { PageHeader } from './PageHeader.tsx'

type Breadcrumb = {
  label: string
  to: string
}

type EditPageHeaderProps = {
  title: string
  breadcrumbs?: Breadcrumb[]
  className?: string
  actions?: ReactNode
  breadcrumbTrailing?: ReactNode
  unsaved?: boolean
}

/**
 * Header for edit pages: a breadcrumb trail ending in the current title plus
 * an unsaved-changes dot, composed on the PageHeader chrome.
 */
export function EditPageHeader({
  title,
  breadcrumbs = [],
  className,
  actions,
  breadcrumbTrailing,
  unsaved = false,
}: EditPageHeaderProps) {
  return (
    <PageHeader className={className} actions={actions}>
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
      <span
        aria-hidden={!unsaved}
        aria-label="Unsaved changes"
        title="Unsaved changes"
        className={cn(
          'inline-block size-1.5 rounded-full bg-secondary-foreground shrink-0 transition-opacity duration-200',
          unsaved ? 'opacity-100 animate-pulse' : 'opacity-0',
        )}
      />
      {breadcrumbTrailing && (
        <div className="flex items-center shrink-0">{breadcrumbTrailing}</div>
      )}
    </PageHeader>
  )
}
