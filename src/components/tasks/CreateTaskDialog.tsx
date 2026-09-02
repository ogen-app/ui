import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModalContainer } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TextSelect } from '@/components/ui/text-select'
import { useTaskWriter } from '@/hooks/useTasks'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useWorkspaceMembers } from '@/hooks/useWorkspaces'

/**
 * Writing a task by hand (CON-225).
 *
 * The half of the model the warnings cannot reach: a task nobody's data
 * implies, because somebody decided it. It takes what a task needs to be
 * findable later and nothing else — a sentence, what the work actually is,
 * optionally a campaign, optionally a person. No severity: urgency is the
 * assignee's, not the system's, and there is no rule behind this one to have an
 * opinion.
 *
 * The description is optional and the title is not, which is the right way
 * round: a task whose sentence needs a paragraph to be understood is a task
 * whose sentence is wrong.
 */
/** The "not set" option's value — a Select cannot carry an empty string. */
const NONE = 'none'

export function CreateTaskDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { createTask } = useTaskWriter()
  const { data: campaigns } = useCampaigns()
  const { data: members } = useWorkspaceMembers()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [campaignId, setCampaignId] = useState(NONE)
  const [assigneeId, setAssigneeId] = useState(NONE)

  // Reopening is a new task, not a resumed draft — a form that remembers the
  // last one invites writing the same task twice.
  useEffect(() => {
    if (!open) return
    setTitle('')
    setDescription('')
    setCampaignId(NONE)
    setAssigneeId(NONE)
  }, [open])

  const campaignOptions = useMemo(
    () => [
      { id: NONE, displayValue: t('tasks.field.noCampaign') },
      ...(campaigns ?? []).map((campaign) => ({
        id: campaign.id,
        displayValue: campaign.name.trim() || t('nav.untitledCampaign'),
      })),
    ],
    [campaigns, t],
  )

  const assigneeOptions = useMemo(
    () => [
      { id: NONE, displayValue: t('tasks.unassigned') },
      ...(members ?? []).map((member) => ({
        id: member.id,
        displayValue: member.name || member.email,
      })),
    ],
    [members, t],
  )

  const canSave = title.trim().length > 0

  const submit = () => {
    if (!canSave) return
    void createTask({
      title,
      description,
      campaignId: campaignId === NONE ? null : campaignId,
      assigneeId: assigneeId === NONE ? null : assigneeId,
    })
    onClose()
  }

  return (
    <ModalContainer isOpen={open} onClose={onClose} title={t('tasks.newTask')}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="task-title">{t('tasks.field.title')}</Label>
          <Input
            id="task-title"
            value={title}
            autoFocus
            placeholder={t('tasks.field.titlePlaceholder')}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit()
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="task-description">
            {t('tasks.field.description')}
          </Label>
          {/* Enter is a newline here, not a submit — the shortcut on the title
              would swallow the paragraph breaks this field exists for. */}
          <Textarea
            id="task-description"
            className="min-h-16"
            value={description}
            placeholder={t('tasks.field.descriptionPlaceholder')}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="task-campaign">{t('tasks.field.campaign')}</Label>
          <TextSelect
            id="task-campaign"
            value={campaignId}
            onValueChange={setCampaignId}
            elements={campaignOptions}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="task-assignee">{t('tasks.field.assignee')}</Label>
          <TextSelect
            id="task-assignee"
            value={assigneeId}
            onValueChange={setAssigneeId}
            elements={assigneeOptions}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            {t('tasks.cancel')}
          </Button>
          <Button disabled={!canSave} onClick={submit}>
            {t('tasks.create')}
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}
