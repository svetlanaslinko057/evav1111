#!/usr/bin/env python3
"""
Fix all components in /app/web/src that call `tByEn(...)` without
destructuring it from `useLang()`. Insert `const { tByEn } = useLang();`
at the start of the offending component body and add a useLang import
if the file doesn't already have one.

Idempotent — re-running is a no-op once fixed.
"""
import os
import re
from pathlib import Path

ROOT = Path('/app/web/src')

FUNC_DEF = re.compile(
    r'(?P<indent>^[\t ]*)'
    r'(?:export\s+)?'
    r'(?:'
        r'function\s+(?P<fname>\w+)\s*\(.*?\)\s*\{'
        r'|'
        r'const\s+(?P<cname>\w+)\s*=\s*(?:\([^)]*\)|\w+)\s*=>\s*(?P<arrow>[\{(])'
    r')',
    re.MULTILINE | re.DOTALL,
)

DESTRUCTURE_RE = re.compile(r'\{[^}]*\btByEn\b[^}]*\}\s*=\s*useLang\s*\(\)')


def find_component_for_offset(c, off):
    """
    Walk all function definitions; return (def_start, body_start, name)
    of the SMALLEST function whose body contains `off`.

    We approximate body span by brace-balancing from body_start.
    """
    candidates = []
    for m in FUNC_DEF.finditer(c):
        name = m.group('fname') or m.group('cname')
        if not name:
            continue
        body_start = m.end() - 1  # index of `{` or `(`
        open_ch = c[body_start]
        close_ch = '}' if open_ch == '{' else ')'
        # brace balance
        depth = 0
        end = None
        i = body_start
        in_str = None
        while i < len(c):
            ch = c[i]
            if in_str:
                if ch == '\\':
                    i += 2; continue
                if ch == in_str:
                    in_str = None
            else:
                if ch in ('"', "'", '`'):
                    in_str = ch
                elif ch == open_ch:
                    depth += 1
                elif ch == close_ch:
                    depth -= 1
                    if depth == 0:
                        end = i
                        break
            i += 1
        if end is None:
            continue
        if body_start <= off <= end:
            candidates.append((m.start(), body_start, end, name))
    if not candidates:
        return None
    # smallest span
    candidates.sort(key=lambda x: x[2] - x[1])
    return candidates[0]


def fix_file(path: Path) -> int:
    """Return number of components patched in this file."""
    c = path.read_text()
    if 'tByEn(' not in c:
        return 0

    # iterate ALL tByEn call sites and find their owning component
    seen_components = set()
    edits = []  # list of (body_start, name) — insert `const { tByEn } = useLang();` right after body_start `{`

    for m in re.finditer(r'\btByEn\s*\(', c):
        off = m.start()
        comp = find_component_for_offset(c, off)
        if not comp:
            continue
        def_start, body_start, body_end, name = comp
        key = body_start
        if key in seen_components:
            continue
        body = c[body_start + 1 : body_end]
        # if already destructures tByEn anywhere in this scope, skip
        if DESTRUCTURE_RE.search(body):
            seen_components.add(key)
            continue
        # Only patch if the function body opens with `{` (real block, not arrow expression)
        if c[body_start] != '{':
            seen_components.add(key)
            continue
        edits.append((body_start, name))
        seen_components.add(key)

    if not edits:
        return 0

    # Apply edits from the END to preserve offsets
    edits.sort(reverse=True)
    new_c = c
    for body_start, name in edits:
        # Detect indentation of the next non-empty line after `{`
        after = new_c[body_start + 1:]
        m = re.match(r'\n?([ \t]*)', after)
        indent = m.group(1) if m else '  '
        insertion = f'\n{indent}const {{ tByEn }} = useLang();'
        new_c = new_c[: body_start + 1] + insertion + new_c[body_start + 1:]

    # Ensure useLang is imported
    if 'useLang' not in new_c or not re.search(r"import\s*\{[^}]*\buseLang\b[^}]*\}\s*from\s*['\"]", new_c):
        # Find existing import from LanguageContext
        m = re.search(
            r"import\s*\{([^}]*)\}\s*from\s*(['\"][^'\"]*LanguageContext['\"])",
            new_c,
        )
        if m:
            inside = m.group(1)
            if 'useLang' not in inside:
                new_inside = inside.rstrip() + ', useLang '
                new_c = new_c[: m.start(1)] + new_inside + new_c[m.end(1):]
        else:
            # Insert a fresh import right after the first import statement
            first_import = re.search(r'^import\s.+?;\s*$', new_c, re.MULTILINE)
            insert_at = first_import.end() if first_import else 0
            new_import = "\nimport { useLang } from '@/contexts/LanguageContext';"
            new_c = new_c[:insert_at] + new_import + new_c[insert_at:]

    path.write_text(new_c)
    return len(edits)


def main():
    total_files = 0
    total_edits = 0
    for p in sorted(ROOT.rglob('*.js')):
        n = fix_file(p)
        if n:
            print(f'  {n}× {p.relative_to(ROOT.parent)}')
            total_files += 1
            total_edits += n
    print(f'\nPatched {total_files} files, {total_edits} component bodies.')


if __name__ == '__main__':
    main()
