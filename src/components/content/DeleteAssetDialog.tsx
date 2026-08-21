import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ModalContainer } from '@/components/ui/modal'
import { useDeleteAsset } from '@/hooks/useContent'
import { removeFromCampaign } from '@/lib/campaignMembership'
import { toast } from '@/stores/toastStore'
import type { Asset } from '@/types/content'

type Props = {
  asset: Asset
  /**
   * The campaign it is being deleted from — and where the page goes after. Null
   * when it was opened in the workspace bank, which has no membership to fix.
   */
  campaignId: string | null
  isOpen: boolean
  onClose: () => void
}

/**
 * Confirmation for deleting the document you are inside.
 *
 * The list deletes a row on one click, which is right there — the row is one
 * of twenty and the mistake is visible immediately. Here the document fills
 * the screen and may have just been written, so the same gesture gets the same
 * confirmation a post gets.
 *
 * Deleting also detaches: membership is a list of ids on the campaign until
 * the backend scopes assets properly (CON-210 phase 2), and an id pointing at
 * a deleted document is a source the campaign thinks it still has. Only the
 * campaign whose page this is can be fixed — the delete itself is workspace-wide
 * and any other campaign keeps a dead id, which shows as nothing because
 * `campaignAssets` matches ids against documents that exist.
 */
export function DeleteAssetDialog({ asset, campaignId, isOpen, onClose }: Props) {
  const navigate = useNavigate()
  const { mutate: deleteAsset, isPending: deleting } = useDeleteAsset()

  const title = asset.title.trim()

  const handleConfirm = () => {
    deleteAsset(asset.id, {
      onSuccess: () => {
        if (campaignId) void removeFromCampaign(campaignId, [asset.id])
        toast.success('Document deleted')
        onClose()
        // This route would 404 on the deleted id, so leaving is not optional.
        void (campaignId
          ? navigate({ to: '/campaigns/$campaignId/content', params: { campaignId } })
          : navigate({ to: '/content-bank' }))
      },
      // No onError: the mutation cache raises the API's own message.
    })
  }

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={deleting ? () => {} : onClose}
      title={title ? `Delete "${title}"?` : 'Delete this document?'}
      size="small"
      closeOnBackdropClick={!deleting}
      closeOnEscape={!deleting}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-secondary-foreground">
          {campaignId
            ? 'This document will be permanently deleted, and this campaign will stop writing from it. This cannot be undone.'
            : 'This document will be permanently deleted, and any campaign using it will stop writing from it. This cannot be undone.'}
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={deleting}>
            KEEP DOCUMENT
          </Button>
          <Button
            type="button"
            variant="destructiveInverted"
            onClick={handleConfirm}
            loading={deleting}
          >
            DELETE DOCUMENT
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}
