#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/public/assets" "$ROOT/public/audio" "$ROOT/out"

base64 -d "$ROOT/assets/source-frames.zip.b64" > "$ROOT/assets/source-frames.zip"
unzip -o "$ROOT/assets/source-frames.zip" -d "$ROOT/public/assets" >/dev/null

fetch_audio() {
  local name="$1" id="$2"
  local out="$ROOT/public/audio/${name}.mp3"
  for n in 1 2 3 4 5; do
    echo "Downloading ${name}, attempt ${n}"
    if curl -fL --connect-timeout 20 --max-time 120 --retry 2 --retry-delay 2 \
      "https://www.aidocmaker.com/g0/audio?name=${id}" -o "${out}.tmp"; then
      if ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${out}.tmp" >/dev/null 2>&1; then
        mv "${out}.tmp" "$out"
        return 0
      fi
    fi
    sleep 4
  done
  echo "Failed to fetch ${name}" >&2
  exit 1
}

fetch_audio S01 006da74080274c4b9c836b56fc9806f4
fetch_audio S02 1d95623a50fb4cf2a71cd7ee97707ff4
fetch_audio S03 5fc5e4155da5419fa7635284c630f17b
fetch_audio S04 bebbad2aae4d4728b4670dd488d16a4b
fetch_audio S05 b8fb9dbac4f34887aa1de3d99fc033f5
fetch_audio S06 f78a0a2297804600ab694025f70bcb62
fetch_audio S07 2f9cede6a2f545d2b8b6c204cafc1bbb
fetch_audio S08 aa78301ba664442e87ae4df01a442204
fetch_audio S09 7295be3f86844ec9906c86da064268e5
fetch_audio S10 1abca2f9df8541a4829ffb251515028d
fetch_audio S11 e63bb672250f4fe0a90341c913a8de6e
fetch_audio S12 07f974cbbb81493d8f66cee5798484c6
fetch_audio S13 b531e27567c94b8fa7d0659a3e5ae5a0

INVITE='https://media.canva.com/v2/document-image/hash:-351361352/height:500/id:DAHUWZEnlVo/type:B/width:400?brand=BAEG81b0nsg&csig=AAAAAAAAAAAAAAAAAAAAAPjgzPPxzDe7R8COnnBe5n4-H4rQxcX_whPpCppX4cBN&disableexport=T&exp=1788806285&fallback=https%3A%2F%2Fs3.amazonaws.com%2Fdocument-export.canva.com%2FEnlVo%2FDAHUWZEnlVo%2F4%2Fthumbnail%2F0001.png%3FX-Amz-Algorithm%3DAWS4-HMAC-SHA256%26X-Amz-Credential%3DAKIAQYCGKMUH4GDRW44L%252F20260906%252Fus-east-1%252Fs3%252Faws4_request%26X-Amz-Date%3D20260906T221011Z%26X-Amz-Expires%3D76374%26X-Amz-Signature%3Dfa904dafde686382c6b05654d8369e52950fe836b399a8ce285c0b7aa741ca74%26X-Amz-SignedHeaders%3Dhost%26response-expires%3DMon%252C%252007%2520Sep%25202026%252019%253A23%253A05%2520GMT&osig=AAAAAAAAAAAAAAAAAAAAADZgFmNcj9wXH7ddvspZhnKPTCKeZMbwtgSejobhk8GN&page=1&signed=brand%2Cdisableexport%2Cfallback%2Cpage%2Cversion&signer=document-rpc&version=4'
if ! curl -fL --connect-timeout 20 --max-time 90 --retry 2 "$INVITE" -o "$ROOT/public/assets/foto-oficial.png"; then
  echo 'Invitation thumbnail unavailable, using exact-data fallback background.'
  cp "$ROOT/public/assets/old_14.jpg" "$ROOT/public/assets/foto-oficial.png"
fi

for f in "$ROOT"/public/audio/*.mp3; do
  printf '%s ' "$(basename "$f")"
  ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$f"
done
