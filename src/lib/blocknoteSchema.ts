import {
  BlockNoteSchema,
  createHeadingBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";

// Shared BlockNote schema for both post content and content-bank assets.
//
// The editor palette is intentionally limited to a small, platform-agnostic
// set of blocks: Heading 1–3, Quote, Bullet List, Numbered List, Paragraph and
// Image. The inline Emoji picker (the `:` trigger) is part of the editor core
// rather than a block spec, so it stays available automatically.
//
// Every other default block — tables, code blocks, dividers, file/video/audio,
// check lists and toggle lists — is excluded simply by leaving it out of the
// schema. BlockNote's slash menu, drag-handle menu and formatting toolbar are
// all schema-driven (each item is guarded by `editorHasBlockWithType`), so a
// block that isn't in the schema is automatically removed from every menu.
//
// The heading block is given a custom spec so the menus only offer levels 1–3
// (the default heading allows 1–6) and never the toggle-heading variants.
export const editorSchema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: defaultBlockSpecs.paragraph,
    heading: createHeadingBlockSpec({
      levels: [1, 2, 3],
      allowToggleHeadings: false,
    }),
    quote: defaultBlockSpecs.quote,
    bulletListItem: defaultBlockSpecs.bulletListItem,
    numberedListItem: defaultBlockSpecs.numberedListItem,
    image: defaultBlockSpecs.image,
  },
});
