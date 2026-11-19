# Help centre

How the in-app help is organised, for whoever writes it and whoever wires a
new screen to it (CON-173). The code is `src/components/help`,
`src/services/help` and `src/lib/helpTopics.ts`; the content model is
`studio/schemaTypes/helpArticle.ts` in `getogen.com`.

## The idea

**Every screen has its own help page, and an idea that several screens share
is written once.** Post statuses matter on the Posts list, the calendar and the
post editor; the difference between the workspace and a campaign matters on
Campaigns, Ideas and Assets. Those paragraphs are not copied into each page —
they are one *concept*, embedded in each page that needs it. Fix it once and
every screen, and later the website, reads the fix.

## Two kinds of article

| | Page | Concept |
| -- | -- | -- |
| Answers | "What is this screen and what do I do here?" | "What does this idea mean?" |
| Opened by | Help in the top bar, on that screen | A cross-link, a `<HelpTrigger>`, or "Open" on an embed |
| Claims | `pages` — screen keys from `HELP_PAGES` | `topics` — trigger keys from `HELP_TOPICS` (optional) |
| May mention the screen | Yes ("the button at the top right") | **Never** — that is what lets it sit inside any page |
| May embed | Concepts | Nothing (embeds go one level deep) |

A page article is short: what the screen is, the few things you do there, then
the concepts it embeds. If a paragraph in a page article would be true on
another screen, it is a concept.

## Screens

A screen is named for *what it is*, not for its level: `ideas` is both
`/ideas` and `/campaigns/:id/ideas`, because the campaign level is the same
menu narrowed. One page article explains both and says where they differ. A
`campaign.` prefix marks a screen that only exists inside a campaign.

The list is `HELP_PAGES` in `src/lib/helpTopics.ts`. Wiring a new screen:

1. Add its key to `HELP_PAGES`.
2. Set `staticData: { help: '<key>' }` on its route. The deepest matched route
   that names one wins, so a layout (`foundation.tsx`) covers its children.
3. Nothing else. Help in the top bar opens the screen's article in the right
   rail, in the assistant's place, and follows the reader from screen to
   screen; a screen whose key no article claims yet says there is no help for
   it.

## Writing

Articles are Studio-owned in Sanity — never seeded from `content/`, whose
re-seed would overwrite Studio edits. **Every build reads them, `pnpm dev`
included**: the project (`s5ikqvpd`) and dataset (`production`) are constants
in `services/help/sanity.ts`, because both are public and no environment reads
anything else. There are no stand-in articles, so what you see in dev is what
the Studio holds, and a broken query or a missing article shows on the screen
where it happens. The browser's origin has to be on the project's CORS list
(`sanity cors add`, without credentials): the deployed app's origins are, and
of localhost only `http://localhost:9010` — on any other port the panel says
"Couldn’t load help".

The tests cannot reach the network, so they read `src/test/helpArticles`
through a mocked `services/help`: six screens' articles in the payload's
shape, a snapshot from when the dataset was first filled and not kept in step
with it.

The eleven starter articles were imported once, on 2026-11-19, as
`help-article-<key>` and `help-category-<key>` (published, in `production`),
and the same day first drafts of the other eight screens' articles were
published straight to Sanity, to be rewritten there. The Studio is the
source: nothing should re-import over it.

- `key` is the article's identity in every language, and what the app asks
  for. Never rename a published one. `slug` is only the website's URL.
- Link with *Link to a help article* (a reference), never a pasted URL, so a
  renamed article cannot break the link.
- *Link into the app* takes a path such as `/campaigns`; the app navigates
  beside the panel and the website shows the words without a link.
- Untick *On the website* for help about controls that mean nothing outside
  the app.
- Everything published to `production` is public. Help for a feature behind a
  flag stays a draft until the feature ships.
