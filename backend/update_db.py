from main import app
from application.extensions import db
from sqlalchemy import text

with app.app_context():
    # Create new tables like parent_connection_requests
    db.create_all()
    
    # Add connection_code to users
    try:
        db.session.execute(text("ALTER TABLE users ADD COLUMN connection_code VARCHAR(10);"))
        db.session.commit()
        print("Added connection_code column.")
    except Exception as e:
        print("Could not add connection_code column (might already exist):", e)
        
    try:
        db.session.execute(text("CREATE UNIQUE INDEX uq_users_connection_code ON users(connection_code);"))
        db.session.commit()
        print("Added unique index.")
    except Exception as e:
        print("Could not add unique index:", e)

    # Add email and cognito_sub to users
    try:
        db.session.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR(120);"))
        db.session.commit()
        print("Added email column.")
    except Exception as e:
        print("Could not add email column (might already exist):", e)

    try:
        db.session.execute(text("CREATE UNIQUE INDEX uq_users_email ON users(email);"))
        db.session.commit()
    except Exception:
        pass

    try:
        db.session.execute(text("ALTER TABLE users ADD COLUMN cognito_sub VARCHAR(50);"))
        db.session.commit()
        print("Added cognito_sub column.")
    except Exception as e:
        print("Could not add cognito_sub column (might already exist):", e)

    try:
        db.session.execute(text("CREATE UNIQUE INDEX uq_users_cognito_sub ON users(cognito_sub);"))
        db.session.commit()
    except Exception:
        pass
