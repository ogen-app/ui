/**
 * Workspace tiers (CON-232) — what the app says when the plan is the reason.
 *
 * Two vocabularies, and keeping them apart is the point. *Not in your plan*
 * is a fact about what was bought and is only ever answered by buying more.
 * *You've reached your limit* is a fact about this month, usually answered by
 * waiting — so it never appears without the count and, where there is one,
 * the date the allowance comes back. Collapsing the two into one "upgrade"
 * message would turn "wait until Tuesday" into a sales pitch.
 *
 * Nothing here names a tier. Tiers are versioned and configurable, and two
 * workspaces can both be on something called "Pro" while holding different
 * allowances — so a sentence like "included in Pro" would be true on one
 * screen and a lie on the next.
 */
export const tiers = {
  /**
   * `/plans` as one ledger of columns (CON-328). Capitals are written out
   * where the design sets them — labels and actions — and survive any
   * restyle that way.
   */
  ledger: {
    title: 'Choose a plan',
    gatedLead:
      "{{workspace}} needs one before anyone can keep working. Nothing you've made is touched.",
    waitingTitle: 'Waiting on the owner',
    waitingBody:
      'Only an owner of {{workspace}} can choose a plan. This page opens the workspace as soon as they do.',
    switchWorkspace: 'Switch workspace',
    signOut: 'Sign out',
    /** The yearly saving, beside the billing switch. Floored, never rounded up. */
    save: 'SAVE {{percent}}%',
    mostPopular: 'MOST POPULAR',
    chargedToday: 'CHARGED TODAY',
    freeMonthThen: 'FREE FOR A MONTH, THEN',
    currentLabel: 'YOUR PLAN',
    perMonth: '/ month',
    billedMonthly: 'Billed monthly · excl. VAT',
    billedYearly: 'Billed {{total}} a year · excl. VAT',
    allowances: 'ALLOWANCES',
    /** `name` arrives already in capitals, set for the active language. */
    chooseNamed: 'Choose {{name}}',
    startFreeMonth: 'Start free month',
    currentPlan: 'Current plan',
    scheduled: 'Scheduled',
    unavailable: 'Not available yet',
    noneOnSale: 'No plan is on sale right now.',
    vatNote:
      'Prices exclude VAT. Polar sells Ogen as merchant of record and adds it at checkout.',
    /**
     * A tester's complimentary workspace (CON-402): the same ledger with no
     * money on it. These replace the title, the price block and the VAT note.
     */
    compTitle: 'Select a plan you like',
    compLead: '{{workspace}} has complimentary beta access.',
    compTryAny: 'Try any plan for as long as you like — nothing is charged.',
    freeWhileTesting: 'FREE WHILE YOU TEST',
    /** `name` arrives already in capitals, set for the active language. */
    switchNamed: 'Switch to {{name}}',
    compNote:
      'Beta access is free while you test. If it ends, Ogen tells you first and nothing you made is touched.',
    /** The tier held is one the Ogen team set up and nobody can choose. */
    hiddenTierTitle:
      "You're on {{name}}, the plan the Ogen team set up for your testing",
    hiddenTierBody:
      "It isn't one of the plans below. Switching to one is free and takes effect at once — but only the Ogen team can move this workspace back to {{name}}.",
    /** Above the owner gate, once, after an operator ends a tester's access. */
    compEndedTitle: 'Your complimentary beta access has ended',
    compEndedBodyFreeMonth:
      'Thanks for testing Ogen. Choose a plan to keep going — your first month is free on {{name}}, because this account has never had one.',
    compEndedBody:
      'Thanks for testing Ogen. Choose a plan to keep going — nothing you made has been touched.',
  },
  /** Waiting for Polar to confirm a subscription (CON-328). */
  checkout: {
    confirmingTitle: 'Confirming your subscription',
    confirmingBody:
      'Polar has your details. {{workspace}} opens as soon as they confirm — usually a few seconds.',
    stepCheckout: 'Checkout completed',
    stepConfirm: 'Waiting for Polar to confirm',
    stepOpen: 'Opening {{workspace}}',
    openedTitle: 'Finish checking out in the new tab',
    /** Said only when checkout itself says the free month was applied. */
    openedTrial: 'Your first month is free — nothing is charged today.',
    openedCharged: "You're charged when you complete the checkout.",
    openedBody:
      'This page carries on by itself once Polar confirms, and opens {{workspace}}.',
    reopen: 'Open checkout again',
    back: 'Choose another plan',
    slowTitle: 'Taking longer than usual',
    slowBody:
      "Leave this open, or come back later — you won't be charged twice. Your receipt from Polar has the order reference.",
    subscribed: "You're on {{name}}.",
  },
  /** Confirming an in-place plan change on a workspace that already pays. */
  changeDialog: {
    title: 'Move to {{name}}?',
    body: 'Polar works out the difference: a move up starts today, a move down waits for the end of the period you have paid for.',
    trialBody:
      'This ends the free month on {{name}} today, and {{target}} is charged now.',
    cancel: 'Cancel',
    /** `name` arrives already in capitals. */
    confirm: 'Move to {{name}}',
    blockedTitle: 'Not during the free month',
    blockedBody:
      "{{name}} can't be changed until its free month ends on {{when}}. Choose again then, or end the free month in Polar and come back.",
    blockedBodyBare:
      "{{name}} can't be changed until its free month ends. End it in Polar, or choose again once it has.",
    nothingCharged: "Nothing was charged, and you're still on {{name}}.",
    ok: 'OK',
  },
  /** A refused plan change, one sentence per code the server sends. */
  planError: {
    stale:
      "That plan can't be chosen any more. Reload the page to see what's on offer.",
    notAvailable: "That plan isn't on sale right now.",
    notChangeable:
      "This subscription can't be changed from here. Manage it in Polar.",
    duringTrial: "Your plan can't be changed during the free month.",
    provider: "Polar didn't answer. Try again in a moment.",
    unavailable: "Billing isn't available right now.",
  },
  /** The Plan & billing card (CON-328). */
  freeUntil: 'Free until {{when}}, then {{price}}.',
  freeUntilBare: 'Free until {{when}}.',
  statusOnTrial: 'Free month',
  billingUnavailable:
    "Billing details aren't available right now, so there's nothing to manage from here.",
  sandbox: 'Sandbox',
  noPortal: "There's nothing at Polar to manage yet.",
  priceExclVat: '{{price}}, excl. VAT',
  perMonth: '{{price}} / month',
  perYear: '{{price}} / year',
  /** `name` arrives already in capitals. */
  keepPlan: 'Keep {{name}}',
  notInPlan: 'Not in your plan',
  notInPlanBody:
    "This isn't part of the plan your workspace is on. Upgrading turns it on for everyone here.",

  /**
   * The limit case. The headline carries no number on purpose — the count
   * lives on the meter below it, where it can be a byte size or a tally
   * without the sentence having to be rewritten for each.
   */
  limitReached: "You've reached your limit",
  resets: 'Your allowance goes back to full on {{when}}.',

  /**
   * The same two refusals, arriving from the server instead of being
   * predicted here (CON-295). The API answers 402 `entitlement_exceeded` or
   * 403 `feature_not_available`, and these are what the mutation toast says
   * in place of that identifier.
   *
   * They go in the toast's *description*, under a title that already names
   * the action that failed — which is why neither names the feature. The noun
   * is on screen already, and putting it here would have to survive
   * `media_storage_bytes`, whose allowance is a byte count: "you've used all
   * 1073741824" is a true sentence nobody can read.
   *
   * `deniedLimit` takes the server's cap as `{{count}}` so the singular is a
   * sentence rather than a "1". The tier refusal carries no number at all —
   * a capability that is switched off has nothing to count.
   */
  deniedTier: "This isn't included in your plan.",
  deniedLimit_one: "You've used the one that your plan allows.",
  deniedLimit_other: "You've used all {{count}} that your plan allows.",
  /** The quota refusal with no cap on it — a malformed body, and rare. */
  deniedLimitFlat: "You've used everything your plan allows here.",

  /**
   * The meter. Each reset is a whole sentence: where "this month" sits in
   * the line is a different answer in every language, and gluing it onto a
   * stem would decide that in English for everyone.
   *
   * The four are the server's own reset words (CON-243). `usage` covers
   * `standing` — a ceiling that never refills has no period to name — and a
   * reset word this build has not heard of, which is true either way.
   */
  usage: '{{used}} of {{limit}}',
  usageMonth: '{{used}} of {{limit}} this month',
  usageTotal: '{{used}} of {{limit}} used',
  usagePost: '{{used}} of {{limit}} on this post',
  /**
   * The limit with no tally beside it — which is most of them, because the
   * API ships allowances and no usage read (CON-243). Saying "0 of 5" instead
   * would be a claim that nothing has been used, made by nobody.
   */
  limitOnly: '{{limit}} included',
  /** For the tier that paid to have no number here. */
  unlimited: 'Unlimited',

  /** Capitalised like every other action label in the app. */
  upgrade: 'Upgrade',
  /**
   * The upgrade dialog (CON-232): one recommended plan argued for, with what
   * it adds beside it.
   *
   * The limit titles are one whole sentence per metered feature rather than
   * one sentence with `{{feature}}` slotted in, because `features` below are
   * headings ("Campaigns") and the sentence wants a noun phrase mid-way
   * ("all active campaigns") — a different word, in every language. None of
   * them states a number: the figure is on the plan, and the title's job is
   * the fact, not the count. `{{plan}}` is the tier's name, which is data.
   *
   * `perMonth` wraps the price in `<price>` so it can be set large without
   * the unit being assembled from a fragment.
   */
  paywall: {
    label: 'Upgrade your plan',
    title: 'Get more with Ogen {{plan}} Plan',
    titleTop: '{{plan}} is as far as this goes',
    reasonTier: "{{feature}} isn't included in {{plan}}.",
    reasonTierOther: "This isn't included in {{plan}}.",
    reasonLimit: {
      team_seats: "You've filled every seat on {{plan}}.",
      workspaces: "You've used all workspaces on {{plan}}.",
      connected_accounts: "You've connected every account {{plan}} allows.",
      active_campaigns: "You've used all active campaigns on {{plan}}.",
      plan_runs_per_month:
        "You've used this month's content plan runs on {{plan}}.",
      quality_reviews_per_post:
        "You've used this post's quality reviews on {{plan}}.",
      posts_total: "You've used all posts on {{plan}}.",
      content_bank_assets: 'Your content bank is full on {{plan}}.',
      web_page_imports: "You've used all web-page imports on {{plan}}.",
      media_storage_bytes: "You've used all media storage on {{plan}}.",
      assistant_multiplier:
        "You've used the assistant's allowance on {{plan}}.",
    },
    reasonLimitOther: "You've reached a limit on {{plan}}.",
    bodyTier: 'Upgrading turns it on for everyone in this workspace.',
    bodyLimit: "Everything you've made stays exactly as it is.",
    bodyResets:
      'Your allowance fills back up on {{when}}, or upgrade now to keep going.',
    noOffer:
      'No plan on sale offers more of this than the one you have. Compare the plans to see everything each one includes.',
    billing: 'Billing period',
    monthly: 'Monthly',
    yearly: 'Yearly',
    perMonth: '<price>{{price}}</price> / month',
    billedYearly: '{{total}} billed yearly',
    billedYearlySaving: '{{total}} billed yearly, save {{saving}}',
    upgradeTo: 'Upgrade to {{plan}}',
    /** The offered plan's name on its card; `plan` is the server's tier name. */
    planName: 'Ogen {{plan}}',
    comparePlans: 'Compare every plan',
    seeAllFeatures: 'See all features',
    /**
     * One tile per benefit: a title that carries the figure, and one line
     * on what it is for. Counted features pluralise on `count`; storage takes
     * a pre-formatted `value`; a plain capability has only `included`. A
     * counted feature the tier does not meter reads as `unlimited`.
     */
    benefit: {
      team_seats: {
        limit_one: '{{count}} team member',
        limit_other: '{{count}} team members',
        unlimited: 'Unlimited team members',
        description: 'Invite teammates to plan and publish with you.',
      },
      workspaces: {
        limit_one: '{{count}} workspace',
        limit_other: '{{count}} workspaces',
        unlimited: 'Unlimited workspaces',
        description: 'Keep separate brands or clients apart.',
      },
      connected_accounts: {
        limit_one: '{{count}} connected account',
        limit_other: '{{count}} connected accounts',
        unlimited: 'Unlimited connected accounts',
        description: 'Publish to more of your social profiles.',
      },
      active_campaigns: {
        limit_one: '{{count}} active campaign',
        limit_other: '{{count}} active campaigns',
        unlimited: 'Unlimited active campaigns',
        description: 'Run more campaigns at the same time.',
      },
      plan_runs_per_month: {
        limit_one: '{{count}} content plan run a month',
        limit_other: '{{count}} content plan runs a month',
        unlimited: 'Unlimited content plan runs',
        description: "Let Ogen draft a campaign's posts for you.",
      },
      quality_reviews_per_post: {
        limit_one: '{{count}} quality review per post',
        limit_other: '{{count}} quality reviews per post',
        unlimited: 'Unlimited quality reviews',
        description: 'Check each post before it goes out.',
      },
      posts_total: {
        limit_one: '{{count}} post',
        limit_other: '{{count}} posts',
        unlimited: 'Unlimited posts',
        description: 'Keep writing without counting what is left.',
      },
      content_bank_assets: {
        limit_one: '{{count}} content bank document',
        limit_other: '{{count}} content bank documents',
        unlimited: 'Unlimited content bank documents',
        description: 'Store the notes, files and pages your posts draw on.',
      },
      web_page_imports: {
        limit_one: '{{count}} web page import',
        limit_other: '{{count}} web page imports',
        unlimited: 'Unlimited web page imports',
        description: 'Turn any web page into source material.',
      },
      media_storage_bytes: {
        limit: '{{value}} of media storage',
        unlimited: 'Unlimited media storage',
        description: 'Room for the images and videos in your posts.',
      },
      multiple_accounts_per_platform: {
        included: 'Several accounts on one platform',
        description: 'Connect two profiles on the same network.',
      },
      all_campaign_types: {
        included: 'All campaign types',
        description: 'Every campaign format, not only evergreen.',
      },
      custom_campaign_types: {
        included: 'Custom campaign types',
        description: 'Define campaign types of your own.',
      },
    },
    /**
     * The plan card's line under the name, and its stand-in for a price the
     * catalogue has not published — an unpriced plan says so rather than
     * showing nothing, or showing a zero it does not mean.
     */
    planPitch: 'Everything on {{current}}, with more room to grow.',
    unpriced: 'Pricing is not published yet.',
  },
  seePlans: 'See plans',
  /**
   * For the half of the workspace that cannot act on any of the above
   * (CON-232). "For everyone here" is the part worth saying: a plan is not a
   * personal setting somebody forgot to turn on, and a member who reads it as
   * one goes looking for a switch that does not exist.
   */
  ownersOnlyPlan:
    'Only a workspace owner can change the plan for everyone here.',

  /**
   * A downgrade suspends; it never deletes. The body's first job is that
   * reassurance — a campaign that stops accepting edits reads as a campaign
   * that has been taken away, and it hasn't been.
   */
  suspended: 'Read-only',
  suspendedBody:
    "Your plan changed, so this is read-only for now. Nothing has been deleted — it's all here, and upgrading makes it editable again.",
  suspendedSince: 'Read-only since {{when}}.',

  planLoadFailed: 'The plans could not be loaded.',
  plansClose: 'Close plans',
  /**
   * Inside the plan's own card, where the card names what is being changed —
   * the same shape, and the same word, as a campaign's type.
   */
  changePlan: 'Change',

  /**
   * Plan & billing — one card in Workspace Settings, with no screen behind
   * it. The provider is the merchant of record and holds everything a
   * customer could edit, so what is left to say fits on the card.
   *
   * "Plan & billing" rather than "Plan": the card is the answer to "where do
   * I change my card", and somebody looking for that scans headings for the
   * word billing.
   */
  billingTitle: 'Plan & billing',
  /**
   * "& details" because the button beside it opens all of them — the address,
   * the tax id, the invoices — and a row called "Payment method" would make
   * that door look like it led to a card form.
   */
  paymentMethod: 'Payment Method & Details',
  /** The brand is printed beside this; the catalogue carries only the tail. */
  cardEnding: 'ending {{last4}}',
  /**
   * A subscription with no card *in our copy of it* — never phrased as a
   * missing payment method. A live subscription has one by definition, so
   * "none on file" under a plan somebody is paying for reads as *we lost your
   * card*: alarming, and untrue. It is held, elsewhere, by the seller.
   */
  cardWithProvider: 'Your payment method is held by Polar.',
  /** The free-tier line: a statement about money, not about a missing card. */
  noSubscription: 'Nothing is being charged for this workspace.',
  /**
   * Both tenses written out, chosen by the provider's status rather than by
   * comparing the date to the clock. `cancelled` is paid up and still
   * running; `expired` is over. Nothing derives that from `when`.
   */
  accessEnds: 'Access ends on {{when}}.',
  accessEnded: 'Access ended on {{when}}.',
  ownersOnly: 'Only workspace owners can see billing details.',

  /**
   * The one place the provider is named, and it has to be named: Polar is
   * the seller of record, so it is the name on the customer's
   * statement and on the invoice. The sentence exists to answer the question
   * this card will be asked — where do I change my VAT number — whose answer
   * is a place rather than a field.
   */
  providerHolds:
    'Your payment method, billing address, tax ID, invoices and cancellation are handled by Polar, which sells Ogen as merchant of record.',
  /** The row title says what is managed, the way SWITCH sits under a name. */
  managePortal: 'Manage',
  portalFailed: 'The billing portal could not be opened.',

  /**
   * Only the states worth interrupting for. "Active" beside "auto-renews on
   * the 22nd" is noise; a failed payment is not.
   */
  statusPastDue: 'Payment failed',
  statusCancelled: 'Cancelled',
  statusPaused: 'Paused',
  statusExpired: 'Expired',
  statusUnpaid: 'Unpaid',

  /**
   * The third line on the plan, and only for the two states that are a
   * problem to be solved. The tag says what happened and the line above says
   * what happens to the plan; this one says whose move it is.
   *
   * Worded apart because the provider means different things by them.
   * `past_due` is still inside the retry schedule, so the instruction is to
   * wait — sending someone to re-enter a card the provider is about to charge
   * successfully is how a card gets changed for no reason. `unpaid` has run
   * out of retries, so nothing else will happen without them.
   *
   * The provider is named in both: the card is not held here, so "update your
   * payment method" without saying where is an instruction with no address.
   */
  paymentRetrying: 'The last payment failed, and Polar will try it again.',
  paymentStopped:
    'The last payment failed and will not be retried — update your payment method with Polar to keep this plan.',

  currentPlan: 'Current plan',
  currentBadge: 'Current',
  /** A tier version that is still held but can no longer be bought. */
  retired: 'No longer offered',
  since: 'On this plan since {{when}}.',

  /**
   * What the workspace is on. Three whole sentences rather than a stem plus
   * "monthly", because where the cadence sits in the line is a different
   * answer in every language — and a tier nobody pays for has no cadence to
   * put anywhere.
   */
  onPlan: "You're on the {{name}} plan.",
  onPlanMonthly: "You're on the {{name}} plan, billed monthly.",
  onPlanYearly: "You're on the {{name}} plan, billed yearly.",

  /**
   * When it renews. Both dates are given — the distance because that is what
   * anyone actually wants ("is it soon?"), the date because that is what they
   * will check against a calendar or a statement.
   *
   * `{{relative}}` is `Intl.RelativeTimeFormat`'s work, not the catalogue's:
   * it knows every language's plural rules and its own words for tomorrow and
   * today, so no `_one`/`_other` pair belongs here. The plain form is the
   * fallback for a date that would not parse.
   */
  autoRenews: 'It auto-renews on {{when}}.',
  autoRenewsIn: 'It auto-renews {{relative}}, on {{when}}.',

  /** For the button's accessible name, where "CHOOSE" alone says too little. */
  chooseNamed: 'Choose {{name}}',
  /** Undoing a scheduled downgrade — the only way back from one. */
  cancelChange: 'Cancel change',

  /**
   * A change that has been made but has not happened yet. Both directions are
   * worded, because "Max starts on the 1st" and "you drop to Trial on the
   * 1st" want opposite tones, and only the server knows which one it is.
   */
  changeScheduled: 'You move to {{name}} on {{when}}.',
  changeScheduledUp: '{{name}} starts on {{when}}.',
  /**
   * The same two with the distance in them, for the screens that are read at
   * a glance rather than during the decision. A pending change outranks the
   * renewal line: telling a workspace its plan auto-renews when it is about
   * to drop a tier is the opposite of what happens next.
   */
  changeScheduledIn: 'You move to {{name}} {{relative}}, on {{when}}.',
  changeScheduledUpIn: '{{name}} starts {{relative}}, on {{when}}.',
  /**
   * The reassurance leads, because a plan change reads as a threat to the
   * work already in the workspace and it isn't one.
   */
  changeScheduledBody:
    "Nothing will be deleted. If you're over the new plan's limits, some things become read-only until you move back up.",
  changeFailed: 'Your plan could not be changed.',
  changedNow: "You're now on {{name}}.",
  /** A complimentary workspace's switch — free and at once (CON-402). */
  switched: 'Switched to {{name}}',
  switchedBody: 'New limits apply straight away.',
  /** For the button's accessible name, where "SWITCH TO" alone says too little. */
  switchNamed: 'Switch to {{name}}',
  /** Leaving a tier the Ogen team set up — the one switch that cannot be made back. */
  leaveHidden: {
    title: 'Leave {{name}}?',
    body: 'Switching to {{target}} is free and takes effect at once. Only the Ogen team can move this workspace back to {{name}}.',
    cancel: 'Cancel',
  },
  /** The Plan & billing card while a workspace has complimentary beta access. */
  comp: {
    tag: 'Beta access',
    sentence: 'Complimentary — nothing to pay.',
    payment:
      "No card on file, and none is needed while this workspace has complimentary beta access. If it ends, you'll be asked to choose a plan and Polar will take your payment details then.",
  },
  changeCancelled: 'That change has been called off.',

  /**
   * How a tier states an allowance, as opposed to how a meter spends one.
   * Keyed off the server's reset words (CON-243); `limitFlat` covers
   * `standing` — a ceiling with no period to name — and any word this build
   * has not heard of.
   */
  limitFlat: '{{value}}',
  limitMonth: '{{value}} per month',
  limitTotal: '{{value}} in total',
  limitPost: '{{value}} per post',
  included: 'Included',
  excluded: 'Not included',

  /**
   * A plan card's price, set large: `<price>` wraps the figure so the unit
   * can sit beside it small without being assembled from a fragment.
   */
  price: '<price>{{price}}</price> / month',
  priceYear: '<price>{{price}}</price> / year',
  priceFree: 'Free',

  /**
   * The name each entitlement key goes by on screen. Keyed by the key rather
   * than assembled anywhere, so a feature is called the same thing on the
   * price list and on the lock that mentions it.
   */
  features: {
    team_seats: 'Team members',
    workspaces: 'Workspaces',
    connected_accounts: 'Connected accounts',
    multiple_accounts_per_platform: 'Several accounts on one platform',
    active_campaigns: 'Campaigns',
    all_campaign_types: 'All campaign types',
    custom_campaign_types: 'Custom campaign types',
    plan_runs_per_month: 'Content plan runs',
    quality_reviews_per_post: 'Post quality reviews',
    posts_total: 'Posts',
    content_bank_assets: 'Content bank documents',
    web_page_imports: 'Web page imports',
    media_storage_bytes: 'Media storage',
  },
}
