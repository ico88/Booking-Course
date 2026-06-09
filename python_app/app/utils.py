import hmac
import hashlib
import os
from datetime import datetime, timezone
from typing import Optional


def format_currency(value) -> str:
    try:
        return f"€ {float(value):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except (TypeError, ValueError):
        return "€ 0,00"


def format_date(dt: Optional[datetime]) -> str:
    if not dt:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime("%-d %B %Y").lower().capitalize()


def format_datetime(dt: Optional[datetime]) -> str:
    if not dt:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime("%-d %B %Y, %H:%M").lower().capitalize()


def format_date_short(dt: Optional[datetime]) -> str:
    if not dt:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime("%d/%m/%Y")


def generate_unsubscribe_token(email: str, secret: str) -> str:
    return hmac.new(secret.encode(), email.encode(), hashlib.sha256).hexdigest()


def verify_unsubscribe_token(email: str, token: str, secret: str) -> bool:
    expected = generate_unsubscribe_token(email, secret)
    return hmac.compare_digest(expected, token)


def allowed_file(filename: str, extensions: set) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in extensions


def safe_filename(filename: str) -> str:
    import unicodedata
    import re
    filename = unicodedata.normalize("NFKD", filename).encode("ascii", "ignore").decode()
    filename = re.sub(r"[^\w\s\-.]", "", filename).strip()
    filename = re.sub(r"\s+", "_", filename)
    return filename or "file"
