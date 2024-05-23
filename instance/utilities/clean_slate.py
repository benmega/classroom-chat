# from application import db
# db.drop_all()
#
from application.config import Config
from sqlalchemy import create_engine, MetaData, Table

SQLALCHEMY_DATABASE_URI = Config.SQLALCHEMY_DATABASE_URI  # Replace with your actual database URI
engine = create_engine(SQLALCHEMY_DATABASE_URI)

with engine.connect() as conn:
    # Drop the alembic_version table if it exists
    conn.execute("DROP TABLE IF EXISTS alembic_version")
