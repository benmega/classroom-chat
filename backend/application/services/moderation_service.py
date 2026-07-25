"""
File: moderation_service.py
Type: py
Summary: Banned-word screening for chat messages.

Matching rules:
  - Case-insensitive, with common leet-speak substitutions normalized
    (e.g. "b4d" matches a banned word "bad").
  - Separator characters may appear between letters ("b a d", "b.a.d").
  - Word boundaries are enforced so innocent words that merely contain a
    banned substring (e.g. "class", "grass") are not flagged.
"""

import re

from application.models.banned_words import BannedWords

# Common character substitutions used to evade filters.
_LEET_MAP = str.maketrans(
    {
        "0": "o",
        "1": "i",
        "3": "e",
        "4": "a",
        "5": "s",
        "7": "t",
        "8": "b",
        "@": "a",
        "$": "s",
        "!": "i",
    }
)

# Separators tolerated between the letters of a banned word.
_SEPARATOR_CLASS = r"[\s.\-_*]*"


def _normalize(text: str) -> str:
    return text.lower().translate(_LEET_MAP)


def _compile_pattern(word: str):
    """Build a boundary-aware pattern that tolerates separators between letters."""
    letters = [re.escape(ch) for ch in word if not ch.isspace()]
    if not letters:
        return None
    body = _SEPARATOR_CLASS.join(letters)
    return re.compile(r"(?<![a-z0-9])" + body + r"(?![a-z0-9])")


def is_appropriate(message, banned_words=None):
    """
    Return True if the message contains no banned words.
    """
    if not message:
        return True

    if banned_words is None:
        banned_words = [
            row.word for row in BannedWords.query.filter_by(active=True).all()
        ]
    if not banned_words:
        return True

    # Check both the plain lowercased text and the leet-normalized form:
    # the leet map turns punctuation like "!" into letters, which would
    # otherwise hide a banned word that simply ends with punctuation.
    lowered = message.lower()
    candidates = {lowered, _normalize(lowered)}

    for word in banned_words:
        pattern = _compile_pattern(_normalize(word.strip()))
        if pattern and any(pattern.search(text) for text in candidates):
            return False
    return True


def message_is_appropriate(message):
    """
    Helper to check appropriateness using the database banned words.
    """
    return is_appropriate(message)
