"""Tests for the CodeCombat/Ozaria scrapers in backend/tools (no network access)."""

import csv
from pathlib import Path

import pytest
import requests
from application.config import Config
from tools import course_instance_scrape, historical_cert_scrape, historical_challenge_log_scrape

BACKEND_DIR = Path(__file__).resolve().parents[2]

SCRAPERS = [course_instance_scrape, historical_cert_scrape, historical_challenge_log_scrape]
SCRAPER_IDS = ["course_instance", "cert", "challenge_log"]


class FakeResponse:
    def __init__(self, payload=None):
        self.payload = payload if payload is not None else []

    def raise_for_status(self):
        pass

    def json(self):
        return self.payload


def _call_fetch_json(scraper, url="https://example.test/db/x"):
    if scraper is course_instance_scrape:
        return scraper.fetch_json(url, "Thing", "cookie=1")
    return scraper.fetch_json(url, "Thing")


def _read_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


@pytest.fixture
def out_dir(tmp_path, monkeypatch):
    """Point the cert and challenge-log scrapers at a temporary output directory."""
    target = tmp_path / "migration"
    monkeypatch.setattr(historical_cert_scrape, "OUT_DIR", target)
    monkeypatch.setattr(historical_cert_scrape, "FILENAME", target / "certificate_log.csv")
    monkeypatch.setattr(historical_challenge_log_scrape, "OUT_DIR", target)
    monkeypatch.setattr(historical_challenge_log_scrape, "FILENAME", target / "master_challenge_log.csv")
    return target


# ---- output paths are anchored on the script, not on the working directory ----


@pytest.mark.parametrize(
    ("scraper", "name"),
    [
        (course_instance_scrape, "course_instances_seed.csv"),
        (historical_cert_scrape, "certificate_log.csv"),
        (historical_challenge_log_scrape, "master_challenge_log.csv"),
    ],
    ids=SCRAPER_IDS,
)
def test_output_is_backend_instance_migration(scraper, name):
    assert Path(scraper.FILENAME).is_absolute()
    assert Path(scraper.FILENAME) == BACKEND_DIR / "instance" / "migration" / name


def test_seed_command_reads_the_directory_the_scraper_writes():
    # application/commands/seed.py reads <BASE_DIR>/backend/instance/migration/course_instances_seed.csv
    seed_dir = Path(Config.BASE_DIR) / "backend" / "instance" / "migration"
    assert Path(course_instance_scrape.FILENAME).parent.resolve() == seed_dir.resolve()


