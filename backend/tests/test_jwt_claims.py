"""``get_unverified_claims`` reads the payload of the id token Cognito returns on login.

It replaced python-jose's function of the same purpose, so the cases here are the ones that
matter for a token straight from Cognito: base64url without padding, the ``-``/``_`` alphabet,
UTF-8 claims, and an untouched signature segment that is never checked.
"""

import base64
import json

import pytest
from application.routes.cognito_routes import get_unverified_claims


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _token(claims, signature="c2lnbmF0dXJl"):
    header = _b64url(json.dumps({"alg": "RS256", "kid": "test-key"}).encode())
    return f"{header}.{_b64url(json.dumps(claims).encode())}.{signature}"


def test_reads_the_claims_of_a_cognito_style_token():
    claims = {"sub": "0000-1111", "email": "parent@example.test", "token_use": "id", "exp": 1893456000}
    assert get_unverified_claims(_token(claims)) == claims


@pytest.mark.parametrize("filler", ["", "a", "ab", "abc"])
def test_handles_every_padding_length(filler):
    # JWTs drop the "=" padding; the payload length mod 4 decides how much must be restored.
    claims = {"sub": "id", "pad": filler}
    payload = _token(claims).split(".")[1]
    assert "=" not in payload
    assert get_unverified_claims(_token(claims)) == claims


def test_reads_the_url_safe_alphabet_and_utf8():
    claims = {"name": "Zoë 😀", "marker": ">>>???"}
    token = _token(claims)
    assert {"-", "_"} & set(token.split(".")[1]), "the fixture should exercise the url-safe characters"
    assert get_unverified_claims(token) == claims


def test_does_not_check_the_signature():
    # What "unverified" means: a forged or empty signature segment is accepted as is.
    assert get_unverified_claims(_token({"sub": "x"}, signature="forged"))["sub"] == "x"
    assert get_unverified_claims(_token({"sub": "x"}, signature=""))["sub"] == "x"


def _with_payload(raw: bytes) -> str:
    return f"header.{_b64url(raw)}.signature"


@pytest.mark.parametrize(
    "token",
    [
        "",
        "not-a-jwt",
        "only.two",
        "one.two.three.four",
        "header.!!!!.signature",  # not base64
        "header.a.signature",  # impossible base64 length
        _with_payload(b"plain text"),  # base64 of something that is not JSON
        _with_payload(b"[1, 2]"),  # JSON, but not an object
        _with_payload(bytes([0xFF, 0xFE])),  # not UTF-8
        None,
        b"header.payload.signature",
    ],
)
def test_rejects_a_token_it_cannot_read(token):
    with pytest.raises(ValueError, match="Malformed JWT"):
        get_unverified_claims(token)
