#!/usr/bin/env python3
"""
Professional UK translation pass for ~333 auto2.* marketing keys in
/app/web/src/i18n/dictionary.js.

Strategy:
  - Read EN entries for auto2.*
  - Send to Claude Sonnet 4.5 in batches of ~50 keys with a strict style guide
    that mirrors the existing UK register documented at the top of
    dictionary.js (operational, businesslike Ukrainian; no russianisms; mono
    tech labels kept Latin; industry terms preserved).
  - Receive translations as JSON {key: uk_value}
  - Rewrite the UK block in dictionary.js, replacing only auto2.* entries.

Idempotent: rerun safely. The rest of `uk` block (non-auto2 keys) is
preserved untouched.

Env: EMERGENT_LLM_KEY must be set (read from /app/backend/.env).
"""
import asyncio
import json
import os
import re
import sys
from pathlib import Path

DICT_FILE = Path('/app/web/src/i18n/dictionary.js')

# Load EMERGENT_LLM_KEY from backend .env
def load_key():
    env = Path('/app/backend/.env').read_text()
    for line in env.splitlines():
        if line.startswith('EMERGENT_LLM_KEY'):
            return line.split('=', 1)[1].strip().strip('"').strip("'")
    raise RuntimeError('EMERGENT_LLM_KEY not found')

os.environ['EMERGENT_LLM_KEY'] = load_key()
print(f"Using EMERGENT_LLM_KEY ({os.environ['EMERGENT_LLM_KEY'][:18]}…)")

from emergentintegrations.llm.chat import LlmChat, UserMessage

SYSTEM = """You are a professional Ukrainian translator specialising in
operational SaaS / software-engineering product copy. You translate from
English to Ukrainian for the public website and cabinet UI of ATLAS — a
platform that scopes, prices, contracts and executes software builds.

STYLE GUIDE (binding):
  • Tone: operational, businesslike, editorial software-engineering Ukrainian.
    Concrete verbs, no fluff, no marketing speak.
  • NO russianisms:
      ✗ ретейнер     ✓ абонемент
      ✗ прибыль      ✓ прибуток
      ✗ деталі       ✓ деталі (OK, but watch for clones)
      ✗ операційка   ✓ операційна система / робота
      ✗ собственно   ✓ власне
  • NO mechanical calques:
      ✗ субстрат         ✓ платформа виконання
      ✗ ескроу-холд      ✓ ескроу-блокування / кошти заблоковано
      ✗ блочити          ✓ блокувати
  • Mono tech labels remain in Latin: SEQ-01, USE.STARTUP, STACK.CORE, MVP,
    QA, SaaS, API, escrow (lower-case), KPI, SLA, CI/CD, A/B.
  • Acronyms in body text stay English: MVP, API, SDK, QA, KPI, SLA.
  • Active verbs over passive: «фіксує», «приймає», «запускає»,
    «розгортає», «приймає в роботу».
  • Brand / product names UNTRANSLATED: ATLAS, EVA-X, Stripe, WayForPay,
    PayPal, Cloudinary, GitHub, Sentry, Google.
  • UI labels: short, imperative if a button.
      «Save» → «Зберегти», «Cancel» → «Скасувати», «Open» → «Відкрити»,
      «Submit» → «Надіслати», «Retry» → «Повторити».
  • Status pills capitalised same way as English:
      «In progress» → «У роботі», «Pending» → «Очікує»,
      «Review» → «Перевірка», «Done» → «Готово», «Blocked» → «Заблоковано».
  • Numbers, $ signs, %, em-dashes — preserved exactly.
  • Placeholder tokens like {name}, {amount}, %s, <0></0> — preserved
    byte-for-byte, never translated.
  • Length: aim for parity with English. Ukrainian usually 1.05–1.15× wider.

OUTPUT FORMAT (strict):
  Return ONLY a valid JSON object mapping each input key to its Ukrainian
  translation. No prose, no markdown fences, no extra keys, no comments.
  Example: {"auto2.000": "Зіставлення шаблонів AI", "auto2.001": "..."}
"""


