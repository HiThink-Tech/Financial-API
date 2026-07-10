"""Local A-share market database powered by Python + DuckDB."""

from typing import TYPE_CHECKING

from marketdb._version import __version__

if TYPE_CHECKING:
    from marketdb.sdk import MarketDB

__all__ = ["MarketDB", "__version__"]


def __getattr__(name: str):
    if name == "MarketDB":
        from marketdb.sdk import MarketDB

        return MarketDB
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
