"""
File: admin_advanced_routes.py
Type: py
Summary: Flask routes for admin advanced routes functionality.
"""

from flask import request, redirect
from flask_admin import Admin, AdminIndexView, expose
from flask_admin.contrib.sqla import ModelView

from application import db


class SecureModelView(ModelView):
    """Restrict access to localhost only"""

    can_create = True
    can_edit = True
    can_delete = True
    can_view_details = True
    column_display_pk = True

    def is_accessible(self):
        return request.remote_addr == "127.0.0.1"

    def inaccessible_callback(self, name, **kwargs):
        return redirect("/admin/dashboard")


class AdvancedIndex(AdminIndexView):
    """Custom landing page for advanced admin"""

    @expose("/")
    def index(self):
        model_views = [v for v in self.admin._views if isinstance(v, ModelView)]
        return self.render("admin/advanced_panel.html", views=model_views)


def init_admin(app):
    """Initialize the advanced admin interface"""

    admin = Admin(
        app,
        name="Advanced Admin",
        index_view=AdvancedIndex(url="/admin/advanced", endpoint="admin_advanced"),
    )

    for mapper in db.Model.registry.mappers:
        model = mapper.class_
        admin.add_view(
            SecureModelView(
                model, db.session, name=model.__name__, endpoint=f"adv_{model.__name__}"
            )
        )

    return admin
