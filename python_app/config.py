import os
import pathlib
from datetime import timedelta
from dotenv import load_dotenv

# Load .env from the same directory as this file, regardless of CWD
load_dotenv(pathlib.Path(__file__).parent / ".env")


def env_bool(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "")
    if not SECRET_KEY:
        raise RuntimeError("SECRET_KEY non impostato. Imposta la variabile d'ambiente SECRET_KEY.")

    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///booking.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 300}

    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "app", "static", "uploads")
    MAX_CONTENT_LENGTH = 20 * 1024 * 1024

    MAIL_SERVER = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    MAIL_PORT = int(os.environ.get("SMTP_PORT", 587))
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get("SMTP_USER", "")
    MAIL_PASSWORD = os.environ.get("SMTP_PASS", "")
    MAIL_DEFAULT_SENDER = os.environ.get("SMTP_FROM", "noreply@example.com")

    APP_URL = os.environ.get("APP_URL", "http://localhost:5000")
    APP_NAME = os.environ.get("APP_NAME", "Gestione Corsi")

    STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
    STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY", "")
    PAYPAL_CLIENT_ID = os.environ.get("PAYPAL_CLIENT_ID", "")
    PAYPAL_CLIENT_SECRET = os.environ.get("PAYPAL_CLIENT_SECRET", "")
    PAYPAL_MODE = os.environ.get("PAYPAL_MODE", "sandbox")
    TURNSTILE_SITE_KEY = os.environ.get("TURNSTILE_SITE_KEY", "")
    TURNSTILE_SECRET_KEY = os.environ.get("TURNSTILE_SECRET_KEY", "")

    RATELIMIT_LOGIN_ATTEMPTS = 10
    RATELIMIT_LOGIN_WINDOW = 900

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = False   # overridden to True in ProductionConfig
    SESSION_COOKIE_SAMESITE = "Lax" # overridden to Strict in ProductionConfig
    PERMANENT_SESSION_LIFETIME = timedelta(hours=8)
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = 3600


class DevelopmentConfig(Config):
    DEBUG = True
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_SAMESITE = "Lax"


class ProductionConfig(Config):
    DEBUG = False
    SESSION_COOKIE_SECURE = env_bool(
        "SESSION_COOKIE_SECURE",
        os.environ.get("APP_URL", "").startswith("https://"),
    )
    SESSION_COOKIE_SAMESITE = "Strict"


class TestingConfig(Config):
    TESTING = True
    DEBUG = True
    # Usa file SQLite temporaneo condiviso (SQLite :memory: non è thread-safe tra richieste)
    SQLALCHEMY_DATABASE_URI = "sqlite:////tmp/test_booking.db"
    WTF_CSRF_ENABLED = False
    MAIL_SUPPRESS_SEND = True
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_SAMESITE = "Lax"
    RATELIMIT_ENABLED = False


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}
