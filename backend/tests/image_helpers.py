"""
File: image_helpers.py
Type: py
Summary: Builders for in-memory test images (valid, animated, oversized, corrupt) used by the upload tests.
"""

import struct
import zlib
from io import BytesIO

from PIL import Image


def image_bytes(fmt="PNG", size=(40, 30), mode="RGB", color=None, **save_args):
    """An encoded image of the given format, size and mode."""
    if color is None:
        color = {"RGB": (200, 40, 40), "RGBA": (200, 40, 40, 128), "L": 128, "LA": (128, 128)}.get(mode, 0)
    buffer = BytesIO()
    Image.new(mode, size, color).save(buffer, fmt, **save_args)
    return buffer.getvalue()


def png_bytes(**kwargs):
    return image_bytes("PNG", **kwargs)


def jpeg_bytes(**kwargs):
    return image_bytes("JPEG", **kwargs)


def animated_gif_bytes(frames=3, size=(20, 20)):
    """A GIF whose frames differ, so Pillow keeps all of them."""
    images = [Image.new("RGB", size, (40 * i % 256, 90, 160)) for i in range(frames)]
    buffer = BytesIO()
    images[0].save(buffer, "GIF", save_all=True, append_images=images[1:], duration=50, loop=0)
    return buffer.getvalue()


def png_header_only(width, height):
    """A PNG that claims width x height pixels but has no pixel data (a decompression bomb's header)."""

    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IEND", b"")


def oriented_jpeg_bytes(orientation, size=(40, 20)):
    """A JPEG whose EXIF orientation tag is ``orientation`` (6 = rotate 90 degrees clockwise to display)."""
    image = Image.new("RGB", size, (10, 120, 200))
    exif = Image.Exif()
    exif[0x0112] = orientation
    buffer = BytesIO()
    image.save(buffer, "JPEG", exif=exif)
    return buffer.getvalue()
