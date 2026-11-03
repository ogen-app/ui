import type { HelpArticle } from '@/types/help'
import { b, bullets, callout, go, h2, p, see } from './pt'

/**
 * Concepts: one idea each, shared by several screens (CON-173).
 *
 * Each of these is readable on its own (`#help/post-statuses`), linked from
 * other articles, and embedded whole into the page articles of every screen
 * where the idea matters — so "what Scheduled means" is written once and read
 * on the Posts list, the calendar and the post editor alike.
 *
 * A concept says nothing about which screen it is being read on. That is what
 * makes it embeddable: "the date lives beside the status" is true wherever you
 * read it, "click the button above" is not.
 */

const POSTS = { key: 'posts', title: 'Posts' }
const BASICS = { key: 'basics', title: 'Getting around' }
const IDEAS = { key: 'ideas', title: 'Ideas' }

const concept = (
  a: Omit<HelpArticle, 'kind' | 'language' | 'pages'>,
): HelpArticle => ({ ...a, kind: 'concept', language: 'en', pages: [] })

export const postStatuses = concept({
  key: 'post-statuses',
  title: 'What each post status means',
  summary:
    'A post is always in one of seven statuses. Which one decides what you can edit, and whether anything is going to publish without you.',
  category: POSTS,
  topics: ['post.status'],
  related: ['scheduling-a-post', 'unscheduling-a-post'],
  body: [
    p(
      'Every post carries a status. It decides what you can still edit, which actions the editor offers you, and — for two of them — whether the post is going to go out on its own.',
    ),
    h2('The seven statuses'),
    ...bullets(
      [b('Draft'), ' — you are still writing. Nothing will publish.'],
      [
        b('Ready for publish'),
        ' — the content is finished, but no date is set yet.',
      ],
      [
        b('Scheduled'),
        ' — a date is set and Ogen will publish it for you when it arrives.',
      ],
      [
        b('Scheduled for manual publishing'),
        ' — a date is set, but this account is one Ogen cannot post to on your behalf. You publish it yourself, then tell Ogen where it went.',
      ],
      [b('Published'), ' — it is live. Nothing moves out of this status.'],
      [
        b('Failed'),
        ' — publishing was attempted and did not work. The post can be sent back to Ready for publish and tried again.',
      ],
      [
        b('Not published'),
        ' — a manual-publishing post whose moment passed without anyone publishing it.',
      ],
    ),
    h2('Who moves a post between them'),
    p(
      'Most moves are yours. Two are not: ',
      b('Scheduled'),
      ' becomes ',
      b('Published'),
      ' or ',
      b('Failed'),
      ' on its own, when the publisher gets to it. You will see the change without doing anything.',
    ),
    callout('warning', [
      'Published is final. There is no route back to a draft, because the post already exists on the platform — editing it here would change nothing out there. If you need to change a published post, change it on the platform.',
    ]),
    p(
      'Setting a date is covered in ',
      see('scheduling a post', 'scheduling-a-post'),
      ', and taking one back in ',
      see('unscheduling a post', 'unscheduling-a-post'),
      '.',
    ),
  ],
})

export const schedulingAPost = concept({
  key: 'scheduling-a-post',
  title: 'Scheduling a post',
  summary:
    'Set a date and Ogen publishes for you — or holds it for you to publish by hand, depending on the account.',
  category: POSTS,
  topics: ['post.schedule', 'post.scheduled-at'],
  related: ['unscheduling-a-post', 'post-statuses'],
  body: [
    p(
      "A post can be scheduled once its content is finished. Pick a date and time, and the post moves out of your hands and into the publisher's.",
    ),
    h2('Setting the date'),
    p(
      'The date lives in the post editor, beside the status. It has to be in the future — a date in the past is rejected rather than published immediately, which is the safer of the two readings.',
    ),
    p(
      'Your ',
      go('campaigns', '/campaigns'),
      ' each carry their own publishing days and times, and a new post is placed against them, so most of the time the date is already close to what you want.',
    ),
    h2('Automatic or manual'),
    p(
      'What happens next depends on the account you are posting to. Where Ogen can publish on your behalf, it does. Where it cannot, the post is held and waits for you — it is still scheduled, but you are the one who publishes, and afterwards you hand Ogen the link so it can pick the post up again.',
    ),
    callout('note', [
      'You do not choose between the two. Ogen knows which accounts it can publish to and routes the post for you when you schedule it.',
    ]),
    callout('warning', [
      'Once a post is scheduled, its date is locked. To move it, unschedule it first — that is not a way of editing the date, it is the only way.',
    ]),
    p(
      'See ',
      see('unscheduling a post', 'unscheduling-a-post'),
      ' for how to take a date back, and ',
      see('post statuses', 'post-statuses'),
      ' for what each state means.',
    ),
  ],
})

