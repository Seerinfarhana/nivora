"""Live, external data for the Knowledge centre and Recommendations pages."""
import json
import time
import xml.etree.ElementTree as ET
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends

from ..models import User
from ..security import current_user

router = APIRouter()
FEEDS = {
    "press": "https://rbi.org.in/pressreleases_rss.xml",
    "notifications": "https://rbi.org.in/notifications_rss.xml",
    "publications": "https://www.rbi.org.in/Publication_rss.xml",
}
_cache: dict[str, tuple[float, list]] = {}
TTL = 30 * 60


def parse_feed(xml_text: str, limit: int = 12) -> list[dict]:
    items = []
    for it in ET.fromstring(xml_text).iter("item"):
        items.append({"title": (it.findtext("title") or "").strip(), "link": (it.findtext("link") or "").strip(),
                      "date": (it.findtext("pubDate") or "").strip()})
        if len(items) >= limit:
            break
    return items


def fetch_feed(kind: str) -> dict:
    now = time.time()
    if kind in _cache and now - _cache[kind][0] < TTL:
        return {"items": _cache[kind][1], "live": True, "source": FEEDS[kind]}
    try:
        r = httpx.get(FEEDS[kind], timeout=10, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0 NIVORA"})
        r.raise_for_status()
        items = parse_feed(r.text)
        _cache[kind] = (now, items)
        return {"items": items, "live": True, "source": FEEDS[kind]}
    except Exception:
        stale = _cache.get(kind)
        return {"items": stale[1] if stale else [], "live": False, "source": FEEDS[kind]}


@router.get("/rbi/{kind}")
def rbi(kind: str, _: User = Depends(current_user)):
    return fetch_feed(kind if kind in FEEDS else "press")


@router.get("/loans")
def loans(_: User = Depends(current_user)):
    """Loan products copied from official bank pages into app/data/loans.json (see loans.example.json)."""
    path = Path(__file__).resolve().parent.parent / "data" / "loans.json"
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
