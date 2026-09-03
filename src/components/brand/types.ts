/**
 * The Brand module's shapes (CON-226/227) — now also the wire format of
 * `/api/brand`, which CON-228 was written to match field for field.
 *
 * They live beside the components rather than in `src/types/`, which was
 * backwards for a service and deliberate while there was no endpoint: a type in
 * `src/types/` is a claim about what the server sends, and none of this was
 * that. It is now, and moving them is a tidy-up worth doing on its own rather
 * than inside the swap — every Brand screen imports from here.
 *
 * Nothing outside the `brand-materials` flag may read any of it.
 *
 * The argument behind every decision here is `docs/brand-materials.md`.
 */

/**
 * The one pattern the whole module is made of: **a reference to a Brand entity,
 * plus an optional local delta, where the delta can be promoted into a new
 * library entry.**
 *
 * For prose the delta is appended text; for structured values it is changed
 * fields. Same model, two renderings — and building it once is what keeps four
 * pickers from reading as four features sharing a screen.
 *
 * The reference stays **live**. An earlier draft resolved it once at creation so
 * that editing a voice could not silently rewrite thirty drafts; that conflated
 * two things. The post's text is already written and nothing rewrites it, and
 * the reference is an input to the *next* generation rather than a filter over
 * existing output. What follows instead is one honest touch: a post written
 * under a voice that has since changed can say so, as a prompt to regenerate.
 */
export type BrandRef<T> = {
  /** The library entry this points at, or `null` for a pure local value. */
  id: string | null
  /** What was changed here, on top of the entry. `null` when unbent. */
  delta: T | null
}

/**
 * Where a piece of material came from.
 *
 * Kept on every entity for three reasons, in ascending order of importance: a
 * reset is possible, we learn which templates get adopted and which get
 * abandoned, and — the real one — a template is **forked, never linked**, so
 * without this line there is nothing at all connecting an entry to the thing it
 * started as. Improving our template must never silently rewrite a customer's
 * voice.
 */
export type BrandOrigin =
  | { kind: 'blank' }
  | { kind: 'template'; templateName: string }
  /** Proposed from the customer's own site — CON-222 scrapes it to Markdown. */
  | { kind: 'website'; url: string }
  /** Learned from what the workspace has already published. */
  | { kind: 'posts'; count: number }
  /** Promoted out of a one-off note somebody wrote while working. */
  | { kind: 'promoted'; fromPost: string }

/**
 * Which part of the app actually reads a piece of material.
 *
 * On the surface rather than in a comment because CON-226 §9 makes it the
 * acceptance question: material nothing reads is worse than no material, since
 * it teaches people the app ignores what they tell it. A screen that shows five
 * sections and only says which two are wired is being honest about the state it
 * is in; one that shows five equal sections is quietly lying.
 */
export type BrandConsumer = 'plan' | 'post' | 'images'

/**
 * How much of the workspace's output a piece of material is actually behind.
 *
 * Two numbers rather than one, because they answer different questions. Drafts
 * are still ours to change — a voice that has been edited since is an offer to
 * regenerate them. Published posts are out in the world and are the reason the
 * voice cannot simply be deleted. Collapsing them into "15 posts" loses both.
 *
 * Zero is the number worth showing most: material nobody has written in is the
 * library's own dead weight, and it is invisible unless the count is on the row.
 *
 * Derived, never stored — the server counts it (CON-228).
 */
export type BrandUsage = {
  drafts: number
  published: number
}

/** How a voice handles the things that most obviously give it away. */
export type VoiceRules = {
  emoji: 'never' | 'sparingly' | 'freely'
  hashtags: 'never' | 'few' | 'many'
  formality: 'casual' | 'neutral' | 'formal'
  person: 'i' | 'we' | 'third'
  length: 'short' | 'medium' | 'long'
  /** How a post opens — the single most recognisable habit a voice has. */
  opening: string
  /**
   * How a post ends.
   *
   * The second most recognisable habit, and the one people notice when it is
   * wrong: a question, a call to action, or nothing at all. Kept apart from
   * `opening` rather than folded into one "structure" field, because a voice
   * can be unmistakable at the top and generic at the bottom, which is exactly
   * the failure a single field would hide.
   */
  closing: string
}

