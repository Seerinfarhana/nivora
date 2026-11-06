"""Thin client for the Claude Messages API (plain HTTPS, no extra SDK to install)."""
import httpx

from .config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL

API_URL = "https://api.anthropic.com/v1/messages"


class LLMError(Exception):
    pass


def available() -> bool:
    return bool(ANTHROPIC_API_KEY)


def create(system: str, messages: list, tools: list, max_tokens: int = 900) -> dict:
    try:
        r = httpx.post(API_URL, timeout=60, headers={"x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01",
                                                      "content-type": "application/json"},
                       json={"model": ANTHROPIC_MODEL, "max_tokens": max_tokens, "system": system, "messages": messages, "tools": tools})
    except httpx.HTTPError as e:
        raise LLMError(f"Could not reach the AI service: {e}")
    if r.status_code != 200:
        raise LLMError(f"AI service returned {r.status_code}: {r.text[:300]}")
    return r.json()
