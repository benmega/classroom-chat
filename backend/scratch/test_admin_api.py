from application import create_app
from application.models.user import User
from flask import url_for
import json

app = create_app()
with app.app_context():
    u = User.query.filter_by(_username='ben').first()
    with app.test_client() as client:
        with client.session_transaction() as sess:
            sess['user'] = u.id
        resp = client.get('/api/achievements/all')
        data = resp.get_json()
        print(f"User: {u.username}")
        print(f"Achievements returned: {len(data['data']['achievements'])}")
        print(f"User achievements returned: {len(data['data']['user_achievements'])}")
        
        # Check if IDs match
        all_ids = [a['id'] for a in data['data']['achievements']]
        user_ids = data['data']['user_achievements']
        print(f"Earned IDs: {user_ids}")
        
        # Calculate Mastery Level as the frontend would
        totalPossible = len(data['data']['achievements'])
        earnedCount = len(data['data']['user_achievements'])
        percent = round((earnedCount / totalPossible) * 100) if totalPossible > 0 else 0
        print(f"Calculated Mastery: {percent}%")
