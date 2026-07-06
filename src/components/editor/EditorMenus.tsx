import type { BlockNoteEditor } from "@blocknote/core";
import { filterSuggestionItems, SideMenuExtension } from "@blocknote/core/extensions";
import {
  AddBlockButton,
  blockTypeSelectItems,
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  SideMenu,
  SideMenuController,
  SuggestionMenuController,
  useBlockNoteEditor,
  useComponentsContext,
  useDictionary,
  useExtension,
  useExtensionState,
  type BlockTypeSelectItem,
  type DefaultReactSuggestionItem,
} from "@blocknote/react";
import { DotsSixVerticalIcon } from "@phosphor-icons/react";

// Custom BlockNote menus shared by the post and content-bank editors. They keep
// every insertion surface (formatting toolbar, slash menu, side menu) aligned
// with the limited block palette defined in `@/lib/blocknoteSchema`.
//
// Render as children of:
//   <BlockNoteView formattingToolbar={false} slashMenu={false} sideMenu={false}>
export function EditorMenus() {
  return (
    <>
      <EditorFormattingToolbar />
      <EditorSlashMenu />
      <EditorSideMenu />
    </>
  );
}

// --- Formatting toolbar -----------------------------------------------------

const ALLOWED_HEADING_LEVELS = [1, 2, 3];
const ALLOWED_NON_HEADING_TYPES = [
  "paragraph",
  "quote",
  "bulletListItem",
  "numberedListItem",
];

// Block-type dropdown options, limited to the editor schema's palette. We start
// from BlockNote's defaults (so icons/labels stay in sync) and strip the
// `isToggleable` prop from heading items: the shared schema disables toggle
// headings, and BlockNote hides any dropdown item whose props reference a prop
// the schema doesn't define, so heading items must use `{ level }` only.
function getBlockTypeSelectItems(
  dict: Parameters<typeof blockTypeSelectItems>[0],
): BlockTypeSelectItem[] {
  return blockTypeSelectItems(dict)
    .filter((item) => {
      if (item.type === "heading") {
        return (
          !item.props?.isToggleable &&
          ALLOWED_HEADING_LEVELS.includes(Number(item.props?.level))
        );
      }
      return ALLOWED_NON_HEADING_TYPES.includes(item.type);
    })
    .map((item) =>
      item.type === "heading"
        ? { ...item, props: { level: item.props!.level } }
        : item,
    );
}

function EditorFormattingToolbar() {
  const editor = useBlockNoteEditor();
  const items = getBlockTypeSelectItems(editor.dictionary);

  return (
    <FormattingToolbarController
      formattingToolbar={() => (
        <FormattingToolbar blockTypeSelectItems={items} />
      )}
    />
  );
}

// --- Slash menu -------------------------------------------------------------

// Slash-menu groups and ordering. "Basic Blocks" merges the default Headings
// and Basic blocks groups (Paragraph first, then headings, then the rest);
// "Others" holds Image and Emoji. Keys are the BlockNote slash-menu item keys.
const SLASH_MENU_GROUPS: { group: string; keys: string[] }[] = [
  {
    group: "Basic Blocks",
    keys: [
      "paragraph",
      "heading",
      "heading_2",
      "heading_3",
      "quote",
      "bullet_list",
      "numbered_list",
    ],
  },
  { group: "Others", keys: ["image", "emoji"] },
];

// The React items omit `key` from their static type, but the runtime objects
// carry it (they spread the core slash-menu items), so we re-attach it here.
type KeyedSuggestionItem = DefaultReactSuggestionItem & { key: string };

function getSlashMenuItems(
  editor: BlockNoteEditor<any, any, any>,
): DefaultReactSuggestionItem[] {
  const items = getDefaultReactSlashMenuItems(editor) as KeyedSuggestionItem[];
  const itemsByKey = new Map(items.map((item) => [item.key, item]));

  return SLASH_MENU_GROUPS.flatMap(({ group, keys }) =>
    keys.flatMap((key) => {
      const item = itemsByKey.get(key);
      return item ? [{ ...item, group }] : [];
    }),
  );
}

function EditorSlashMenu() {
  const editor = useBlockNoteEditor();

  return (
    <SuggestionMenuController
      triggerCharacter="/"
      getItems={async (query) =>
        filterSuggestionItems(getSlashMenuItems(editor), query)
      }
    />
  );
}

// --- Side menu --------------------------------------------------------------

// Drag handle that still supports drag-to-reorder but, unlike the default, does
// NOT open a block menu on click (no "Delete"/"Colors" popup).
function DragHandle() {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const editor = useBlockNoteEditor();
  const sideMenu = useExtension(SideMenuExtension);
  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.block,
  });

  if (!block) {
    return null;
  }

  return (
    <Components.SideMenu.Button
      label={dict.side_menu.drag_handle_label}
      draggable
      onDragStart={(e) => sideMenu.blockDragStart(e, block)}
      onDragEnd={sideMenu.blockDragEnd}
      className="bn-button"
      icon={<DotsSixVerticalIcon size={22} weight="bold" />}
    />
  );
}

function EditorSideMenu() {
  return (
    <SideMenuController
      sideMenu={() => (
        <SideMenu>
          <AddBlockButton />
          <DragHandle />
        </SideMenu>
      )}
    />
  );
}
