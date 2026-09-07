#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS="$ROOT/public/assets"
AUDIO="$ROOT/public/audio"
mkdir -p "$ASSETS" "$AUDIO" "$ROOT/out"

retry_audio() {
  local url="$1" out="$2"
  local tmp="${out}.tmp"
  for attempt in $(seq 1 20); do
    rm -f "$tmp"
    echo "[audio] $out attempt $attempt"
    if curl -fL --connect-timeout 20 --max-time 120 --retry 2 --retry-delay 3 "$url" -o "$tmp"; then
      if [[ -s "$tmp" ]] && ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$tmp" >/dev/null 2>&1; then
        mv "$tmp" "$out"
        return 0
      fi
    fi
    sleep 10
  done
  echo "Unable to obtain valid audio: $url" >&2
  return 1
}

retry_image() {
  local out="$1"; shift
  local tmp="${out}.tmp"
  for url in "$@"; do
    for attempt in 1 2 3; do
      rm -f "$tmp"
      echo "[image] $out attempt $attempt"
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

# Authoritative PACKERS MÉXICO horizontal V1.1 logo. Never rebuild or recolor.
echo "[logo] horizontal V1.1"
curl -fL --connect-timeout 20 --max-time 120 --retry 3 \
  'https://drive.google.com/uc?export=download&id=1oF6Fkw7f32j3DGd7ftpU_0uI7Bm50tLI' \
  -o "$ASSETS/pmx-logo.svg"
grep -qi '<svg' "$ASSETS/pmx-logo.svg"

# Asset map locked by 03.5. Use current Packers.com material and approved S12 invitation.
retry_image "$ASSETS/gutekunst-1.jpg" \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/f_auto/packers/z3o98g3gxwaijfa01mtx.jpg' \
  'https://static.clubs.nfl.com/image/upload/f_auto/q_auto/packers/z3o98g3gxwaijfa01mtx.jpg' \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/t_lazy/f_auto/packers/z3o98g3gxwaijfa01mtx.jpg'
retry_image "$ASSETS/gutekunst-2.jpg" \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/f_auto/packers/ri8dg9rxenlcxh8qdrgf.jpg' \
  'https://static.clubs.nfl.com/image/upload/f_auto/q_auto/packers/ri8dg9rxenlcxh8qdrgf.jpg' \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/t_lazy/f_auto/packers/ri8dg9rxenlcxh8qdrgf.jpg'
retry_image "$ASSETS/love-headshot.png" \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/f_png/packers/r8esz44ozxewbju7yejx.png' \
  'https://static.clubs.nfl.com/image/upload/f_png/q_auto/packers/r8esz44ozxewbju7yejx.png' \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/t_lazy/f_png/packers/r8esz44ozxewbju7yejx.png'
retry_image "$ASSETS/jonnu.jpg" \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/f_auto/packers/ugvuci7yhhex3o6jmboh.jpg' \
  'https://static.clubs.nfl.com/image/upload/f_auto/q_auto/packers/ugvuci7yhhex3o6jmboh.jpg' \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/t_lazy/f_auto/packers/ugvuci7yhhex3o6jmboh.jpg'
retry_image "$ASSETS/kaleb.png" \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/f_png/packers/jyym2it97dz9s79m2tw7.png' \
  'https://static.clubs.nfl.com/image/upload/f_png/q_auto/packers/jyym2it97dz9s79m2tw7.png' \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/t_lazy/f_png/packers/jyym2it97dz9s79m2tw7.png'
retry_image "$ASSETS/redman.jpg" \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/f_auto/packers/rn5q8q2cxmtcurxx1che.jpg' \
  'https://static.clubs.nfl.com/image/upload/f_auto/q_auto/packers/rn5q8q2cxmtcurxx1che.jpg' \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/t_lazy/f_auto/packers/rn5q8q2cxmtcurxx1che.jpg'
retry_image "$ASSETS/slovis.jpg" \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/f_auto/packers/dlst1tone991jel2pxea.jpg' \
  'https://static.clubs.nfl.com/image/upload/f_auto/q_auto/packers/dlst1tone991jel2pxea.jpg' \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/t_lazy/f_auto/packers/dlst1tone991jel2pxea.jpg'
retry_image "$ASSETS/kraft-action.jpg" \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/f_auto/packers/xqgewk8aae2lpdwolspb.jpg' \
  'https://static.clubs.nfl.com/image/upload/f_auto/q_auto/packers/xqgewk8aae2lpdwolspb.jpg' \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/t_lazy/f_auto/packers/xqgewk8aae2lpdwolspb.jpg'
retry_image "$ASSETS/lloyd-action.jpg" \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/f_auto/packers/mhyhuzglsfp0e2kvhjwd.jpg' \
  'https://static.clubs.nfl.com/image/upload/f_auto/q_auto/packers/mhyhuzglsfp0e2kvhjwd.jpg' \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/t_lazy/f_auto/packers/mhyhuzglsfp0e2kvhjwd.jpg'
retry_image "$ASSETS/love-action.jpg" \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/f_auto/packers/ge3gtr4vakeywns9zmar.jpg' \
  'https://static.clubs.nfl.com/image/upload/f_auto/q_auto/packers/ge3gtr4vakeywns9zmar.jpg' \
  'https://static.clubs.nfl.com/image/upload/t_new_photo_album/t_lazy/f_auto/packers/ge3gtr4vakeywns9zmar.jpg'

INVITE_URL='https://media.canva.com/v2/document-image/hash:-351361352/height:500/id:DAHUWZEnlVo/type:B/width:400?brand=BAEG81b0nsg&csig=AAAAAAAAAAAAAAAAAAAAAJy1Q7WrguIoLEq5UwmaZmRvjJiRwnoia1uJ834JzK3A&disableexport=T&exp=1788774969&fallback=https%3A%2F%2Fs3.amazonaws.com%2Fdocument-export.canva.com%2FEnlVo%2FDAHUWZEnlVo%2F4%2Fthumbnail%2F0001.png%3FX-Amz-Algorithm%3DAWS4-HMAC-SHA256%26X-Amz-Credential%3DAKIAQYCGKMUH4GDRW44L%252F20260906%252Fus-east-1%252Fs3%252Faws4_request%26X-Amz-Date%3D20260906T221011Z%26X-Amz-Expires%3D45058%26X-Amz-Signature%3Dbb91d3ca29d631714beed685d4de1b26247f67e84a0a14a8a2cfba136592ece4%26X-Amz-SignedHeaders%3Dhost%26response-expires%3DMon%252C%252007%2520Sep%25202026%252010%253A41%253A09%2520GMT&osig=AAAAAAAAAAAAAAAAAAAAAMwC6hfZrNUSCvt8U9jMa0W9lw9yf3mJtjKgdBOn1q1Y&page=1&signed=brand%2Cdisableexport%2Cfallback%2Cpage%2Cversion&signer=document-rpc&version=4'
if ! retry_image "$ASSETS/foto-oficial-invitacion.png" "$INVITE_URL"; then
  echo '[invite] signed Canva thumbnail unavailable; generating exact-data fallback without altering event facts.'
  convert -size 900x1200 xc:'#F2E8CF' \
    -fill '#081D13' -font DejaVu-Sans-Bold -pointsize 46 -gravity NorthWest \
    -annotate +55+70 'FOTO OFICIAL · AFICIÓN PACKERS' \
    -fill '#123B31' -pointsize 76 -annotate +55+200 'DOM · 13 SEP' \
    -fill '#081D13' -pointsize 110 -annotate +55+320 '12:00 h' \
    -pointsize 46 -annotate +55+500 'PALACIO DE BELLAS ARTES' \
    -pointsize 32 -annotate +55+650 'Costado izquierdo · pasillo' \
    -pointsize 30 -annotate +55+735 'Llega 30 min antes' \
    "$ASSETS/foto-oficial-invitacion.png"
fi

# New V7 narration, one voice clip per scene. Old V6 audio is never downloaded or referenced.
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
