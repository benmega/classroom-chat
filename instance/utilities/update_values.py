import sqlite3

# Mapping of achievement slug to new reward value
reward_updates = {
    "first-duck": 5,
    "duck-collector": 20,
    "duck-hoarder": 40,
    "duck-millionaire": 75,
    "first-challenge": 5,
    "cc-novice": 10,
    "cc-veteran": 20,
    "challenge-master": 40,
    "first-project": 5,
    "portfolio-builder": 10,
    "project-master": 10,
    "chatterbox": 10,
    "active-user": 10,
    "marathoner": 15,
    "trade-initiate": 5,
    "helpful-peer": 5,
    "achievement-hunter": 10,
    "duckling": 10,
    "flock-builder": 20,
    "pond-master": 25,
    "duck-legend": 75,
    "5-challenges": 10,
    "10-challenges": 15,
    "25-challenges": 25,
    "100-challenges": 50,
    "first-streak": 5,
    "3-week-streak": 10,
    "5-week-streak": 15,
    "10-week-streak": 25,
    "25-week-streak": 50,
    "first-message": 5,
    "10-messages": 10,
    "50-messages": 20,
    "200-messages": 40,
    "first-help": 5,
    "5-helps": 10,
    "20-helps": 20,
    "50-helps": 40,
    "3-projects": 10,
    "10-projects": 15,
    "25-projects": 25,
    "560f1a9f22961295f9427742": 10,
    "5632661322961295f9428638": 20,
    "56462f935afde0c6fd30fc8c": 40,
    "56462f935afde0c6fd30fc8d": 60,
    "569ed916efa72b0ced971447": 80,
    "5817d673e85d1220db624ca4": 100,
    "5789587aad86a6efb573701e": 20,
    "57b621e7ad86a6efb5737e64": 40,
    "5a0df02b8f2391437740f74f": 60,
    "65f32b6c87c07dbeb5ba1936": 10,
    "5789587aad86a6efb573701f": 20,
    "5789587aad86a6efb5737020": 40
}

def update_rewards(db_path, table_name, mapping):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        updates = 0
        for slug, reward in mapping.items():
            cursor.execute(f"""
                UPDATE {table_name}
                SET reward = ?
                WHERE slug = ?
            """, (reward, slug))
            updates += cursor.rowcount  # count only if row exists

        conn.commit()
        print(f"Updated rewards for {updates} achievements in '{table_name}'.")
    except Exception as e:
        print("Error occurred:", e)
    finally:
        conn.close()


if __name__ == "__main__":
    db_path = r"C:\Users\Ben\PycharmProjects\groupChat2\instance\dev_users.db"
    update_rewards(db_path, "achievement", reward_updates)
