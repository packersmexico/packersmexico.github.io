#!/usr/bin/env python3
"""Build one private operator push event per newly locked valid participant.

Reads canonical GitHub snapshots; never changes form submissions, picks, rankings,
or publication state. No new notification for duplicate/corrected submissions.
"""
from __future__ import annotations
import hashlib
import json
import pathlib
import re
import sys
import unicodedata


def load(path: str) -> dict:
    try:
        return json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return {}


def select_capture(data: dict, config: dict) -> tuple[int, dict]:
    data_week = int(data.get("week_number") or 0)
    cfg_week = int(config.get("week_number") or 0)
    if cfg_week > data_week and str(config.get("status") or config.get("window") or "").upper() in ("OPEN", "CLOSED"):
        return cfg_week, config
    return data_week, data.get("capture") or {}


def valid_submissions(capture: dict, expected_games: int | None = None) -> dict:
    """Valid first locked submissions only; ignore duplicate/replaced IDs."""
    valid = {}
    total = int(capture.get("total") or 9)
    expected_picks = int(capture.get("expected_picks") or 0)
    if expected_games is None and expected_picks and total and expected_picks % total == 0:
        expected_games = expected_picks // total
    duplicates = set(map(str, capture.get("duplicate_submission_ids") or []))
    for name, rec in (capture.get("locked_submissions") or {}).items():
        if not isinstance(rec, dict) or not isinstance(name, str):
            continue
        sid = str(rec.get("submission_id") or "").strip()
        picks = rec.get("picks")
        status = str(rec.get("status") or "").upper()
        if not sid.isdigit() or sid in duplicates or not status.startswith("LOCKED"):
            continue
        if not isinstance(picks, list) or len(picks) < 1 or len(picks) > 20:
            continue
        if expected_games and len(picks) != expected_games:
            continue
        valid[name.strip().upper()] = sid
    return valid


def slug(name: str) -> str:
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^A-Z0-9]+", "_", ascii_name.upper()).strip("_")[:28]


def build(before_data: dict, before_cfg: dict, after_data: dict, after_cfg: dict) -> list[dict]:
    old_week, old_capture = select_capture(before_data, before_cfg)
    week, capture = select_capture(after_data, after_cfg)
    if week < 1:
        return []
    expected_games = len(after_data.get("games") or []) if week == int(after_data.get("week_number") or 0) else None
    old_games = len(before_data.get("games") or []) if old_week == int(before_data.get("week_number") or 0) else None
    previous = valid_submissions(old_capture, old_games) if old_week == week else {}
    current = valid_submissions(capture, expected_games)
    names = {str(p.get("name") or "").upper().strip() for p in after_data.get("participants") or [] if isinstance(p, dict)}
    count, total = len(current), int(capture.get("total") or 9)
    events = []
    for name, sid in sorted(current.items()):
        if names and name not in names:
            continue
        if name in previous:
            continue  # Changed/replaced pick is not a new participant.
        identity = hashlib.sha256(sid.encode("utf-8")).hexdigest()[:12].upper()
        key = f"W{week}_PICK_RECEIVED_{slug(name)}_{identity}"
        events.append({
            "eventKey": key,
            "title": f"QUINIELA PMX · W{week} · PICK RECIBIDO",
            "body": f"{name} envió sus picks. Registro: {count}/{total} participantes.",
            "url": "https://packersmexico.github.io/quiniela-control/",
            "tag": f"pmx-w{week}-received-{slug(name).lower()}"
        })
    return events


def self_test() -> None:
    def sub(sid: str) -> dict:
        return {"submission_id": sid, "status": "LOCKED_FIRST_VALID", "picks": ["GB"] * 15}
    data = {"week_number": 6, "games": [{}] * 15, "participants": [{"name": "RODRI"}, {"name": "LUIS C."}],
            "capture": {"total": 9, "locked_submissions": {"RODRI": sub("101")}}}
    after = json.loads(json.dumps(data))
    after["capture"]["locked_submissions"]["LUIS C."] = sub("102")
    notices = build(data, {}, after, {})
    assert len(notices) == 1 and "LUIS C." in notices[0]["body"]
    assert "102" not in json.dumps(notices) and "GB" not in json.dumps(notices)
    assert build(after, {}, after, {}) == []
    after_dup = json.loads(json.dumps(after))
    after_dup["capture"]["duplicate_submission_ids"] = ["103"]
    after_dup["capture"]["locked_submissions"]["RODRI"]["submission_id"] = "103"
    assert build(after, {}, after_dup, {}) == []
    fresh = {"week_number": 7, "games": [{}] * 15, "participants": data["participants"],
             "capture": {"total": 9, "locked_submissions": {"RODRI": sub("201")}}}
    assert len(build(after, {}, fresh, {})) == 1
    cfg = {"week_number": 7, "status": "OPEN", "total": 9, "expected_picks": 135,
           "locked_submissions": {"RODRI": sub("201")}}
    assert len(build(after, {}, after, cfg)) == 1
    print("PASS: unique submission, no prior replay, duplicate ignored, new week, config-only handoff, privacy")


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        self_test()
        raise SystemExit(0)
    if len(sys.argv) != 6:
        raise SystemExit("usage: script.py before-data.json before-config.json after-data.json after-config.json output.jsonl")
    before_data, before_cfg, after_data, after_cfg = map(load, sys.argv[1:5])
    events = build(before_data, before_cfg, after_data, after_cfg)
    pathlib.Path(sys.argv[5]).write_text("".join(json.dumps(e, ensure_ascii=False) + "\n" for e in events), encoding="utf-8")
    print(json.dumps({"new_unique_submissions": len(events), "notifications": [e["eventKey"] for e in events]}))
