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
| Opened by | The "?" at the end of the page header | A cross-link, a `<HelpTrigger>`, or "Open" on an embed |
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
3. Nothing else. `PageHeader` already renders the "?", and it stays hidden
   until an article claims the key.

## Writing

Articles are Studio-owned in Sanity — never seeded from `content/`, whose
re-seed would overwrite Studio edits. While `VITE_SANITY_PROJECT_ID` is unset
the app serves `src/services/help/fixtures` instead, which are the same payload
and are held to the Studio's rules by `services/help/help.test.ts`.

- `key` is the article's identity in every language, and what the app asks
  for. Never rename a published one. `slug` is only the website's URL.
- Link with *Link to a help article* (a reference), never a pasted URL, so a
  renamed article cannot break the link.
- *Link into the app* takes a path such as `/campaigns`; the app navigates
  behind the drawer and the website shows the words without a link.
- Untick *On the website* for help about controls that mean nothing outside
  the app.
- Everything published to `production` is public. Help for a feature behind a
  flag stays a draft until the feature ships.
