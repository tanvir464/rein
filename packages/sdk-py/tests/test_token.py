import base64
import json
import time

import pytest

from rein import ReinError, has_scope, parse_token, redact_token, token_nearing_expiry


def _b64u(s: str) -> str:
    return base64.urlsafe_b64encode(s.encode("utf-8")).decode("ascii").rstrip("=")


def make_token(env="dev", kid="01abcdef", payload=None, sig="fakesig"):
    if payload is None:
        payload = {
            "vault": "vault123",
            "scopes": ["spend"],
            "exp": int(time.time()) + 3600,
            "nonce": "abc",
        }
    return f"rein_{env}_{kid}.{_b64u(json.dumps(payload))}.{sig}"


def test_parses_valid():
    tok = parse_token(make_token())
    assert tok.env == "dev"
    assert tok.kid == "01abcdef"
    assert tok.payload.vault == "vault123"
    assert tok.payload.scopes == ["spend"]


def test_lowercases_kid():
    tok = parse_token(make_token(kid="01ABCDEF"))
    assert tok.kid == "01abcdef"


def test_rejects_missing_prefix():
    with pytest.raises(ReinError) as e:
        parse_token("bearer xyz")
    assert e.value.code == "ErrTokenInvalid"


def test_rejects_unknown_env():
    with pytest.raises(ReinError) as e:
        parse_token(make_token(env="mainnet"))
    assert e.value.code == "ErrTokenInvalid"


def test_rejects_bad_kid():
    with pytest.raises(ReinError):
        parse_token(make_token(kid="NOTHEXXX"))
    with pytest.raises(ReinError):
        parse_token(make_token(kid="abc"))


def test_rejects_no_payload():
    with pytest.raises(ReinError):
        parse_token("rein_dev_01abcdef")


def test_rejects_bad_payload_b64():
    with pytest.raises(ReinError):
        parse_token("rein_dev_01abcdef.@@@.sig")


def test_rejects_payload_missing_fields():
    with pytest.raises(ReinError):
        parse_token(make_token(payload={"vault": "v"}))


def test_rejects_expired():
    with pytest.raises(ReinError) as e:
        parse_token(
            make_token(payload={
                "vault": "v",
                "scopes": ["spend"],
                "exp": 1,
                "nonce": "a",
            })
        )
    assert e.value.code == "ErrTokenExpired"


def test_honours_now_sec_arg():
    exp = 1_000_000
    t = make_token(payload={"vault": "v", "scopes": ["spend"], "exp": exp, "nonce": "a"})
    assert parse_token(t, now_sec=exp - 1).payload.exp == exp
    with pytest.raises(ReinError):
        parse_token(t, now_sec=exp)


def test_token_nearing_expiry():
    tok = parse_token(make_token(payload={
        "vault": "v",
        "scopes": ["read"],
        "exp": int(time.time()) + 30,
        "nonce": "a",
    }))
    assert token_nearing_expiry(tok, 60) is True
    assert token_nearing_expiry(tok, 10) is False


def test_redact_token_in_string():
    t = make_token()
    line = f"Authorization: Bearer {t} done"
    out = redact_token(line)
    assert t not in out
    assert "redacted" in out


def test_redact_token_leaves_other_strings_alone():
    assert redact_token("hello world") == "hello world"


def test_has_scope():
    tok = parse_token(make_token(payload={
        "vault": "v",
        "scopes": ["spend"],
        "exp": int(time.time()) + 3600,
        "nonce": "n",
    }))
    assert has_scope(tok, "spend") is True
    assert has_scope(tok, "read") is False
