from application import create_app
app = create_app()
for name, bp in app.blueprints.items():
    print(f"Blueprint: {name}, Import name: {bp.import_name}")
