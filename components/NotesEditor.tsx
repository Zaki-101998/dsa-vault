"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";
import { marked } from "marked";
import { DOMParser as PMDOMParser } from "@tiptap/pm/model";
import { useEffect, useRef } from "react";
import { useIsMobile } from "@/lib/useIsMobile";

const lowlight = createLowlight(common);

function looksLikeMarkdown(text: string): boolean {
  return /(^#{1,6}\s)|(\*\*[^*]+\*\*)|(^```)|(^\s*[-*+]\s+)|(^\s*\d+\.\s+)|(^>\s)|(^\|.*\|.*\|)/m.test(
    text
  );
}

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`border rounded-md px-2.5 py-1 text-xs ${
        active
          ? "border-[#5b8cff] text-[#5b8cff] bg-[#1c212c]"
          : "border-[#2a3040] text-[#8b93a7] hover:text-[#e6e9f0] bg-[#161a22]"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  return (
    <div className="hidden md:flex gap-1 mb-2 flex-wrap items-center">
      <ToolbarButton title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <b>B</b>
      </ToolbarButton>
      <ToolbarButton title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <i>I</i>
      </ToolbarButton>
      <ToolbarButton title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <u>U</u>
      </ToolbarButton>
      <ToolbarButton title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        • List
      </ToolbarButton>
      <ToolbarButton title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        1. List
      </ToolbarButton>
      <ToolbarButton title="Heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        H2
      </ToolbarButton>
      <ToolbarButton title="Code block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        {"{ }"}
      </ToolbarButton>
      <ToolbarButton title="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
        `code`
      </ToolbarButton>
      <ToolbarButton title="Clear formatting" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
        ⌫ Fmt
      </ToolbarButton>
      <span className="ml-auto text-[11px] text-[#8b93a7] opacity-80">
        Paste from Gemini keeps formatting · plain markdown auto-renders
      </span>
    </div>
  );
}

export function NotesEditor({
  problemKey,
  html,
  onChange,
}: {
  problemKey: string;
  html: string;
  onChange: (html: string) => void;
}) {
  // Mobile is a strictly read-only revision surface: lock the editor so
  // tapping the notes never pops the on-screen keyboard.
  const isMobile = useIsMobile();

  const editor = useEditor({
    immediatelyRender: false,
    editable: !isMobile,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: html || "",
    editorProps: {
      attributes: { class: "notes-prose" },
      handlePaste(view, event) {
        const cd = event.clipboardData;
        if (!cd) return false;
        if (cd.getData("text/html")) return false; // rich paste — TipTap's built-in handler preserves it
        const text = cd.getData("text/plain") || "";
        if (!text || !looksLikeMarkdown(text)) return false;
        event.preventDefault();
        const parsedHtml = marked.parse(text, { async: false }) as string;
        const dom = new window.DOMParser().parseFromString(parsedHtml, "text/html");
        const parser = PMDOMParser.fromSchema(view.state.schema);
        const slice = parser.parseSlice(dom.body, { preserveWhitespace: true });
        view.dispatch(view.state.tr.replaceSelection(slice));
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    editor?.setEditable(!isMobile);
  }, [editor, isMobile]);

  const lastKey = useRef(problemKey);
  useEffect(() => {
    if (!editor) return;
    if (lastKey.current !== problemKey) {
      editor.commands.setContent(html || "", { emitUpdate: false });
      lastKey.current = problemKey;
    }
  }, [problemKey, html, editor]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Toolbar editor={editor} />
      <div className="flex-1 overflow-y-auto bg-[#161a22] border border-[#2a3040] rounded-xl">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
