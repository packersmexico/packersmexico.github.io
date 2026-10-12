"""Canonical weekly/season Quiniela scoring.

Direction decision, 2026-10-12: an official NFL tie is PUSH (void for scoring).
A TIE is decided for schedule progress but awards zero correct and zero wrong
to every participant; it is excluded from the count of scoreable games.
The first valid locked submission is authoritative. Never mutate its picks.
"""

def calculate_standings(games, participants, locked_submissions, season_base_before_week):
    """Return (weekly, season, counts) without changing the supplied records."""
    decided = [
        g for g in games
        if g.get("status") == "TIE"
        or (g.get("status") == "FINAL" and g.get("winner"))
    ]
    scoreable = [
        (index, g) for index, g in enumerate(games)
        if g.get("status") == "FINAL" and g.get("winner")
    ]
    pushes = sum(g.get("status") == "TIE" for g in games)
    if len(decided) != len(scoreable) + pushes:
        raise ValueError("Inconsistent decided game and PUSH counts")
    if any(g.get("status") == "TIE" and g.get("winner") for g in games):
        raise ValueError("A TIE must not have a winner")

    weekly = []
    for participant in participants:
        name = participant["name"]
        picks = (locked_submissions.get(name) or {}).get("picks") or []
        valid = len(picks) == len(games)
        correct = (
            sum(picks[index] == g["winner"] for index, g in scoreable)
            if valid else 0
        )
        weekly.append({
            "name": name,
            "correct": correct,
            "wrong": len(scoreable) - correct if valid else 0,
            "status": "VALID" if valid else "NO_PICKS",
        })

    base = {row["name"]: row for row in season_base_before_week}
    season = []
    for week in weekly:
        previous = base.get(week["name"], {})
        season.append({
            "name": week["name"],
            "correct": int(previous.get("correct", 0)) + week["correct"],
            "wrong": int(previous.get("wrong", 0)) + week["wrong"],
            "status": week["status"],
        })
    season.sort(key=lambda row: (-row["correct"], row["wrong"], row["name"]))
    return weekly, season, {
        "decided": len(decided),
        "scored": len(scoreable),
        "pushes": pushes,
    }
