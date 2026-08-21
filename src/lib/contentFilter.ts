import { statusToBadge } from "@/lib/assetStatus";
import type { Asset, AssetStatus } from "@/types/content";

/**
 * What a document list is currently narrowed to: some words, and a list of
 * clauses.
 *
 * The clauses are a flat list rather than a field per facet, because that is
 * what is on screen — a row of chips, in the order they were added, each one
 * removable on its own. A shape with `statuses` and `tagIds` beside them could
 * not say which came first, and could not say "not" without growing a second
 * field per facet, and then a third.
 *
 * Deliberately not a query builder. There is no grouping, no nesting, and no
 * and/or of the user's choosing; the three rules in `filterAssets` are fixed
 * and are the only ones, which is what keeps this readable without a legend.
 */
export type ContentFilter = {
  /** Matched against the title, case-insensitively, anywhere in it. */
  name: string;
  clauses: Clause[];
};

/** One value of one facet, wanted or unwanted. */
export type Clause = {
  facet: FilterFacet;
  id: string;
  /** True excludes rather than includes — `not tag (Legal)`. */
  negated: boolean;
};

export const EMPTY_FILTER: ContentFilter = { name: "", clauses: [] };

/** Whether anything is being narrowed — what tells the empty state which words to use. */
export function isFilterActive(filter: ContentFilter): boolean {
  return filter.name.trim() !== "" || filter.clauses.length > 0;
}

function matches(asset: Asset, clause: Clause): boolean {
  return clause.facet === "status"
    ? asset.status === clause.id
    : asset.tags.some((tag) => tag.id === clause.id);
}

/**
 * The documents that satisfy the filter.
 *
 * Three rules, and none of them is a choice offered to the user:
 *
 * - Wanted values of the same facet are **any-of**. Ready or Partial.
 * - Every facet with a wanted value must be satisfied, so facets **and**
 *   together. Ready, and filed under Legal.
 * - Unwanted values **all** have to miss. "Not Legal or not Pricing" is
 *   satisfied by very nearly everything and is never what anyone means, so
 *   negation is always "and not".
 *
 * A document with no tags at all therefore passes `not tag (Legal)` — it does
 * not carry Legal — while failing `tag (Legal)`. That asymmetry is what the
 * words mean, and it is the one thing here worth knowing before reading a
 * result.
 */
export function filterAssets(assets: Asset[], filter: ContentFilter): Asset[] {
  const name = filter.name.trim().toLowerCase();
  const wanted = new Map<FilterFacet, Clause[]>();
  const unwanted: Clause[] = [];
  for (const clause of filter.clauses) {
    if (clause.negated) unwanted.push(clause);
    else
      wanted.set(clause.facet, [...(wanted.get(clause.facet) ?? []), clause]);
  }

  return assets.filter((asset) => {
    if (name !== "" && !asset.title.toLowerCase().includes(name)) return false;
    for (const group of wanted.values()) {
      if (!group.some((clause) => matches(asset, clause))) return false;
    }
    return !unwanted.some((clause) => matches(asset, clause));
  });
}

/** A named value a facet can be narrowed to. */
export type FilterValue = { id: string; name: string };

/**
 * Everything the documents in scope could be filtered by.
 *
 * Both halves are drawn from the documents themselves rather than from the
 * workspace's tag list and the five statuses that exist in the type: a value no
 * document here carries can only ever filter to nothing, and a menu of dead
 * ends is how a filter starts reading as broken. On a campaign where everything
 * has been read, `status` therefore isn't offered at all.
 */
export type FilterVocabulary = { statuses: FilterValue[]; tags: FilterValue[] };

export function vocabulary(assets: Asset[]): FilterVocabulary {
  return { statuses: statusVocabulary(assets), tags: tagVocabulary(assets) };
}

/** The statuses present here, kept in life-cycle order rather than sorted. */
export function statusVocabulary(assets: Asset[]): FilterValue[] {
  const present = new Set(assets.map((asset) => asset.status));
  return FILTERABLE_STATUSES.filter((status) => present.has(status)).map(
    (status) => ({
      id: status,
      name: statusToBadge(status).label,
    }),
  );
}

