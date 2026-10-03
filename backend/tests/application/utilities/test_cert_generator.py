from unittest.mock import MagicMock, patch

from application.utilities.cert_generator import generate_certificate


def test_generate_certificate_default():
    # Test generating a certificate without a valid template path, returning bytes
    pdf_bytes = generate_certificate(None, None, "John Doe")
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0

@patch('application.utilities.cert_generator.os.path.exists')
@patch('application.utilities.cert_generator.fitz.open')
def test_generate_certificate_with_template(mock_fitz_open, mock_exists):
    mock_exists.return_value = True

    mock_doc = MagicMock()
    mock_page = MagicMock()
    mock_page.rect.width = 842
    mock_doc.__getitem__.return_value = mock_page
    mock_fitz_open.return_value = mock_doc

    # Test generating a certificate with a template, saving to output path
    generate_certificate("dummy_template.pdf", "output.pdf", "Jane Doe")

    mock_doc.save.assert_called_once_with("output.pdf")
    mock_doc.close.assert_called_once()

    mock_page.insert_text.assert_called()

@patch('application.utilities.cert_generator.os.path.exists')
@patch('application.utilities.db_helpers.get_canonical_course_slug')
@patch('application.utilities.db_helpers.resolve_course_id')
@patch('application.utilities.cert_generator.fitz.open')
def test_generate_certificate_course_id_fallback(mock_fitz_open, mock_resolve, mock_slug, mock_exists):
    # First exists call is for template_path_or_course_id (returns False)
    # Second exists call is for possible_path (returns True)
    mock_exists.side_effect = [False, True, True]

    mock_slug.return_value = "canonical-slug"
    mock_resolve.return_value = "mongo-id"

    mock_doc = MagicMock()
    mock_page = MagicMock()
    mock_page.rect.width = 842
    mock_doc.__getitem__.return_value = mock_page
    mock_fitz_open.return_value = mock_doc

    generate_certificate("invalid_path", None, "Alice")

    mock_doc.write.assert_called_once()
    mock_doc.close.assert_called_once()


def test_generate_certificate_corrupt_template_falls_back_to_default(tmp_path, caplog):
    bad = tmp_path / "bad.pdf"
    bad.write_bytes(b"fake pdf content")

    with caplog.at_level("WARNING"):
        pdf_bytes = generate_certificate(str(bad), None, "John Doe")

    assert pdf_bytes.startswith(b"%PDF")
    assert "could not be used as a PDF" in caplog.text


def test_generate_certificate_corrupt_template_saves_default_to_output(tmp_path):
    import fitz

    bad = tmp_path / "bad.pdf"
    bad.write_bytes(b"fake pdf content")
    out = tmp_path / "out.pdf"

    assert generate_certificate(str(bad), str(out), "John Doe") is None
    with fitz.open(str(out)) as doc:
        assert "John Doe" in doc[0].get_text()


def test_generate_certificate_resolves_course_id_from_configured_dir(test_app, tmp_path):
    import fitz

    templates_dir = tmp_path / "tpl"
    templates_dir.mkdir()
    src = fitz.open()
    src.new_page(width=500, height=400)
    src.save(str(templates_dir / "zz-9.pdf"))
    src.close()

    with test_app.app_context():
        test_app.config["CERTIFICATE_TEMPLATES_DIR"] = str(templates_dir)
        try:
            pdf_bytes = generate_certificate("zz-9", None, "Jane")
        finally:
            test_app.config.pop("CERTIFICATE_TEMPLATES_DIR", None)

    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        assert doc[0].rect.width == 500
