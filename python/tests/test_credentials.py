from __future__ import annotations

from pathlib import Path

import pytest

from marketdb.credentials import (
    CredentialFileError,
    credential_file_path,
    resolve_api_key,
)
from marketdb.config import Settings


def test_unified_environment_wins_over_file_and_legacy(tmp_path: Path) -> None:
    credential = tmp_path / "credentials.env"
    credential.write_text(
        "HITHINK_FINANCE_API_KEY=file-key\n",
        encoding="utf-8",
    )

    assert resolve_api_key(
        env={
            "HITHINK_FINANCE_API_KEY": "global-key",
            "FUYAO_TOKEN": "legacy-key",
            "API_KEY": "older-key",
        },
        credential_path=credential,
    ) == "global-key"


def test_user_credential_file_wins_over_legacy_environment(tmp_path: Path) -> None:
    credential = tmp_path / "credentials.env"
    credential.write_text(
        "# managed by hithink finance\nHITHINK_FINANCE_API_KEY=file-key\n",
        encoding="utf-8",
    )

    assert resolve_api_key(
        env={"FUYAO_TOKEN": "legacy-key", "API_KEY": "older-key"},
        credential_path=credential,
    ) == "file-key"


def test_legacy_environment_order_remains_compatible(tmp_path: Path) -> None:
    missing = tmp_path / "missing.env"

    assert resolve_api_key(
        env={"FUYAO_TOKEN": "legacy-key", "API_KEY": "older-key"},
        credential_path=missing,
    ) == "legacy-key"
    assert resolve_api_key(
        env={"API_KEY": "older-key"},
        credential_path=missing,
    ) == "older-key"


def test_blank_values_and_missing_files_are_treated_as_unconfigured(tmp_path: Path) -> None:
    assert (
        resolve_api_key(
            env={
                "HITHINK_FINANCE_API_KEY": "   ",
                "FUYAO_TOKEN": "",
                "API_KEY": "\t",
            },
            credential_path=tmp_path / "missing.env",
        )
        is None
    )


@pytest.mark.parametrize(
    ("platform", "env", "expected"),
    [
        (
            "win32",
            {"APPDATA": "C:/Users/test/AppData/Roaming"},
            Path("C:/Users/test/AppData/Roaming/hithink-finance/credentials.env"),
        ),
        (
            "darwin",
            {},
            Path("/Users/test/Library/Application Support/hithink-finance/credentials.env"),
        ),
        (
            "linux",
            {"XDG_CONFIG_HOME": "/config"},
            Path("/config/hithink-finance/credentials.env"),
        ),
    ],
)
def test_platform_credential_paths(
    platform: str,
    env: dict[str, str],
    expected: Path,
) -> None:
    home = Path("C:/Users/test") if platform == "win32" else Path("/Users/test")

    assert credential_file_path(platform=platform, env=env, home=home) == expected


def test_credential_file_read_errors_are_actionable(tmp_path: Path) -> None:
    directory = tmp_path / "credentials.env"
    directory.mkdir()

    with pytest.raises(CredentialFileError, match="credentials.env"):
        resolve_api_key(env={}, credential_path=directory)


@pytest.mark.parametrize(
    "stored_value",
    ['"quoted-key"', "'quoted-key'", '"unterminated', "unterminated'"],
)
def test_credential_file_rejects_quoted_values(
    tmp_path: Path,
    stored_value: str,
) -> None:
    credential = tmp_path / "credentials.env"
    credential.write_text(
        f"HITHINK_FINANCE_API_KEY={stored_value}\n",
        encoding="utf-8",
    )

    with pytest.raises(CredentialFileError, match="must not be quoted"):
        resolve_api_key(env={}, credential_path=credential)


def test_marketdb_settings_use_the_unified_environment(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("HITHINK_FINANCE_API_KEY", "global-key")
    monkeypatch.delenv("FUYAO_TOKEN", raising=False)
    monkeypatch.delenv("API_KEY", raising=False)

    assert Settings.load(db_path=tmp_path / "market.duckdb").api_key == "global-key"
