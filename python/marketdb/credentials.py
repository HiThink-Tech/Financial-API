from __future__ import annotations

import os
import sys
from collections.abc import Mapping
from pathlib import Path

CANONICAL_API_KEY_ENV = "HITHINK_FINANCE_API_KEY"
LEGACY_API_KEY_ENVS = ("FUYAO_TOKEN", "API_KEY")


class CredentialFileError(RuntimeError):
    """Raised when the user credential file exists but cannot be read safely."""


def credential_file_path(
    *,
    platform: str | None = None,
    env: Mapping[str, str] | None = None,
    home: Path | None = None,
) -> Path:
    resolved_platform = platform or sys.platform
    resolved_env = env if env is not None else os.environ
    resolved_home = home or Path.home()

    if resolved_platform == "win32":
        config_root = resolved_env.get("APPDATA", "").strip()
        base = Path(config_root) if config_root else resolved_home / "AppData" / "Roaming"
    elif resolved_platform == "darwin":
        base = resolved_home / "Library" / "Application Support"
    else:
        config_root = resolved_env.get("XDG_CONFIG_HOME", "").strip()
        base = Path(config_root).expanduser() if config_root else resolved_home / ".config"
    return base / "hithink-finance" / "credentials.env"


def _non_blank(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _read_credential_file(path: Path) -> str | None:
    if not path.exists():
        return None
    try:
        content = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise CredentialFileError(
            f"Unable to read hithink finance credential file: {path}"
        ) from exc

    for line_number, raw_line in enumerate(content.splitlines(), start=1):
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        if name.strip() != CANONICAL_API_KEY_ENV:
            continue
        normalized = value.strip()
        if "'" in normalized or '"' in normalized:
            raise CredentialFileError(
                f"Invalid hithink finance credential file at {path}:{line_number}: "
                f"{CANONICAL_API_KEY_ENV} must not be quoted."
            )
        return _non_blank(normalized)
    return None


def resolve_api_key(
    *,
    env: Mapping[str, str] | None = None,
    credential_path: Path | None = None,
) -> str | None:
    resolved_env = env if env is not None else os.environ

    canonical = _non_blank(resolved_env.get(CANONICAL_API_KEY_ENV))
    if canonical is not None:
        return canonical

    stored = _read_credential_file(
        credential_path
        if credential_path is not None
        else credential_file_path(env=resolved_env)
    )
    if stored is not None:
        return stored

    for name in LEGACY_API_KEY_ENVS:
        legacy = _non_blank(resolved_env.get(name))
        if legacy is not None:
            return legacy
    return None
