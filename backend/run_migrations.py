#!/usr/bin/env python
"""Run database migrations using alembic."""
import sys
import os
from alembic.config import Config
from alembic import command
from application import create_app

app = create_app()

with app.app_context():
    migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
    alembic_cfg = Config(os.path.join(migrations_dir, 'alembic.ini'))
    alembic_cfg.set_main_option('script_location', migrations_dir)
    alembic_cfg.set_main_option('sqlalchemy.url', str(app.config['SQLALCHEMY_DATABASE_URI']))

    command.upgrade(alembic_cfg, 'head')
    print("Migrations completed successfully")
