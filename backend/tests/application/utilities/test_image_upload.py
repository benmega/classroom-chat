"""
Unit tests for the shared image upload helper (application/utilities/image_upload.py).
"""

import os
import re
from io import BytesIO

import pytest
from application.config import Config
from application.utilities import image_upload
from application.utilities.image_upload import (
    ImageUploadError,
    delete_stored_image,
    process_image,
    save_validated_image,
    write_bytes_atomic,
)
from PIL import Image
from tests.image_helpers import (
    animated_gif_bytes,
    image_bytes,
    jpeg_bytes,
    oriented_jpeg_bytes,
    png_bytes,
    png_header_only,
)

MB = 1024 * 1024


def run(data, **options):
    options.setdefault("max_bytes", 5 * MB)
    return process_image(BytesIO(data), **options)


def decode(processed):
    return Image.open(BytesIO(processed.data))


def rejected(data, **options):
    with pytest.raises(ImageUploadError) as excinfo:
        run(data, **options)
    return excinfo.value


# ---- Size and content checks --------------------------------------------------


def test_a_file_over_the_byte_cap_is_413():
    err = rejected(b"0" * (MB + 1), max_bytes=MB)

    assert err.status == 413
    assert err.message == "File too large. Maximum size is 1MB."


def test_a_file_exactly_at_the_cap_is_accepted():
    data = png_bytes()

    assert run(data, max_bytes=len(data)).format == "PNG"


def test_the_size_message_keeps_a_fractional_megabyte_cap():
    assert rejected(b"0" * (3 * MB), max_bytes=int(1.5 * MB)).message == "File too large. Maximum size is 1.5MB."


def test_an_empty_file_is_400():
    err = rejected(b"")

    assert err.status == 400
    assert "empty" in err.message


@pytest.mark.parametrize(
    "data",
    [
        b"just some text, not an image",
        b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>",
        b"\x89PNG\r\n\x1a\n" + b"garbage",
    ],
)
def test_content_that_is_not_an_image_is_400(data):
    err = rejected(data)

    assert err.status == 400
    assert err.message == "Invalid or corrupt image file."


