// Shared decoder for the takeuforward A2Z payload. Pure functions, no I/O —
// scripts/fetch-a2z.mjs uses it to scrape, scripts/build-a2z-sheet.mjs to read
// the cache back. See fetch-a2z.mjs for why the data is shaped this way.

/**
 * Pull the `sheet_syllabus` object out of a page's HTML.
 *
 * The payload sits inside a JS string literal, so every quote is backslashed and
 * `&` is unicode-escaped. Undo that first, then bracket-match from the key to the
 * end of its object — the payload is far too large and too deeply nested to match
 * with a regex.
 */
export function extractSyllabus(html) {
  const text = html
    .replace(/\\u0026/g, "&")
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");

  const key = '"sheet_syllabus":';
  const at = text.indexOf(key);
  if (at === -1) throw new Error("no sheet_syllabus in page — TUF changed the payload shape");

  const start = at + key.length;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      if (--depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new Error("unterminated sheet_syllabus object");
}

/**
 * Expand each row into a plain object, naming its columns via `fields`, and
 * resolve any "$…:rows:I:J[:K]" back-reference to the value it points at.
 * Index-aligned with `rows`, which is what `children`/`roots` refer to.
 */
export function decodeRows({ fields, rows }) {
  const deref = (v) => {
    if (typeof v !== "string" || !v.startsWith("$")) return v;
    const m = /rows:(\d+):(\d+)(?::(\d+))?$/.exec(v);
    if (!m) return v;
    const cell = rows[+m[1]]?.[+m[2]];
    return m[3] === undefined ? cell : cell?.[+m[3]];
  };

  return rows.map((row) => {
    const names = fields[row[0]];
    if (!names) throw new Error(`row references unknown fields[${row[0]}]`);
    const out = {};
    names.forEach((name, i) => {
      const v = row[i + 1];
      out[name] = Array.isArray(v) ? v.map(deref) : deref(v);
    });
    return out;
  });
}

/**
 * Walk the module → subsection → item tree from `roots`, in sheet order.
 * Calls `visit(item, { module, subsection })` for every leaf; contests are
 * skipped. Returns the tally, so callers can assert the shape they expected.
 */
export function walkSheet(syllabus, visit) {
  const decoded = decodeRows(syllabus);
  const tally = { modules: 0, subsections: 0, items: 0, contests: 0 };

  const walk = (idx, module, subsection) => {
    const node = decoded[idx];
    if (!node) throw new Error(`row ${idx} referenced but out of range`);
    if (node.type === "category") {
      if (!module) tally.modules++;
      else tally.subsections++;
      for (const child of node.children || []) {
        walk(child, module ?? node, module ? node : undefined);
      }
    } else if (node.type === "contest") {
      tally.contests++;
    } else {
      tally.items++;
      visit?.(node, { module, subsection });
    }
  };

  for (const root of syllabus.roots) walk(root, undefined, undefined);
  return tally;
}
