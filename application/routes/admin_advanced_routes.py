
# Flask-Admin auto-registration for all models with admin-only access
from flask import request, redirect, render_template
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from application import db

class SecureModelView(ModelView):
    can_create = True
    can_edit = True
    can_delete = True
    can_view_details = True
    column_display_pk = True  # show primary keys
    extra_css = ['/static/css/admin.css']

    def is_accessible(self):
        local_ok = request.remote_addr == '127.0.0.1'
        return local_ok

    def inaccessible_callback(self, name, **kwargs):
        return redirect("/admin/dashboard")


def init_admin(app):
    global admin_advanced_instance
    admin = Admin(
        app,
        name="Admin",
        # template_mode="bootstrap4",
        template_mode=None,  # don't use bootstrap4
        base_template='admin/advanced_panel.html',
        url="/admin/advanced",
        endpoint="admin_advanced"
    )

    for mapper in db.Model.registry.mappers:
        model = mapper.class_
        admin.add_view(
            SecureModelView(
                model,
                db.session,
                name=model.__name__,
                endpoint=f"adv_{model.__name__}"
            )
        )
    admin_advanced_instance = admin

    # Optional: explicit route to render your custom template
    @app.route('/admin/advanced')
    def advanced_panel():
        return render_template(
            'admin/advanced_panel.html',
            admin_advanced=admin_advanced_instance
        )

    return admin

