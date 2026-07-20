import { ArrowUpRight, Check, Copy, Github, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { codeToHtml, type BundledLanguage } from "shiki";
import { Editor } from "./components/ui/editor";
import { Button } from "./components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Textarea } from "./components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";

const THEME_STORAGE_KEY = "pages-editor-theme";
const COPY_FEEDBACK_MS = 1500;
const DEFAULT_EDITOR_CONTENT_CSS = `@layer components {
   .cn-editor .tiptap {
    @apply border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm;
  }

  .cn-editor .tiptap > :first-child {
    @apply mt-0;
  }

  .cn-editor .tiptap > :last-child {
    @apply mb-0;
  }

  .cn-editor .tiptap h1 {
    @apply mt-8 mb-3 scroll-m-20 text-4xl font-bold tracking-tight text-balance;
  }

  .cn-editor .tiptap h2 {
    @apply mt-8 mb-3 scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0;
  }

  .cn-editor .tiptap h3 {
    @apply mt-6 mb-2 scroll-m-20 text-2xl font-semibold tracking-tight;
  }

  .cn-editor .tiptap p {
    @apply leading-7 [&:not(:first-child)]:mt-4;
  }

  .cn-editor .tiptap ul {
    @apply my-4 ml-6 list-disc;
  }

  .cn-editor .tiptap ol {
    @apply my-4 ml-6 list-decimal;
  }

  .cn-editor .tiptap blockquote {
    @apply my-6 border-l-2 pl-6 italic;
  }

  .cn-editor .tiptap img {
    @apply my-4 transition-shadow;
    
    &.ProseMirror-selectednode {
      @apply ring-1;
    }
  }

  .cn-editor .tiptap a {
    @apply font-medium text-primary underline decoration-dotted underline-offset-4;
  }

  .cn-editor .tiptap code {
    @apply relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm;
  }

  .cn-editor .tiptap pre {
    @apply my-4 overflow-x-auto rounded-xl bg-background p-4;
  }

  .cn-editor .tiptap pre code {
    @apply bg-transparent p-0;
  }

  .cn-editor .tiptap table {
    @apply my-4 w-full border-collapse;
  }

  .cn-editor .tiptap th,
  .cn-editor .tiptap td {
    @apply border px-3 py-2 text-left;
  }

  .cn-editor .tiptap th {
    @apply bg-muted font-medium;
  }

  .cn-editor .tiptap .selectedCell {
    @apply text-foreground;
    outline: 1px solid var(--ring);
  }

  .cn-editor .tiptap .selectedCell::after {
    content: none;
  }

  .cn-editor .tiptap .selectedCell::selection,
  .cn-editor .tiptap .selectedCell *::selection {
    @apply bg-accent text-foreground!;
  }
}`;

const INITIAL_MARKDOWN_VALUE = `Start writing in Markdown or use the bubble menu in editor mode.

- Inline styles: **bold**, *italic*, <u>underline</u>, ~~strike~~, \`inline code\`
- Block styles: text, headings, lists, quote, code block
- Type "/" for slash commands (image, table, and more)

> Built for Pages CMS and extracted as a reusable shadcn/ui component.

\`\`\`ts
export function hello(name: string) {
  return \`Hello, \${name}\`
}
\`\`\`

![Demo image](https://images.unsplash.com/photo-1542114740389-9b46fb1e5be7?w=1920)
`;

type ThemePreference = "light" | "dark" | null;
type DemoView = "editor" | "source";

type HighlightedCodeProps = {
  code: string;
  lang: BundledLanguage;
  dark: boolean;
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });

