"""Local A-share market database powered by Python + DuckDB."""

from marketdb._version import __version__
from marketdb.sdk import MarketDB

__all__ = ["MarketDB", "__version__"]
