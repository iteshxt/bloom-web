#!/usr/bin/env bash
# Synthesizes Bloom's eight sounds (design §13.1) with ffmpeg: soft, short,
# warm marimba and glass tones, each under 20 KB as .mp3 and .ogg.
# Re-run with: bash scripts/generate-sounds.sh
set -euo pipefail
cd "$(dirname "$0")/.."
out=public/sounds
mkdir -p "$out"

# name | duration (s) | expression | extra filters
sounds=(
  # a soft wooden "bloop": a sine dropping from 600 to 300 Hz
  "pop|0.25|0.7*sin(2*PI*(300*t+7.5*(1-exp(-40*t))))*exp(-t*18)|lowpass=f=2500"
  # three rising glass notes, C6 E6 G6, with a quiet octave
  "chime|1.3|0.32*(if(gte(t,0),(sin(2*PI*1046.5*t)+0.3*sin(2*PI*2093*t))*exp(-t*5),0)+if(gte(t,0.13),(sin(2*PI*1318.5*t)+0.3*sin(2*PI*2637*t))*exp(-(t-0.13)*5),0)+if(gte(t,0.26),(sin(2*PI*1568*t)+0.3*sin(2*PI*3136*t))*exp(-(t-0.26)*4),0))|afade=t=out:st=1.1:d=0.2"
  # a small coin on wood
  "clink|0.3|0.5*(sin(2*PI*2600*t)+0.6*sin(2*PI*3900*t)+0.4*sin(2*PI*1250*t)*exp(-t*20))*exp(-t*30)|"
  # light, crisp ice crack: two short noise bursts
  "crack|0.22|0.8*(random(0)*2-1)*(exp(-t*60)+0.6*if(gte(t,0.05),exp(-(t-0.05)*70),0))|highpass=f=1800,lowpass=f=9000"
  # a soft rising shimmer with a gentle tremolo
  "melt|0.75|0.38*(sin(2*PI*(500*t+357*t*t))+0.4*sin(2*PI*(1000*t+714*t*t)))*(0.65+0.35*sin(2*PI*12*t))*sin(PI*t/0.75)|"
  # an airy swish
  "whoosh|0.5|0.9*(random(0)*2-1)*pow(sin(PI*t/0.5),2)|bandpass=f=900:width_type=h:w=900,lowpass=f=3000"
  # a barely-there tick
  "tap|0.05|0.35*sin(2*PI*2200*t)*exp(-t*120)|"
  # paper rustle as the ribbon unties
  "rustle|0.6|0.6*(random(0)*2-1)*(0.5+0.5*sin(2*PI*21*t))*sin(PI*t/0.6)|highpass=f=1500,lowpass=f=7000"
)

for entry in "${sounds[@]}"; do
  IFS='|' read -r name d expr filters <<<"$entry"
  af="aformat=channel_layouts=mono"
  [[ -n "$filters" ]] && af="$filters,$af"
  ffmpeg -hide_banner -loglevel error -y \
    -f lavfi -i "aevalsrc=exprs='$expr':s=44100:d=$d" -af "$af" \
    -c:a libmp3lame -b:a 48k "$out/$name.mp3"
  ffmpeg -hide_banner -loglevel error -y \
    -f lavfi -i "aevalsrc=exprs='$expr':s=44100:d=$d" -af "$af" \
    -c:a libvorbis -q:a 2 "$out/$name.ogg"
done
ls -l "$out"
