"""
RETIRED: this module does nothing and deploy.sh no longer runs it.
────────────────────────────────────────────────────────────────────────────
It used to run a set of data steps on every deploy for the move to per-classroom
enrolment. None of them is needed any more:

• The reserved 'global' and 'archive' classrooms are created by
  seed_global_data() whenever the app starts (application/__init__.py).
• The enrolment backfills were one-time jobs and have been applied. Repeating
  them on every deploy re-enrolled students a teacher had removed from a class.
• The conversation steps worked on tables that Alembic has since dropped.
• Roles are not managed from here.

────────────────────────────────────────────────────────────────────────────
FOR FUTURE DEVELOPERS
────────────────────────────────────────────────────────────────────────────
• Do not add steps here. A data fix that must run once is an Alembic data
  migration; data that must exist on every install is an idempotent upsert in
  `flask seed`. Schema changes always go through Alembic.

• The file itself stays for one more release. A deploy executes the deploy.sh
  that was on disk before it updated the code, so `python -m
  tools.migrate_classroom` is called one last time after this change ships and
  has to succeed. Delete this file and its test after that deploy.
"""


def run():
    """Do nothing; see the module docstring."""
    print("tools.migrate_classroom is retired and does nothing.")


if __name__ == "__main__":
    run()
