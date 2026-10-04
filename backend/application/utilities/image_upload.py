"""
File: image_upload.py
Type: py
Summary: One validated path for every image upload: size cap, content check, dimension cap, stored name.
"""

import logging
import os
import uuid
from dataclasses import dataclass
from io import BytesIO

from application.config import Config
from flask import current_app, has_app_context
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

# Pillow format -> (stored extension, content type). The stored extension always comes
# from the verified content, never from the name the client gave the file.
IMAGE_FORMATS = {
    "PNG": ("png", "image/png"),
    "JPEG": ("jpg", "image/jpeg"),
    "GIF": ("gif", "image/gif"),
    "WEBP": ("webp", "image/webp"),
}

# Longest edge an image is shrunk to when it is re-encoded.
AVATAR_MAX_EDGE = 512
PROJECT_MAX_EDGE = 1600
BADGE_MAX_EDGE = 256

_ANIMATED_FORMATS = ("PNG", "GIF", "WEBP")
_PNG_MODES = ("1", "L", "LA", "P", "RGB", "RGBA", "I", "I;16")
_ALPHA_MODES = ("RGBA", "LA", "PA", "RGBa", "La")
_JPEG_QUALITY = 85


class ImageUploadError(Exception):
    """The upload was rejected. ``message`` is safe to show to the user, ``status`` is the HTTP status."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


@dataclass(frozen=True)
class ProcessedImage:
    """A validated image, ready to be written to disk or S3."""

    data: bytes
    format: str  # "PNG", "JPEG", "GIF" or "WEBP"
    ext: str
    content_type: str
    width: int
    height: int


def _setting(name):
    """A setting from the app config, falling back to Config outside an app context."""
    if has_app_context():
        return current_app.config.get(name, getattr(Config, name))
    return getattr(Config, name)


def _size_label(num_bytes):
    megabytes = num_bytes / (1024 * 1024)
    return f"{megabytes:.0f}MB" if megabytes == int(megabytes) else f"{megabytes:.1f}MB"


def _read_capped(file, max_bytes):
    """The bytes of an uploaded file, once its size is known to be within the cap."""
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    if size > max_bytes:
        raise ImageUploadError(f"File too large. Maximum size is {_size_label(max_bytes)}.", 413)
    if size == 0:
        raise ImageUploadError("The uploaded file is empty.")
    return file.read()


def _open_verified(data, max_pixels, allowed_formats):
    """Open ``data`` as an image whose structure and size have been checked.

    Returns (image, format). The pixel count is checked from the header, before any
    pixel is decoded, so a small file that expands to a huge bitmap is turned away
    cheaply. Image.MAX_IMAGE_PIXELS is deliberately left alone: it is process-wide.
    """
    try:
        probe = Image.open(BytesIO(data))
        # Phone cameras write multi-picture JPEGs (MPO); they are JPEGs for our purposes.
        fmt = "JPEG" if probe.format == "MPO" else probe.format
        if fmt not in allowed_formats:
            allowed = ", ".join(name for name in IMAGE_FORMATS if name in allowed_formats)
            raise ImageUploadError(f"Unsupported image format. Allowed: {allowed}.")
        width, height = probe.size
        if width * height > max_pixels:
            raise ImageUploadError(
                f"Image dimensions too large. Maximum is {max_pixels / 1_000_000:g} megapixels."
            )
        probe.verify()
        # verify() leaves the image unusable, so decode from a fresh object.
        return Image.open(BytesIO(data)), fmt
    except ImageUploadError:
        raise
    except Image.DecompressionBombError:
        raise ImageUploadError("Image dimensions too large.") from None
    except Exception as e:
        # UnidentifiedImageError, truncated or corrupt data and the odd decoder error all mean the same thing.
        logger.info("Rejected an upload that is not a readable image: %s", e)
        raise ImageUploadError("Invalid or corrupt image file.") from None


def _has_alpha(img):
    return img.mode in _ALPHA_MODES or "transparency" in img.info


def _flatten_to_rgb(img):
    """RGB version of ``img`` for JPEG output: transparency is flattened onto white."""
    if img.mode in ("RGB", "L"):
        return img
    if _has_alpha(img):
        rgba = img.convert("RGBA")
        background = Image.new("RGB", rgba.size, (255, 255, 255))
        background.paste(rgba, mask=rgba.getchannel("A"))
        return background
    return img.convert("RGB")


def _encode(img, target):
    """``img`` as ``target`` ("PNG", "JPEG", "GIF" or "WEBP") bytes, converting its mode if needed."""
    buffer = BytesIO()
    if target == "JPEG":
        _flatten_to_rgb(img).save(buffer, "JPEG", quality=_JPEG_QUALITY, optimize=True)
    elif target == "PNG":
        if img.mode not in _PNG_MODES:
            img = img.convert("RGBA")
        img.save(buffer, "PNG", optimize=True)
    elif target == "WEBP":
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA" if _has_alpha(img) else "RGB")
        img.save(buffer, "WEBP", quality=_JPEG_QUALITY)
    else:
        img.save(buffer, "GIF")
    return buffer.getvalue()


def _processed(data, fmt, size):
    ext, content_type = IMAGE_FORMATS[fmt]
    return ProcessedImage(data, fmt, ext, content_type, size[0], size[1])


def process_image(
    file,
    *,
    max_bytes,
    max_pixels=None,
    max_edge=None,
    reencode=True,
    preserve_animation=False,
    allowed_formats=None,
    output_format=None,
    max_frames=None,
):
    """Validate an uploaded image and return it as a ProcessedImage.

    ``file`` is a FileStorage (or any seekable binary stream). Raises ImageUploadError
    with the HTTP status to answer with: 413 over ``max_bytes``, 400 for anything that
    is not a readable image of an allowed format, or is too large in pixels or frames.

    - ``reencode=False`` keeps the original bytes (after checking them).
    - ``reencode=True`` decodes and rewrites the image: EXIF orientation is applied
      and metadata dropped, it is shrunk to ``max_edge`` (never enlarged), and the
      mode is converted for the output format (transparency is flattened onto white
      for JPEG). ``output_format`` forces a format, e.g. "PNG".
    - ``preserve_animation=True`` keeps an animated GIF/WebP/APNG as it was uploaded
      (the frame count is capped at ``max_frames``); otherwise only its first frame is kept.
    """
    max_pixels = max_pixels or _setting("MAX_IMAGE_PIXELS")
    max_frames = max_frames or _setting("IMAGE_MAX_FRAMES")
    allowed_formats = tuple(allowed_formats or IMAGE_FORMATS)

    data = _read_capped(file, max_bytes)
    img, fmt = _open_verified(data, max_pixels, allowed_formats)

    try:
        animated = fmt in _ANIMATED_FORMATS and getattr(img, "is_animated", False)
        keep_original = not reencode or (animated and preserve_animation and output_format is None)
        if keep_original:
            if animated and getattr(img, "n_frames", 1) > max_frames:
                raise ImageUploadError(f"Animated image has too many frames (maximum {max_frames}).")
            return _processed(data, fmt, img.size)

        if animated:
            img.seek(0)
        if max_edge and max(img.size) > max_edge:
            img.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
        img = ImageOps.exif_transpose(img)
        target = output_format or fmt
        return _processed(_encode(img, target), target, img.size)
    except ImageUploadError:
        raise
    except Exception as e:
        logger.info("Could not decode an uploaded image: %s", e)
        raise ImageUploadError("Invalid or corrupt image file.") from None


def write_bytes_atomic(path, data):
    """Write ``data`` to ``path`` through a temp file, so a reader never sees a partial file."""
    temp_path = f"{path}.{uuid.uuid4().hex}.tmp"
    try:
        with open(temp_path, "wb") as handle:
            handle.write(data)
        os.replace(temp_path, path)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def save_processed_image(image, dest_dir):
    """Write a ProcessedImage to ``dest_dir`` under a new uuid name and return the file name."""
    os.makedirs(dest_dir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{image.ext}"
    write_bytes_atomic(os.path.join(dest_dir, filename), image.data)
    return filename


def save_validated_image(file, dest_dir, *, max_bytes, **options):
    """Validate an uploaded image (see process_image) and save it to ``dest_dir``.

    Returns the stored file name: ``<uuid hex>.<extension of the verified format>``.
    """
    return save_processed_image(process_image(file, max_bytes=max_bytes, **options), dest_dir)


def delete_stored_image(directory, filename, keep=()):
    """Remove an uploaded file from ``directory``. Never raises; True when a file was removed.

    Empty names, anything that is not a plain file name and the names in ``keep``
    (e.g. a shared default image) are left alone.
    """
    if not filename or filename in keep or filename in (".", "..") or os.path.basename(filename) != filename:
        return False
    try:
        os.remove(os.path.join(directory, filename))
    except FileNotFoundError:
        return False
    except (OSError, ValueError):  # ValueError: an embedded null byte in the name
        logger.exception("Could not delete the stored image %s", filename)
        return False
    return True
