import os
from flask import Flask
from flask_login import LoginManager
from flask_migrate import Migrate
from .models import db, Utente
from config import config


login_manager = LoginManager()
migrate = Migrate()


def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "default")

    app = Flask(__name__, template_folder="templates", static_folder="static")
    app.config.from_object(config[config_name])

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"
    login_manager.login_message = "Accedi per continuare."
    login_manager.login_message_category = "info"

    @login_manager.user_loader
    def load_user(user_id):
        return Utente.query.get(user_id)

    # Blueprints
    from .auth.routes import auth_bp
    from .public.routes import public_bp
    from .dashboard.routes import dashboard_bp
    from .admin.routes import admin_bp
    from .api.routes import api_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(public_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(api_bp)

    # Jinja globals
    from .utils import format_currency, format_date, format_datetime
    app.jinja_env.globals["format_currency"] = format_currency
    app.jinja_env.globals["format_date"] = format_date
    app.jinja_env.globals["format_datetime"] = format_datetime

    @app.context_processor
    def inject_globals():
        from .models import Impostazione, Corso
        try:
            app_name = Impostazione.get("app_name") or app.config.get("APP_NAME", "Gestione Corsi")
            logo_url = Impostazione.get("logo_url")
            # For marketing modal
            try:
                corsi_pubblicati = Corso.query.filter_by(pubblicato=True).order_by(Corso.data_inizio.asc()).all()
            except Exception:
                corsi_pubblicati = []
        except Exception:
            app_name = app.config.get("APP_NAME", "Gestione Corsi")
            logo_url = None
            corsi_pubblicati = []
        return {"app_name": app_name, "logo_url": logo_url, "corsi_pubblicati": corsi_pubblicati}

    return app