def test_output_path_does_not_depend_on_cwd(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    assert Path(historical_cert_scrape.FILENAME).parent == BACKEND_DIR / "instance" / "migration"


# ---- every request has a timeout ----


@pytest.mark.parametrize("scraper", SCRAPERS, ids=SCRAPER_IDS)
def test_requests_have_a_timeout(scraper, monkeypatch):
    seen = {}

    def fake_get(url, **kwargs):
        seen.update(kwargs)
        return FakeResponse([{"ok": True}])

    monkeypatch.setattr(scraper.requests, "get", fake_get)

    assert _call_fetch_json(scraper) == [{"ok": True}]
    assert seen["timeout"] == scraper.REQUEST_TIMEOUT == 30


@pytest.mark.parametrize("scraper", SCRAPERS, ids=SCRAPER_IDS)
def test_timeout_is_handled_like_any_request_error(scraper, monkeypatch, capsys):
    def fake_get(url, **kwargs):
        raise requests.exceptions.Timeout("too slow")

    monkeypatch.setattr(scraper.requests, "get", fake_get)

    assert _call_fetch_json(scraper) == []
    assert "too slow" in capsys.readouterr().out


# ---- 401 detection without the locals() hack ----


def _response(status):
    response = requests.Response()
    response.status_code = status
    response.url = "https://example.test/db/x"
    return response


def test_expired_cookie_is_reported_on_401(monkeypatch, capsys):
    monkeypatch.setattr(historical_challenge_log_scrape.requests, "get", lambda url, **kw: _response(401))

    assert _call_fetch_json(historical_challenge_log_scrape) == []

    out = capsys.readouterr().out
    assert "Error fetching Thing" in out
    assert "Cookie expired" in out


def test_other_http_errors_do_not_claim_the_cookie_expired(monkeypatch, capsys):
    monkeypatch.setattr(historical_challenge_log_scrape.requests, "get", lambda url, **kw: _response(500))

    assert _call_fetch_json(historical_challenge_log_scrape) == []

    out = capsys.readouterr().out
    assert "Error fetching Thing" in out
    assert "Cookie expired" not in out


def test_connection_error_before_any_response_is_reported_cleanly(monkeypatch, capsys):
    def fake_get(url, **kwargs):
        raise requests.exceptions.ConnectionError("refused")

    monkeypatch.setattr(historical_challenge_log_scrape.requests, "get", fake_get)

    assert _call_fetch_json(historical_challenge_log_scrape) == []

    out = capsys.readouterr().out
    assert "refused" in out
    assert "Cookie expired" not in out


# ---- certificate_log.csv is not duplicated by re-runs ----


def _cert_row(n, domain="codecombat.com"):
    return {
        "student_name": f"Student {n}",
        "class_name": "Class",
        "course_name": "Course",
        "certificate_url": f"https://{domain}/certificates/{n}",
        "domain": domain,
        "completion_date": "2026-01-01T00:00:00.000",
    }


def test_cert_rows_are_appended_once(out_dir):
    rows = [_cert_row(1), _cert_row(2)]

    assert historical_cert_scrape.append_new_rows(rows) == 2
    assert historical_cert_scrape.append_new_rows(rows) == 0

    written = _read_csv(historical_cert_scrape.FILENAME)
    assert [r["certificate_url"] for r in written] == [r["certificate_url"] for r in rows]


def test_cert_rerun_only_adds_new_rows(out_dir):
    historical_cert_scrape.append_new_rows([_cert_row(1)])

    added = historical_cert_scrape.append_new_rows([_cert_row(1), _cert_row(2), _cert_row(2)])

    assert added == 1
    assert [r["student_name"] for r in _read_csv(historical_cert_scrape.FILENAME)] == ["Student 1", "Student 2"]


def test_cert_header_is_written_once_and_also_for_an_empty_file(out_dir):
    out_dir.mkdir()
    historical_cert_scrape.FILENAME.write_text("", encoding="utf-8")

    historical_cert_scrape.append_new_rows([_cert_row(1)])
    historical_cert_scrape.append_new_rows([_cert_row(2)])

    text = Path(historical_cert_scrape.FILENAME).read_text(encoding="utf-8")
    assert text.count("student_name,class_name") == 1
    assert len(_read_csv(historical_cert_scrape.FILENAME)) == 2


def test_cert_main_does_not_duplicate_rows_when_run_twice(out_dir, monkeypatch):
    def fake_fetch(url, description):
        if "ownerID" in url:
            return [{"classroomID": "c1", "classroomName": "Class One"}]
        if "classroom-courses-data" in url:
            return [{"_id": "course1", "name": "Intro"}]
        if "/members" in url:
            return [{"_id": "u1", "name": "Ann"}]
        return [{"complete": True, "userID": "u1", "courseID": "course1", "_id": "inst1", "updated": "2026-01-01T00:00:00Z"}]

    monkeypatch.setattr(historical_cert_scrape, "fetch_json", fake_fetch)
    monkeypatch.setattr(historical_cert_scrape.time, "sleep", lambda s: None)

    for _ in range(2):
        historical_cert_scrape.main("codecombat.com", "https://codecombat.com/db/classroom-courses-data")

    written = _read_csv(historical_cert_scrape.FILENAME)
    assert len(written) == 1
    assert written[0]["student_name"] == "Ann"
    assert written[0]["completion_date"] == "2026-01-01T00:00:00"


# ---- master_challenge_log.csv is written once and never duplicated ----


def _challenge_row(user, level, stamp, domain="www.ozaria.com"):
    return {
        "username": user,
        "domain": domain,
        "challenge_name": level,
        "timestamp": stamp,
        "course_id": "",
        "course_instance": "c1",
        "helper": "",
    }


def test_challenge_rows_are_keyed_on_user_level_and_timestamp(out_dir):
    rows = [_challenge_row("Ann", "lvl-1", "t1"), _challenge_row("Ann", "lvl-2", "t1")]

    assert historical_challenge_log_scrape.append_new_rows(rows) == 2
    again = [*rows, _challenge_row("Ann", "lvl-1", "t2"), _challenge_row("Bob", "lvl-1", "t1")]
    assert historical_challenge_log_scrape.append_new_rows(again) == 2

    written = _read_csv(historical_challenge_log_scrape.FILENAME)
    assert [(r["username"], r["challenge_name"], r["timestamp"]) for r in written] == [
        ("Ann", "lvl-1", "t1"),
        ("Ann", "lvl-2", "t1"),
        ("Ann", "lvl-1", "t2"),
        ("Bob", "lvl-1", "t1"),
    ]


def _challenge_fetch(url, description):
    if "ownerID" in url:
        return [{"classroomID": "c1"}, {"classroomID": "c2"}]
    if "classroom-courses-data" in url:
        return [{"levels": [{"original": "L1", "slug": "lvl-1"}]}]
    classroom = "c1" if "/c1/" in url else "c2"
    if "/members" in url:
        return [{"_id": f"u-{classroom}", "name": f"Student {classroom}"}]
    return [{"state": {"complete": True}, "creator": f"u-{classroom}", "level": {"original": "L1"}, "changed": "2026-01-01T00:00:00Z"}]


def test_challenge_main_writes_each_row_once_across_classrooms(out_dir, monkeypatch, capsys):
    monkeypatch.setattr(historical_challenge_log_scrape, "fetch_json", _challenge_fetch)
    monkeypatch.setattr(historical_challenge_log_scrape.time, "sleep", lambda s: None)

    historical_challenge_log_scrape.main("www.ozaria.com", "https://www.ozaria.com/db/classroom-courses-data")

    written = _read_csv(historical_challenge_log_scrape.FILENAME)
    # Before the fix the write ran inside the classroom loop: 1 + 2 = 3 rows.
    assert sorted(r["username"] for r in written) == ["Student c1", "Student c2"]
    assert capsys.readouterr().out.count("SUCCESS!") == 1


def test_challenge_main_is_idempotent(out_dir, monkeypatch):
    monkeypatch.setattr(historical_challenge_log_scrape, "fetch_json", _challenge_fetch)
    monkeypatch.setattr(historical_challenge_log_scrape.time, "sleep", lambda s: None)

    for _ in range(2):
        historical_challenge_log_scrape.main("www.ozaria.com", "https://www.ozaria.com/db/classroom-courses-data")

    assert len(_read_csv(historical_challenge_log_scrape.FILENAME)) == 2


def test_challenge_main_without_rows_reports_once_and_writes_nothing(out_dir, monkeypatch, capsys):
    def fetch(url, description):
        if "ownerID" in url:
            return [{"classroomID": "c1"}, {"classroomID": "c2"}]
        return []

    monkeypatch.setattr(historical_challenge_log_scrape, "fetch_json", fetch)
    monkeypatch.setattr(historical_challenge_log_scrape.time, "sleep", lambda s: None)

    historical_challenge_log_scrape.main("www.ozaria.com", "https://www.ozaria.com/db/classroom-courses-data")

    assert not Path(historical_challenge_log_scrape.FILENAME).exists()
    assert capsys.readouterr().out.count("No data found.") == 1
