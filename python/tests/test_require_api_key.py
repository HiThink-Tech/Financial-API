from __future__ import annotations

import io

import pytest
from rich.console import Console

from marketdb.auth import (
    ADMIN_URL,
    MissingApiKeyError,
    render_auth_failure,
    require_api_key,
)


def _captured_console() -> tuple[Console, io.StringIO]:
    buf = io.StringIO()
    return Console(file=buf, force_terminal=False, width=120), buf


def test_require_api_key_returns_when_present() -> None:
    console, buf = _captured_console()
    assert require_api_key("abc", console=console) == "abc"
    assert buf.getvalue() == ""


def test_require_api_key_raises_when_missing() -> None:
    console, buf = _captured_console()
    with pytest.raises(MissingApiKeyError):
        require_api_key(None, console=console)
    out = buf.getvalue()
    assert ADMIN_URL in out
    assert "API_KEY" in out


def test_render_auth_failure_includes_admin_url() -> None:
    console, buf = _captured_console()
    render_auth_failure("unauthorized", console=console)
    out = buf.getvalue()
    assert ADMIN_URL in out
    assert "unauthorized" in out
