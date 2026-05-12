"""Runtime token parser. Mirrors ``packages/sdk-ts/src/auth/token.ts``."""

from __future__ import annotations

import base64
import json
import re
import time

from rein.errors import ReinError
from rein.types import ParsedToken, TokenPayload

TOKEN_PREFIX = "rein_"
VALID_ENVS = frozenset({"dev", "devnet", "production"})
KID_RE = re.compile(r"^[0-9a-f]{8}$", re.IGNORECASE)
_TOKEN_REDACT_RE = re.compile(
    r"rein_(?:dev|devnet|production)_[0-9a-f]{8}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+",
)


def _b64u_decode(s: str) -> bytes:
    """base64url → bytes, with padding restored."""
    padding = (-len(s)) % 4
    return base64.urlsafe_b64decode(s + ("=" * padding))


def parse_token(raw: str, *, now_sec: int | None = None) -> ParsedToken:
    """Parse and structurally validate a wire-format runtime token.

    Format: ``rein_<env>_<kid>.<payload_b64u>.<sig_b64u>``.

    The SDK never has the per-kid HMAC secret, so it cannot verify the
    signature locally — only structure, env/kid, payload shape, and ``exp``.
    The server re-verifies on every request.
    """
    if not isinstance(raw, str) or not raw.startswith(TOKEN_PREFIX):
        raise ReinError("ErrTokenInvalid", {"reason": "missing rein_ prefix"})

    first_dot = raw.find(".")
    if first_dot == -1:
        raise ReinError("ErrTokenInvalid", {"reason": "no payload section"})
    head = raw[:first_dot]
    tail = raw[first_dot + 1 :]

    head_parts = head.split("_")
    if len(head_parts) != 3:
        raise ReinError("ErrTokenInvalid", {"reason": "malformed prefix"})
    env, kid = head_parts[1], head_parts[2]
    if env not in VALID_ENVS:
        raise ReinError("ErrTokenInvalid", {"reason": f"unknown env: {env}"})
    if not KID_RE.match(kid):
        raise ReinError("ErrTokenInvalid", {"reason": "kid must be 8 hex chars"})

    tail_parts = tail.split(".")
    if len(tail_parts) != 2:
        raise ReinError("ErrTokenInvalid", {"reason": "malformed body"})
    payload_b64u, sig_b64u = tail_parts
    if not payload_b64u or not sig_b64u:
        raise ReinError("ErrTokenInvalid", {"reason": "empty payload or signature"})

    try:
        payload_obj = json.loads(_b64u_decode(payload_b64u).decode("utf-8"))
    except Exception:
        raise ReinError(
            "ErrTokenInvalid", {"reason": "payload not valid base64url JSON"}
        )

    if (
        not isinstance(payload_obj, dict)
        or not isinstance(payload_obj.get("vault"), str)
        or not isinstance(payload_obj.get("scopes"), list)
        or not isinstance(payload_obj.get("exp"), int)
        or not isinstance(payload_obj.get("nonce"), str)
    ):
        raise ReinError("ErrTokenInvalid", {"reason": "payload missing required fields"})

    now = now_sec if now_sec is not None else int(time.time())
    if payload_obj["exp"] <= now:
        raise ReinError(
            "ErrTokenExpired", {"exp": payload_obj["exp"], "now": now}
        )

    payload = TokenPayload(
        vault=payload_obj["vault"],
        scopes=list(payload_obj["scopes"]),
        exp=payload_obj["exp"],
        nonce=payload_obj["nonce"],
    )
    return ParsedToken(
        raw=raw,
        env=env,
        kid=kid.lower(),
        payload=payload,
        signature=sig_b64u,
    )


def token_nearing_expiry(
    tok: ParsedToken, window_sec: int = 60, *, now_sec: int | None = None
) -> bool:
    """True if the token's ``exp`` is within ``window_sec`` seconds of now."""
    now = now_sec if now_sec is not None else int(time.time())
    return tok.payload.exp - now < window_sec


def redact_token(s: str) -> str:
    """Token-format-aware redactor; safe to apply to arbitrary log strings."""

    def repl(m: re.Match[str]) -> str:
        return f"{m.group(0)[:24]}…<redacted>"

    return _TOKEN_REDACT_RE.sub(repl, s)


def has_scope(tok: ParsedToken, scope: str) -> bool:
    return scope in tok.payload.scopes
