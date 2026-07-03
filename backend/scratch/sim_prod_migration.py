"""
Simulates exactly what happens on the prod server during flask db upgrade.
Run from the repo root: python backend/scratch/sim_prod_migration.py
"""
import shutil
import tempfile
import os
import sys

sys.path.insert(0, os.path.abspath(os.getcwd()))
# CWD is expected to be backend/

import sqlalchemy as sa  # noqa: E402
from sqlalchemy import text  # noqa: E402

# ---------------------------------------------------------------------------
# STEP 1: Copy prod_users.db to a temp file
# ---------------------------------------------------------------------------
# Mirrors ProductionConfig: INSTANCE_FOLDER = <repo_root>/backend/instance/
# After chdir to backend/, prod_users.db lives at instance/prod_users.db.
prod_db_path = os.path.join('instance', 'prod_users.db')

if not os.path.exists(prod_db_path):
    print(f"[ERROR] prod_users.db not found at: {os.path.abspath(prod_db_path)}")
    sys.exit(1)

tmp_fd, db_path = tempfile.mkstemp(suffix='.db')
os.close(tmp_fd)

print("=" * 60)
print("STEP 1: Copy prod_users.db to temp file")
print(f"  Source : {os.path.abspath(prod_db_path)}")
print(f"  Dest   : {db_path}")
print("=" * 60)

shutil.copy2(prod_db_path, db_path)
print("Done.\n")

# ---------------------------------------------------------------------------
# STEP 2: Run flask db upgrade against the copy
# ---------------------------------------------------------------------------
print("=" * 60)
print("STEP 2: Run flask db upgrade via Flask app context (mirrors server)")
print("=" * 60)

# Set the environment so Flask uses our temp copy
os.environ['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
os.environ['FLASK_APP'] = 'main.py'
os.environ['FLASK_ENV'] = 'production'
# Prevent the scheduler / seed from running during this context
os.environ['TESTING'] = '1'

from application import create_app  # noqa: E402
from application.config import ProductionConfig  # noqa: E402


class SimConfig(ProductionConfig):
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{db_path}'
    TESTING = True
    SCHEDULER_AUTO_START = False


app = create_app(SimConfig)

try:
    with app.app_context():
        from flask_migrate import upgrade as flask_upgrade
        flask_upgrade()
except Exception as exc:
    print(f"\n[ERROR] flask db upgrade raised an exception: {exc}")
    try:
        os.unlink(db_path)
    except Exception:
        pass
    sys.exit(1)

print()

# ---------------------------------------------------------------------------
# STEP 3: Verify final state
# ---------------------------------------------------------------------------
print("=" * 60)
print("STEP 3: Verify final state")
print("=" * 60)

engine = sa.create_engine(f'sqlite:///{db_path}')
with engine.connect() as conn:
    stamp = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
    tables = sorted([
        r[0] for r in conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table'")
        ).fetchall()
    ])
engine.dispose()
try:
    os.unlink(db_path)
except Exception:
    pass

# Determine Alembic HEAD by asking Flask-Migrate
with app.app_context():
    from alembic.script import ScriptDirectory
    from alembic.config import Config as AlembicConfig

    alembic_cfg = AlembicConfig()
    alembic_cfg.set_main_option(
        'script_location',
        os.path.join(os.path.dirname(os.path.abspath('migrations')), 'migrations'),
    )
    script = ScriptDirectory.from_config(alembic_cfg)
    head_revisions = [r.revision for r in script.get_revisions('heads')]

print(f"  Alembic HEAD(s) : {head_revisions}")
print(f"  DB stamp        : {stamp}")
print(f"  Tables          : {tables}")
print()

errors = []

if stamp in head_revisions:
    print(f"  [PASS] Stamp '{stamp}' matches Alembic HEAD")
else:
    print(f"  [FAIL] Stamp '{stamp}' does NOT match Alembic HEAD {head_revisions}")
    errors.append("stamp_not_at_head")

if errors:
    print()
    print("=" * 60)
    print(f"FAILED: {len(errors)} check(s) failed: {errors}")
    print("=" * 60)
    sys.exit(1)
else:
    print("=" * 60)
    print("ALL CHECKS PASSED — safe to push to prod")
    print("=" * 60)
