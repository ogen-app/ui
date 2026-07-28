import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ModalContainer } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  CampaignTypePicker,
  defaultCampaignTypeId,
} from '@/components/campaigns/CampaignTypePicker'
import { useCampaignTypes, useCreateCampaign } from '@/hooks/useCampaigns'
import { toast } from '@/stores/toastStore'

/**
 * The first step of a campaign: its name and its type.
 *
 * Creation used to happen on the click, dropping the user into an untitled
 * campaign on the default type. Both are decisions the rest of the campaign is
 * built on — the type picks the phase plan the content is generated against —
 * so they are asked for once, up front, instead of being defaults to discover
 * and correct later in Settings.
 */
export function CreateCampaignDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { data: types, isLoading: typesLoading } = useCampaignTypes()
  const createCampaign = useCreateCampaign()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [typeId, setTypeId] = useState('')

  // Reopening starts a new campaign, not a resumed one.
  useEffect(() => {
    if (open) {
      setName('')
      setTypeId('')
    }
  }, [open])

  // The default lands as soon as the types do, whether that is before the
  // dialog opens or after.
  useEffect(() => {
    if (!typeId && types) setTypeId(defaultCampaignTypeId(types) ?? '')
  }, [types, typeId])

  const trimmed = name.trim()
  const canCreate = trimmed !== '' && typeId !== '' && !createCampaign.isPending

  const submit = () => {
    if (!canCreate) return
    createCampaign.mutate(
      { name: trimmed, campaign_type_id: typeId },
      {
        onSuccess: (campaign) => {
          onClose()
          navigate({
            to: '/campaigns/$campaignId',
            params: { campaignId: campaign.id },
          })
        },
        onError: (e) =>
          toast.error('Unable to create the campaign', {
            description: e instanceof Error ? e.message : undefined,
          }),
      },
    )
  }

  return (
    <ModalContainer
      isOpen={open}
      onClose={onClose}
      title="New campaign"
      size="large"
    >
      <form
        className="flex flex-col gap-6"
        noValidate
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-campaign-name">Campaign name</Label>
          <Input
            id="new-campaign-name"
            name="new-campaign-name"
            autoFocus
            autoComplete="off"
            placeholder="e.g. Spring product launch"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Campaign type</Label>
          {typesLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <CampaignTypePicker
              types={types ?? []}
              value={typeId}
              onChange={setTypeId}
            />
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canCreate} loading={createCampaign.isPending}>
            CREATE CAMPAIGN
          </Button>
        </div>
      </form>
    </ModalContainer>
  )
}
