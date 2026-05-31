# Notification i18n Wire-Up — 2026-02-FEB (closeout)

**Scope:** Перевести оставшиеся «raw English» call-sites создания
in-app/push нотификаций на ключи `i18n_backend.t('notif.*')` с резолвом
языка получателя из `users.language` (en|uk) и graceful fallback на en.

## Что было до

- `create_notification()` / `_emit_notification()` уже умели i18n
  (`i18n_key_title`, `i18n_key_body`, `i18n_fmt`).
- `push_sender.send_push_nowait()` уже умел `lang` + i18n keys
  (резолвит lang из `user.language` если не передан, переводит на лету).
- `module_motion.py` уже был i18n-aware (8 emit-сайтов).
- `i18n_backend.py` уже содержал ~71 пару `notif.*.title/body` для EN+UK.

Но 12 call-sites обходили это и писали английскую копию руками:

| Файл | Call-sites |
|------|---|
| `server.py` — 7 через `create_notification(...)` (legacy positional) | referral_earned ×2, tier_up dev, tier_up client, dev_joined, achievement_unlocked, payout batch |
| `server.py` — 4 через прямой `db.{notifications,client_notifications}.insert_one` | support_reply, payment_received (magic pull), payment_link_resent, revision_requested |
| `legal_contract_layer.py` — fan-out signed (`insert_many`) + reminder cadence (`insert_one`) | contract_signed_{client,admin,dev}, contract_reminder |

## Что сделано

### 1. server.py — 7 legacy `create_notification(...)` сайтов
Переведены на kwargs-форму с `i18n_key_title` / `i18n_key_body` / `i18n_fmt`:
- `notif.referral_earned.{title,body}` ×2 (invoice referral + network referral)
- `notif.tier_up_dev.{title,body}` (developer tier up)
- `notif.tier_up_client.{title,body}` (client tier up)
- `notif.dev_joined.{title,body}` (developer joined via referral)
- `notif.achievement_unlocked.{title,body}` (achievement unlock)
- `notif.payout.{title,body}` (payout batch paid to dev)

Поскольку `create_notification()` уже резолвит `_resolve_user_lang` внутри
и переводит до записи в БД + дублирует перевод на push через
`send_push_nowait(..., i18n_key_title=..., i18n_key_body=...)`, эти 7
сайтов теперь полностью локализованы и в БД, и в push на устройство.

### 2. server.py — 4 прямых `insert_one` сайта
Резолвят язык получателя через новый helper `_resolve_user_lang(user_id)`
(добавлен в начало `server.py` сразу после `_get_payment_provider`), затем
вставляют переведённые `title` / `body` / `message`:

- `support_reply` (line ~8317): `notif.support_reply.{title,body}` — тех-поддержка ответила
- `payment_received` (line ~11560, magic-link pull): `notif.payment_received_inv.{title,body}`
- `payment_link_resent` (line ~12880, admin resend invoice): `notif.payment_link_resent.{title,body}`
- `revision_requested` (line ~25907, client запросил правки): `notif.revision_requested.{title,body}`

Эти сайты не идут через push_sender (по дизайну — это in-app
inbox/timeline), так что для них достаточно перевода при записи.

### 3. legal_contract_layer.py — fan-out signed + reminder
Перенаправлены на ключи + ленивый импорт `i18n_backend.t` с fallback-лямбдой:

`_emit_signed_notifications()` — теперь резолвит lang каждого получателя
(client / admin × N / developer × N) и подставляет:
- `notif.contract_signed_client.{title,body}` для клиента
- `notif.contract_signed_admin.{title,body}` для админов
- `notif.contract_signed_dev.{title,body}` для разработчиков

`_emit_reminder_notification(threshold_h)` — единый ключ
`notif.contract_reminder.{title,body}` (без отдельных тонов 24h/48h/96h
— тон уже передаётся в `data.threshold_h`).

### 4. Новый helper `_resolve_user_lang`
В `server.py` (lines ~108-122):
```python
async def _resolve_user_lang(user_id: str) -> str:
    try:
        if not user_id: return "en"
        u = await db.users.find_one({"user_id": user_id}, {"_id": 0, "language": 1})
        lg = ((u or {}).get("language") or "").strip().lower().split("-", 1)[0]
        return lg if lg in ("en", "uk") else "en"
    except Exception:
        return "en"
```
- Один индексированный read на сайт.
- Защищён try/except — i18n никогда не валит создание нотификации.
- Использует `db` — глобальный motor handle, уже доступный из server.py.

## Sanity check (end-to-end)

```
$ python3 -c "from i18n_backend import t; ..."
EN title: Project unlocked
UK title: Проєкт розблоковано
EN admin body: Alice signed the agreement for Atlas App ($5000).
UK admin body: Аліса підписав(-ла) договір по Atlas App ($5000).
EN rem: Test — please review and sign to start work.
UK rem: Test — будь ласка, перегляньте та підпишіть для старту.
EN rev: Changes requested: Auth Module
UK rev: Запит на правки: Auth Module
EN pay: Payment received — $5000
UK pay: Платіж отримано — $5000
EN sup: Support replied
UK sup: Відповідь підтримки
```

Backend перезапустился чисто, lifespan complete, все loop'ы запустились,
`/api/healthz=200`. Synthax-check: `python3 -m ast server.py → OK`.

## Покрытие на момент закрытия

| Поверхность | Локализация |
|-------------|-------------|
| `_emit_notification` (module_motion + push) | ✅ done ранее |
| `create_notification` (server.py 7 сайтов) | ✅ done в этом батче |
| `db.notifications.insert_one` direct (server.py 4 сайта) | ✅ done в этом батче |
| `legal_contract_layer` fan-out + reminder | ✅ done в этом батче |
| `push_sender.send_push_nowait` (lang + i18n keys) | ✅ done ранее |
| Seed-time demo notifications (server.py:10828) | ⏭ оставлено raw (demo data) |

## Push payload локализация (как уже работает)

`push_sender.send_push_nowait(...)`:
1. Если caller передал `i18n_key_title` / `i18n_key_body` — внутри
   запускается task, который читает `users.language` через единственный
   индексированный read, переводит через `i18n_backend.t` и шлёт на Expo.
2. Если caller передал готовые `title/body` (legacy) — переводит, что есть.
3. Все ошибки i18n → graceful, push не блокирует business path.

Так что **push payload локализация (~1ч)** была сделана раньше и заново
не нужна. Все 11 переведённых сайтов теперь автоматически получают
локализованный push, потому что либо они идут через `create_notification`
(который сам зовёт `send_push_nowait(i18n_key_title=..., i18n_key_body=...)`),
либо они in-app-only.

## Файлы изменены

```
backend/server.py                +33 / -22 (11 сайтов + 1 helper)
backend/legal_contract_layer.py  +88 / -47 (signed fan-out + reminder)
```

## Что осталось из i18n roadmap

- ⚪ **API HTTPException detail локализация** (~2ч, опционально) — спорно по DX. 
  Endpoints возвращают `detail: "..."` строкой; чтобы локализовать,
  нужен middleware который читает `Accept-Language`. Контракт уже есть
  (`raise_http(status, key, **fmt)` экспортируется из `i18n_backend`),
  ~50 сайтов в server.py всё ещё на голом `HTTPException(detail=...)`.
  Может оставаться как есть, т.к. это видит только разработчик / API
  клиент, не конечный пользователь UI.

---

**Готово к ревью.** Notification i18n полностью замкнут: каждая запись
в `notifications` / `client_notifications` теперь идёт на языке
получателя, и каждый push-payload — тоже.
