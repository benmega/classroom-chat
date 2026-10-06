"""python-jose must keep signing and verifying RS256 tokens through ``cryptography``.

The Cognito parent login reads the claims of the id token Cognito returns
(``application/routes/cognito_routes.py``). python-jose picks ``cryptography`` as
its RSA backend whenever the package can be imported and otherwise falls back to
a pure-Python one, so a ``cryptography`` upgrade that python-jose cannot work
with would change how those tokens are handled without any import failing.
These tests run a token through that backend end to end.
"""

import base64
import time

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from jose import jwt
from jose.backends import RSAKey
from jose.exceptions import JWTError

AUDIENCE = "test-client-id"
CLAIMS = {"sub": "0000-1111", "email": "parent@example.test", "aud": AUDIENCE}


def _b64url(number: int) -> str:
    raw = number.to_bytes((number.bit_length() + 7) // 8, "big")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


@pytest.fixture(scope="module")
def private_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture(scope="module")
def private_pem(private_key):
    return private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode()


@pytest.fixture(scope="module")
def public_pem(private_key):
    return (
        private_key.public_key()
        .public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
        .decode()
    )


@pytest.fixture(scope="module")
def public_jwk(private_key):
    """The public key in the JWK form a Cognito user pool publishes."""
    numbers = private_key.public_key().public_numbers()
    return {"kty": "RSA", "alg": "RS256", "use": "sig", "kid": "test-key", "n": _b64url(numbers.n), "e": _b64url(numbers.e)}


@pytest.fixture
def token(private_pem):
    return jwt.encode({**CLAIMS, "exp": int(time.time()) + 300}, private_pem, algorithm="RS256", headers={"kid": "test-key"})


def test_python_jose_uses_the_cryptography_backend():
    assert RSAKey.__module__ == "jose.backends.cryptography_backend"


def test_rs256_token_verifies_with_the_public_pem(token, public_pem):
    claims = jwt.decode(token, public_pem, algorithms=["RS256"], audience=AUDIENCE)
    assert {key: claims[key] for key in CLAIMS} == CLAIMS


def test_rs256_token_verifies_with_a_published_jwk(token, public_jwk):
    claims = jwt.decode(token, public_jwk, algorithms=["RS256"], audience=AUDIENCE)
    assert claims["sub"] == CLAIMS["sub"]


def test_unverified_claims_read_the_signed_payload(token):
    # The call cognito_routes.py makes on the id token.
    claims = jwt.get_unverified_claims(token)
    assert claims["sub"] == CLAIMS["sub"]
    assert claims["email"] == CLAIMS["email"]


def test_token_signed_with_another_key_is_rejected(token):
    other_pem = (
        rsa.generate_private_key(public_exponent=65537, key_size=2048)
        .public_key()
        .public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
        .decode()
    )
    with pytest.raises(JWTError):
        jwt.decode(token, other_pem, algorithms=["RS256"], audience=AUDIENCE)


def test_tampered_token_is_rejected(token, public_pem):
    header, _, signature = token.split(".")
    forged = base64.urlsafe_b64encode(b'{"sub":"someone-else","aud":"%s"}' % AUDIENCE.encode()).rstrip(b"=").decode()
    with pytest.raises(JWTError):
        jwt.decode(f"{header}.{forged}.{signature}", public_pem, algorithms=["RS256"], audience=AUDIENCE)
