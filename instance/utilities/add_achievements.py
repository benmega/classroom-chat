

# Filename: add_achievements.py
# Description: Script to bulk insert predefined achievements into the database.

from application import create_app, DevelopmentConfig
from application.extensions import db
from application.models.achievements import Achievement


def seed_achievements():
    """Insert predefined achievements if they do not already exist."""

    achievements = [
        {"slug": "codecombat-first-level", "name": "Novice Coder", "description": "Complete your first level",
         "type": "progress", "requirement_value": "1", "source": "www.codecombat.com", "reward": 1},

        {"slug": "codecombat-5-levels", "name": "Apprentice Adventurer", "description": "Complete 5 levels",
         "type": "progress", "requirement_value": "5", "source": "www.codecombat.com", "reward": 2},

        {"slug": "codecombat-10-levels", "name": "Coding Recruit", "description": "Complete 10 levels",
         "type": "progress", "requirement_value": "10", "source": "www.codecombat.com", "reward": 4},

        {"slug": "codecombat-25-levels", "name": "Script Squire", "description": "Complete 25 levels",
         "type": "progress", "requirement_value": "25", "source": "www.codecombat.com", "reward": 8},

        {"slug": "codecombat-50-levels", "name": "Algorithm Adept", "description": "Complete 50 levels",
         "type": "progress", "requirement_value": "50", "source": "www.codecombat.com", "reward": 15},

        {"slug": "codecombat-100-levels", "name": "Code Knight", "description": "Complete 100 levels",
         "type": "progress", "requirement_value": "100", "source": "www.codecombat.com", "reward": 30},

        {"slug": "codecombat-200-levels", "name": "Master Programmer", "description": "Complete 200 levels",
         "type": "progress", "requirement_value": "200", "source": "www.codecombat.com", "reward": 60},

        {"slug": "codecombat-300-levels", "name": "Code Champion", "description": "Complete 300 levels",
         "type": "progress", "requirement_value": "300", "source": "www.codecombat.com", "reward": 100},

        {"slug": "codecombat-400-levels", "name": "Legendary Coder", "description": "Complete 400 levels",
         "type": "progress", "requirement_value": "400", "source": "www.codecombat.com", "reward": 140},

        {"slug": "codecombat-500-levels", "name": "Heroic Hacker", "description": "Complete 500 levels",
         "type": "progress", "requirement_value": "500", "source": "www.codecombat.com", "reward": 180},

        {"slug": "codecombat-570-levels", "name": "CodeCombat Conqueror", "description": "Complete all 570 levels",
         "type": "progress", "requirement_value": "570", "source": "www.codecombat.com", "reward": 200},
    ]

    inserted, skipped = 0, 0

    for a in achievements:
        if not Achievement.query.filter_by(slug=a["slug"]).first():
            db.session.add(Achievement(**a))
            inserted += 1
        else:
            skipped += 1

    db.session.commit()
    print(f"Achievements seeding complete. Inserted: {inserted}, Skipped (already exist): {skipped}")


def main():
    app = create_app(DevelopmentConfig)
    with app.app_context():
        seed_achievements()


