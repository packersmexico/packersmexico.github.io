#!/usr/bin/env python3
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / 'public' / 'audio'
OUT = ROOT / 'src' / 'timings.json'
FPS = 30
SCENES = [f'S{i:02d}' for i in range(1, 14)]
TAIL = {
    'S08': 0.65,
    'S09': 0.45,
    'S12': 1.35,
    'S13': 1.70,
}

def duration(path: Path) -> float:
    proc = subprocess.run([
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', str(path)
    ], check=True, capture_output=True, text=True)
    return float(proc.stdout.strip())

items = []
for scene in SCENES:
    path = AUDIO / f'{scene}.mp3'
    if not path.exists() or path.stat().st_size < 4096:
        raise SystemExit(f'Missing or invalid audio: {path}')
    seconds = duration(path) + TAIL.get(scene, 0.28)
    items.append({'id': scene, 'seconds': round(seconds, 3)})

data = {'fps': FPS, 'scenes': items}
OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(json.dumps(data, indent=2, ensure_ascii=False))
print(f'TOTAL_SECONDS={sum(i["seconds"] for i in items):.3f}')
