from sqlalchemy.testing import db

from application.models.bounty import Bounty


def test_create_bounty(init_db):
    bounty = Bounty(user_id=1, description="Test Bounty", bounty="binary_string")
    db.session.add(bounty)
    db.session.commit()

    # Ensure bounty is added
    created_bounty = Bounty.query.filter_by(description="Test Bounty").first()
    assert created_bounty is not None
    assert created_bounty.description == "Test Bounty"


def test_read_bounty(init_db):
    bounty = Bounty(user_id=1, description="Test Bounty", bounty="binary_string")
    db.session.add(bounty)
    db.session.commit()

    # Read from the database
    fetched_bounty = Bounty.query.filter_by(description="Test Bounty").first()
    assert fetched_bounty is not None
    assert fetched_bounty.description == "Test Bounty"


def test_update_bounty(init_db):
    bounty = Bounty(user_id=1, description="Test Bounty", bounty="binary_string")
    db.session.add(bounty)
    db.session.commit()

    # Update the bounty description
    bounty.description = "Updated Bounty"
    db.session.commit()

    # Ensure the description is updated
    updated_bounty = Bounty.query.filter_by(description="Updated Bounty").first()
    assert updated_bounty.description == "Updated Bounty"


def test_delete_bounty(init_db):
    bounty = Bounty(user_id=1, description="Test Bounty", bounty="binary_string")
    db.session.add(bounty)
    db.session.commit()

    # Delete the bounty
    db.session.delete(bounty)
    db.session.commit()

    # Ensure the bounty is deleted
    deleted_bounty = Bounty.query.filter_by(description="Test Bounty").first()
    assert deleted_bounty is None