if __name__ == "__main__":
    main()


    # achievements = [
    #     {"slug": "560f1a9f22961295f9427742", "name": "CS1", "description": "Submit completion certificate for CS1",
    #      "type": "custom", "requirement_value": "1"},
    #     {"slug": "5632661322961295f9428638", "name": "CS2", "description": "Submit completion certificate for CS2",
    #      "type": "custom", "requirement_value": "1"},
    #     {"slug": "56462f935afde0c6fd30fc8c", "name": "CS3", "description": "Submit completion certificate for CS3",
    #      "type": "custom", "requirement_value": "1"},
    #     {"slug": "56462f935afde0c6fd30fc8d", "name": "CS4", "description": "Submit completion certificate for CS4",
    #      "type": "custom", "requirement_value": "1"},
    #     {"slug": "569ed916efa72b0ced971447", "name": "CS5", "description": "Submit completion certificate for CS5",
    #      "type": "custom", "requirement_value": "1"},
    #     {"slug": "5817d673e85d1220db624ca4", "name": "CS6", "description": "Submit completion certificate for CS6",
    #      "type": "custom", "requirement_value": "1"},
    #     {"slug": "5789587aad86a6efb573701e", "name": "GD1", "description": "Submit completion certificate for GD1",
    #      "type": "custom", "requirement_value": "1"},
    #     {"slug": "57b621e7ad86a6efb5737e64", "name": "GD2", "description": "Submit completion certificate for GD2",
    #      "type": "custom", "requirement_value": "1"},
    #     {"slug": "5a0df02b8f2391437740f74f", "name": "GD3", "description": "Submit completion certificate for GD3",
    #      "type": "custom", "requirement_value": "1"},
    #     {"slug": "65f32b6c87c07dbeb5ba1936", "name": "Junior",
    #      "description": "Submit completion certificate for Junior", "type": "custom", "requirement_value": "1"},
    #     {"slug": "5789587aad86a6efb573701f", "name": "WD1", "description": "Submit completion certificate for WD1",
    #      "type": "custom", "requirement_value": "1"},
    #     {"slug": "5789587aad86a6efb5737020", "name": "WD2", "description": "Submit completion certificate for WD2",
    #      "type": "custom", "requirement_value": "1"},
    # ]

    # achievements = [
    #     # Ducks
    #     {"slug": "first-duck", "name": "First Duck", "description": "Earn your first duck", "type": "ducks",
    #      "requirement_value": "1"},
    #     {"slug": "duckling", "name": "Duckling", "description": "Earn 10 ducks", "type": "ducks",
    #      "requirement_value": "10"},
    #     {"slug": "flock-builder", "name": "Flock Builder", "description": "Earn 50 ducks", "type": "ducks",
    #      "requirement_value": "50"},
    #     {"slug": "pond-master", "name": "Pond Master", "description": "Earn 100 ducks", "type": "ducks",
    #      "requirement_value": "100"},
    #     {"slug": "duck-legend", "name": "Duck Legend", "description": "Earn 500 ducks (prestige)", "type": "ducks",
    #      "requirement_value": "500"},
    #
    #     # Progress (Challenges Completed)
    #     {"slug": "first-challenge", "name": "Getting Started", "description": "Complete your first challenge",
    #      "type": "progress", "requirement_value": "1"},
    #     {"slug": "5-challenges", "name": "Steady Steps", "description": "Complete 5 challenges", "type": "progress",
    #      "requirement_value": "5"},
    #     {"slug": "10-challenges", "name": "Challenge Conqueror", "description": "Complete 10 challenges",
    #      "type": "progress", "requirement_value": "10"},
    #     {"slug": "25-challenges", "name": "Learning Machine", "description": "Complete 25 challenges",
    #      "type": "progress", "requirement_value": "25"},
    #     {"slug": "100-challenges", "name": "Marathon Learner", "description": "Complete 100 challenges (prestige)",
    #      "type": "progress", "requirement_value": "100"},
    #
    #     # Consistency (Weekly Streaks)
    #     {"slug": "first-streak", "name": "On the Board",
    #      "description": "Attend class and complete work 1 week in a row", "type": "consistency",
    #      "requirement_value": "1"},
    #     {"slug": "3-week-streak", "name": "Triple Play", "description": "Keep a 3-week streak going",
    #      "type": "consistency", "requirement_value": "3"},
    #     {"slug": "5-week-streak", "name": "High Five", "description": "Maintain a 5-week streak", "type": "consistency",
    #      "requirement_value": "5"},
    #     {"slug": "10-week-streak", "name": "Decathlon Learner", "description": "Maintain a 10-week streak",
    #      "type": "consistency", "requirement_value": "10"},
    #     {"slug": "25-week-streak", "name": "Unstoppable", "description": "Maintain a 25-week streak (prestige)",
    #      "type": "consistency", "requirement_value": "25"},
    #
    #     # Chat Activity
    #     {"slug": "first-message", "name": "Hello World", "description": "Send your first message in chat",
    #      "type": "chat", "requirement_value": "1"},
    #     {"slug": "10-messages", "name": "Chatterbox", "description": "Send 10 chat messages", "type": "chat",
    #      "requirement_value": "10"},
    #     {"slug": "50-messages", "name": "Talkative Duck", "description": "Send 50 chat messages", "type": "chat",
    #      "requirement_value": "50"},
    #     {"slug": "200-messages", "name": "Chat Champion", "description": "Send 200 chat messages", "type": "chat",
    #      "requirement_value": "200"},
    #     {"slug": "500-messages", "name": "Voice of the Flock", "description": "Send 500 chat messages (prestige)",
    #      "type": "chat", "requirement_value": "500"},
    #
    #     # Community (Helping Others)
    #     {"slug": "first-help", "name": "Helper-in-Training", "description": "Help a classmate with a challenge",
    #      "type": "community", "requirement_value": "1"},
    #     {"slug": "5-helps", "name": "Team Player", "description": "Help 5 classmates", "type": "community",
    #      "requirement_value": "5"},
    #     {"slug": "20-helps", "name": "Mentor Duck", "description": "Help 20 classmates", "type": "community",
    #      "requirement_value": "20"},
    #     {"slug": "50-helps", "name": "Classroom Hero", "description": "Help 50 classmates (prestige)",
    #      "type": "community", "requirement_value": "50"},
    #
    #     # Catalog (Exploration)
    #     {"slug": "first-project", "name": "Show and Tell", "description": "Log your first project in the catalog",
    #      "type": "catalog", "requirement_value": "1"},
    #     {"slug": "3-projects", "name": "Maker Duck", "description": "Log 3 projects", "type": "catalog",
    #      "requirement_value": "3"},
    #     {"slug": "10-projects", "name": "Builder Extraordinaire", "description": "Log 10 projects", "type": "catalog",
    #      "requirement_value": "10"},
    #     {"slug": "25-projects", "name": "Master Creator", "description": "Log 25 projects (prestige)",
    #      "type": "catalog", "requirement_value": "25"},
    # ]