"""
Matching rules:
  - Text is Unicode-normalized first (NFKC, so fullwidth letters fold to ASCII)
    and invisible characters are dropped (zero-width spaces and joiners,
    combining marks), so they cannot be used to split a banned word.
  - Case-insensitive, with common leet-speak substitutions normalized
    (e.g. "b4d" matches a banned word "bad").
  - Separator characters may appear between letters ("b a d", "b.a.d").
  - Word boundaries are enforced so innocent words that merely contain a
    banned substring (e.g. "class", "grass") are not flagged.

The compiled patterns for the active banned words are cached for a short time,
so a message does not cost a table query and a regex compile per word.
"""

import re
import time
import unicodedata
from typing import Optional

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

# Unicode categories that render as nothing: format characters (zero-width
# space/joiner, BOM, soft hyphen) and combining marks.
_INVISIBLE_CATEGORIES = {"Cf", "Mn"}

# How long the compiled patterns are reused. Every server worker holds its own
# copy, so a word added through another worker can take this long to apply there.
_CACHE_TTL_SECONDS = 30

# (compiled patterns, expiry time), or None when nothing is cached.
_cache: Optional[tuple[list[re.Pattern[str]], float]] = None
# Bumped by clear_cache() so a load that was already running cannot store the
# words it read before the change.
_cache_generation = 0


def _now():
    return time.monotonic()


def _clean(text: str) -> str:
    """Fold look-alike forms and strip invisible characters from the text."""
    # Case folding can itself produce combining marks (a dotted capital I), so strip last
    text = unicodedata.normalize("NFKC", text).casefold()
    return "".join(ch for ch in text if unicodedata.category(ch) not in _INVISIBLE_CATEGORIES)


def _normalize(text: str) -> str:
    return _clean(text).translate(_LEET_MAP)


def _compile_pattern(word: str):
    """Build a boundary-aware pattern that tolerates separators between letters."""
    letters = [re.escape(ch) for ch in word if not ch.isspace()]
    if not letters:
        return None
    body = _SEPARATOR_CLASS.join(letters)
    return re.compile(r"(?<![a-z0-9])" + body + r"(?![a-z0-9])")


def _compile_patterns(banned_words):
    patterns = (_compile_pattern(_normalize(word.strip())) for word in banned_words)
    return [pattern for pattern in patterns if pattern]


def clear_cache():
    """Forget the cached patterns so the next check reads the banned words again."""
    global _cache, _cache_generation
    _cache_generation += 1
    _cache = None


def _active_patterns():
    """Compiled patterns for the active banned words, from the cache when fresh."""
    global _cache
    cached = _cache
    if cached is not None and _now() < cached[1]:
        return cached[0]

    generation = _cache_generation
    words = [row.word for row in BannedWords.query.filter_by(active=True).all()]
    patterns = _compile_patterns(words)
    if generation == _cache_generation:
        _cache = (patterns, _now() + _CACHE_TTL_SECONDS)
    return patterns


def is_appropriate(message, banned_words=None):
    """
    Return True if the message contains no banned words.

    Without banned_words the active words are read from the database (cached
    briefly). An explicit list is always used as given, without the cache.
    """
    if not message:
        return True

    patterns = (
        _active_patterns() if banned_words is None else _compile_patterns(banned_words)
    )
    if not patterns:
        return True

    # Check both the plain cleaned text and the leet-normalized form:
    # the leet map turns punctuation like "!" into letters, which would
    # otherwise hide a banned word that simply ends with punctuation.
    cleaned = _clean(message)
    candidates = {cleaned, cleaned.translate(_LEET_MAP)}

    return not any(
        pattern.search(text) for pattern in patterns for text in candidates
    )
