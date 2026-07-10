from __future__ import annotations

import sys

from rich.console import Console
from rich.panel import Panel


ADMIN_URL = "https://fuyao.aicubes.cn/admin/"


class MissingApiKeyError(RuntimeError):
    """Raised when API_KEY is required but absent."""


def _panel_body(headline: str) -> str:
    return (
        f"{headline}\n\n"
        f"1) 到 [bold]{ADMIN_URL}[/bold] 创建并复制 API Key。\n"
        "2) 写入项目根目录的 [bold].env[/bold]（参考 .env.example）：\n"
        "       API_KEY=<your-key>\n"
        "   或临时导出：\n"
        "       export API_KEY=<your-key>   # macOS / Linux\n"
        "       setx API_KEY <your-key>     # Windows PowerShell\n"
        "3) 确认完成后重新运行命令。"
    )


def require_api_key(api_key: str | None, *, console: Console | None = None) -> str:
    """Return api_key when present, otherwise print a guidance panel and exit.

    The contract is intentionally strict: a missing key short-circuits before any
    HTTP request is made, so users don't burn quota on a doomed call.
    """
    if api_key:
        return api_key
    out = console or Console(stderr=True)
    out.print(
        Panel(
            _panel_body("未检测到 [bold]API_KEY[/bold] 环境变量。"),
            title="[bold red]需要 API Key[/bold red]",
            border_style="red",
        )
    )
    raise MissingApiKeyError("API_KEY is not set")


def render_auth_failure(message: str, *, console: Console | None = None) -> None:
    """Reuse the same guidance text when the server rejects the key (2002/2004)."""
    out = console or Console(stderr=True)
    headline = f"API 鉴权失败：{message}。Key 可能未配置、已过期或未授权对应 capability。"
    out.print(
        Panel(
            _panel_body(headline),
            title="[bold red]API 鉴权失败[/bold red]",
            border_style="red",
        )
    )


def exit_with_code(code: int = 2) -> "NoReturn":  # type: ignore[name-defined]
    sys.exit(code)
