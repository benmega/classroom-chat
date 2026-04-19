"""
File: admin_advanced_routes.py
Type: py
Summary: Flask routes for admin advanced routes functionality.
"""

from flask import session, render_template
from flask_admin import Admin, AdminIndexView, expose
from flask_admin.contrib.sqla import ModelView

from application.extensions import db
from application.models.user import User


class SecureModelView(ModelView):
    """Restrict access to Admins only"""

    can_create = True
    can_edit = True
    can_delete = True
    can_view_details = True
    column_display_pk = True

    def __init__(self, model, session, *args, **kwargs):
        self.column_exclude_list = [c for c in ['password_hash', 'ip_address'] if hasattr(model, c)]
        super(SecureModelView, self).__init__(model, session, *args, **kwargs)

    def is_accessible(self):
        user_id = session.get("user")
        if not user_id:
            return False

        user = User.query.get(user_id)
        return user and user.is_admin

    def inaccessible_callback(self, name, **kwargs):
        # unauthorized access
        return "Admin access required.", 403



class AdvancedIndex(AdminIndexView):
    """Custom landing page for advanced admin"""

    def is_accessible(self):
        user_id = session.get("user")
        if not user_id:
            return False

        user = User.query.get(user_id)
        return user and user.is_admin

    def inaccessible_callback(self, name, **kwargs):
        return "Admin access required.", 403


    @expose("/")
    def index(self):
        model_views = [v for v in self.admin._views if isinstance(v, ModelView)]
        return self.render("admin/advanced_panel.html", views=model_views)


def init_admin(app):
    """Initialize the advanced admin interface"""

    admin = Admin(
        app,
        name="Advanced Admin",
        url="/api/admin/advanced",
        index_view=AdvancedIndex(name="Overview", url="/api/admin/advanced"),
    )

    for mapper in db.Model.registry.mappers:
        model = mapper.class_
        admin.add_view(
            SecureModelView(
                model, db.session, name=model.__name__, endpoint=f"adv_{model.__name__}"
            )
        )

    app.extensions['flask_admin_instance'] = admin
    return admin