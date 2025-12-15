"""
File: admin_advanced_routes.py
Type: py
Summary: Flask routes for admin advanced routes functionality.
"""

from flask import request, redirect
from flask_admin import Admin, AdminIndexView, expose
from flask_admin.contrib.sqla import ModelView
from flask_admin.theme import Bootstrap4Theme  # NEW: Import the theme
from application import db


class SecureModelView(ModelView):
    """Restrict access to localhost only"""
    can_create = True
    can_edit = True
    can_delete = True
    can_view_details = True
    column_display_pk = True

    def is_accessible(self):
        # Note: In production, consider using current_user.is_admin instead of IP checks
        return request.remote_addr == '127.0.0.1'

    def inaccessible_callback(self, name, **kwargs):
        return redirect("/admin/dashboard")


class AdvancedIndex(AdminIndexView):
    """Custom landing page for advanced admin - renders in admin_base.html"""
    @expose('/')
    def index(self):
        model_views = [v for v in self.admin._views if isinstance(v, ModelView)]
        return self.render('admin/advanced_panel.html', views=model_views)


def init_admin(app):
    """Initialize the advanced admin interface"""
    admin = Admin(
        app,
        name="Advanced Admin",
        index_view=AdvancedIndex(url='/admin/advanced', endpoint='admin_advanced'),
        theme=Bootstrap4Theme(),  # NEW: Replaces template_mode='bootstrap4'
        base_template='admin/admin_base.html',
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

    return admin