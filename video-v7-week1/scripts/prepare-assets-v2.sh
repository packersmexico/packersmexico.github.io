#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS="$ROOT/public/assets"
AUDIO="$ROOT/public/audio"
EMBED="$ROOT/assets/PMX_LOGO_HISTORICO_HORIZONTAL_CANVA_MASTER_V1.1.svg.xz.b64"
mkdir -p "$ASSETS" "$AUDIO" "$ROOT/out"

retry_audio() {
  local url="$1" out="$2"
  local tmp="${out}.tmp"
  for attempt in $(seq 1 24); do
    rm -f "$tmp"
    echo "[audio] $(basename "$out") attempt $attempt"
    if curl -fL --connect-timeout 20 --max-time 120 --retry 2 --retry-delay 3 "$url" -o "$tmp"; then
      if [[ -s "$tmp" ]] && ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$tmp" >/dev/null 2>&1; then
        mv "$tmp" "$out"
        return 0
      fi
    fi
    sleep 8
  done
  echo "Unable to obtain valid audio: $url" >&2
  return 1
}

retry_image() {
  local out="$1"; shift
  local tmp="${out}.tmp"
  for url in "$@"; do
    for attempt in 1 2 3 4; do
      rm -f "$tmp"
      echo "[image] $(basename "$out") attempt $attempt"
      if curl -fL --connect-timeout 20 --max-time 120 --retry 2 --retry-delay 2 "$url" -o "$tmp"; then
        if [[ -s "$tmp" ]] && identify "$tmp" >/dev/null 2>&1; then
          mv "$tmp" "$out"
          identify "$out"
          return 0
        fi
      fi
      sleep 3
    done
  done
  echo "Unable to obtain image: $out" >&2
  return 1
}

# Exact uploaded authoritative horizontal V1.1 asset, compressed losslessly only for transport.
echo '[logo] materializing exact horizontal V1.1'
base64 -d "$EMBED" | xz -dc > "$ASSETS/pmx-logo.svg"
grep -qi '<svg' "$ASSETS/pmx-logo.svg"
EXPECTED='3eab36865dae4fc9494132df4a860dabdccf82b6ec5445b9aed9cbd1eefbb3e4'
ACTUAL="$(sha256sum "$ASSETS/pmx-logo.svg" | awk '{print $1}')"
[[ "$ACTUAL" = "$EXPECTED" ]] || { echo "Logo SHA256 mismatch: $ACTUAL" >&2; exit 1; }
echo "[logo] verified $ACTUAL"

# Asset map locked by 03.5. No discovery/research here.
retry_image "$ASSETS/gutekunst-1.jpg" \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/f_auto/packers/z3o98g3gxwaijfa01mtx.jpg' \
  'https://static.clubs.nfl.com/image/upload/f_auto/q_auto/packers/z3o98g3gxwaijfa01mtx.jpg'
retry_image "$ASSETS/gutekunst-2.jpg" \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/f_auto/packers/ri8dg9rxenlcxh8qdrgf.jpg' \
  'https://static.clubs.nfl.com/image/upload/f_auto/q_auto/packers/ri8dg9rxenlcxh8qdrgf.jpg'
retry_image "$ASSETS/love-headshot.png" \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/f_png/packers/r8esz44ozxewbju7yejx.png' \
  'https://static.clubs.nfl.com/image/upload/f_png/q_auto/packers/r8esz44ozxewbju7yejx.png'
retry_image "$ASSETS/jonnu.jpg" \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/f_auto/packers/ugvuci7yhhex3o6jmboh.jpg' \
  'https://static.clubs.nfl.com/image/upload/f_auto/q_auto/packers/ugvuci7yhhex3o6jmboh.jpg'
retry_image "$ASSETS/kaleb.png" \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/f_png/packers/jyym2it97dz9s79m2tw7.png' \
  'https://static.clubs.nfl.com/image/upload/f_png/q_auto/packers/jyym2it97dz9s79m2tw7.png'
retry_image "$ASSETS/redman.jpg" \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/f_auto/packers/rn5q8q2cxmtcurxx1che.jpg' \
  'https://static.clubs.nfl.com/image/upload/f_auto/q_auto/packers/rn5q8q2cxmtcurxx1che.jpg'
