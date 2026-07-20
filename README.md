# Editor

`Editor` is a format-aware TipTap component (`HTML` or `Markdown`) with:
- Bubble menu formatting controls
- Slash commands
- Links, images (including ALT editing), and tables

Component export:
- `Editor` from `src/components/ui/editor.tsx`

## Local Development

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm run registry:build
```

`npm run build` now:
- builds client assets
- builds SSR entry
- prerenders `/` into `dist/index.html`

## Styling Model

- Uses shadcn-style Tailwind utility classes and semantic tokens.
- Uses local shadcn component files where needed (`button`, `tabs`).
- Demo/base styles live in `src/index.css`.

## Registry

Registry source:
- `registry.json`
- `registry/default/editor/*`

Build registry artifacts:

```bash
npm run registry:build
```

Generated files:
- `public/r/registry.json`
- `public/r/editor.json`

## Install In Another Project

Install this component directly from GitHub:

```bash
npx shadcn@latest add https://editor.pagescms.org/r/editor.json
```

## Basic Usage

```tsx
import { useState } from "react";
import { Editor } from "@/components/ui/editor";

export function Example() {
  const [value, setValue] = useState("");

  return (
    <Editor
      value={value}
      onChange={setValue}
    />
  );
}
```

Notes:
- Default `format` is `"html"`.
- `format` supports `"markdown"` and `"html"`.
- `className` applies classes to the root wrapper (`cn-editor`).
- `editorClassName` applies classes to the WYSIWYG surface only.

## Markdown HTML Policy

In Markdown mode, raw HTML is parsed through TipTap by default. Use `markdownHtml`
to control matching raw HTML fragments by CSS selector:

```tsx
<Editor
  format="markdown"
  value={value}
  onChange={setValue}
  markdownHtml={{
    keep: ["div.callout", "span[data-keep]", "u"],
    strip: ["div.legacy-wrapper"],
    drop: ["script", "style", "iframe"],
  }}
/>
```

Policy precedence is `drop`, then `strip`, then `keep`, then the default TipTap
Markdown behavior. Selectors match the root element of the raw HTML fragment.

## Image Workflows

`Editor` supports both pre-uploaded URLs and local file uploads.

- Slash image selector:
  - Return `{ kind: "url", src }` from `onRequestImage` if the image is already uploaded.
  - Return `{ kind: "file", file }` from `onRequestImage` to run optimistic upload flow.
- Paste/drop:
  - Enable with `enableImagePasteDrop`.
  - Provide `onUploadImage` to upload files and return final `{ src }`.
  - Optional fallback with `imageFallback="data-url"` for base64 insertion.
- Swap behavior:
  - The editor preloads the final uploaded URL before replacing the temporary `blob:` preview.
  - If preload fails or times out, the editor keeps the temporary preview and marks the image with an upload error state.
- Pending uploads:
  - Use `onPendingUploadsChange` to disable autosave/publish while uploads are in progress.

## Implement Your Own Source Toggle

`Editor` is intentionally focused on rich-text editing. If you need a source view, keep a single shared `value` state and switch between `Editor` and your own text input.

```tsx
import { useState } from "react";
import { Editor } from "@/components/ui/editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type View = "editor" | "source";

export function EditorWithSourceToggle() {
  const [view, setView] = useState<View>("editor");
  const [value, setValue] = useState("");

  return (
    <Tabs value={view} onValueChange={(next) => setView(next as View)} className="w-full">
      <TabsList>
        <TabsTrigger value="editor">Editor</TabsTrigger>
        <TabsTrigger value="source">Source</TabsTrigger>
      </TabsList>
      <TabsContent value="editor">
        <Editor
          value={value}
          onChange={setValue}
          format="markdown"
        />
      </TabsContent>
      <TabsContent value="source">
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="min-h-64 font-mono"
        />
      </TabsContent>
    </Tabs>
  );
}
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `string` | `""` | Current editor content. |
| `onChange` | `(value: string) => void` | - | Called whenever content changes. |
| `format` | `"markdown" \| "html"` | `"html"` | Parsing and output format. |
| `disabled` | `boolean` | `false` | Disables editing and toolbar actions. |
| `enableImages` | `boolean` | `true` | Enables image-related behaviors (slash command and image actions). |
| `enableImagePasteDrop` | `boolean` | `false` | Enables image file paste and drag/drop insertion. |
| `onRequestImage` | `(ctx) => { kind: "url", src, alt?, title? } \| { kind: "file", file, alt?, title? } \| null \| Promise<...>` | - | Called by Image slash command. Return a URL result for already-uploaded images or a file result for local upload flow. |
| `onUploadImage` | `(file, ctx) => { src, alt?, title? } \| null \| Promise<...>` | - | Upload hook for local files (paste/drop/slash file). |
| `imageFallback` | `"data-url" \| "prompt-url" \| "none"` | `"prompt-url"` | Fallback when no callback inserts an image. |
| `maxImageBytes` | `number` | `1000000` | Max file size used by `"data-url"` fallback. |
| `onPendingUploadsChange` | `(count: number) => void` | - | Receives pending optimistic upload count. |
| `enableVideos` | `boolean` | `true` | Enables the Video slash command (inserts an externally-hosted `<video>` embed, GitHub-style — no upload). |
| `markdownHtml` | `{ keep?: string[]; strip?: string[]; drop?: string[] }` | - | Controls raw HTML fragments in Markdown mode using root-element CSS selectors. |
| `className` | `string` | - | Extra classes for the root wrapper (`cn-editor`). |
| `editorClassName` | `string` | - | Extra classes for the WYSIWYG surface. |
| `...props` | `HTMLAttributes<HTMLDivElement>` | - | Forwarded to the root container. |

## Deploy (Cloudflare Pages)

Use Git integration with these settings:
- Framework preset: `None`
- Root directory: `editor`
- Build command: `npm run build`
- Build output directory: `dist`

This deploys the prerendered static HTML + hydrated React demo.
