from application import create_app
import traceback

try:
    app = create_app()
    app.config["WTF_CSRF_ENABLED"] = True # Force CSRF on
    client = app.test_client()

    response = client.options('/api/auth/cognito/register')
    print("OPTIONS /api/auth/cognito/register ->", response.status_code)
    print(response.data.decode('utf-8'))

    response = client.post('/api/auth/cognito/register', json={"email":"test@test.com", "password":"password"})
    print("POST /api/auth/cognito/register ->", response.status_code)
    print(response.data.decode('utf-8'))
except Exception as e:
    traceback.print_exc()
