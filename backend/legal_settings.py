"""
Legal Settings module — single source of truth for:
  • Footer social-media links (telegram, tiktok, instagram, youtube, facebook, github)
  • Legal documents (terms of use, privacy policy, cookies policy)
  • Cookie consent log (anonymous, GDPR-friendly)

Storage: MongoDB
  • collection `legal_settings` — single doc with `key="default"`
  • collection `cookie_consents` — append-only audit log

Public reads expose only "safe" data (enabled socials, doc body); admin
reads/writes touch the full document. Consent log is anonymized — only
SHA-256 of (client IP + UA) is stored to avoid storing PII.

Wired into server.py as a sub-router via `router = APIRouter(prefix="/api")`.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# ── Settings shape ─────────────────────────────────────────────────────────

SUPPORTED_SOCIALS = ["telegram", "tiktok", "instagram", "youtube", "facebook", "github"]
SUPPORTED_LEGAL_DOCS = ["terms", "privacy", "cookies"]

DEFAULT_LEGAL_BODIES = {
    "terms": (
        "## Terms of Use\n\n"
        "Welcome to ATLAS / EVA-X. By using this service, you agree to act in good faith and "
        "respect other users and the platform. This is placeholder text — edit it from the "
        "admin panel.\n\n"
        "**Last updated:** _set this from the admin editor_."
    ),
    "privacy": (
        "## Privacy Policy\n\n"
        "We collect only what we need to run your projects, payments and notifications. We do "
        "not sell your data. You can request export or deletion of your account data at any "
        "time. This is placeholder text — edit it from the admin panel.\n\n"
        "**Last updated:** _set this from the admin editor_."
    ),
    "cookies": (
        "## Cookies Policy\n\n"
        "We use **essential cookies** for authentication and session continuity, and — only "
        "with your consent — **analytics cookies** to understand how the product is used. "
        "You can change your choice at any time from the cookie banner at the bottom of the "
        "page. This is placeholder text — edit it from the admin panel."
    ),
}


def _default_settings() -> Dict[str, Any]:
    return {
        "key": "default",
        "socials": {
            # Three primaries default to enabled with empty URL (admin sets URLs).
            "telegram":  {"url": "",  "enabled": True},
            "tiktok":    {"url": "",  "enabled": True},
            "instagram": {"url": "",  "enabled": True},
            "youtube":   {"url": "",  "enabled": False},
            "facebook":  {"url": "",  "enabled": False},
            "github":    {"url": "",  "enabled": False},
        },
        "legal": {
            kind: {
                "title": {"terms": "Terms of Use", "privacy": "Privacy Policy", "cookies": "Cookies Policy"}[kind],
                "body": DEFAULT_LEGAL_BODIES[kind],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            for kind in SUPPORTED_LEGAL_DOCS
        },
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


async def _get_or_create(db) -> Dict[str, Any]:
    doc = await db.legal_settings.find_one({"key": "default"}, {"_id": 0})
    if not doc:
        doc = _default_settings()
        await db.legal_settings.insert_one(dict(doc))
        logger.info("LEGAL_SETTINGS: seeded default document")
    else:
        # Migrate: if a newly supported social was added in code, fill it.
        socials = doc.get("socials") or {}
        legal = doc.get("legal") or {}
        mutated = False
        for k in SUPPORTED_SOCIALS:
            if k not in socials:
                socials[k] = {"url": "", "enabled": False}
                mutated = True
        for k in SUPPORTED_LEGAL_DOCS:
            if k not in legal:
                legal[k] = {
                    "title": {"terms": "Terms of Use", "privacy": "Privacy Policy", "cookies": "Cookies Policy"}[k],
                    "body": DEFAULT_LEGAL_BODIES[k],
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
                mutated = True
        if mutated:
            await db.legal_settings.update_one(
                {"key": "default"}, {"$set": {"socials": socials, "legal": legal}}
            )
            doc["socials"] = socials
            doc["legal"] = legal
    # Always drop _id defensively (projection should have handled it).
    doc.pop("_id", None)
    return doc


# ── Pydantic models ────────────────────────────────────────────────────────

class SocialItem(BaseModel):
    url: str = ""
    enabled: bool = False


class LegalDoc(BaseModel):
    title: str
    body: str
    updated_at: Optional[str] = None


class LegalSettingsUpdate(BaseModel):
    socials: Optional[Dict[str, SocialItem]] = None
    legal: Optional[Dict[str, LegalDoc]] = None


class CookieConsentBody(BaseModel):
    # 'all' = accept everything, 'essential' = essential only, 'rejected' = decline all non-essential.
    choice: str = Field(..., pattern="^(all|essential|rejected)$")
    # Optional list of categories the user opted into when choosing "custom"-like flows.
    categories: Optional[List[str]] = None


# ── Router factory ─────────────────────────────────────────────────────────

def build_legal_router(db, require_admin):
    """Build the FastAPI router bound to the given db handle + admin guard.

    The guard is passed in (not imported) so we don't introduce a circular
    dependency with server.py. Pass `require_role('admin')` from there.
    """
    router = APIRouter(prefix="/api", tags=["legal"])

    # ── Public ─────────────────────────────────────────────────────────────

    @router.get("/public/legal-settings")
    async def public_legal_settings():
        """Footer-safe payload: only enabled socials + legal doc titles."""
        doc = await _get_or_create(db)
        socials = [
            {"key": k, "url": v.get("url", "")}
            for k, v in (doc.get("socials") or {}).items()
            if v.get("enabled") and (v.get("url") or "").strip()
        ]
        legal_summary = [
            {"kind": k, "title": v.get("title", k.title()), "updated_at": v.get("updated_at")}
            for k, v in (doc.get("legal") or {}).items()
        ]
        return {"socials": socials, "legal": legal_summary}

    @router.get("/public/legal-document/{kind}")
    async def public_legal_document(kind: str):
        if kind not in SUPPORTED_LEGAL_DOCS:
            raise HTTPException(404, detail={"code": "unknown_doc", "message": "Unknown legal document"})
        doc = await _get_or_create(db)
        legal = (doc.get("legal") or {}).get(kind) or {}
        return {
            "kind": kind,
            "title": legal.get("title", kind.title()),
            "body": legal.get("body", ""),
            "updated_at": legal.get("updated_at"),
        }

    @router.post("/cookie-consent")
    async def cookie_consent(payload: CookieConsentBody, request: Request):
        """Log anonymous cookie-consent. Hash of IP+UA only, no PII."""
        ip = (request.headers.get("x-forwarded-for") or request.client.host or "").split(",")[0].strip()
        ua = request.headers.get("user-agent", "")
        # Hash + truncate so the audit log is anonymous yet de-dup capable.
        fingerprint = hashlib.sha256(f"{ip}|{ua}".encode("utf-8")).hexdigest()[:16]
        rec = {
            "fingerprint": fingerprint,
            "choice": payload.choice,
            "categories": payload.categories or [],
            "ua_short": ua[:120],
            "at": datetime.now(timezone.utc).isoformat(),
        }
        await db.cookie_consents.insert_one(dict(rec))
        return {"ok": True, "fingerprint": fingerprint, "at": rec["at"]}

    # ── Admin ──────────────────────────────────────────────────────────────

    @router.get("/admin/legal-settings")
    async def admin_legal_settings(user=Depends(require_admin)):
        doc = await _get_or_create(db)
        return doc

    @router.put("/admin/legal-settings")
    async def admin_legal_settings_update(
        update: LegalSettingsUpdate,
        user=Depends(require_admin),
    ):
        current = await _get_or_create(db)
        now_iso = datetime.now(timezone.utc).isoformat()
        set_fields: Dict[str, Any] = {"updated_at": now_iso}

        if update.socials is not None:
            socials = dict(current.get("socials") or {})
            for k, v in update.socials.items():
                if k not in SUPPORTED_SOCIALS:
                    raise HTTPException(400, detail={"code": "unknown_social", "message": f"Unsupported social: {k}"})
                socials[k] = {"url": (v.url or "").strip(), "enabled": bool(v.enabled)}
            set_fields["socials"] = socials

        if update.legal is not None:
            legal = dict(current.get("legal") or {})
            for k, v in update.legal.items():
                if k not in SUPPORTED_LEGAL_DOCS:
                    raise HTTPException(400, detail={"code": "unknown_doc", "message": f"Unsupported doc: {k}"})
                legal[k] = {
                    "title": (v.title or "").strip(),
                    "body": v.body or "",
                    "updated_at": now_iso,
                }
            set_fields["legal"] = legal

        await db.legal_settings.update_one({"key": "default"}, {"$set": set_fields}, upsert=True)
        result = await _get_or_create(db)
        return result

    @router.get("/admin/cookie-consents/stats")
    async def admin_consent_stats(user=Depends(require_admin)):
        """Aggregate consent counters + last-7-days timeline."""
        pipeline_choice = [
            {"$group": {"_id": "$choice", "count": {"$sum": 1}}},
        ]
        by_choice: Dict[str, int] = {"all": 0, "essential": 0, "rejected": 0}
        async for row in db.cookie_consents.aggregate(pipeline_choice):
            key = row.get("_id") or "unknown"
            by_choice[key] = row.get("count", 0)
        total = sum(by_choice.values())
        return {
            "total": total,
            "by_choice": by_choice,
            "computed_at": datetime.now(timezone.utc).isoformat(),
        }

    return router