/** Sorted by name, so the menu doesn't reorder itself as documents come and go. */
export function tagVocabulary(assets: Asset[]): FilterValue[] {
  const byId = new Map<string, string>();
  for (const asset of assets) {
    for (const tag of asset.tags) byId.set(tag.id, tag.name);
  }
  return [...byId]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The statuses worth offering, in the order they appear on a document's life:
 * waiting, being read, then the three ways it can end up.
 */
export const FILTERABLE_STATUSES: AssetStatus[] = [
  "pending",
  "processing",
  "ready",
  "partial",
  "failed",
];

/* ------------------------------------------------------------------ *
 * Modifiers
 *
 * The clauses, entered the way Slack takes them: free text narrows by name,
 * and anything else is a `keyword:value` modifier that becomes a chip. Chips
 * accumulate, so the set operators never have to be explained — two `status`
 * chips are plainly "either", a `status` chip beside a `tag` chip is plainly
 * "both", and a `not` chip is plainly neither.
 *
 * The grammar is deliberately one line long. It exists so that typing is a
 * *faster* path to the same filter, not a second, more capable one: everything
 * reachable by typing is reachable from the suggestions, and nothing here can
 * express a filter the chips cannot draw.
 * ------------------------------------------------------------------ */

export type FilterFacet = "status" | "tag";

/** The modifiers, in the order they are offered. */
export const FACETS: { facet: FilterFacet; keyword: string }[] = [
  { facet: "status", keyword: "status" },
  { facet: "tag", keyword: "tag" },
];

/** `tags:` too, because people type the plural and being corrected is friction. */
const KEYWORDS: Record<string, FilterFacet> = {
  status: "status",
  statuses: "status",
  tag: "tag",
  tags: "tag",
};

/** A modifier half-typed: the facet is settled, the value is still being said. */
export type ModifierDraft = {
  facet: FilterFacet;
  query: string;
  negated: boolean;
};

/**
 * Reads `status:re` as a modifier, `-tag:legal` as one that excludes, and
 * anything without a known keyword as prose.
 *
 * The leading minus is Slack's, and it is the whole of the negation grammar:
 * `not tag:legal` would read better and would also mean teaching a second
 * keyword that is not a facet.
 */
export function parseModifier(draft: string): ModifierDraft | null {
  const trimmed = draft.trimStart();
  const negated = trimmed.startsWith("-");
  const body = negated ? trimmed.slice(1) : trimmed;
  const colon = body.indexOf(":");
  if (colon === -1) return null;
  const facet = KEYWORDS[body.slice(0, colon).trim().toLowerCase()];
  if (!facet) return null;
  return { facet, query: body.slice(colon + 1).trimStart(), negated };
}

/**
 * What typed text means for the name clause — nothing, while it is a modifier.
 * Without this, `status:` would be searched for as a title and empty the list
 * halfway through being typed.
 */
export function draftName(draft: string): string {
  return parseModifier(draft) ? "" : draft;
}

/** What a facet can be narrowed to here. */
export function facetValues(
  facet: FilterFacet,
  vocab: FilterVocabulary,
): FilterValue[] {
  return facet === "status" ? vocab.statuses : vocab.tags;
}

export function keywordFor(facet: FilterFacet): string {
  return FACETS.find((entry) => entry.facet === facet)!.keyword;
}

/**
 * Adds a clause, or replaces the one already standing for that value.
 *
 * Replacing rather than appending is what makes a chip flip instead of
 * doubling: nothing can be both wanted and unwanted, and a second `tag (Legal)`
 * chip says nothing the first didn't.
 */
export function withClause(
  filter: ContentFilter,
  facet: FilterFacet,
  id: string,
  negated: boolean,
): ContentFilter {
  const at = filter.clauses.findIndex((c) => c.facet === facet && c.id === id);
  if (at === -1)
    return { ...filter, clauses: [...filter.clauses, { facet, id, negated }] };
  if (filter.clauses[at].negated === negated) return filter;
  const clauses = [...filter.clauses];
  clauses[at] = { facet, id, negated };
  return { ...filter, clauses };
}

export function withoutClause(
  filter: ContentFilter,
  facet: FilterFacet,
  id: string,
): ContentFilter {
  return {
    ...filter,
    clauses: filter.clauses.filter((c) => !(c.facet === facet && c.id === id)),
  };
}

export type FilterChip = Clause & { keyword: string; label: string };

/**
 * The filter as chips, one per clause, in the order they were added.
 *
 * One chip per value rather than one per facet — `status (Ready)` next to
 * `status (Failed)`, not `status (Ready or Failed)` — so that removing one of
 * three choices is a click on the thing being removed, rather than reopening
 * the menu it came from and hunting for the tick.
 */
export function filterChips(
  filter: ContentFilter,
  vocab: FilterVocabulary,
): FilterChip[] {
  // A chosen value can leave the scope — the last failed document is deleted
  // while `status (Failed)` is up — and the chip still has to say what it is
  // filtering by. Statuses are labelled from the type rather than from what is
  // present for exactly that reason.
  const tags = new Map(vocab.tags.map((tag) => [tag.id, tag.name]));
  return filter.clauses.map((clause) => ({
    ...clause,
    keyword: keywordFor(clause.facet),
    label:
      clause.facet === "status"
        ? statusToBadge(clause.id as AssetStatus).label
        : (tags.get(clause.id) ?? clause.id),
  }));
}

export type Suggestion = {
  facet: FilterFacet;
  keyword: string;
  negated: boolean;
} & (
  | { kind: "facet"; hint: string }
  | { kind: "value"; id: string; label: string }
);

/** Enough of a facet's values to show what it holds, without wrapping the row. */
function hint(values: FilterValue[]): string {
  const shown = values.slice(0, 3).map((v) => v.name);
  return values.length > shown.length
    ? `${shown.join(", ")}…`
    : shown.join(", ");
}

/**
 * What to offer under the box for what has been typed so far.
 *
 * Three cases, and the same list serves all of them. Nothing typed: the
 * modifiers, which is how anyone finds out they exist. A modifier begun
 * (`status:re`): its remaining values. Prose: the modifiers it could be the
 * start of, and then any value it names outright — typing `ready` should offer
 * `status (Ready)` without knowing there was a keyword for it.
 *
 * Every offer is followed by its opposite — `Tag is Legal`, then
 * `Tag is not Legal`. Exclusion used to hang off a button on the right of the
 * row, which put two verbs on one menu item and hid the second one until the
 * row was aimed at; as its own row it is a thing you can see, read and click
 * like any other. The list doubles in length, which is the price: the
 * alternative is a filter whose other half nobody knows is there.
 *
 * Values already claimed never come back, whichever way they were claimed: a
 * value cannot be wanted and unwanted at once, so its chip is the only place it
 * can be changed. A facet with nothing left to offer stops being suggested.
 */
export function suggest(
  draft: string,
  filter: ContentFilter,
  vocab: FilterVocabulary,
): Suggestion[] {
  const remaining = (facet: FilterFacet) => {
    const claimed = new Set(
      filter.clauses.filter((c) => c.facet === facet).map((c) => c.id),
    );
    return facetValues(facet, vocab).filter((v) => !claimed.has(v.id));
  };
  // Once the minus is typed the polarity is settled, and offering the including
  // form would contradict the text the cursor is sitting in.
  const both = (suggestion: Suggestion): Suggestion[] =>
    suggestion.negated
      ? [suggestion]
      : [suggestion, { ...suggestion, negated: true }];
  const values = (facet: FilterFacet, query: string, negated: boolean) =>
    remaining(facet)
      .filter((v) => v.name.toLowerCase().includes(query))
      .map(
        (v) =>
          ({
            kind: "value",
            facet,
            keyword: keywordFor(facet),
            negated,
            id: v.id,
            label: v.name,
          }) as const,
      );

  const modifier = parseModifier(draft);
  if (modifier) {
    return values(
      modifier.facet,
      modifier.query.toLowerCase(),
      modifier.negated,
    ).flatMap(both);
  }

  // A lone minus is someone starting an exclusion: offer the modifiers, in the
  // form they are about to be typed.
  const negated = draft.trimStart().startsWith("-");
  const typed = (negated ? draft.trimStart().slice(1) : draft)
    .trim()
    .toLowerCase();
  const facets = FACETS.filter(({ keyword }) => keyword.startsWith(typed))
    .map(
      ({ facet, keyword }) =>
        ({
          kind: "facet",
          facet,
          keyword,
          negated,
          hint: hint(remaining(facet)),
        }) as const,
    )
    .filter((s) => s.hint !== "");
  if (typed === "") return facets.flatMap(both);

  // Six values, not six rows: the cap is on how much of the vocabulary a word
  // drags in, and a pair split across it would be an offer with no opposite.
  return [
    ...facets.flatMap(both),
    ...FACETS.flatMap(({ facet }) => values(facet, typed, negated))
      .slice(0, 6)
      .flatMap(both),
  ];
}
