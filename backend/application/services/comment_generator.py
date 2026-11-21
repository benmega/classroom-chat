"""Drafts the teacher comment for a project submission with the OpenAI API."""

import logging
import os

import requests
from application.config import Config
from application.models.project_file import PROJECT_FILES_DIR
from application.utilities.stored_files import stored_file_path

logger = logging.getLogger(__name__)

OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"
DEFAULT_MODEL = "gpt-4o-mini"
REQUEST_TIMEOUT_SECONDS = 45

# Student code and transcripts are cut to these sizes so one huge project cannot make a
# huge request.
MAX_CODE_CHARS = 12000
MAX_TRANSCRIPT_CHARS = 8000
MAX_SOURCE_FILE_CHARS = 4000

PROMPT_TEMPLATE = """Student Name: {student_name}

Student Code:
{student_code}

Student video transcript:
{transcript}

Tone and Style
- Keep the tone calm, professional, and supportive
- Avoid exaggerated enthusiasm or informal slang
- Write in complete sentences with proper punctuation
- Avoid hyphens unless absolutely necessary
- Maintain a friendly, approachable tone suitable for parents

Structure (Poop Sandwich Method)
1. Start with a positive observation
   - Mention something specific the student did well (e.g., creativity, persistence, design choice)
   - Reference at least one specific part of their code (e.g., a function, variable, or design decision)
   - The opening should sound natural and warm, not formulaic
2. Offer one gentle, constructive improvement
   - Focus on a realistic next step for growth (e.g., using loops, adding comments, organizing code)
   - Phrase suggestions as opportunities rather than corrections
3. End with a positive closing remark
   - Acknowledge effort, creativity, or progress
   - Aim for an encouraging tone that feels personal and specific

Length and Focus
- Keep it 3-4 sentences total
- Stay focused on the code and learning process, not personal traits
- Each comment should sound like it is written directly to the parents, not the student

Example Template
[Student Name] did a great job showing [specific strength], especially in [specific reference to code]. It is a smart approach, though next time we might focus on [specific improvement]. I also appreciate how [positive closing remark related to creativity, structure, or progress].

Write only the comment itself, with no heading or quotation marks."""


class CommentGenerationError(Exception):
    """The comment could not be drafted. ``status`` is the HTTP status to answer with."""

    def __init__(self, message, status=502):
        super().__init__(message)
        self.message = message
        self.status = status


def _clip(text, limit):
    text = (text or "").strip()
    if len(text) <= limit:
        return text
    return text[:limit] + "\n[...truncated]"


def _project_code(project):
    """The student's code: the pasted snippet, else the text of the uploaded source
    files, else the GitHub link."""
    if project.code_snippet and project.code_snippet.strip():
        return _clip(project.code_snippet, MAX_CODE_CHARS)

    parts = []
    used = 0
    for project_file in project.files:
        if project_file.kind != "source" or used >= MAX_CODE_CHARS:
            continue
        full_path = stored_file_path(project_file.stored_path, subfolder=PROJECT_FILES_DIR)
        if not full_path:
            continue
        try:
            with open(full_path, encoding="utf-8", errors="replace") as handle:
                text = handle.read(MAX_SOURCE_FILE_CHARS + 1)
        except OSError:
            continue
        text = _clip(text, MAX_SOURCE_FILE_CHARS)
        parts.append(f"// {project_file.path}\n{text}")
        used += len(text)
    if parts:
        return "\n\n".join(parts)

    if project.github_link:
        return f"(No code was submitted. GitHub repository: {project.github_link})"
    return "(No code was submitted.)"


def build_prompt(project):
    student = project.user
    return PROMPT_TEMPLATE.format(
        student_name=(student.nickname or student.username) if student else "The student",
        student_code=_project_code(project),
        transcript=_clip(project.video_transcript, MAX_TRANSCRIPT_CHARS)
        or "(No transcript available.)",
    )


def generate_project_comment(project):
    """Draft the parent-facing comment for ``project``. Raises CommentGenerationError."""
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        raise CommentGenerationError("OPENAI_API_KEY is not configured.", status=503)

    try:
        response = requests.post(
            OPENAI_CHAT_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": os.getenv("OPENAI_MODEL") or DEFAULT_MODEL,
                "messages": [{"role": "user", "content": build_prompt(project)}],
                "temperature": 0.7,
            },
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except requests.RequestException as error:
        logger.exception("OpenAI request failed for project %s", project.id)
        raise CommentGenerationError("Could not reach the OpenAI API.") from error

    if response.status_code != 200:
        logger.error(
            "OpenAI returned %s for project %s: %s",
            response.status_code,
            project.id,
            response.text[:500],
        )
        raise CommentGenerationError(
            f"OpenAI request failed ({response.status_code})."
        )

    try:
        comment = response.json()["choices"][0]["message"]["content"].strip()
    except (ValueError, KeyError, IndexError, TypeError, AttributeError):
        comment = ""
    if not comment:
        raise CommentGenerationError("OpenAI returned an empty comment.")
    return comment
