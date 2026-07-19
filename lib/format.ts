import type { CodeLang } from "./types";

// clang-format style shared by Java and C++
const CLANG_STYLE = "{BasedOnStyle: Google, IndentWidth: 4, ColumnLimit: 100}";

// Lazily loaded wasm formatters, cached after first use. On load failure the
// cache is cleared so a later attempt can retry (e.g. transient network error).
let clangPromise: Promise<typeof import("@wasm-fmt/clang-format/web")> | null = null;
let ruffPromise: Promise<typeof import("@wasm-fmt/ruff_fmt/web")> | null = null;

function loadClang() {
  clangPromise ??= import("@wasm-fmt/clang-format/web")
    .then(async (mod) => {
      await mod.default();
      return mod;
    })
    .catch((err) => {
      clangPromise = null;
      throw err;
    });
  return clangPromise;
}

function loadRuff() {
  ruffPromise ??= import("@wasm-fmt/ruff_fmt/web")
    .then(async (mod) => {
      await mod.default();
      return mod;
    })
    .catch((err) => {
      ruffPromise = null;
      throw err;
    });
  return ruffPromise;
}

/** Formats code for the given language. Throws if the code can't be parsed/formatted. */
export async function formatCode(code: string, lang: CodeLang): Promise<string> {
  if (lang === "python") {
    const ruff = await loadRuff();
    return ruff.format(code);
  }
  const clang = await loadClang();
  return clang.format(code, lang === "cpp" ? "main.cpp" : "Solution.java", CLANG_STYLE);
}
