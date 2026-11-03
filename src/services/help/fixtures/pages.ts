import type { HelpArticle } from '@/types/help'
import type { HelpPage } from '@/lib/helpTopics'
import { b, bullets, callout, embed, h2, p, see } from './pt'
import {
  ideaVerdicts,
  postStatuses,
  schedulingAPost,
  workspaceAndCampaign,
} from './concepts'

/**
 * Page articles: one per screen, opened by the help button in its header.
 *
 * A page article answers "where am I and what do I do here", and borrows
 * everything else. The paragraphs about post statuses are not written here
 * three times — the Posts list, the calendar and the post editor each *embed*
 * the one concept, which is what keeps them from drifting apart and what lets
 * the website publish the same words without a copy.
 *
 * The page's own prose may name the screen ("this list", "the button at the
 * top right"); a concept's never does. That line is the whole difference
 * between the two kinds.
 */

const page = (
  pages: HelpPage[],
  a: Omit<HelpArticle, 'kind' | 'language' | 'pages' | 'topics'>,
): HelpArticle => ({ ...a, kind: 'page', language: 'en', pages, topics: [] })

const CAMPAIGNS = { key: 'campaigns', title: 'Campaigns' }
const POSTS = { key: 'posts', title: 'Posts' }
const IDEAS = { key: 'ideas', title: 'Ideas' }
const ASSETS = { key: 'assets', title: 'Assets' }

export const PAGES: HelpArticle[] = [
  page(['campaigns'], {
    key: 'page-campaigns',
    title: 'Campaigns',
    summary:
      'Every campaign the workspace is running, and how close each one is to being ready.',
    category: CAMPAIGNS,
    related: ['workspace-and-campaign'],
    body: [
      p(
        'A campaign is a stretch of time with a purpose: its own dates, its own pace of posting, and its own posts, ideas and documents. Each card here summarises one, and points out the posts that need someone’s attention.',
      ),
      p(
        b('ADD CAMPAIGN'),
        ', at the top right, starts a new one. Open a card to go into it.',
      ),
      h2('When a campaign is over'),
      p(
        'Archive it. It leaves this list and waits in the archive at the foot of the page, where it can be opened, read and brought back. Deleting is different: it is final, and nothing in Ogen undoes it.',
      ),
      embed(workspaceAndCampaign),
    ],
  }),

  page(['posts'], {
    key: 'page-posts',
    title: 'Posts',
    summary:
      'Every post in this campaign, as one table you can sort, select and act on together.',
    category: POSTS,
    related: ['scheduling-a-post', 'unscheduling-a-post'],
    body: [
      p(
        'This is the campaign’s posts as a list. Unlike the calendar it has no date range: every post is here, whenever it is due, including the ones without a date yet.',
      ),
      ...bullets(
        [
          b('Sort'),
          ' by any column. The order you choose is remembered for you, on every campaign and every device.',
        ],
        [b('Select'), ' several rows to change or delete them in one go.'],
        [b('ADD POST'), ' creates a draft and opens it.'],
      ),
      p(
        'The Calendar, one row below in the menu, shows the same posts by day.',
      ),
      embed(postStatuses),
    ],
  }),

  page(['calendar'], {
    key: 'page-calendar',
    title: 'Calendar',
    summary:
      'This campaign’s posts laid out by day, a week or a month at a time.',
    category: POSTS,
    related: ['scheduling-a-post', 'unscheduling-a-post'],
    body: [
      p(
        'The calendar is the campaign’s posts on the days they are due. Switch between a week and a month at the top; the arrows move through time.',
      ),
      ...bullets(
        [b('Add a post'), ' on a day, and it starts out dated to that day.'],
        [
          b('Drag a card'),
          ' to another day to move a post that has not been scheduled yet.',
        ],
        [b('Open a card'), ' to edit the post.'],
      ),
      callout('note', [
        'A scheduled post keeps its date until it is unscheduled — see ',
        see('unscheduling a post', 'unscheduling-a-post'),
        '.',
      ]),
      embed(postStatuses),
    ],
  }),

  page(['post'], {
    key: 'page-post',
    title: 'The post editor',
    summary:
      'Write the post, add its media, and decide where and when it goes. Everything saves as you type.',
    category: POSTS,
    related: ['unscheduling-a-post'],
    body: [
      p(
        'There is no save button. Every change is kept a moment after you make it, and the status at the top of the screen says when it last was.',
      ),
      h2('What is on this screen'),
      ...bullets(
        [
          b('The body'),
          ' — the words of the post. For a thread, a line of three dashes starts the next message.',
        ],
        [
          b('Media'),
          ' — upload files, or bring in an image from Assets. A bank image is copied onto the post, so deleting it from Assets later leaves the post intact.',
        ],
        [
          b('The post type'),
          ' — left on Auto, Ogen picks it from what the post contains, until the post leaves draft.',
        ],
        [
          b('The status and date'),
          ' — where the post is in its life, and when it goes out.',
        ],
      ),
      embed(postStatuses),
      embed(schedulingAPost),
    ],
  }),

  page(['ideas'], {
    key: 'page-ideas',
    title: 'Ideas',
    summary:
      'Everything worth making, written down first and decided about later.',
    category: IDEAS,
    related: [],
    body: [
      p(
        'Type an idea into the field at the top and press Return. That is all writing one down takes — it does not need a campaign, a date or a format, and it does not need to be any good yet.',
      ),
      p(
        'Ideas also arrive on their own: when Ogen reads a document in Assets, it suggests the posts it found in it, and they land here alongside yours.',
      ),
      p(
        'The number beside Ideas in the menu is how many are still on the desk. It is meant to go down as you answer them, not to grow with the list.',
      ),
      embed(ideaVerdicts),
      embed(workspaceAndCampaign),
    ],
  }),

  page(['assets'], {
    key: 'page-assets',
    title: 'Assets',
    summary:
      'The documents, images, recordings and web pages Ogen writes from.',
    category: ASSETS,
    related: [],
    body: [
      p(
        'Assets are the material behind your posts. Upload a file, write a note, or add a web page; Ogen reads each one so the assistant can write from it, and suggests the ideas it finds.',
      ),
      ...bullets(
        [
          b('Filter'),
          ' by editing the sentence above the list — it reads as what you are looking at.',
        ],
        [b('Group'), ' and sort the list to see it the way you work.'],
        [
          b('Smart groups'),
          ' save a filter you come back to, on the workspace’s page.',
        ],
      ),
      callout('note', [
        'Uploading an image you already have does nothing: Ogen keeps one copy, and says so before you upload rather than after.',
      ]),
      embed(workspaceAndCampaign),
    ],
  }),
]