export type BrandVoice = {
  id: string
  name: string
  /** One line. The thing a picker shows under the name. */
  whenToUse: string
  /**
   * One sentence, written by us from the samples: *what this voice actually is*
   * as opposed to what it was named.
   *
   * Generated rather than typed, on purpose. The name and `whenToUse` are the
   * author's intent, and intent is exactly the thing that drifts — "Friendly
   * explainer" stays friendly in the label long after the samples have gone
   * arch. This line is read back off the samples, so a voice whose description
   * has stopped matching its name is a finding rather than a mystery, and a
   * voice with no samples has no description at all, which is the honest
   * rendering of a voice with nothing behind it.
   */
  summary: string
  /**
   * The one a post starts in when nothing has said otherwise.
   *
   * **Exactly one voice is the default, and the library says which.** The
   * alternative — no default, pick every time — sounds neutral and is not: a
   * workspace with four voices would face a four-way choice on every post, and
   * the answer is the same one nine times out of ten. This is the *applies by
   * default, fine-tune, sometimes cherry-pick* shape the picture templates
   * already use (`BrandTemplate.isDefault`), and it is the reason a voice
   * library can grow past two without making the app slower to use.
   *
   * The invariant is the writer's, not the reader's: whoever stores a voice
   * clears the flag on the others (`services/api/brand.ts` today, CON-228
   * later). A screen may assume at most one is set and must survive none being
   * set — which is what an empty library is.
   *
   * **The first voice a workspace writes is born with it.** Promotion was a
   * deliberate switch for a good reason — it demotes somebody else's entry, and
   * a Create button does not get to do that quietly — but that reason has no
   * force when there is nobody to demote. A library of one whose one voice is
   * not the default is the rule failing at the only size where it cannot be
   * argued about: every post falls back to no voice at all, and the section the
   * workspace has just filled in changes nothing.
   */
  isDefault: boolean
  /** What has actually been written in it. See `BrandUsage`. */
  usage: BrandUsage
  /**
   * Three to eight real posts. **The samples are the voice** — "witty, bold,
   * human" produces nothing, five posts you would be proud of produce a lot.
   * A voice with none of these is the failure state worth drawing: named,
   * saved, and generating exactly what it would have generated anyway.
   */
  samples: string[]
  rules: VoiceRules
  /**
   * Per-channel variation, keyed by platform id — "dialled down on LinkedIn".
   *
   * A note **inside** a voice, deliberately not a second axis. Voices ×
   * platforms as independent dimensions is a matrix nobody maintains; this
   * keeps the count at the number of voices.
   */
  channelNotes: Record<string, string>
  origin: BrandOrigin
  /** ISO. Read against a post's own date to spot the stale-link case. */
  updatedAt: string
  /**
   * How many existing posts were written under an older version of this voice.
   *
   * Derived, not stored — the server counts it, and it is the visible half of
   * the live-link decision. Deliberately worded as an offer to regenerate
   * rather than as a warning: nothing is wrong with those posts, their text was
   * written and stands, and the voice is only an input to the *next*
   * generation. A warning here would be the screen apologising for working
   * correctly.
   */
  postsBehind?: number
}

/**
 * Kept separate from voices because the two cross: the same corporate voice
 * addresses two audiences, and merging them multiplies the list.
 *
 * The three consequence fields are the design, not decoration. Left to a blank
 * box people describe a fantasy — "reach and generous successful people" is the
 * predictable answer to a question nobody has a good way to answer. Naming the
 * consequences forces the concrete version and makes the fantasy visibly
 * useless: it has nothing to put in these three lines.
 */
export type BrandAudience = {
  id: string
  name: string
  /** Concrete and narrowing. Not "professionals". */
  who: string
  /** Read back off the three consequence lines — see `BrandVoice.summary`. */
  summary: string
  /*
   * No `isDefault`, and voices have one. It is a decision rather than an
   * omission: CON-228 FR4 scopes the one-default invariant to voices and
   * templates, `brand_audiences` has no such column, and CON-245 §5 resolves an
   * audience post → campaign → legacy prose with no workspace step. See
   * `resolveAudience` in `binding.ts` for why, and CON-263 if it is to change.
   */
  /** What has actually been written for them. See `BrandUsage`. */
  usage: BrandUsage
  readsOn: string
  scrollsPastWhen: string
  believesWhen: string
  origin: BrandOrigin
  updatedAt: string
}

