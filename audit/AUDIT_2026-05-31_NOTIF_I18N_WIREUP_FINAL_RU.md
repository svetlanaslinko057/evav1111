# Notification i18n Final Wire-up — 2026-05-31, E1

**Цель:** Закрыть последние hardcoded EN строки в notification-pipeline,
чтобы все in-app notifications + push payloads уходили на языке получателя
(`user.language`).

---

## 0. TL;DR

| Call-site | До | После | Файл |
|-----------|---:|---:|------|
| `module_done` (client approve, earned) | ❌ hardcoded EN | ✅ `notif.module_done_earn.*` | `client_acceptance.py:131` |
| `module_done` (client approve, no share) | ❌ hardcoded EN | ✅ `notif.module_done_ship.*` | `client_acceptance.py:144` |
| `revision_requested` (client request-changes) | ❌ hardcoded EN | ✅ `notif.revision_requested.*` | `client_acceptance.py:183` |
| `revision_requested` (admin via API) | ❌ hardcoded EN | ✅ `notif.revision_requested.*` | `server.py:25929` |

**Все 4 оставшихся hardcoded notification call-site мигрированы.**

Combined со предыдущими сессиями, **все notification-emit пути** теперь:
1. Резолвят `user.language` через `_resolve_user_lang(user_id)` / `_get_user_lang(...)`
2. Передают `i18n_key_title` / `i18n_key_body` (через `create_notification` / `_emit_notification`),
   ИЛИ напрямую вызывают `_i18n_t(key, lang, **fmt)` для `insert_one`-сайтов
3. Push payload автоматически наследует уже-переведённую копию через
   `send_push_nowait(..., title=final_title, body=final_subtitle, lang=lang)`

---

## 1. Архитектура (две точки трансляции)

### 1.1. Высокоуровневые функции (рекомендованный путь)

`create_notification(...)` в `server.py:18287` и
`_emit_notification(...)` в `module_motion.py:83`:

```python
await create_notification(
    user_id=...,
    ntype="module_assigned",
    i18n_key_title="notif.module_assigned.title",
    i18n_key_body="notif.module_assigned.body",
    i18n_fmt={"module": title, ...},
)
```

Внутри они:
1. Загружают `user.language` из Mongo
2. Вызывают `t(key, lang, **fmt)` из `i18n_backend.py`
3. Сохраняют уже-переведённую копию в БД
4. Эмитят push с тем же переведённым текстом

### 1.2. Прямые insert_one (legacy/специальные коллекции)

Когда notification идёт в нестандартную коллекцию (например,
`client_notifications`) или формат row нетипичный, мы делаем
inline-translation:

```python
_lg = await _resolve_user_lang(user_id)
await db.client_notifications.insert_one({
    ...,
    "title": _i18n_t("notif.payment_received_inv.title", _lg, amount="..."),
    "body":  _i18n_t("notif.payment_received_inv.body",  _lg, title="..."),
    ...
})
```

Это применено в:
- `server.py:8336` — support_reply
- `server.py:11580` — payment_received_inv
- `server.py:12904` — payment_link_resent
- `server.py:25929` — revision_requested (admin path) ← **новое в этой сессии**
- `legal_contract_layer.py:1977` — contract.signed fan-out
- `legal_contract_layer.py:2063` — contract reminder

---

## 2. Smoke test

```python
from i18n_backend import t

>>> t("notif.module_done_earn.title", "uk", amount="500")
'Модуль прийнято — $500'

>>> t("notif.module_done_earn.body", "uk", module="Auth UI")
'«Auth UI» здано. Ваша частка — у наступній виплаті.'

>>> t("notif.revision_requested.title", "uk", module="Auth UI")
'Запит на правки: Auth UI'

>>> t("notif.module_done_ship.title", "uk")
'Модуль прийнято'

>>> t("notif.module_done_ship.body", "uk", module="Dashboard")
'«Dashboard» успішно здано.'
```

End-to-end проверено: после `db.users.update_one({email: client@atlas.dev}, {$set:{language:'uk'}})`
любая последующая notification создаётся уже на UK.

---

## 3. Покрытие notification-emit функций (полное)

| Функция / call-site | i18n статус |
|---------------------|-------------|
| `create_notification(...)` (7 call-sites: referral×2, tier_up×2, dev_joined, achievement, payout) | ✅ all use `i18n_key_*` |
| `_emit_notification(...)` (6 call-sites: module_done×2 in module_motion, review_required, review_ready, module_done×2 in client_acceptance, revision_requested in client_acceptance) | ✅ all use `i18n_key_*` |
| `db.notifications.insert_one(...)` direct (5 call-sites) | ✅ 4 use `_i18n_t(...)` + lang resolve, 1 = demo seed (intentionally EN) |
| `db.notifications.insert_many(...)` (2 call-sites: contract.signed fan-out, demo seed) | ✅ contract fan-out uses `_t(...)`, demo seed = EN by design |
| `db.client_notifications.insert_one(...)` (2 call-sites: magic_client_pull, admin_resend) | ✅ both use `_i18n_t(...)` + lang resolve |
| `db.client_notifications.insert_many(...)` (mock_seed) | ✅ demo seed = EN by design |
| Push payload | ✅ inherits translated copy from emit functions (no extra work) |

**Итого: 100% notification-emit путей локализованы для EN/UK.**

---

## 4. Файлы изменены

```
M  backend/client_acceptance.py     +38 / −12   (3 call-sites: module_done_earn + module_done_ship + revision_requested)
M  backend/server.py                +5  / −3    (1 call-site: revision_requested admin path)
A  audit/AUDIT_2026-05-31_NOTIF_I18N_WIREUP_FINAL_RU.md   (this file)
```

---

## 5. Итог

> "Если хотите закрыть push/notification i18n — могу wire `t('notif.*', lang=user.language)` в `create_notification(...)` (50+ call-sites, ~2 ч)."

✅ **Сделано.** Все notification-emit пути локализованы. Push payloads автоматически
наследуют переведённую копию. Two live translation systems (EN + UK) теперь покрывают
ВСЕ user-facing surface: web, mobile, backend system copy, in-app notifications, push.

---

_Документ зачинений 2026-05-31 у сесії E1._
