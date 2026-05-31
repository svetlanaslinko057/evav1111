#!/usr/bin/env python3
"""
Cabinet i18n batch sweep — automated wrapper.

Reads `/app/audit/CABINET_I18N_COVERAGE_2026-05-30.md`, finds files with
hardcoded≥1, and for each literal:
  • Wraps `>LITERAL<` (in JSX text position) with `{tByEn('LITERAL')}`.
  • Adds `import { useLang } from '...'` if missing.
  • Reports unmatched literals for manual triage.

Does NOT touch dictionary.js — that's done in a separate step with UK
translations authored by hand for proper register.
"""
import re
import sys
from pathlib import Path

COV = Path("/app/audit/CABINET_I18N_COVERAGE_2026-05-30.md")
PAGES = Path("/app/web/src/pages")
OUT = Path("/tmp/i18n_sweep_report.md")


def parse_coverage():
    """Returns dict {filename: [literals]} for hardcoded>=1 files only."""
    text = COV.read_text()
    out = {}
    # Per-file sections start with "### `Name.js` — tByEn=N hardcoded≈M"
    sections = re.split(r"^### `", text, flags=re.MULTILINE)[1:]
    for s in sections:
        m = re.match(r"^([A-Za-z0-9_.]+)`\s*—\s*tByEn=(\d+)\s*hardcoded≈(\d+)", s)
        if not m:
            continue
        fname, tByEn, hc = m.group(1), int(m.group(2)), int(m.group(3))
        if hc < 1:
            continue
        # Collect bullet lines: `- ` … `\n`
        lits = re.findall(r"^\-\s+`(.+?)`\s*$", s, flags=re.MULTILINE)
        out[fname] = {"literals": lits, "tByEn": tByEn, "hardcoded": hc}
    return out


def find_file(fname):
    candidates = list(PAGES.rglob(fname))
    return candidates[0] if candidates else None


def ensure_useLang_import(content):
    """Add `import { useLang } from '<correct path>/LanguageContext';` if absent."""
    if "useLang" in content:
        return content, False
    # Find existing relative import to a context to detect path style
    m = re.search(r"from\s+['\"]((?:\.\./)+contexts/[^'\"]+)['\"]", content)
    if m:
        ctx_path = m.group(1).rsplit("/", 1)[0]
        import_line = f"import {{ useLang }} from '{ctx_path}/LanguageContext';\n"
    else:
        # default to ../contexts
        import_line = "import { useLang } from '../contexts/LanguageContext';\n"
    # Insert after the first import line
    content = re.sub(
        r"^(import [^\n]+\n)", r"\1" + import_line, content, count=1, flags=re.MULTILINE
    )
    return content, True


def wrap_literal(content, lit):
    """Wrap `>LIT<` → `>{tByEn('LIT')}<` for the FIRST match. Returns (new, ok)."""
    esc = re.escape(lit)
    # JSX text node: literal between > and < (or other JSX delimiters), allowing
    # surrounding whitespace inc. newlines. Must NOT match inside an attribute.
    # We restrict to `>` followed by literal and then `<` (with optional whitespace).
    pattern = rf"(>)(\s*){esc}(\s*)(<)"
    safe = lit.replace("\\", "\\\\").replace("'", "\\'")
    repl = rf"\1\2{{tByEn('{safe}')}}\3\4"
    new = re.sub(pattern, repl, content, count=1)
    return new, new != content


def main():
    files = parse_coverage()
    print(f"Files to process: {len(files)}")
    all_literals = []
    unmatched = []
    fixed_files = []
    for fname, info in sorted(files.items()):
        path = find_file(fname)
        if not path:
            print(f"  NOT FOUND: {fname}")
            continue
        original = path.read_text()
        content = original
        content, added_import = ensure_useLang_import(content)
        # Most files have tByEn destructured already (tByEn>0). For tByEn==0,
        # we still need to add destructuring — but it's component-specific.
        # We log them for manual review.
        needs_hook = "tByEn" not in original and info["tByEn"] == 0
        wrapped_count = 0
        for lit in info["literals"]:
            new, ok = wrap_literal(content, lit)
            if ok:
                content = new
                wrapped_count += 1
                all_literals.append(lit)
            else:
                unmatched.append((fname, lit))
        if content != original:
            path.write_text(content)
            fixed_files.append((fname, wrapped_count, added_import, needs_hook))
            print(
                f"  FIXED {fname}: wrapped={wrapped_count}/{len(info['literals'])}"
                f" import={'+'if added_import else '='}"
                f" hook={'NEEDED' if needs_hook else 'ok'}"
            )

    # Report
    OUT.write_text(
        "# i18n sweep report\n\n"
        f"Files fixed: {len(fixed_files)}\n"
        f"Total wrappings: {len(all_literals)}\n"
        f"Unique literals: {len(set(all_literals))}\n"
        f"Unmatched: {len(unmatched)}\n\n"
        + "## Unmatched literals (manual triage)\n"
        + "\n".join(f"- `{f}` :: `{l}`" for f, l in unmatched)
        + "\n\n## Unique literals (for dictionary)\n"
        + "\n".join(f"- {l!r}" for l in sorted(set(all_literals)))
        + "\n"
    )
    print(f"\nReport: {OUT}")
    print(f"Fixed: {len(fixed_files)} files")
    print(f"Wrapped: {len(all_literals)} literals")
    print(f"Unique:  {len(set(all_literals))}")
    print(f"Unmatched: {len(unmatched)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