function HighlightedCode({ code, lang, dark }: HighlightedCodeProps) {
  const [html, setHtml] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const theme = dark ? "github-dark" : "github-light";

    void codeToHtml(code, { lang, theme }).then((nextHtml) => {
      if (isMounted) setHtml(nextHtml);
    });

    return () => {
      isMounted = false;
    };
  }, [code, dark, lang]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      setCopied(false);
    }
  };

  const CopyIcon = copied ? Check : Copy;
  const copyButtonLabel = copied ? "Copied" : "Copy";
  const copyButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={copyCode}
          aria-label={copyButtonLabel}
          className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute top-2 right-2 z-10 inline-flex size-7 items-center justify-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
        >
          <CopyIcon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{copyButtonLabel}</TooltipContent>
    </Tooltip>
  );

  if (!html) {
    return (
      <div className="bg-accent dark:bg-accent/50 relative mt-4 overflow-hidden rounded-lg">
        {copyButton}
        <pre className="p-4 pr-12 text-sm whitespace-pre-wrap break-words">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="bg-accent dark:bg-accent/50 relative mt-4 overflow-hidden rounded-lg">
      {copyButton}
      <div
        className="[&_pre]:m-0 [&_pre]:rounded-[inherit] [&_pre]:bg-accent! dark:[&_pre]:bg-accent/50! [&_pre]:p-4 [&_pre]:pr-12 [&_pre]:text-sm [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:whitespace-pre-wrap [&_code]:break-words"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export default function App() {
  const inlineCodeClass =
    "bg-muted relative rounded-md px-[0.3rem] py-[0.2rem] font-mono text-[0.8rem] break-words outline-none";
  const textLinkClass = "font-medium underline underline-offset-4";
  const [markdownValue, setMarkdownValue] = useState<string>(INITIAL_MARKDOWN_VALUE);
  const [demoView, setDemoView] = useState<DemoView>("editor");
  const [themePreference, setThemePreference] = useState<ThemePreference>(null);
  const [prefersDark, setPrefersDark] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") setThemePreference(stored);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setPrefersDark(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const resolvedTheme = themePreference ?? (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [themePreference, prefersDark]);

  const resolvedIsDark = (themePreference ?? (prefersDark ? "dark" : "light")) === "dark";
  const nextTheme = resolvedIsDark ? "light" : "dark";
  const ThemeIcon = resolvedIsDark ? Sun : Moon;

  const toggleTheme = () => {
    const next = nextTheme;
    setThemePreference(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  };

  return (
    <TooltipProvider>
      <main className="min-h-screen text-sm">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-4 py-8 md:px-6">
        <section className="space-y-2">
          <header className="flex items-center justify-between">
            <Button asChild variant="secondary" size="sm">
              <a href="https://pagescms.org" target="_blank" rel="noreferrer">
                Pages CMS
                <ArrowUpRight className="size-4" />
              </a>
            </Button>
            <div className="flex items-center gap-2">
              <Button asChild variant="secondary" size="sm">
                <a href="https://github.com/pages-cms/editor" target="_blank" rel="noreferrer">
                  <Github className="size-4" />
                  GitHub
                </a>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                aria-label={`Switch to ${nextTheme} theme`}
                title={`Switch to ${nextTheme} theme`}
                onClick={toggleTheme}
                className="size-8 px-0"
              >
                <ThemeIcon className="size-4" />
              </Button>
            </div>
          </header>
          <h1 className="mt-8 scroll-m-24 text-3xl font-semibold tracking-tight sm:text-3xl">Pages Editor</h1>
          <p className="text-[1.05rem] sm:text-base sm:text-balance md:max-w-[80%] text-muted-foreground">
            A simple, Notion-like WYSIWYG editor component for shadcn/ui. Built with TipTap, ProseMirror, and React.
          </p>
        </section>

        <section id="demo" className="space-y-4">
          <h2 className="font-heading [&+]*:[code]:text-xl mt-10 scroll-m-28 text-xl font-medium tracking-tight first:mt-0 lg:mt-12 [&+.steps]:mt-0! [&+.steps>h3]:mt-4! [&+h3]:mt-6! [&+p]:mt-4!">
            Demo
          </h2>

          <Tabs value={demoView} onValueChange={(value) => setDemoView(value as DemoView)} className="w-full">
            <TabsList>
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="source">Source</TabsTrigger>
            </TabsList>
            <TabsContent value="editor">
              <Editor
                value={markdownValue}
                onChange={setMarkdownValue}
                format="markdown"
                enableImages
                enableImagePasteDrop
                imageFallback="data-url"
                maxImageBytes={2_000_000}
                onRequestImage={async () => {
                  const src = window.prompt("Image URL");
                  return src ? { kind: "url", src } : null;
                }}
                onUploadImage={async (file) => ({
                  src: await fileToDataUrl(file),
                  alt: file.name,
                })}
              />
            </TabsContent>
            <TabsContent value="source">
              <Textarea
                value={markdownValue}
                onChange={(event) => setMarkdownValue(event.target.value)}
                className="min-h-64 font-mono"
              />
            </TabsContent>
          </Tabs>
        </section>

        <section id="documentation">
          <h2 className="font-heading [&+]*:[code]:text-xl mt-10 scroll-m-28 text-xl font-medium tracking-tight first:mt-0 lg:mt-12 [&+.steps]:mt-0! [&+.steps>h3]:mt-4! [&+h3]:mt-6! [&+p]:mt-4!">
            Documentation
          </h2>

          <h3 className="font-heading mt-12 scroll-m-28 text-lg font-medium tracking-tight [&+p]:mt-4! *:[code]:text-xl">
            Install
          </h3>
          <p className="leading-relaxed [&:not(:first-child)]:mt-6">
            Install this specific component directly from its JSON URL.
          </p>
          <HighlightedCode
            dark={resolvedIsDark}
            lang="bash"
            code={"npx shadcn@latest add https://editor.pagescms.org/r/editor.json"}
          />

          <h3 className="font-heading mt-12 scroll-m-28 text-lg font-medium tracking-tight [&+p]:mt-4! *:[code]:text-xl">
            Usage
          </h3>
          <p className="leading-relaxed [&:not(:first-child)]:mt-6">
            Use controlled state and pass <code className={inlineCodeClass}>format="markdown"</code> or{" "}
            <code className={inlineCodeClass}>format="html"</code> depending on how you store content. You can also
            pass <code className={inlineCodeClass}>onRequestImage</code> to replace the default image prompt with your
            own modal or picker, plus <code className={inlineCodeClass}>onUploadImage</code> for paste/drop uploads.
          </p>
          <p className="mt-4 leading-relaxed">
            During uploads, the editor inserts a temporary local preview immediately, then preloads the final uploaded
            URL before swapping <code className={inlineCodeClass}>src</code>. If preload fails or times out, it keeps
            the temporary preview and marks an upload error on that image.
          </p>
          <HighlightedCode
            dark={resolvedIsDark}
            lang="tsx"
            code={`import { useState } from "react"
import { Editor } from "@/components/ui/editor"

export function Example() {
  const [value, setValue] = useState("")

  return (
    <Editor
      value={value}
      onChange={setValue}
      onRequestImage={async () => {
        const src = window.prompt("Use URL? Leave empty to simulate file upload")
        if (src) return { kind: "url", src, alt: "Optional alt text" }
        return { kind: "file", file: new File(["demo"], "demo.png", { type: "image/png" }) }
      }}
      enableImagePasteDrop
      imageFallback="data-url"
      onUploadImage={async (file) => ({
        src: await fileToDataUrl(file),
        alt: file.name,
      })}
    />
  )
}`}
          />
          <p className="mt-4">
            The default format is <code className={inlineCodeClass}>"html"</code>. Set{" "}
            <code className={inlineCodeClass}>format="markdown"</code> if your application stores Markdown.
          </p>

          <h3 className="font-heading mt-12 scroll-m-28 text-lg font-medium tracking-tight [&+p]:mt-4! *:[code]:text-xl">
            Implement Your Own Source Toggle
          </h3>
          <p className="leading-relaxed [&:not(:first-child)]:mt-6">
            Keep one shared <code className={inlineCodeClass}>value</code> state and switch between{" "}
            <code className={inlineCodeClass}>Editor</code> and your own source input. This keeps source-mode logic in
            your app, while the component stays focused on rich-text editing.
          </p>
          <HighlightedCode
            dark={resolvedIsDark}
            lang="tsx"
            code={`import { useState } from "react"
import { Editor } from "@/components/ui/editor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type View = "editor" | "source"

export function EditorWithSourceToggle() {
  const [view, setView] = useState<View>("editor")
  const [value, setValue] = useState("")

  return (
    <Tabs value={view} onValueChange={(next) => setView(next as View)} className="w-full">
      <TabsList>
        <TabsTrigger value="editor">Editor</TabsTrigger>
        <TabsTrigger value="source">Source</TabsTrigger>
      </TabsList>
      <TabsContent value="editor">
        <Editor value={value} onChange={setValue} format="markdown" />
      </TabsContent>
      <TabsContent value="source">
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="min-h-64 font-mono"
        />
      </TabsContent>
    </Tabs>
  )
}`}
          />

          <h3 className="font-heading mt-12 scroll-m-28 text-lg font-medium tracking-tight [&+p]:mt-4! *:[code]:text-xl">
            Default Content Styles
          </h3>
          <p className="leading-relaxed [&:not(:first-child)]:mt-6">
            The editor works without these styles, but you can copy this baseline stylesheet to get the same content
            typography as the demo.
          </p>
          <HighlightedCode dark={resolvedIsDark} lang="css" code={DEFAULT_EDITOR_CONTENT_CSS} />

          <h3 className="font-heading mt-12 scroll-m-28 text-lg font-medium tracking-tight [&+p]:mt-4! *:[code]:text-xl">
            Options
          </h3>
          <p className="leading-relaxed [&:not(:first-child)]:mt-6">
            <code className={inlineCodeClass}>Editor</code> is a controlled component. The props below define content
            format and presentation behavior.
          </p>
          <div className="my-6 w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="h-10 px-2 text-left font-medium">Prop</th>
                  <th className="h-10 px-2 text-left font-medium">Type</th>
                  <th className="h-10 px-2 text-left font-medium">Default</th>
                  <th className="h-10 px-2 text-left font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>value</code>
                  </td>
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>string</code>
                  </td>
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>""</code>
                  </td>
                  <td className="p-2 align-top">Current editor content.</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>onChange</code>
                  </td>
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>(value: string) =&gt; void</code>
                  </td>
                  <td className="p-2 align-top">-</td>
                  <td className="p-2 align-top">Called whenever content changes.</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>format</code>
                  </td>
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>"markdown" | "html"</code>
                  </td>
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>"html"</code>
                  </td>
                  <td className="p-2 align-top">Parsing and output format.</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>disabled</code>
                  </td>
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>boolean</code>
                  </td>
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>false</code>
                  </td>
                  <td className="p-2 align-top">Disables editing and toolbar actions.</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>enableImages</code>
                  </td>
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>boolean</code>
                  </td>
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>true</code>
                  </td>
                  <td className="p-2 align-top">
                    Enables image-related behaviors (slash command and image actions).
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>enableImagePasteDrop</code>
                  </td>
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>boolean</code>
                  </td>
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>false</code>
                  </td>
                  <td className="p-2 align-top">
                    Enables image file paste and drag/drop insertion.
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>onRequestImage</code>
                  </td>
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>
                      (ctx) =&gt; {"{ kind: \"url\", src, alt?, title? } | { kind: \"file\", file, alt?, title? }"} | null | Promise&lt;{"{ kind: \"url\", src, alt?, title? } | { kind: \"file\", file, alt?, title? }"} | null&gt;
                    </code>
                  </td>
                  <td className="p-2 align-top">-</td>
                  <td className="p-2 align-top">
                    Called when the user picks the Image slash command. Return image data to insert it; return{" "}
                    <code className={inlineCodeClass}>null</code> to cancel. If omitted, the editor falls back to a
                    native URL prompt.
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>onUploadImage</code>
                  </td>
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>
                      (file, ctx) =&gt; {"{ src, alt?, title? }"} | null | Promise&lt;{"{ src, alt?, title? }"} | null&gt;
                    </code>
                  </td>
                  <td className="p-2 align-top">-</td>
                  <td className="p-2 align-top">
                    Called for pasted or dropped image files. Return image data to insert. If missing or returning{" "}
                    <code className={inlineCodeClass}>null</code>, fallback behavior is used.
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>imageFallback</code>
                  </td>
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>"data-url" | "prompt-url" | "none"</code>
                  </td>
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>"prompt-url"</code>
                  </td>
                  <td className="p-2 align-top">
                    Fallback strategy when no image callback inserts content. For paste/drop, only{" "}
                    <code className={inlineCodeClass}>"data-url"</code> can insert from files.
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>maxImageBytes</code>
                  </td>
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>number</code>
                  </td>
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>1000000</code>
                  </td>
                  <td className="p-2 align-top">
                    Max file size used by <code className={inlineCodeClass}>"data-url"</code> fallback.
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>onPendingUploadsChange</code>
                  </td>
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>(count: number) =&gt; void</code>
                  </td>
                  <td className="p-2 align-top">-</td>
                  <td className="p-2 align-top">
                    Called when pending optimistic uploads change. Use it to gate autosave/save/navigation.
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>enableVideos</code>
                  </td>
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>boolean</code>
                  </td>
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>true</code>
                  </td>
                  <td className="p-2 align-top">
                    Enables the Video slash command — inserts an externally-hosted{" "}
                    <code className={inlineCodeClass}>{"<video>"}</code> embed (GitHub-style, no upload).
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>className</code>
                  </td>
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>string</code>
                  </td>
                  <td className="p-2 align-top">-</td>
                  <td className="p-2 align-top">Extra classes for the root wrapper.</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>editorClassName</code>
                  </td>
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>string</code>
                  </td>
                  <td className="p-2 align-top">-</td>
                  <td className="p-2 align-top">Extra classes for the WYSIWYG surface.</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>...props</code>
                  </td>
                  <td className="p-2 align-top">
                    <code className={inlineCodeClass}>HTMLAttributes&lt;HTMLDivElement&gt;</code>
                  </td>
                  <td className="p-2 align-top">-</td>
                  <td className="p-2 align-top">Forwarded to the root container.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Built by{" "}
          <a href="https://ronanberder.com" target="_blank" rel="noreferrer" className={textLinkClass}>
            Ronan Berder
          </a>{" "}
          for{" "}
          <a href="https://pagescms.org" target="_blank" rel="noreferrer" className={textLinkClass}>
            Pages CMS
          </a>
          .
        </p>
      </div>
      </main>
    </TooltipProvider>
  );
}