def test_a_truncated_png_is_400():
    data = png_bytes(size=(200, 200))

    assert rejected(data[: len(data) // 2]).status == 400


def test_a_truncated_jpeg_is_400_when_it_is_re_encoded():
    """verify() cannot see a short JPEG; decoding it for the re-encode does."""
    noisy = Image.effect_noise((300, 300), 80).convert("RGB")
    buffer = BytesIO()
    noisy.save(buffer, "JPEG")
    data = buffer.getvalue()

    assert rejected(data[: len(data) // 2]).status == 400


def test_a_valid_image_of_a_format_that_is_not_allowed_is_400():
    err = rejected(image_bytes("BMP"))

    assert err.status == 400
    assert err.message == "Unsupported image format. Allowed: PNG, JPEG, GIF, WEBP."


def test_allowed_formats_narrows_what_is_accepted():
    err = rejected(animated_gif_bytes(), allowed_formats=("PNG", "JPEG", "WEBP"))

    assert err.message == "Unsupported image format. Allowed: PNG, JPEG, WEBP."


# ---- Dimension and frame caps -------------------------------------------------


def test_more_pixels_than_the_cap_is_400():
    err = rejected(png_bytes(size=(100, 100)), max_pixels=9_999)

    assert err.status == 400
    assert err.message.startswith("Image dimensions too large")


def test_exactly_the_pixel_cap_is_accepted():
    assert run(png_bytes(size=(100, 100)), max_pixels=10_000).width == 100


def test_the_default_pixel_cap_is_the_configured_one():
    # 6000 x 5000 = 30 megapixels: a header that is a few dozen bytes
    err = rejected(png_header_only(6000, 5000))

    assert err.status == 400
    assert "25 megapixels" in err.message


def test_a_decompression_bomb_header_is_400_not_a_crash():
    # 20000 x 20000 is beyond twice Pillow's own limit, so Image.open raises
    err = rejected(png_header_only(20000, 20000))

    assert err.status == 400
    assert err.message == "Image dimensions too large."


def test_the_global_pillow_limit_is_not_changed():
    before = Image.MAX_IMAGE_PIXELS

    run(png_bytes())

    assert before == Image.MAX_IMAGE_PIXELS


def test_an_animation_with_too_many_frames_is_400():
    err = rejected(animated_gif_bytes(frames=6), preserve_animation=True, max_frames=5)

    assert err.status == 400
    assert err.message == "Animated image has too many frames (maximum 5)."


def test_the_frame_cap_defaults_to_the_configured_one():
    assert run(animated_gif_bytes(frames=Config.IMAGE_MAX_FRAMES), preserve_animation=True).format == "GIF"
    assert rejected(animated_gif_bytes(frames=Config.IMAGE_MAX_FRAMES + 1), preserve_animation=True).status == 400


# ---- Names, formats and modes -------------------------------------------------


def test_an_rgba_png_is_stored_as_a_valid_png_with_its_alpha():
    processed = run(png_bytes(mode="RGBA"))

    assert (processed.format, processed.ext, processed.content_type) == ("PNG", "png", "image/png")
    img = decode(processed)
    assert img.format == "PNG"
    assert img.mode == "RGBA"
    assert img.getpixel((0, 0))[3] == 128


def test_the_extension_comes_from_the_content_not_the_client_name():
    jpeg = run(jpeg_bytes())
    png = run(png_bytes())

    assert (jpeg.ext, jpeg.content_type, decode(jpeg).format) == ("jpg", "image/jpeg", "JPEG")
    assert (png.ext, png.content_type, decode(png).format) == ("png", "image/png", "PNG")


def test_an_rgba_image_forced_to_jpeg_is_flattened_onto_white():
    data = png_bytes(mode="RGBA", color=(255, 0, 0, 0))  # fully transparent

    processed = run(data, output_format="JPEG")

    img = decode(processed)
    assert (processed.ext, img.format, img.mode) == ("jpg", "JPEG", "RGB")
    assert all(channel >= 250 for channel in img.getpixel((5, 5)))


def test_a_palette_png_with_transparency_keeps_it_as_png():
    img = Image.new("P", (10, 10), 0)
    img.putpalette([255, 0, 0] * 256)
    img.info["transparency"] = 0
    buffer = BytesIO()
    img.save(buffer, "PNG", transparency=0)

    out = decode(run(buffer.getvalue()))

    assert out.format == "PNG"
    assert out.convert("RGBA").getpixel((0, 0))[3] == 0


@pytest.mark.parametrize("mode", ["L", "LA", "1", "CMYK"])
def test_other_modes_are_converted_to_something_the_format_can_store(mode):
    color = {"L": 90, "LA": (90, 200), "1": 1, "CMYK": (10, 20, 30, 40)}[mode]
    fmt = "JPEG" if mode == "CMYK" else "PNG"

    processed = run(image_bytes(fmt, mode=mode, color=color))

    assert decode(processed).format == fmt
    decode(processed).load()


def test_a_cmyk_jpeg_forced_to_png_becomes_a_normal_png():
    processed = run(image_bytes("JPEG", mode="CMYK", color=(10, 20, 30, 40)), output_format="PNG")

    img = decode(processed)
    assert (processed.ext, img.format, img.mode) == ("png", "PNG", "RGBA")


@pytest.mark.parametrize(("mode", "expected"), [("L", "RGB"), ("LA", "RGBA")])
def test_modes_webp_cannot_store_are_converted_when_webp_is_forced(mode, expected):
    color = (90, 200) if mode == "LA" else 90

    processed = run(png_bytes(mode=mode, color=color), output_format="WEBP")

    img = decode(processed)
    assert (processed.ext, img.format, img.mode) == ("webp", "WEBP", expected)


@pytest.mark.parametrize("mode", ["LA", "P"])
def test_modes_with_transparency_become_rgb_for_jpeg_output(mode):
    img = Image.new("RGBA", (10, 10), (0, 0, 0, 0)).convert(mode)
    buffer = BytesIO()
    img.save(buffer, "PNG")

    out = decode(run(buffer.getvalue(), output_format="JPEG"))

    assert (out.format, out.mode) == ("JPEG", "RGB")


def test_a_static_webp_is_re_encoded_as_webp_and_keeps_alpha():
    processed = run(image_bytes("WEBP", mode="RGBA"))

    img = decode(processed)
    assert (processed.ext, img.format) == ("webp", "WEBP")
    assert img.mode == "RGBA"


def test_a_static_webp_without_alpha_stays_rgb():
    assert decode(run(image_bytes("WEBP"))).mode == "RGB"


def test_a_static_gif_stays_a_gif():
    data = image_bytes("GIF", mode="P", color=3)

    processed = run(data)

    assert (processed.ext, decode(processed).format) == ("gif", "GIF")


def test_a_multi_picture_jpeg_from_a_phone_is_a_jpeg():
    first = Image.new("RGB", (30, 20), (200, 10, 10))
    second = Image.new("RGB", (30, 20), (10, 10, 200))
    buffer = BytesIO()
    first.save(buffer, "MPO", save_all=True, append_images=[second])
    data = buffer.getvalue()
    assert Image.open(BytesIO(data)).format == "MPO"

    for reencode in (True, False):
        processed = run(data, reencode=reencode)
        assert (processed.format, processed.ext, processed.content_type) == ("JPEG", "jpg", "image/jpeg")
        assert decode(processed).size == (30, 20)


# ---- Resizing, orientation and animation --------------------------------------


def test_a_large_image_is_shrunk_to_the_longest_edge():
    processed = run(png_bytes(size=(1200, 800)), max_edge=512)

    assert (processed.width, processed.height) == (512, 341)
    assert decode(processed).size == (512, 341)


def test_a_small_image_is_never_enlarged():
    assert decode(run(png_bytes(size=(100, 60)), max_edge=512)).size == (100, 60)


def test_without_max_edge_the_size_is_kept():
    assert decode(run(png_bytes(size=(900, 700)))).size == (900, 700)


def test_the_exif_orientation_is_applied():
    processed = run(oriented_jpeg_bytes(6, size=(40, 20)))

    img = decode(processed)
    assert img.size == (20, 40)
    assert not img.getexif().get(0x0112)


def test_an_animated_gif_keeps_its_frames_when_animation_is_preserved():
    data = animated_gif_bytes(frames=4)

    processed = run(data, preserve_animation=True, max_edge=8)

    assert processed.data == data
    assert (processed.ext, decode(processed).n_frames) == ("gif", 4)


def test_an_animated_gif_is_flattened_to_its_first_frame_otherwise():
    processed = run(animated_gif_bytes(frames=4))

    img = decode(processed)
    assert img.format == "GIF"
    assert getattr(img, "n_frames", 1) == 1


def test_an_animated_webp_keeps_its_frames_when_animation_is_preserved():
    frames = [Image.new("RGB", (16, 16), (30 * i, 0, 90)) for i in range(3)]
    buffer = BytesIO()
    frames[0].save(buffer, "WEBP", save_all=True, append_images=frames[1:], duration=40)

    processed = run(buffer.getvalue(), preserve_animation=True)

    assert (processed.ext, decode(processed).n_frames) == ("webp", 3)


def test_a_forced_output_format_flattens_an_animation_even_when_it_is_preserved():
    processed = run(animated_gif_bytes(frames=3), preserve_animation=True, output_format="PNG")

    img = decode(processed)
    assert img.format == "PNG"
    assert getattr(img, "n_frames", 1) == 1


def test_without_re_encoding_the_original_bytes_are_kept():
    data = oriented_jpeg_bytes(6)

    processed = run(data, reencode=False, max_edge=8)

    assert processed.data == data
    assert (processed.ext, processed.content_type) == ("jpg", "image/jpeg")
    assert (processed.width, processed.height) == (40, 20)


def test_without_re_encoding_the_content_is_still_checked():
    assert rejected(b"not an image", reencode=False).status == 400
    assert rejected(b"0" * (MB + 1), reencode=False, max_bytes=MB).status == 413
    assert rejected(png_bytes(size=(50, 50)), reencode=False, max_pixels=100).status == 400
    assert rejected(animated_gif_bytes(frames=6), reencode=False, max_frames=5).status == 400


def test_limits_fall_back_to_the_config_without_an_app_context(monkeypatch):
    monkeypatch.setattr(image_upload, "has_app_context", lambda: False)

    assert rejected(png_header_only(6000, 5000)).status == 400
    assert run(png_bytes()).format == "PNG"


def test_limits_come_from_the_app_config(test_app, monkeypatch):
    monkeypatch.setitem(test_app.config, "MAX_IMAGE_PIXELS", 100)

    with test_app.app_context():
        assert rejected(png_bytes(size=(20, 20))).status == 400


def test_the_configured_byte_caps_fit_under_the_request_body_limit():
    caps = [
        Config.IMAGE_MAX_BYTES_AVATAR,
        Config.IMAGE_MAX_BYTES_WALLPAPER,
        Config.IMAGE_MAX_BYTES_PROJECT,
        Config.IMAGE_MAX_BYTES_NOTE,
        Config.IMAGE_MAX_BYTES_BADGE,
    ]

    assert all(cap + 4096 < Config.MAX_CONTENT_LENGTH for cap in caps)


# ---- Saving and deleting ------------------------------------------------------


def test_save_validated_image_writes_a_uuid_named_file_in_a_new_folder(tmp_path):
    dest = tmp_path / "a" / "b"

    name = save_validated_image(BytesIO(png_bytes()), str(dest), max_bytes=MB)

    assert re.fullmatch(r"[0-9a-f]{32}\.png", name)
    assert Image.open(dest / name).format == "PNG"
    assert [p.name for p in dest.iterdir()] == [name]  # no temp file left behind


def test_save_validated_image_names_two_uploads_differently(tmp_path):
    names = {save_validated_image(BytesIO(png_bytes()), str(tmp_path), max_bytes=MB) for _ in range(3)}

    assert len(names) == 3


def test_save_validated_image_writes_nothing_for_a_rejected_upload(tmp_path):
    with pytest.raises(ImageUploadError):
        save_validated_image(BytesIO(b"not an image"), str(tmp_path / "x"), max_bytes=MB)

    assert not (tmp_path / "x").exists()


def test_write_bytes_atomic_replaces_the_target(tmp_path):
    target = tmp_path / "f.bin"
    target.write_bytes(b"old")

    write_bytes_atomic(str(target), b"new")

    assert target.read_bytes() == b"new"
    assert [p.name for p in tmp_path.iterdir()] == ["f.bin"]


def test_write_bytes_atomic_leaves_no_temp_file_when_it_fails(tmp_path, monkeypatch):
    target = tmp_path / "f.bin"
    target.write_bytes(b"old")

    def boom(src, dst):
        raise OSError("disk gone")

    monkeypatch.setattr(image_upload.os, "replace", boom)

    with pytest.raises(OSError, match="disk gone"):
        write_bytes_atomic(str(target), b"new")

    assert target.read_bytes() == b"old"
    assert [p.name for p in tmp_path.iterdir()] == ["f.bin"]


def test_delete_stored_image_removes_the_file(tmp_path):
    (tmp_path / "x.png").write_bytes(b"1")

    assert delete_stored_image(str(tmp_path), "x.png") is True
    assert not (tmp_path / "x.png").exists()


@pytest.mark.parametrize("name", [None, "", ".", "..", "../outside.png", "sub/x.png", "sub\\x.png"])
def test_delete_stored_image_ignores_names_that_are_not_plain_file_names(tmp_path, name):
    (tmp_path.parent / "outside.png").write_bytes(b"1")
    (tmp_path / "sub").mkdir()
    (tmp_path / "sub" / "x.png").write_bytes(b"1")

    assert delete_stored_image(str(tmp_path), name) is False
    assert (tmp_path.parent / "outside.png").exists()
    assert (tmp_path / "sub" / "x.png").exists()


def test_delete_stored_image_keeps_the_names_it_is_told_to(tmp_path):
    (tmp_path / "Default_pfp.jpg").write_bytes(b"1")

    assert delete_stored_image(str(tmp_path), "Default_pfp.jpg", keep=("Default_pfp.jpg",)) is False
    assert (tmp_path / "Default_pfp.jpg").exists()


def test_delete_stored_image_tolerates_a_missing_file(tmp_path):
    assert delete_stored_image(str(tmp_path), "gone.png") is False


def test_delete_stored_image_swallows_os_errors(tmp_path, monkeypatch):
    (tmp_path / "x.png").write_bytes(b"1")

    def locked(path):
        raise PermissionError("in use")

    monkeypatch.setattr(os, "remove", locked)

    assert delete_stored_image(str(tmp_path), "x.png") is False


def test_delete_stored_image_ignores_a_name_with_a_null_byte(tmp_path):
    (tmp_path / "x.png").write_bytes(b"1")

    assert delete_stored_image(str(tmp_path), "x\0.png") is False
    assert (tmp_path / "x.png").exists()
