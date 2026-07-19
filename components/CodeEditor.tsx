"use client";

import CodeMirror from "@uiw/react-codemirror";
import { java } from "@codemirror/lang-java";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";

const extensions = [
  java(),
  EditorView.theme({
    "&": { fontSize: "13px", height: "100%" },
    ".cm-content": { padding: "14px 16px" },
  }),
];

export function CodeEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex-1 min-h-0 border border-[#2a3040] rounded-xl overflow-hidden bg-[#0d1017]">
      <CodeMirror
        value={value}
        height="100%"
        theme={oneDark}
        extensions={extensions}
        onChange={onChange}
        placeholder="// Paste or write your Java solution here…"
        basicSetup={{ lineNumbers: true, foldGutter: true, tabSize: 4 }}
        style={{ height: "100%" }}
      />
    </div>
  );
}
