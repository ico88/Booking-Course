import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "cambia-questa-chiave-in-produzione")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/booking_corsi",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 300}

    # Upload
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "app", "static", "uploads")
    MAX_CONTENT_LENGTH = 20 * 1024 * 1024  # 20 MB

    # Mail (override via DB settings)
    MAIL_SERVER = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    MAIL_PORT = int(os.environ.get("SMTP_PORT", 587))
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get("SMTP_USER", "")
    MAIL_PASSWORD = os.environ.get("SMTP_PASS", "")
    MAIL_DEFAULT_SENDER = os.environ.get("SMTP_FROM", "noreply@example.com")

    APP_URL = os.environ.get("APP_URL", "http://localhost:5000")
    APP_NAME = os.environ.get("APP_NAME", "Gestione Corsi")

    # Stripe
    STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
    STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY", "")

    # PayPal
    PAYPAL_CLIENT_ID = os.environ.get("PAYPAL_CLIENT_ID", "")
    PAYPAL_CLIENT_SECRET = os.environ.get("PAYPAL_CLIENT_SECRET", "")
    PAYPAL_MODE = os.environ.get("PAYPAL_MODE", "sandbox")

    # Turnstile CAPTCHA
    TURNSTILE_SITE_KEY = os.environ.get("TURNSTILE_SITE_KEY", "")
    TURNSTILE_SECRET_KEY = os.environ.get("TURNSTILE_SECRET_KEY", "")

    # Login rate limiting
    RATELIMIT_LOGIN_ATTEMPTS = 10
    RATELIMIT_LOGIN_WINDOW = 900  # 15 minuti


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
