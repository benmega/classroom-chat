"""
fix_earned_ducks_invariant.py
-----------------------------
Repair script: enforces the invariant  earned_ducks >= duck_balance  for all
users. Finds anyone where that constraint is violated and resets earned_ducks to:

    max(sum_of_positive_transactions, duck_balance)

Invariant rationale:
  - earned_ducks is a lifetime counter (only ever goes up).
  - duck_balance is the net spendable balance (earned minus spent).
  - Therefore earned_ducks must always be >= duck_balance.

Users whose balance predates the duck_transactions log (migrated from a legacy
DB via raw SQL) may have a duck_balance higher than their transaction sum. In
that case their earned_ducks is set to duck_balance — their balance is proof
they earned at least that much at some point.

Usage:
    # Dry run against prod DB (default)
    python instance/utilities/fix_earned_ducks_invariant.py --dry-run

    # Apply fix to prod DB
    python instance/utilities/fix_earned_ducks_invariant.py

    # Apply to a specific DB path
    python instance/utilities/fix_earned_ducks_invariant.py --db path/to/users.db
"""

import argparse
import sqlite3
import sys
from pathlib import Path

DEFAULT_DB = Path(__file__).parent.parent / "prod_users.db"


def fix_earned_ducks_invariant(db_path: Path, dry_run: bool = False) -> None:
    print(f"Connecting to: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Find all users where the invariant is violated:
    # earned_ducks < duck_balance  OR  earned_ducks < 0
    cur.execute(
        """
        SELECT id, username, earned_ducks, duck_balance
        FROM users
        WHERE earned_ducks < duck_balance OR earned_ducks < 0
        ORDER BY username
        """
    )
    affected = cur.fetchall()

    if not affected:
        print("All users satisfy earned_ducks >= duck_balance. Nothing to do.")
        conn.close()
        return

    print(f"\nFound {len(affected)} user(s) violating the invariant:\n")

    updates = []
    for row in affected:
        user_id = row["id"]

        # Sum only positive transactions (lifetime earnings per transaction log)
        cur.execute(
            """
            SELECT COALESCE(SUM(amount), 0)
            FROM duck_transactions
            WHERE user_id = ? AND amount > 0
            """,
            (user_id,),
        )
        positive_tx_sum = cur.fetchone()[0] or 0

        # Correct value: at least as high as both the tx sum and the current balance
        current_balance = row["duck_balance"]
        correct_earned = max(positive_tx_sum, current_balance)

        print(
            f"  [{user_id}] {row['username']}: "
            f"earned_ducks={row['earned_ducks']:.2f} -> {correct_earned:.2f}  "
            f"(positive_tx_sum={positive_tx_sum:.2f}, duck_balance={current_balance:.2f})"
        )
        updates.append((correct_earned, user_id))

    if dry_run:
        print("\n[DRY RUN] No changes written to database.")
        conn.close()
        return

    # Apply fixes
    cur.executemany(
        "UPDATE users SET earned_ducks = ? WHERE id = ?",
        updates,
    )
    conn.commit()
    conn.close()
    print(f"\nSuccessfully repaired {len(updates)} user(s).")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Enforce earned_ducks >= duck_balance for all users."
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB,
        help=f"Path to the SQLite database (default: {DEFAULT_DB})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be changed without writing to the database.",
    )
    args = parser.parse_args()

    if not args.db.exists():
        print(f"Error: database not found at {args.db}", file=sys.stderr)
        sys.exit(1)

    fix_earned_ducks_invariant(args.db, dry_run=args.dry_run)