retry_image "$ASSETS/slovis.jpg" \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/f_auto/packers/dlst1tone991jel2pxea.jpg' \
  'https://static.clubs.nfl.com/image/upload/f_auto/q_auto/packers/dlst1tone991jel2pxea.jpg'
retry_image "$ASSETS/kraft-action.jpg" \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/f_auto/packers/xqgewk8aae2lpdwolspb.jpg' \
  'https://static.clubs.nfl.com/image/upload/f_auto/q_auto/packers/xqgewk8aae2lpdwolspb.jpg'
retry_image "$ASSETS/lloyd-action.jpg" \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/f_auto/packers/mhyhuzglsfp0e2kvhjwd.jpg' \
  'https://static.clubs.nfl.com/image/upload/f_auto/q_auto/packers/mhyhuzglsfp0e2kvhjwd.jpg'
retry_image "$ASSETS/love-action.jpg" \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/f_auto/packers/ge3gtr4vakeywns9zmar.jpg' \
  'https://static.clubs.nfl.com/image/upload/f_auto/q_auto/packers/ge3gtr4vakeywns9zmar.jpg'

# S12 intentionally has no photo dependency. Generate a neutral exact-data support card.
convert -size 900x1200 xc:'#F2E8CF' \
  -fill '#081D13' -font DejaVu-Sans-Bold -pointsize 44 -gravity NorthWest \
  -annotate +55+70 'FOTO OFICIAL · AFICIÓN PACKERS' \
  -fill '#123B31' -pointsize 76 -annotate +55+200 'DOM · 13 SEP' \
  -fill '#081D13' -pointsize 108 -annotate +55+320 '12:00 h' \
  -pointsize 44 -annotate +55+500 'PALACIO DE BELLAS ARTES' \
  -pointsize 31 -annotate +55+650 'Costado izquierdo · pasillo' \
  -pointsize 30 -annotate +55+735 'Recomendamos llegar 30 min antes' \
  "$ASSETS/foto-oficial-invitacion.png"
identify "$ASSETS/foto-oficial-invitacion.png"

# NEW V7 narration. V6 is never downloaded or referenced.
retry_audio 'https://www.aidocmaker.com/g0/audio?name=c7f410b3ca1747709bbc5265a980c8de' "$AUDIO/S01.mp3"
retry_audio 'https://www.aidocmaker.com/g0/audio?name=9979eebaf5604ed298932f45469e89c3' "$AUDIO/S02.mp3"
retry_audio 'https://www.aidocmaker.com/g0/audio?name=64394589023a4523b169082bff324676' "$AUDIO/S03.mp3"
retry_audio 'https://www.aidocmaker.com/g0/audio?name=367a1059a6ba48ba8a9c560dd4b932b0' "$AUDIO/S04.mp3"
retry_audio 'https://www.aidocmaker.com/g0/audio?name=237b997d65d444cc8c31eee79095404f' "$AUDIO/S05.mp3"
retry_audio 'https://www.aidocmaker.com/g0/audio?name=cbda8bb37dda4363ae566f12730d9f11' "$AUDIO/S06.mp3"
retry_audio 'https://www.aidocmaker.com/g0/audio?name=310c835f73004f82bbcf812828413ecb' "$AUDIO/S07.mp3"
retry_audio 'https://www.aidocmaker.com/g0/audio?name=6d56a1c7406d4243adad5e47ceefa930' "$AUDIO/S08.mp3"
retry_audio 'https://www.aidocmaker.com/g0/audio?name=925ed2ba5e594d8799f129b0870cda09' "$AUDIO/S09.mp3"
retry_audio 'https://www.aidocmaker.com/g0/audio?name=6ebc003517654f90817a245c6d6698ce' "$AUDIO/S10.mp3"
retry_audio 'https://www.aidocmaker.com/g0/audio?name=4b03fffa719d4e4c8266f5ae83277dce' "$AUDIO/S11.mp3"
retry_audio 'https://www.aidocmaker.com/g0/audio?name=00be8d6d303a485ebb4aab016b278fd2' "$AUDIO/S12.mp3"
retry_audio 'https://www.aidocmaker.com/g0/audio?name=ba5a7c9699874dad8e86a50d800f5a78' "$AUDIO/S13.mp3"

echo '[assets] ready'
find "$ASSETS" -maxdepth 1 -type f -printf '%f %s bytes\n' | sort
find "$AUDIO" -maxdepth 1 -type f -printf '%f %s bytes\n' | sort