/**
 * The singleton with real weight rather than decoration. Applied to every
 * generation regardless of which voice is chosen — never selected, never
 * overridden — because a sarcastic post and a corporate post about the same
 * regulated product must be factually identical and must both avoid the same
 * promises. A brand module without this layer is styling.
 */
export type BrandGuardrails = {
  facts: string[]
  mayClaim: string[]
  /** The ones that bite. Carries the screen's one tone step rather than capitals. */
  neverClaim: string[]
  bannedWords: string[]
  /**
   * The line every post has to carry, added as written — a risk warning, a
   * licence number, an ad disclosure.
   *
   * Called `boilerplate` until somebody who had not written this file read the
   * label and asked what it meant, which is the whole test a name has to pass.
   * The trade's word for it describes where it came from (a print shop's
   * reusable slug) rather than what it does, and the thing it does here is
   * plain enough to say: it is the disclaimer.
   */
  disclaimer: string
  updatedAt: string
}

/** A logo variant with a **declared job** — not a folder of files. */
export type BrandLogo = {
  id: string
  job: 'profile' | 'watermark' | 'mark'
  url: string
}

/** A colour with a role. A swatch dump is a palette nobody can apply. */
export type BrandColor = {
  id: string
  role: string
  hex: string
}

export type BrandLook = {
  logos: BrandLogo[]
  palette: BrandColor[]
  /** Display and body, as named faces. Licensing is CON-132 §10.2's problem. */
  typefaces: string[]
  /** CON-105's `brand_style`, promoted from a per-asset flag to where it belongs. */
  referenceImages: string[]
  updatedAt: string
}

/** `1:1`, `4:5`, `9:16`, `16:9` — one asset each, which is the whole trick. */
export type TemplateRatio = {
  ratio: string
  url: string
}

/**
 * A picture template: a full-canvas PNG per ratio, composited over (or under)
 * the source image.
 *
 * **Called a template, built as an overlay.** The name is the user's word — it
 * is what people expect to find when they go looking for "the thing that makes
 * our pictures look like ours". The mechanic underneath deliberately is not
 * CON-132's: that one is expensive for exactly one reason, it **reflows layout**
 * across aspect ratios, and constraint anchors, safe areas and text overflow are
 * all downstream of that. This does not reflow — require one asset per ratio and
 * the hard problem disappears. Not a first slice of the expensive thing; a
 * different, smaller thing wearing the name people search for.
 */
export type BrandTemplate = {
  id: string
  name: string
  /** `foreground` composites over the source; `background` sits under it. */
  role: 'foreground' | 'background'
  ratios: TemplateRatio[]
  /**
   * Pre-applied to images unless something says otherwise — the same *applies
   * by default, fine-tune, sometimes cherry-pick* semantics as voice.
   */
  isDefault: boolean
  /**
   * Display names of the platforms this set is chosen for ("Instagram" —
   * matched against `PlatformInfo.name`, not the sqid). Empty means
   * it claims no platform of its own and is only ever used because it is the
   * default.
   *
   * **A platform here need not be connected.** That is the requirement, not an
   * oversight: a template is artwork, and the work of preparing it is exactly
   * the work you do *before* connecting an account — so binding this to
   * connected accounts would make the screen useless at the moment it is most
   * useful. Connection state is shown, never enforced.
   */
  platforms: string[]
  origin: BrandOrigin
  updatedAt: string
}

/**
 * Everything the Brand screen renders.
 *
 * Every field is present and every list may be empty, which is the shape the
 * API has to answer in too (CON-228): **an omitted key and an empty slot are
 * different things here.** An empty named slot says "your brand has no stated
 * guardrails", which is a to-do; an absent one says nothing at all, and the
 * whole argument for this screen over a bin is that it can be measured against.
 */
