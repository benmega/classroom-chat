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
    # Setup mocks
    mock_exists.return_value = True

    mock_doc = MagicMock()
    mock_page = MagicMock()
    mock_page.rect.width = 842
    mock_doc.__getitem__.return_value = mock_page
    mock_fitz_open.return_value = mock_doc

    # Test generating a certificate with a template, saving to output path
    generate_certificate("dummy_template.pdf", "output.pdf", "Jane Doe")

    # Verify the document was saved and closed
    mock_doc.save.assert_called_once_with("output.pdf")
    mock_doc.close.assert_called_once()

    # Verify text was inserted
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
