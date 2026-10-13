"""Regression tests for Direction-approved Quiniela PUSH scoring (2026-10-12)."""
import copy
import json
import pathlib
import unittest
from quiniela_scoring import calculate_standings

ROOT = pathlib.Path(__file__).resolve().parents[1]


class TiePushTests(unittest.TestCase):
    def test_tie_is_decided_not_scored(self):
        games = [
            {"id": "G01", "status": "FINAL", "winner": "GB"},
            {"id": "G02", "status": "TIE", "winner": None},
            {"id": "G03", "status": "SCHEDULED", "winner": None},
        ]
        participants = [{"name": "P1"}, {"name": "P2"}]
        locked = {
            "P1": {"picks": ["GB", "NYG", "DAL"]},
            "P2": {"picks": ["CHI", "WAS", "DAL"]},
        }
        original = copy.deepcopy(locked)
        weekly, season, counts = calculate_standings(
            games, participants, locked,
            [{"name": "P1", "correct": 4, "wrong": 2}],
        )
        self.assertEqual(counts, {"decided": 2, "scored": 1, "pushes": 1})
        self.assertEqual((weekly[0]["correct"], weekly[0]["wrong"]), (1, 0))
        self.assertEqual((weekly[1]["correct"], weekly[1]["wrong"]), (0, 1))
        self.assertEqual((season[0]["correct"], season[0]["wrong"]), (5, 2))
        self.assertEqual(locked, original)

    def test_tie_cannot_have_winner(self):
        with self.assertRaises(ValueError):
            calculate_standings(
                [{"id": "G01", "status": "TIE", "winner": "NYG"}],
                [{"name": "P"}], {"P": {"picks": ["NYG"]}}, [],
            )

    def test_week_5_snapshot_locked_picks_and_rankings(self):
        data = json.loads((ROOT / "quiniela-control/data.json").read_text(encoding="utf8"))
        archived = json.loads(
            (ROOT / "quiniela-control/weeks/week-05.json").read_text(encoding="utf8")
        )
        self.assertEqual(data["week_number"], 5)
        self.assertEqual(len(data["games"]), 15)
        self.assertEqual(data["games"][8]["id"], "G09")
        self.assertEqual(data["games"][8]["status"], "TIE")
        self.assertIsNone(data["games"][8]["winner"])
        self.assertEqual(data["games"][8]["score"], "NYG 27–27 WAS")
        self.assertEqual(data["results"]["final"], 15)
        self.assertEqual(data["results"]["scored"], 14)
        self.assertEqual(data["results"]["ties"], 1)
        self.assertEqual(data["results"]["pushes"], 1)
        self.assertEqual(data["results"]["total"], 15)
        self.assertEqual(data["results"]["status"], "FINAL")
        self.assertEqual(data["games"][14]["id"], "G15")
        self.assertEqual(data["games"][14]["status"], "FINAL")
        self.assertEqual(data["games"][14]["winner"], "BUF")
        self.assertEqual(data["games"][14]["score"], "BUF 37–34 LAR")
        self.assertEqual(data["capture"]["expected_picks"], 135)
        self.assertEqual(data["capture"]["received_picks"], 135)
        self.assertEqual(len(data["capture"]["locked_submissions"]), 9)
        for submission in data["capture"]["locked_submissions"].values():
            self.assertEqual(len(submission["picks"]), 15)
        original = copy.deepcopy(data["capture"]["locked_submissions"])
        weekly, season, counts = calculate_standings(
            data["games"], data["participants"], original,
            data["season_base_before_week"],
        )
        self.assertEqual(counts, {"decided": 15, "scored": 14, "pushes": 1})
        self.assertEqual(weekly, data["weekly_standings"])
        self.assertEqual(season, data["season_standings"])
        self.assertEqual(weekly, archived["weekly_standings"])
        self.assertEqual(season, archived["season_standings"])
        self.assertEqual({p["name"] for p in weekly if p["correct"] == 11}, {"ARI", "ALEX", "IBRACHO"})
        self.assertEqual(data["games"], archived["games"])
        self.assertEqual(original, data["capture"]["locked_submissions"])
        self.assertEqual(original, archived["capture"]["locked_submissions"])
        self.assertEqual(
            {p["name"]: sum([p["correct"], p["wrong"]]) for p in weekly},
            {p["name"]: 14 for p in weekly},
        )

    def test_future_final_counts_only_scoreable_games(self):
        data = json.loads((ROOT / "quiniela-control/data.json").read_text(encoding="utf8"))
        games = copy.deepcopy(data["games"])
        games[-1]["status"] = "FINAL"
        games[-1]["winner"] = "BUF"
        weekly, _, counts = calculate_standings(
            games, data["participants"], data["capture"]["locked_submissions"],
            data["season_base_before_week"],
        )
        self.assertEqual(counts, {"decided": 15, "scored": 14, "pushes": 1})
        self.assertTrue(all(x["correct"] + x["wrong"] == 14 for x in weekly))


if __name__ == "__main__":
    unittest.main()
