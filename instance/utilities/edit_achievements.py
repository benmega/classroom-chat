# manage_achievements.py
import sys

from application.extensions import db
from application.models.achievements import Achievement


def list_achievements():
    achievements = Achievement.query.all()
    if not achievements:
        print("No achievements found.")
        return
    for a in achievements:
        print(
            f"{a.id}: slug='{a.slug}', name='{a.name}', type='{a.type}', requirement='{a.requirement_value}'"
        )


def add_achievement():
    slug = input("Slug (unique ID): ").strip()
    name = input("Name: ").strip()
    description = input("Description: ").strip()
    type_ = input("Type (ducks/challenge/streak/custom): ").strip()
    requirement_value = input("Requirement value: ").strip()

    existing = Achievement.query.filter_by(slug=slug).first()
    if existing:
        print("Error: Achievement with this slug already exists.")
        return

    achievement = Achievement(
        slug=slug,
        name=name,
        description=description,
        type=type_,
        requirement_value=requirement_value,
    )
    db.session.add(achievement)
    db.session.commit()
    print(f"Added achievement '{name}'.")


def remove_achievements():
    list_achievements()
    ids_input = input("Enter IDs of achievements to remove (comma-separated): ").strip()
    if not ids_input:
        print("No IDs provided.")
        return

    ids = [id_.strip() for id_ in ids_input.split(",")]
    removed = 0

    for id_ in ids:
        achievement = Achievement.query.get(id_)
        if achievement:
            db.session.delete(achievement)
            removed += 1
            print(f"Removed achievement '{achievement.name}'.")
        else:
            print(f"Achievement with ID {id_} not found.")

    if removed:
        db.session.commit()
        print(f"Total achievements removed: {removed}")
    else:
        print("No achievements were removed.")


# def remove_achievement():
#     list_achievements()
#     id_ = input("Enter ID of achievement to remove: ").strip()
#     achievement = Achievement.query.get(id_)
#     if not achievement:
#         print("Achievement not found.")
#         return
#     db.session.delete(achievement)
#     db.session.commit()
#     print(f"Removed achievement '{achievement.name}'.")


def edit_achievement():
    list_achievements()
    id_ = input("Enter ID of achievement to edit: ").strip()
    achievement = Achievement.query.get(id_)
    if not achievement:
        print("Achievement not found.")
        return

    print("Leave blank to keep current value.")
    slug = input(f"Slug [{achievement.slug}]: ").strip()
    name = input(f"Name [{achievement.name}]: ").strip()
    description = input(f"Description [{achievement.description}]: ").strip()
    type_ = input(f"Type [{achievement.type}]: ").strip()
    requirement_value = input(
        f"Requirement value [{achievement.requirement_value}]: "
    ).strip()

    if slug:
        achievement.slug = slug
    if name:
        achievement.name = name
    if description:
        achievement.description = description
    if type_:
        achievement.type = type_
    if requirement_value:
        achievement.requirement_value = requirement_value

    db.session.commit()
    print(f"Updated achievement '{achievement.name}'.")


def main():
    while True:
        print("\nAchievement Manager")
        print("1. List achievements")
        print("2. Add achievement")
        print("3. Edit achievement")
        print("4. Remove achievement")
        print("5. Exit")
        choice = input("Choose an option: ").strip()

        if choice == "1":
            list_achievements()
        elif choice == "2":
            add_achievement()
        elif choice == "3":
            edit_achievement()
        elif choice == "4":
            remove_achievements()
        elif choice == "5":
            sys.exit(0)
        else:
            print("Invalid choice.")


if __name__ == "__main__":
    from application import create_app

    app = create_app()
    with app.app_context():
        main()