export const unschedulingAPost = concept({
  key: 'unscheduling-a-post',
  title: 'Unscheduling a post',
  summary:
    'Unscheduling asks the publisher to call the post back. It stays scheduled until that is confirmed.',
  category: POSTS,
  topics: ['post.unschedule'],
  related: ['scheduling-a-post', 'post-statuses'],
  body: [
    p(
      "Unscheduling takes a date back off a post and returns it to you. You need it to change a scheduled post's date, its content, or to stop it going out at all.",
    ),
    h2('It is not instant'),
    p(
      'Unscheduling is a request, not a switch. Ogen asks the publisher to call the post back, and the post stays ',
      b('Scheduled'),
      ' until the publisher confirms. Only then does it return to ',
      b('Ready for publish'),
      ' or ',
      b('Draft'),
      '. The wait is usually seconds.',
    ),
    callout('warning', [
      'Until the status actually changes, treat the post as still scheduled. That is the honest reading: the publisher has not yet agreed to hold it.',
    ]),
    h2('Once it is back'),
    p(
      'An unscheduled post is editable again — content, date, everything. Schedule it a second time exactly as you did the first, and it is routed again from scratch.',
    ),
    p(
      'See ',
      see('scheduling a post', 'scheduling-a-post'),
      ' and ',
      see('post statuses', 'post-statuses'),
      '.',
    ),
  ],
})

export const workspaceAndCampaign = concept({
  key: 'workspace-and-campaign',
  title: 'The workspace and its campaigns',
  summary:
    'Most of Ogen exists twice: once for the whole workspace, and once inside each campaign, narrowed to it.',
  category: BASICS,
  topics: [],
  related: [],
  body: [
    p(
      'The menu has two levels. The first is the ',
      b('workspace'),
      ': everything your team has, across every campaign. Open a campaign and the menu becomes the same list ',
      b('narrowed to that campaign'),
      ' — its ideas, its documents, its posts, its numbers.',
    ),
    p(
      'Going into a campaign never takes you somewhere else; it filters what you were already looking at. An idea filed onto a campaign is the same idea in both lists, and a document a campaign uses is still one of the workspace’s.',
    ),
    h2('Two things only one level has'),
    ...bullets(
      [
        b('Strategy'),
        ' is a campaign’s alone. A campaign commits to dates and to how often it posts; a workspace commits to neither, so there is nothing to narrow it from.',
      ],
      [
        b('Foundation'),
        ' is the workspace’s alone. Voices, audiences and guardrails are written once for everyone; a campaign chooses which of them it writes in, on its Strategy page.',
      ],
    ),
    p(
      'The workspace is always one step away: the caret beside the campaign’s name at the top of the menu, or the account menu, which lists every workspace destination. Start from ',
      go('your campaigns', '/campaigns'),
      ' to go back in.',
    ),
  ],
})

export const ideaVerdicts = concept({
  key: 'idea-verdicts',
  title: 'Deciding on an idea',
  summary:
    'Every idea gets one of three answers — making it, not yet, or not at all — and every answer can be taken back.',
  category: IDEAS,
  topics: [],
  related: [],
  body: [
    p(
      'Writing an idea down and deciding about it are two separate jobs. A new idea lands ',
      b('On the desk'),
      ', undecided, and waits there for as long as it needs to.',
    ),
    h2('The three answers'),
    ...bullets(
      [b('Making'), ' — yes. This one is going to become a post.'],
      [
        b('In the drawer'),
        ' — good, but not now. You choose when it comes back: in a week, a month or three months. On that day it returns to the desk by itself.',
      ],
      [
        b('Set aside'),
        ' — no. It is archived rather than deleted, so it can be found and reconsidered later.',
      ],
    ),
    p(
      'The four piles always add up to the whole list. An idea back from the drawer is on the desk again, not in two places at once.',
    ),
    callout('tip', [
      'Every answer can be changed, which is what makes deciding quickly safe. Only deleting is final, and that is only offered once you open an idea.',
    ]),
  ],
})

export const CONCEPTS: HelpArticle[] = [
  postStatuses,
  schedulingAPost,
  unschedulingAPost,
  workspaceAndCampaign,
  ideaVerdicts,
]
