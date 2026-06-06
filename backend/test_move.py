import requests
from application import create_app
from application.extensions import db
from application.models.user import User
from application.models.project import Project

app = create_app()
with app.app_context():
    # Find an admin
    admin = User.query.filter_by(is_admin=True).first()
    student1 = User.query.filter_by(is_admin=False).first()
    student2 = User.query.filter(User.id != student1.id, User.is_admin == False).first()
    
    if not admin or not student1 or not student2:
        print("Not enough users to test.")
        exit(0)
        
    print(f"Admin: {admin.id}, Student 1: {student1.id}, Student 2: {student2.id}")
    
    # Create a project for student 1
    project = Project(name="Test Move", user_id=student1.id)
    db.session.add(project)
    db.session.commit()
    project_id = project.id
    print(f"Created project {project_id} for student {student1.id}")
    
    # Simulate the request
    # Use the test client
    with app.test_client() as client:
        # We need to simulate login.
        with client.session_transaction() as sess:
            sess['user'] = admin.id
            
        data = {
            'action': 'save',
            'name': 'Test Move Edited',
            'student_id': str(student2.id)
        }
        
        response = client.post(f'/user/project/edit/{project_id}', data=data)
        print("Status code:", response.status_code)
        
    # Check if project moved
    project = db.session.get(Project, project_id)
    print(f"Project user_id is now: {project.user_id}. Expected: {student2.id}")