export type BrandData = {
  voices: BrandVoice[]
  audiences: BrandAudience[]
  guardrails: BrandGuardrails | null
  look: BrandLook | null
  templates: BrandTemplate[]
}

/** Whether a workspace has anything at all — the first-run branch. */
export function isBrandEmpty(data: BrandData): boolean {
  // The three sections that are offered — see `shown` in `lib/brandSections`.
  // A workspace whose only brand material is a `look` it has no way to have
  // written from this app is still, from the Overview's point of view, a
  // workspace that has not started.
  return (
    data.voices.length === 0 &&
    data.audiences.length === 0 &&
    data.guardrails === null
  )
}

/**
 * How long a voice's samples have to run before the voice is worth having.
 *
 * Three, not one: one sample is an example, three is a pattern. The ceiling in
 * the docs is eight, but there is no upper bound enforced here — more samples
 * is the one place in this module where more input is straightforwardly better.
 */
export const MIN_VOICE_SAMPLES = 3

/* -- Binding ---------------------------------------------------------------
 *
 * What a campaign and a post have chosen out of the library above. The model
 * is `docs/brand-materials.md` §8 and it is deliberately three levels deep:
 *
 *     workspace has a cast of voices
 *         → a campaign picks which of them it uses
 *             → each post carries one, changeable
 *
 * There is no fourth. Binding at phase, post type or account was considered
 * and cut — a campaign carrying a cast plus a per-post assignment expresses
 * every case we have with one fewer concept, and each extra level is another
 * place the resolved value has to be explained.
 *
 * **Guardrails are absent from both, and that is the design.** They apply to
 * every generation regardless of what is picked here, so there is nothing to
 * pick and nothing to override. A guardrails control on these screens would
 * imply a campaign could opt out of the claims it is allowed to make.
 */

/**
 * A campaign's share of the library.
 *
 * Neither field is a copy — both are live references, per §8's *live links are
 * safe* argument. Editing a voice changes the next generation and changes
 * nothing already written.
 */
export type CampaignBrand = {
  /**
   * The voices this campaign draws on, in the order they were chosen.
   *
   * A cast rather than one, because the plan generator assigns a voice **as it
   * plans**: twelve Friday slots get the Friday voice at generation time
   * rather than through twelve manual corrections afterwards. A campaign with
   * one voice is the common case and costs nothing to express here.
   *
   * Empty means the campaign has not chosen, which resolves to the library's
   * default voice — not to "no voice". A campaign that opts out of having a
   * voice is not a case anybody has asked for, and reading empty as silence
   * keeps an untouched campaign working exactly as it did before.
   */
  voiceIds: string[]
  /**
   * Which of the cast a post starts in. `null` falls back to the library's own
   * `isDefault` voice.
   *
   * Stored rather than derived from `voiceIds[0]`: the order of the cast is the
   * order they were picked in, and nobody expects re-picking to change which
   * voice their next post opens in.
   */
  defaultVoiceId: string | null
  /**
   * Who the campaign writes to. **One, not a cast** — the asymmetry with voices
   * is deliberate rather than an omission.
   *
   * A cast of voices exists because something automatic chooses between them
   * per post. Nothing chooses an audience per post, so a list here would be a
   * picker whose extra entries no code path ever reads. A post that addresses
   * somebody else says so on the post.
   */
  audienceId: string | null
}

/**
 * One post's assignment. Both fields are overrides — absent means *whatever the
 * campaign says*, which is the state almost every post stays in.
 */
export type PostBrand = {
  /**
   * The voice this post is written in, plus what was bent locally.
   *
   * A `BrandRef` rather than a bare id because the local delta and the promote
   * path come with it (§4). `null` id with a delta is a pure local value —
   * somebody wrote a one-off instruction without naming a voice, which is the
   * state promotion exists to rescue.
   *
   * `null` for the whole field means the post has not overridden anything and
   * takes the campaign's default. That is different from a ref pointing at the
   * same voice the campaign would have given it: the second survives the
   * campaign's default changing, and was chosen.
   */
  voice: BrandRef<string> | null
  /** Overrides the campaign's audience. `null` takes the campaign's. */
  audienceId: string | null
}
