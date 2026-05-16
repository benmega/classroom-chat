from application.models.banned_words import BannedWords


def is_appropriate(message, banned_words=None):
    """
    Checks if a message contains any banned words.
    """
    if banned_words is None:
        banned_words = [word.word for word in BannedWords.query.all()]

    message_lower = message.lower()
    banned_words_lower = [word.lower() for word in banned_words]
    return not any(word in message_lower for word in banned_words_lower)


def message_is_appropriate(message):
    """
    Helper to check appropriateness using the database banned words.
    """
    return is_appropriate(message)