async def translate_batch(batch: dict, batch_num: int, total_batches: int):
    chat = LlmChat(
        api_key=os.environ['EMERGENT_LLM_KEY'],
        session_id=f'auto2-translate-batch-{batch_num}',
        system_message=SYSTEM,
    ).with_model('anthropic', 'claude-sonnet-4-5-20250929').with_params(max_tokens=8000)

    user_payload = (
        f"Translate these {len(batch)} EN strings to UK following the style "
        f"guide. Batch {batch_num}/{total_batches}. Return strict JSON only.\n\n"
        + json.dumps(batch, ensure_ascii=False, indent=2)
    )
    msg = UserMessage(text=user_payload)
    resp = await chat.send_message(msg)
    text = resp if isinstance(resp, str) else str(resp)
    # Strip code fences if present
    m = re.search(r'\{[\s\S]*\}', text)
    if not m:
        raise RuntimeError(f"No JSON in batch {batch_num} response: {text[:200]}")
    return json.loads(m.group(0))


async def main():
    with open('/tmp/auto2_to_translate.json') as f:
        data = json.load(f)
    en = data['en']
    keys = sorted(en.keys(), key=lambda k: int(k.split('.')[1]))
    BATCH = 60
    batches = [keys[i:i + BATCH] for i in range(0, len(keys), BATCH)]
    print(f"Total {len(keys)} keys in {len(batches)} batches of ≤{BATCH}")

    translations = {}
    for i, ks in enumerate(batches, 1):
        sub = {k: en[k] for k in ks}
        print(f"  → batch {i}/{len(batches)} ({len(sub)} keys)…", flush=True)
        try:
            res = await translate_batch(sub, i, len(batches))
        except Exception as e:
            print(f"    ERROR batch {i}: {e}", file=sys.stderr)
            # one retry
            try:
                res = await translate_batch(sub, i, len(batches))
            except Exception as e2:
                print(f"    SECOND ERROR batch {i}: {e2}. Skipping.", file=sys.stderr)
                continue
        # validate keys
        missing = [k for k in sub if k not in res]
        if missing:
            print(f"    WARN batch {i}: missing keys: {missing[:5]}", file=sys.stderr)
        translations.update({k: v for k, v in res.items() if k in sub})

    out_path = Path('/tmp/auto2_uk_pro.json')
    out_path.write_text(json.dumps(translations, ensure_ascii=False, indent=2))
    print(f"Wrote {out_path} with {len(translations)} translations")

    if len(translations) < len(keys) * 0.95:
        print(f"Coverage too low ({len(translations)}/{len(keys)}). NOT writing dictionary.js.")
        sys.exit(2)

    # Rewrite dictionary.js — replace only auto2.* entries in `uk` block
    c = DICT_FILE.read_text()
    m = re.search(r'const uk = \{', c)
    uk_start = m.end()
    m2 = re.search(r'export const DICTIONARY', c)
    uk_end = m2.start()
    uk_block = c[uk_start:uk_end]

    # Replace each auto2.* line
    replaced = 0
    for k, v in translations.items():
        # escape single quotes in value
        v_esc = v.replace('\\', '\\\\').replace("'", "\\'")
        pat = re.compile(rf"^(\s*)'{re.escape(k)}':\s*'[^']*'(,?\s*)$", re.M)
        def sub_line(mm, _v=v_esc, _k=k):
            return f"{mm.group(1)}'{_k}': '{_v}'{mm.group(2)}"
        new_block, n = pat.subn(sub_line, uk_block)
        if n > 0:
            uk_block = new_block
            replaced += 1
    print(f"Replaced {replaced} auto2.* entries in UK block")

    c_new = c[:uk_start] + uk_block + c[uk_end:]
    DICT_FILE.write_text(c_new)
    print(f"Wrote {DICT_FILE} ({len(c_new)} bytes)")


if __name__ == '__main__':
    asyncio.run(main())
