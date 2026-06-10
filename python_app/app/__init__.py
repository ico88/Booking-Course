import os
import logging
from flask import Flask, request
from flask_login import LoginManager
from flask_migrate import Migrate
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from .models import db, Utente
from config import config

login_manager = LoginManager()
migrate = Migrate()
csrf = CSRFProtect()
limiter = Limiter(key_func=get_remote_address, default_limits=[], storage_uri="memory://")


def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "default")

    app = Flask(__name__, template_folder="templates", static_folder="static")
    app.config.from_object(config[config_name])

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    if not app.debug:
        logging.basicConfig(level=logging.INFO)

    db.init_app(app)
    migrate.init_app(app, db)
    csrf.init_app(app)
    limiter.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"
    login_manager.login_message = "Accedi per continuare."
    login_manager.login_message_category = "info"

    @login_manager.user_loader
    def load_user(user_id):
        return Utente.query.get(user_id)

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

    # API uses JSON + login_required, exempt from CSRF cookie check
    csrf.exempt(api_bp)

    @app.after_request
    def set_security_headers(response):
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        if request.is_secure or not app.debug:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' cdn.tailwindcss.com js.stripe.com "
            "www.paypal.com www.paypalobjects.com challenges.cloudflare.com; "
            "style-src 'self' 'unsafe-inline' fonts.googleapis.com cdn.tailwindcss.com; "
            "font-src 'self' fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "frame-src js.stripe.com www.paypal.com challenges.cloudflare.com; "
            "connect-src 'self' api.stripe.com www.paypal.com "
            "api-m.paypal.com api-m.sandbox.paypal.com challenges.cloudflare.com;"
        )
        response.headers["Content-Security-Policy"] = csp
        return response

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
            color_scheme = Impostazione.get("color_scheme") or "blu"
            try:
                corsi_pubblicati = Corso.query.filter_by(pubblicato=True).order_by(Corso.data_inizio.asc()).all()
            except Exception:
                corsi_pubblicati = []
        except Exception:
            app_name = app.config.get("APP_NAME", "Gestione Corsi")
            logo_url = None
            color_scheme = "blu"
            corsi_pubblicati = []
        turnstile_site_key = (
            Impostazione.get("turnstile_site_key") or app.config.get("TURNSTILE_SITE_KEY", "")
        ) if app_name else app.config.get("TURNSTILE_SITE_KEY", "")
        return {
            "app_name": app_name,
            "logo_url": logo_url,
            "color_scheme": color_scheme,
            "corsi_pubblicati": corsi_pubblicati,
            "turnstile_site_key": turnstile_site_key,
        }

    return app
