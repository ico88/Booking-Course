import hmac
import hashlib
import os
import re
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse

import bleach
from markupsafe import escape

_ALLOWED_TAGS = [
    "p", "br", "strong", "em", "u", "s", "ul", "ol", "li",
    "h1", "h2", "h3", "h4", "blockquote", "a", "img",
    "table", "thead", "tbody", "tr", "th", "td",
]
_ALLOWED_ATTRS = {
    "a": ["href", "title", "target"],
    "img": ["src", "alt", "width", "height"],
    "td": ["colspan", "rowspan"],
    "th": ["colspan", "rowspan"],
}


def sanitize_html(html: str) -> str:
    if not html:
        return ""
    return bleach.clean(html, tags=_ALLOWED_TAGS, attributes=_ALLOWED_ATTRS, strip=True)


def escape_html(value: str) -> str:
    return str(escape(value or ""))


def is_safe_redirect_url(url: str, host: str) -> bool:
    if not url:
        return False
    parsed = urlparse(url)
    if not parsed.scheme and not parsed.netloc:
        return True
    return parsed.netloc == host


def format_currency(value) -> str:
    try:
        return f"€ {float(value):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except (TypeError, ValueError):
        return "€ 0,00"


_MESI_IT = ["", "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
            "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]


def format_date(dt: Optional[datetime]) -> str:
    if not dt:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return f"{dt.day} {_MESI_IT[dt.month]} {dt.year}"


def format_datetime(dt: Optional[datetime]) -> str:
    if not dt:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return f"{dt.day} {_MESI_IT[dt.month]} {dt.year}, {dt.strftime('%H:%M')}"


def format_date_short(dt: Optional[datetime]) -> str:
    if not dt:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime("%d/%m/%Y")


def generate_unsubscribe_token(email: str, secret: str) -> str:
    return hmac.new(secret.encode(), email.encode(), hashlib.sha256).hexdigest()


def verify_unsubscribe_token(email: str, token: str, secret: str) -> bool:
    if not token:
        return False
    expected = generate_unsubscribe_token(email, secret)
    return hmac.compare_digest(expected, token)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def verify_hashed_token(plain: str, hashed: str) -> bool:
    if not plain or not hashed:
        return False
    return hmac.compare_digest(hashlib.sha256(plain.encode()).hexdigest(), hashed)


def allowed_file(filename: str, extensions: set) -> bool:
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    if filename.count(".") > 1:
        middle = filename.rsplit(".", 2)[1].lower()
        dangerous = {"php", "py", "sh", "rb", "pl", "asp", "aspx", "js", "exe"}
        if middle in dangerous:
            return False
    return ext in extensions


def safe_filename(filename: str) -> str:
    import unicodedata
    filename = unicodedata.normalize("NFKD", filename).encode("ascii", "ignore").decode()
    filename = re.sub(r"[^\w\s\-.]", "", filename).strip()
    filename = re.sub(r"\s+", "_", filename)
    return filename or "file"


def validate_email_address(email: str) -> Optional[str]:
    try:
        from email_validator import validate_email, EmailNotValidError
        return validate_email(email).email
    except Exception:
        return None


def validate_int_range(value, min_val: int, max_val: int, default: int = None) -> Optional[int]:
    try:
        v = int(value)
        if min_val <= v <= max_val:
            return v
        return None
    except (TypeError, ValueError):
        return default
