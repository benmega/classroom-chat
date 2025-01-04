from datetime import datetime

from application import db
from application.models.bounty import Bounty

def test_bounty_creation(init_db):
    """Test creating a Bounty entry."""
    bounty = Bounty(
        user_id=2,
        description="Implement a new duck rewards system.",
        bounty="100",
        expected_behavior="Users should see ducks update in real time.",
        image_path="images/bounty2.png",
        status="Open"
    )
    db.session.add(bounty)
    db.session.commit()

    retrieved_bounty = Bounty.query.filter_by(user_id=2).first()
    assert retrieved_bounty is not None
    assert retrieved_bounty.description == "Implement a new duck rewards system."
    assert retrieved_bounty.bounty == "100"
    assert retrieved_bounty.expected_behavior == "Users should see ducks update in real time."
    assert retrieved_bounty.image_path == "images/bounty2.png"
    assert retrieved_bounty.status == "Open"
    assert isinstance(retrieved_bounty.timestamp, datetime)

def test_bounty_query_status(sample_bounty):
    """Test querying bounties by status."""
    open_bounties = Bounty.query.filter_by(status="Open").all()
    assert len(open_bounties) == 1
    assert open_bounties[0].description == "Fix a bug in the classroom chat application."

def test_bounty_repr(sample_bounty):
    """Test the __repr__ method of Bounty."""
    bounty = sample_bounty
    assert repr(bounty) == f"<Bounty {bounty.id} by User {bounty.user_id}>"

def test_bounty_unique_constraint(init_db):
    """Test adding multiple bounties for the same user and ensure they are treated separately."""
    bounty1 = Bounty(
        user_id=3,
        description="Create a leaderboard feature.",
        bounty="200",
        status="Open"
    )
    bounty2 = Bounty(
        user_id=3,
        description="Enhance the UI design.",
        bounty="150",
        status="Pending"
    )
    db.session.add(bounty1)
    db.session.add(bounty2)
    db.session.commit()

    bounties = Bounty.query.filter_by(user_id=3).all()
    assert len(bounties) == 2
    assert bounties[0].description == "Create a leaderboard feature."
    assert bounties[1].description == "Enhance the UI design."
