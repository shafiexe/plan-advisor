import base64
import json
import os
import re

import anthropic
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

router = APIRouter()

_PROMPT = """Extract all information from this passport or travel document image.
Return ONLY a valid JSON object with these exact fields (null if not visible):

{
  "surname": "family name as printed",
  "given_names": "given and middle names as printed",
  "passport_number": "document/passport number",
  "nationality": "nationality as written",
  "nationality_code": "3-letter ISO code e.g. IND, ARE, GBR, USA",
  "date_of_birth": "YYYY-MM-DD",
  "gender": "M or F",
  "expiry_date": "YYYY-MM-DD",
  "issue_date": "YYYY-MM-DD or null",
  "issuing_country": "full country name",
  "country_code": "3-letter ISO code of issuing country",
  "place_of_birth": "city and/or country or null"
}

No markdown, no explanation. Only the JSON object."""


_ACCEPTED_IMAGES = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"}
_ACCEPTED_PDF    = {"application/pdf"}


def _build_content(b64: str, media_type: str) -> list:
    """Return the Claude content block for an image or a PDF."""
    if media_type == "application/pdf":
        return [
            {
                "type": "document",
                "source": {"type": "base64", "media_type": "application/pdf", "data": b64},
            },
            {"type": "text", "text": _PROMPT},
        ]
    return [
        {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}},
        {"type": "text",  "text": _PROMPT},
    ]


@router.post("/api/passport/scan")
async def scan_passport(file: UploadFile = File(...)):
    ctype = (file.content_type or "").lower().split(";")[0].strip()

    if ctype not in _ACCEPTED_IMAGES and ctype not in _ACCEPTED_PDF:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Upload a passport photo (JPEG/PNG/WebP) or a PDF scan.",
        )

    raw = await file.read()
    max_size = 32 * 1024 * 1024 if ctype == "application/pdf" else 10 * 1024 * 1024
    if len(raw) > max_size:
        label = "32 MB" if ctype == "application/pdf" else "10 MB"
        raise HTTPException(status_code=400, detail=f"File too large — max {label}")

    # Normalise JPEG variant
    if ctype == "image/jpg":
        ctype = "image/jpeg"

    b64     = base64.standard_b64encode(raw).decode()
    api_key = os.getenv("ANTHROPIC_API_KEY")
    model   = os.getenv("CLAUDE_MODEL", "claude-haiku-4-5-20251001")

    client = anthropic.AsyncAnthropic(api_key=api_key)
    try:
        resp = await client.messages.create(
            model=model,
            max_tokens=512,
            messages=[{"role": "user", "content": _build_content(b64, ctype)}],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Scan failed: {exc}")

    text = resp.content[0].text.strip()

    # Strip markdown code fences if Claude added them
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    try:
        data = json.loads(text.strip())
        return {"success": True, "data": data}
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            try:
                return {"success": True, "data": json.loads(m.group())}
            except Exception:
                pass
        raise HTTPException(status_code=422, detail="Could not parse passport data — try a clearer photo")


# ── Text extraction ────────────────────────────────────────────────────────────

_TEXT_PROMPT = """Extract passenger / travel document details from the text below.
The text may be an email, ticket, note, booking confirmation, or free-form entry.
Return ONLY a valid JSON object with these exact fields (null if not present):

{
  "surname": "family / last name",
  "given_names": "first and middle names",
  "passport_number": "document or passport number",
  "nationality": "nationality as written",
  "nationality_code": "3-letter ISO code or null",
  "date_of_birth": "YYYY-MM-DD or null",
  "gender": "M or F or null",
  "expiry_date": "YYYY-MM-DD or null",
  "issue_date": "YYYY-MM-DD or null",
  "issuing_country": "full country name or null",
  "country_code": "3-letter ISO code or null",
  "place_of_birth": "city/country or null"
}

Convert any date formats you find (DD/MM/YYYY, Month DD YYYY, etc.) to YYYY-MM-DD.
No markdown, no explanation. Only the JSON object.

TEXT:
"""


class TextBody(BaseModel):
    text: str


@router.post("/api/passport/parse-text")
async def parse_text(body: TextBody):
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="text must not be empty")
    if len(body.text) > 4000:
        raise HTTPException(status_code=400, detail="Text too long — max 4000 characters")

    api_key = os.getenv("ANTHROPIC_API_KEY")
    model   = os.getenv("CLAUDE_MODEL", "claude-haiku-4-5-20251001")
    client  = anthropic.AsyncAnthropic(api_key=api_key)

    try:
        resp = await client.messages.create(
            model=model,
            max_tokens=512,
            messages=[{"role": "user", "content": _TEXT_PROMPT + body.text}],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {exc}")

    text = resp.content[0].text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    try:
        return {"success": True, "data": json.loads(text.strip())}
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            try:
                return {"success": True, "data": json.loads(m.group())}
            except Exception:
                pass
        raise HTTPException(status_code=422, detail="Could not extract passenger details from the text")
