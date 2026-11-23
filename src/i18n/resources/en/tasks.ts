/**
 * Tasks (CON-225): the workspace's open work, its own module next to the
 * feed. The titles themselves still speak the rule set's own English
 * (`campaignReadiness`), which is legacy to convert, not a precedent — only
 * the screen's own copy lives here.
 */
export const tasks = {
  title: 'Tasks',
  add: 'ADD TASK',
  newTask: 'New task',
  create: 'CREATE TASK',
  cancel: 'Cancel',
  complete: 'Mark this task done',
  reopen: 'Reopen this task',
  delete: 'DELETE TASK',
  unassigned: 'Unassigned',
  /**
   * The assignee's picture is a button, and these name it: initials read out
   * as letters, so the name has to be said rather than shown.
   */
  assignedTo: 'Assigned to {{name}} — change',
  assign: 'Assign this task',
  /** Who made the task, and when — one sentence, never a name glued to a date. */
  createdBySystem: 'Raised automatically on {{at}}',
  createdBy: 'Written by {{name}} on {{at}}',
  closedBy: 'Ticked by {{name}} on {{at}}',
  /** Said on the task itself, where the work went without anyone ticking it. */
  autoResolved: 'Resolved on its own — the warning behind it cleared',
  /** Stands in the description's place, on the row and in the section. */
  noDescription: 'No description',
  saveFailed: 'Could not save the change to your tasks.',
  loadFailed: 'Unable to load tasks',
  empty: {
    title: 'Nothing to do',
    subtitle:
      'Tasks you write land here, and so does anything the campaigns need doing about them.',
  },
  /**
   * What a task raised from a warning is about — one paragraph per rule, in
   * the imperative: the title already says what is wrong.
   */
  rule: {
    failedPosts:
      'The publisher tried and the channel refused. Open the posts, read what came back — a disconnected account, a rejected image, a caption the channel would not take — fix it and publish again.',
    manualPublishDue:
      'These are set to be published by hand and their time has come. Nothing goes out until someone opens each post and publishes it.',
    autoPublishOverdue:
      'The slot has passed and the publisher has not sent these. Check the channel is still connected before rescheduling them.',
    notPublished:
      'The window closed with these still waiting, so they were never sent. Decide for each one whether it is still worth publishing or should be dropped.',
    plannedTodayUnscheduled:
      'Posts dated for the next day are still drafts. A date on a post is a plan, not an instruction — until they are scheduled, nothing will send them.',
    pipelineGap:
      'Nothing is scheduled for the next week. Write and schedule posts now, or the campaign goes quiet.',
    accountsMissingBlocking:
      'A channel this campaign publishes to has no connected account, so its posts cannot go out. Connect the account, or take the channel off the campaign.',
    accountInactive:
      'A connected account has stopped authorising, usually an expired token. Reconnect it in Workspace Settings before its next slot.',
    channelDroppedScheduled:
      'A channel was taken off the campaign while posts were still scheduled to go out on it. Those posts have nowhere to publish.',
    behindPace:
      'Fewer posts have gone out than the campaign’s goal implies for the time elapsed. Schedule more, or revise the goal to what the campaign is actually doing.',
  },
  field: {
    title: 'What needs doing',
    titlePlaceholder: 'Write the task as you would say it',
    description: 'Description',
    descriptionPlaceholder:
      'What the work is, and anything the next person needs to know',
    campaign: 'Campaign',
    noCampaign: 'No campaign',
    assignee: 'Assigned to',
  },
  /** The figure on the sidebar's Tasks row, read out rather than seen. */
  openCount_one: '{{count}} open task',
  openCount_other: '{{count}} open tasks',
}
