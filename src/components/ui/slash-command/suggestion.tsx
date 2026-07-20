import { ReactRenderer } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import CommandsList, { type CommandsListHandle, type SlashItem } from "./commands-list";
import { Code, Heading1, Heading2, Heading3, Image, List, ListOrdered, Pilcrow, Quote, Table, Video } from "lucide-react";
import type { SuggestionOptions as TiptapSuggestionOptions } from "@tiptap/suggestion";

export type ImagePickerUrlResult = {
  kind: "url";
  src: string;
  alt?: string;
  title?: string;
};

export type ImagePickerFileResult = {
  kind: "file";
  file: File;
  alt?: string;
  title?: string;
};

export type ImagePickerResult = ImagePickerUrlResult | ImagePickerFileResult;

export type ImagePickerContext = {
  editor: Editor;
  range: { from: number; to: number };
};

export type ImagePickerHandler = (
  context: ImagePickerContext,
) => ImagePickerResult | null | Promise<ImagePickerResult | null>;

export type SlashImageFallback = "prompt-url" | "none";

type SuggestionOptions = {
  onRequestImage?: ImagePickerHandler | null;
  onInsertLocalImageFile?: ((context: ImagePickerContext & Omit<ImagePickerFileResult, "kind">) => void | Promise<void>) | null;
  enableImages?: boolean;
  imageSlashFallback?: SlashImageFallback;
  enableVideos?: boolean;
};

// A native <video> element can only ever play a direct media file — it
// can't point at a YouTube/Vimeo page, because neither platform exposes
// a stable file URL to hotlink (the real video bytes are served through
// their own player, by design). Those two need a real <iframe> embed
// instead. This sniffs which shape a pasted URL needs and returns the
// iframe src to use, or null if it looks like a direct file URL instead
// (in which case the caller inserts a plain <video src> node).
const YOUTUBE_URL_PATTERN = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i;
const VIMEO_URL_PATTERN = /vimeo\.com\/(?:video\/)?(\d+)/i;

export const toVideoEmbedSrc = (url: string): string | null => {
  const youtubeMatch = url.match(YOUTUBE_URL_PATTERN);
  if (youtubeMatch) return `https://www.youtube-nocookie.com/embed/${youtubeMatch[1]}`;

  const vimeoMatch = url.match(VIMEO_URL_PATTERN);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return null;
};

const requestVideoAndInsert = ({ editor, range }: ImagePickerContext): void => {
  const url = window.prompt("Video URL (direct file, YouTube, or Vimeo)")?.trim();
  if (!url) return;
  const embedSrc = toVideoEmbedSrc(url);
  editor
    .chain()
    .focus()
    .deleteRange(range)
    .insertContent(embedSrc ? { type: "videoEmbed", attrs: { src: embedSrc } } : { type: "video", attrs: { src: url } })
    .run();
};

const TABLE_SAFE_COMMANDS = new Set(["Image"]);

type RequestImageAndInsertArgs = ImagePickerContext & {
  onRequestImage: ImagePickerHandler | null;
  onInsertLocalImageFile: ((context: ImagePickerContext & Omit<ImagePickerFileResult, "kind">) => void | Promise<void>) | null;
  imageSlashFallback: SlashImageFallback;
};

const requestImageAndInsert = async ({
  editor,
  range,
  onRequestImage,
  onInsertLocalImageFile,
  imageSlashFallback = "prompt-url",
}: RequestImageAndInsertArgs): Promise<void> => {
  let result: ImagePickerResult | null = null;
  if (onRequestImage) {
    result = await onRequestImage({ editor, range });
  } else if (imageSlashFallback === "prompt-url") {
    const src = window.prompt("Image URL")?.trim();
    result = src ? { kind: "url", src } : null;
  }

  if (!result) return;

  if (result.kind === "file") {
    if (!onInsertLocalImageFile) return;
    editor.chain().focus().deleteRange(range).run();
    const fileInsertContext: ImagePickerContext & Omit<ImagePickerFileResult, "kind"> = {
      editor,
      range,
      file: result.file,
      ...(result.alt ? { alt: result.alt } : {}),
      ...(result.title ? { title: result.title } : {}),
    };
    await onInsertLocalImageFile(fileInsertContext);
    return;
  }

  const imageAttrs = {
    src: result.src,
    ...(result.alt ? { alt: result.alt } : {}),
    ...(result.title ? { title: result.title } : {}),
  };

  editor
    .chain()
    .focus()
    .deleteRange(range)
    .setImage(imageAttrs)
    .run();
};

const getAllItems = (options: SuggestionOptions): SlashItem[] => [
  {
    title: "Text",
    icon: Pilcrow,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: "Heading 1",
    icon: Heading1,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    icon: Heading2,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    icon: Heading3,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
  },
  {
    title: "Bulleted list",
    icon: List,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    icon: ListOrdered,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Image",
    icon: Image,
    command: ({ editor, range }) => {
      void requestImageAndInsert({
        editor,
        range,
        onRequestImage: options.onRequestImage ?? null,
        onInsertLocalImageFile: options.onInsertLocalImageFile ?? null,
        imageSlashFallback: options.imageSlashFallback ?? "prompt-url",
      });
    },
  },
  {
    title: "Video",
    icon: Video,
    command: ({ editor, range }) => requestVideoAndInsert({ editor, range }),
  },
  {
    title: "Table",
    icon: Table,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: "Quote",
    icon: Quote,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Code block",
    icon: Code,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
];

type SlashSuggestion = Pick<TiptapSuggestionOptions, "items" | "render">;
type SuggestionRenderLifecycle = NonNullable<ReturnType<NonNullable<SlashSuggestion["render"]>>>;
type SuggestionKeyDownProps = Parameters<NonNullable<SuggestionRenderLifecycle["onKeyDown"]>>[0];

const createSuggestion = (options: SuggestionOptions = {}): SlashSuggestion => ({
  items: ({ query, editor }: { query: string; editor: Editor }) => {
    const isInTableCell = editor.isActive("tableCell") || editor.isActive("tableHeader");
    return getAllItems(options)
      .filter((item) => !isInTableCell || TABLE_SAFE_COMMANDS.has(item.title))
      .filter((item) => options.enableImages !== false || item.title !== "Image")
      .filter((item) => options.enableVideos !== false || item.title !== "Video")
      .filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10);
  },

  render: (): SuggestionRenderLifecycle => {
    let component: ReactRenderer<CommandsListHandle> | null = null;
    let popup: TippyInstance | null = null;

    return {
      onStart: (props) => {
        component = new ReactRenderer(CommandsList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) return;
        const referenceRect = () => props.clientRect?.() ?? new DOMRect(0, 0, 0, 0);

        popup = tippy(document.body, {
          getReferenceClientRect: referenceRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
        });
      },

      onUpdate: (props) => {
        if (!component) return;
        component.updateProps(props);
        if (!props.clientRect || !popup) return;
        const referenceRect = () => props.clientRect?.() ?? new DOMRect(0, 0, 0, 0);
        popup.setProps({ getReferenceClientRect: referenceRect });
      },

      onKeyDown: ({ event }: SuggestionKeyDownProps): boolean => {
        if (event.key === "Escape" && popup) {
          popup.hide();
          return true;
        }

        return component?.ref?.onKeyDown(event) ?? false;
      },

      onExit: (): void => {
        if (popup) popup.destroy();
        component?.destroy();
      },
    };
  },
});

export default createSuggestion;
