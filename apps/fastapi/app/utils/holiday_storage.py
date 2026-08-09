"""Encode/decode holiday audience + class scope in the `holidays.description` text column.

Avoids requiring DB migrations for `audience_type` / `scope_json` columns. Legacy rows
(with plain-text descriptions) are treated as having no structured scope.
"""

from __future__ import annotations

import json

_META_HEADER = "HOLIDAY_META_V1"

# Legacy SQL Server CHECK on dbo.holidays.holiday_type often allows only these three values.
_ALLOWED_DB_HOLIDAY_TYPES = frozenset({"PUBLIC_HOLIDAY", "ACADEMIC_BREAK", "NON_TEACHING_DAY"})


def coerce_holiday_type_for_db(user_input: str) -> tuple[str, str | None]:
    """Map UI free text to (DB column value, optional holiday_type_label for HOLIDAY_META_V1).

    Custom labels are stored in description JSON so the CHECK constraint can stay in place.
    """
    raw = (user_input or "").strip()
    if not raw:
        return "NON_TEACHING_DAY", None
    simple = raw.lower()
    if simple == "holiday":
        return "PUBLIC_HOLIDAY", None
    if simple == "event":
        return "NON_TEACHING_DAY", "Event"
    if simple == "exam":
        return "NON_TEACHING_DAY", "Exam"
    u = raw.upper()
    if u in _ALLOWED_DB_HOLIDAY_TYPES:
        return u, None
    return "NON_TEACHING_DAY", raw[:50]


def unpack_holiday_description(
    raw: str | None,
) -> tuple[str | None, list[int], list[int], str, str | None, int | None]:
    """Returns (audience_type, class_ids, division_ids, user_visible_description, holiday_type_label, created_by_user_id)."""
    if not raw or not str(raw).strip():
        return None, [], [], "", None, None
    s = str(raw).strip()
    if not s.startswith(_META_HEADER):
        return None, [], [], s, None, None
    after_header = s[len(_META_HEADER) :].lstrip("\n")
    parts = after_header.split("\n\n", 1)
    json_line = parts[0].strip()
    user = parts[1].strip() if len(parts) > 1 else ""
    try:
        data = json.loads(json_line)
        if not isinstance(data, dict):
            return None, [], [], s, None, None
        aud = data.get("audience_type")
        if aud is not None:
            aud = str(aud).strip().upper() or None
        c = [int(x) for x in (data.get("class_ids") or []) if x is not None]
        d = [int(x) for x in (data.get("division_ids") or []) if x is not None]
        raw_label = data.get("holiday_type_label")
        label: str | None = None
        if raw_label is not None:
            label = str(raw_label).strip() or None
            if label is not None and len(label) > 50:
                label = label[:50]
        creator_raw = data.get("created_by_user_id")
        creator_id: int | None = None
        if creator_raw is not None:
            try:
                creator_id = int(creator_raw)
            except (TypeError, ValueError):
                creator_id = None
        return aud, c, d, user, label, creator_id
    except (json.JSONDecodeError, TypeError, ValueError):
        return None, [], [], s, None, None


def pack_holiday_description(
    audience_type: str,
    class_ids: list[int],
    division_ids: list[int],
    user_description: str | None,
    *,
    holiday_type_label: str | None = None,
    created_by_user_id: int | None = None,
) -> str | None:
    meta_obj = {
        "audience_type": audience_type,
        "class_ids": class_ids,
        "division_ids": division_ids,
    }
    if holiday_type_label and str(holiday_type_label).strip():
        meta_obj["holiday_type_label"] = str(holiday_type_label).strip()[:50]
    if created_by_user_id is not None:
        meta_obj["created_by_user_id"] = int(created_by_user_id)
    body = f"{_META_HEADER}\n{json.dumps(meta_obj, separators=(',', ':'))}"
    user = (user_description or "").strip()
    if not user:
        return body
    return f"{body}\n\n{user}"
