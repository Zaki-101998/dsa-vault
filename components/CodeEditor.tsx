"use client";

import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import type { CodeLang } from "@/lib/types";

const langExtension: Record<CodeLang, ReturnType<typeof java>> = {
  java: java(),
  cpp: cpp(),
  python: python(),
};

const placeholderText: Record<CodeLang, string> = {
  java: "// Paste or write your Java solution here…",
  cpp: "// Paste or write your C++ solution here…",
  python: "# Paste or write your Python solution here…",
};

const themeExtension = EditorView.theme({
  "&": { fontSize: "13px", height: "100%" },
  ".cm-content": { padding: "14px 16px" },
});

export function CodeEditor({
  value,
  lang,
  onChange,
  onPasted,
  editorRef,
  readOnly = false,
}: {
  value: string;
  lang: CodeLang;
  onChange: (v: string) => void;
  /** Called with the full document text just after a paste has been applied. */
  onPasted?: (doc: string) => void;
  editorRef?: React.Ref<ReactCodeMirrorRef>;
  /** Read-mode (mobile): blocks edits and focus so no keyboard pops up. */
  readOnly?: boolean;
}) {
  const extensions = [
    langExtension[lang],
    themeExtension,
    EditorView.domEventHandlers({
      paste: (_event, view) => {
        // Defer so CodeMirror has applied the pasted text before we read the doc.
        if (onPasted) setTimeout(() => onPasted(view.state.doc.toString()), 0);
        return false;
      },
    }),
  ];

  return (
    <div className="flex-1 min-h-0 border border-[#2a3040] rounded-xl overflow-hidden bg-[#0d1017]">
      <CodeMirror
        ref={editorRef}
        value={value}
        height="100%"
        theme={oneDark}
        extensions={extensions}
        onChange={onChange}
        placeholder={placeholderText[lang]}
        readOnly={readOnly}
        editable={!readOnly}
        basicSetup={{ lineNumbers: true, foldGutter: !readOnly, tabSize: 4 }}
        style={{ height: "100%" }}
      />
    </div>
  );
}
