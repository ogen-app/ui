import { Button } from '@/components/ui/button'
import { cn } from '@/lib'
import portfolioEmptyImage from '@/assets/illustrations/folder-empty.webp'
import { FunnelSimpleIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

type TableEmptyStateProps = {
  message?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function TableEmptyState({ onAction, className }: TableEmptyStateProps) {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        'absolute inset-0 bg-linear-to-b from-table-header to-background flex flex-col justify-center items-center',
        className,
      )}
    >
      <div className="flex flex-col gap-5 justify-center items-center">
        <div className={'mb-5'}>
          <img
            src={portfolioEmptyImage}
            alt="Nothing left to view"
            className="w-40 h-auto"
          />
        </div>
        <div className="text-tertiary-foreground text-center space-y-2">
          <div
            className={'text-2xl/8 text-foreground font-display font-medium'}
          >
            Nothing left to view
          </div>
          <div>Try to relax your filtration criteria</div>
        </div>
        {onAction ? (
          <Button variant={'defaultInverted'} onClick={onAction}>
            <FunnelSimpleIcon />
            <span>{t('tables.empty.resetFilters')}</span>
          </Button>
        ) : (
          <div className={'h-10'}></div>
        )}
      </div>
    </div>
  )
}
