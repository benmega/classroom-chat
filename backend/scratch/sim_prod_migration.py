"""
Simulates exactly what happens on the prod server during flask db upgrade.
Run from the repo root: python backend/scratch/sim_prod_migration.py
"""
import tempfile
import os
import sys

sys.path.insert(0, os.path.abspath('backend'))
os.chdir('backend')  # Flask app expects to run from backend/

import sqlalchemy as sa  # noqa: E402
from sqlalchemy import text  # noqa: E402

db_path = tempfile.mktemp(suffix='.db')
engine = sa.create_engine(f'sqlite:///{db_path}')

print("=" * 60)
print("STEP 1: Build prod-mirror database")
print("  stamp         : a1b2c3d4e5f6")
print("  challenge_logs: user_id present, NO username (prod state)")
print("  duck_trade_log: user_id present, NO username (prod state)")
print("=" * 60)

with engine.connect() as conn:
    conn.execute(text("""CREATE TABLE users (
        id INTEGER PRIMARY KEY, username VARCHAR(80) UNIQUE NOT NULL,
        password_hash VARCHAR(200), earned_ducks INTEGER DEFAULT 0,
        duck_balance INTEGER DEFAULT 0, is_admin BOOLEAN DEFAULT 0,
        is_approved BOOLEAN DEFAULT 0, role VARCHAR(20), email VARCHAR(120),
        cognito_sub VARCHAR(50), has_seen_tutorial BOOLEAN,
        connection_code VARCHAR(10), has_chat_font BOOLEAN,
        chat_font_color VARCHAR(7), has_animated_border BOOLEAN,
        has_auto_bitshift BOOLEAN, has_custom_wallpaper BOOLEAN,
        profile_wallpaper VARCHAR(255), has_auto_claimer BOOLEAN,
        profile_picture VARCHAR(200)
    )"""))
    conn.execute(text("""CREATE TABLE challenge_logs (
        id INTEGER PRIMARY KEY, user_id INTEGER, username VARCHAR(80),
        domain VARCHAR(100) NOT NULL, challenge_slug VARCHAR(255) NOT NULL,
        course_id VARCHAR(100), course_instance VARCHAR(100),
        timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, helper TEXT
    )"""))
    conn.execute(text("""CREATE TABLE duck_trade_log (
        id INTEGER PRIMARY KEY, user_id INTEGER, username VARCHAR(80),
        digital_ducks INTEGER, bit_ducks TEXT, byte_ducks TEXT,
        status VARCHAR(20), timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )"""))
    conn.execute(text("""CREATE TABLE classrooms (
        id VARCHAR(64) PRIMARY KEY, name VARCHAR(255) NOT NULL,
        language VARCHAR(64) NOT NULL, url VARCHAR(255) NOT NULL,
        course_id VARCHAR(64), created_at DATETIME
    )"""))
    conn.execute(text("""CREATE TABLE conversations (
        id INTEGER PRIMARY KEY, title VARCHAR(100) NOT NULL,
        creator_id INTEGER REFERENCES users(id),
        classroom_id VARCHAR(64) REFERENCES classrooms(id),
        is_locked BOOLEAN DEFAULT 0, slow_mode_delay INTEGER DEFAULT 0,
        created_at DATETIME
    )"""))
    conn.execute(text("""CREATE TABLE user_classrooms (
        user_id INTEGER NOT NULL REFERENCES users(id),
        classroom_id VARCHAR(64) NOT NULL REFERENCES classrooms(id),
        enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, classroom_id)
    )"""))
    conn.execute(text("""CREATE TABLE challenges (
        id INTEGER PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE,
        slug VARCHAR(255) NOT NULL UNIQUE, domain VARCHAR(100) NOT NULL,
        difficulty VARCHAR(50) NOT NULL DEFAULT 'medium',
        value INTEGER NOT NULL DEFAULT 1, is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        course_id VARCHAR(100),
        classroom_id VARCHAR(64) REFERENCES classrooms(id), description TEXT
    )"""))
    conn.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32) PRIMARY KEY)"))
    conn.execute(text("INSERT INTO alembic_version VALUES ('a1b2c3d4e5f6')"))
    conn.execute(text("INSERT INTO users (id,username,password_hash) VALUES (1,'alice','hash1'),(2,'bob','hash2')"))
    conn.execute(text("INSERT INTO challenge_logs (username,domain,challenge_slug) VALUES ('alice','codecombat.com','level-1'),('bob','codecombat.com','level-2')"))
    conn.execute(text("INSERT INTO duck_trade_log (username,digital_ducks,status) VALUES ('alice',5,'pending')"))
    conn.commit()

engine.dispose()
print("Done.\n")

print("=" * 60)
print("STEP 2: Run flask db upgrade via Flask app context (mirrors server)")
print("=" * 60)

# Set the environment so Flask uses our test DB
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

with app.app_context():
    from flask_migrate import upgrade as flask_upgrade
    flask_upgrade()

print()
print("=" * 60)
print("STEP 3: Verify final state")
print("=" * 60)

engine2 = sa.create_engine(f'sqlite:///{db_path}')
with engine2.connect() as conn:
    stamp = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
    tables = sorted([r[0] for r in conn.execute(text(
        "SELECT name FROM sqlite_master WHERE type='table'")).fetchall()])
    users = [r[0] for r in conn.execute(text("SELECT username FROM users ORDER BY id")).fetchall()]
    logs = conn.execute(text("SELECT user_id, challenge_slug FROM challenge_logs ORDER BY id")).fetchall()
    trades = conn.execute(text("SELECT user_id, status FROM duck_trade_log ORDER BY id")).fetchall()
    cl_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(challenge_logs)")).fetchall()]
    dtl_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(duck_trade_log)")).fetchall()]

errors = []

def check(label, condition, detail=""):
    if condition:
        print(f"  [PASS] {label}")
    else:
        print(f"  [FAIL] {label} {detail}")
        errors.append(label)

print(f"Stamp               : {stamp}")
check("Stamp is at head (f1a2b3c4d5e6)", stamp == 'f1a2b3c4d5e6')

print(f"challenge_logs cols : {cl_cols}")
check("challenge_logs has user_id", 'user_id' in cl_cols)
check("challenge_logs has no username", 'username' not in cl_cols)

print(f"duck_trade_log cols : {dtl_cols}")
check("duck_trade_log has user_id", 'user_id' in dtl_cols)
check("duck_trade_log has no username", 'username' not in dtl_cols)

print(f"Users               : {users}")
check("User data preserved", users == ['alice', 'bob'], str(users))

print(f"Challenge logs      : {list(logs)}")
check("Challenge log data preserved", len(logs) == 2, str(len(logs)))

print(f"Duck trade logs     : {list(trades)}")
check("Duck trade data preserved", len(trades) == 1, str(len(trades)))

print(f"Tables              : {tables}")
check("user_classrooms table exists", 'user_classrooms' in tables)

engine2.dispose()
os.unlink(db_path)
print()

if errors:
    print("=" * 60)
    print(f"FAILED: {len(errors)} check(s) failed: {errors}")
    print("=" * 60)
    sys.exit(1)
else:
    print("=" * 60)
    print("ALL CHECKS PASSED — safe to push to prod")
    print("=" * 60)
