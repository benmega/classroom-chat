"""
File: project_file_helpers.py
Type: py
Summary: Small generated project files (STL, GLB) and upload parts for the project file tests.
"""

import struct
from io import BytesIO

from werkzeug.datastructures import FileStorage

# One triangle, as Tinkercad writes an ASCII STL
ASCII_STL = b"""solid tri
  facet normal 0 0 1
    outer loop
      vertex 0 0 0
      vertex 1 0 0
      vertex 0 1 0
    endloop
  endfacet
endsolid tri
"""


def binary_stl(triangles=1, header=b"binary stl"):
    """A binary STL: an 80-byte header, the triangle count, then 50 bytes per triangle."""
    triangle = struct.pack("<12fH", 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0)
    return header.ljust(80, b"\0") + struct.pack("<I", triangles) + triangle * triangles


def glb_bytes():
    """A minimal binary glTF: the 12-byte header and one JSON chunk."""
    json_chunk = b'{"asset":{"version":"2.0"}}'
    json_chunk += b" " * (-len(json_chunk) % 4)
    chunk = struct.pack("<I4s", len(json_chunk), b"JSON") + json_chunk
    return struct.pack("<4sII", b"glTF", 2, 12 + len(chunk)) + chunk


def upload(filename, data):
    """An uploaded file part, as request.files holds it."""
    return FileStorage(stream=BytesIO(data), filename=filename)
