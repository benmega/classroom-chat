import csv
import os
import re
from flask.cli import with_appcontext
import click

def generate_kebab_slug(text):
    """Generate a clean kebab-case slug."""
    if not text:
        return ""
    # Remove suffixes commonly found in Ozaria data
    text = text.replace(" - Locked", "")
    text = text.replace(" - In Progress", "")
    # Lowercase, replace spaces/underscores with dashes
    slug = re.sub(r'[_\s]+', '-', text.lower())
    # Remove non-alphanumeric (except dashes)
    slug = re.sub(r'[^a-z0-9-]', '', slug)
    # Collapse multiple dashes
    slug = re.sub(r'-+', '-', slug).strip('-')
    return slug

@click.command('seed')
@with_appcontext
def seed_command():
    """Seed the database with challenges and course instances from CSV files."""
    from application.extensions import db
    from application.models.challenge import Challenge
    from application.models.course_instance import CourseInstance
    from flask import current_app

    base_dir = os.path.join(current_app.config['BASE_DIR'], 'backend', 'instance', 'migration')
    challenges_csv = os.path.join(base_dir, 'level_seed_data.csv')
    instances_csv = os.path.join(base_dir, 'course_instances_seed.csv')

    # Seed Course Instances
    if os.path.exists(instances_csv):
        click.echo(f"Seeding course instances from {instances_csv}...")
        inserted_instances = 0
        try:
            with open(instances_csv, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    instance_id = row.get('id')
                    if not instance_id:
                        continue
                    
                    exists = CourseInstance.query.filter_by(id=instance_id).first()
                    if not exists:
                        new_instance = CourseInstance(
                            id=instance_id,
                            classroom_id=row.get('classroom_id'),
                            course_id=row.get('course_id')
                        )
                        db.session.add(new_instance)
                        inserted_instances += 1
            
            db.session.commit()
            click.echo(f"Successfully inserted {inserted_instances} new course instances.")
        except Exception as e:
            db.session.rollback()
            click.echo(f"Error seeding course instances: {e}")
    else:
        click.echo(f"File not found: {instances_csv}")

    # Seed Challenges
    if os.path.exists(challenges_csv):
        click.echo(f"Seeding challenges from {challenges_csv}...")
        inserted_challenges = 0
        updated_challenges = 0
        try:
            with open(challenges_csv, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    name = row.get('name', '').strip()
                    if name.endswith(" - In Progress"):
                        name = name[:-14]
                    domain = row.get('domain', '').strip()
                    if not name or not domain:
                        continue

                    csv_slug = row.get('slug', '').strip() or generate_kebab_slug(name)
                    difficulty = row.get('difficulty', 'medium').capitalize()
                    value = int(float(row.get('value', 1)))
                    description = row.get('description', 'No description provided.')
                    course_id = row.get('course_id')

                    # Check existence by slug OR (name and domain)
                    challenge = Challenge.query.filter((Challenge.slug == csv_slug) | ((Challenge.name == name) & (Challenge.domain == domain))).first()
                    
                    if challenge:
                        # Update existing
                        challenge.name = name
                        challenge.domain = domain
                        challenge.slug = csv_slug
                        challenge.difficulty = difficulty
                        challenge.value = value
                        challenge.description = description
                        challenge.course_id = course_id
                        updated_challenges += 1
                    else:
                        # Insert new
                        new_challenge = Challenge(
                            name=name,
                            slug=csv_slug,
                            domain=domain,
                            course_id=course_id,
                            description=description,
                            difficulty=difficulty,
                            value=value,
                            is_active=True
                        )
                        db.session.add(new_challenge)
                        inserted_challenges += 1

            db.session.commit()
            click.echo(f"Successfully inserted {inserted_challenges} and updated {updated_challenges} challenges.")
        except Exception as e:
            db.session.rollback()
            click.echo(f"Error seeding challenges: {e}")
    else:
        click.echo(f"File not found: {challenges_csv}")
