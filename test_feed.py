import os
import time
from application import create_app
from application.extensions import db
from application.models.message import Message, message_classrooms, message_users
from application.models.user import User
from application.models.classroom import Classroom

app = create_app()

with app.app_context():
    # Pick a random user who has classrooms
    user = None
    for u in User.query.all():
        if u.classrooms and not u.is_admin:
            user = u
            break
            
    if not user:
        print("No user with classrooms found")
        exit(0)
    
    print(f"Testing with user {user.username}, id {user.id}")
    
    start_time = time.time()
    limit = 50
    user_classroom_ids = [c.id for c in user.classrooms]
    
    before_id = None
    
    base_query = db.session.query(Message.id).filter(Message.deleted_at.is_(None))
    if before_id:
        base_query = base_query.filter(Message.id < before_id)

    q1 = base_query.filter(Message.is_global.is_(True))
    q2 = base_query.filter(Message.user_id == user.id)
    q3 = base_query.join(message_users, Message.id == message_users.c.message_id)\
                   .filter(message_users.c.user_id == user.id)

    queries = [q1, q2, q3]

    if user_classroom_ids:
        q4 = base_query.join(message_classrooms, Message.id == message_classrooms.c.message_id)\
                       .filter(message_classrooms.c.classroom_id.in_(user_classroom_ids))
        queries.append(q4)

    union_query = queries[0].union(*queries[1:])
    # For union, we might need to wrap it to order, or order the final union
    from sqlalchemy import desc
    union_query = union_query.order_by(desc(Message.id)).limit(limit)
    
    message_ids = [row[0] for row in union_query.all()]
    print(f"Message ids: {message_ids}")
    
    messages = []
    if message_ids:
        messages = Message.query.filter(Message.id.in_(message_ids)).order_by(Message.id.desc()).all()
    
    print("\nExecuting query...")
    q_start = time.time()
    
    # Just to time it isolated
    ids_query = queries[0].union(*queries[1:]).order_by(desc(Message.id)).limit(limit)
    fetched_ids = [row[0] for row in ids_query.all()]
    if fetched_ids:
        _ = Message.query.filter(Message.id.in_(fetched_ids)).order_by(Message.id.desc()).all()
        
    q_end = time.time()
    print(f"Query executed in {q_end - q_start:.4f} seconds")
