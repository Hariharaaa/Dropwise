#!/usr/bin/env python3
"""Trims the recorded demo: every silent stretch is sped up, narration plays at normal speed.

Usage: trim.py <dir with timeline.txt, script.srt, script.md> [target-seconds]

Each narration line (text and start time come from script.srt, written by scenes.mjs) keeps the moment it starts, so it
still sits over the action it describes. While a line is spoken the picture plays at normal speed; every stretch between
lines (page loads, waiting for a model or a search, idle holds) is shortened. A line longer than the footage before the
next line slows that footage a little (never more than 1.5x). Writes timeline-trimmed.txt, script-trimmed.md and
script-trimmed.srt in the same directory; run the encoder on the timeline.
"""
import re, sys, os

WORK = sys.argv[1]
WPS, PAD, BREATH = 2.3, 0.4, 0.3  # words per second (calm reading pace), padding per line, breath between lines

def srt_secs(s):
    h, m, rest = s.split(":"); sec, ms = rest.split(",")
    return int(h) * 3600 + int(m) * 60 + int(sec) + int(ms) / 1000

def sec(s):
    m, x = s.split(":"); return int(m) * 60 + float(x)

starts, texts = [], []
for block in open(os.path.join(WORK, "script.srt")).read().strip().split("\n\n"):
    lines = block.split("\n")
    starts.append(srt_secs(lines[1].split(" --> ")[0])); texts.append(" ".join(lines[2:]))

scenes = []
for row in open(os.path.join(WORK, "script.md")):
    m = re.match(r"\| \*\*(\d+:\d+\.\d)\*\* \| \*\*(.*)\*\* \|", row)
    if m: scenes.append((sec(m[1]), m[2]))

frames = []
for row in open(os.path.join(WORK, "timeline.txt")):
    if "\t" in row:
        t, f = row.rstrip("\n").split("\t", 1); frames.append((float(t), f))
total = frames[-1][0]

dur = [len(t.split()) / WPS + PAD for t in texts]

def gap_len(g):
    """How long a silent stretch of g seconds lasts after trimming."""
    return g if g <= 0.8 else max(0.8, min(g, 0.2 * g + 0.4))

bp = [(0.0, 0.0)]
new_t = 0.0
if starts[0] > 0:
    new_t += min(gap_len(starts[0]), 0.3); bp.append((starts[0], new_t))
stretched = []
for i, a in enumerate(starts):
    nxt = starts[i + 1] if i + 1 < len(starts) else total
    span = nxt - a
    need = dur[i] + BREATH
    if need >= span:
        if need / span > 1.5: raise SystemExit(f"line {i} needs {need:.1f}s but its footage is only {span:.1f}s; shorten it")
        if need > span + 0.01: stretched.append((i, round(need / span, 2)))
        new_t += need; bp.append((nxt, new_t))
    else:
        new_t += need; bp.append((a + need, new_t))
        new_t += gap_len(nxt - (a + need)) if i + 1 < len(starts) else min(gap_len(nxt - (a + need)), 0.4)
        bp.append((nxt, new_t))
if stretched: print("slowed footage:", stretched)

def remap(t):
    for (a0, n0), (a1, n1) in zip(bp, bp[1:]):
        if a0 <= t <= a1:
            return n0 if a1 == a0 else n0 + (t - a0) * (n1 - n0) / (a1 - a0)
    return bp[-1][1]

with open(os.path.join(WORK, "timeline-trimmed.txt"), "w") as f:
    for t, file in frames:
        f.write(f"{remap(t):.3f}\t{file}\n")

hhmm = lambda s: f"{int(s // 60)}:{s % 60:04.1f}"
def srt_t(s):
    ms = round(s * 1000)
    return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"

md = f"# Dropwise demo (trimmed): voice-over script with timings\n\nThe silent video runs **{hhmm(new_t + 1.0)}**. Read each line at its time, at about 2.3 words a second: the line ends before the next begins. Scene times are exact; line times are targets.\n\n| Time | Scene | You say |\n|---|---|---|\n"
srt = ""
events = [(remap(t), 0, ("scene", name)) for t, name in scenes] + [(remap(s), 1, ("line", i)) for i, s in enumerate(starts)]
for t, _, (kind, v) in sorted(events, key=lambda e: (e[0], e[1])):
    if kind == "scene":
        md += f"| **{hhmm(t)}** | **{v}** | |\n"
    else:
        md += f"| {hhmm(t)} to {hhmm(t + dur[v])} | | {texts[v]} |\n"
        srt += f"{v + 1}\n{srt_t(t)} --> {srt_t(t + dur[v])}\n{texts[v]}\n\n"
open(os.path.join(WORK, "script-trimmed.md"), "w").write(md)
open(os.path.join(WORK, "script-trimmed.srt"), "w").write(srt)
print(f"original {hhmm(total)} -> trimmed {hhmm(new_t)} (+1s end hold in the video); narration {sum(dur):.1f}s in {len(texts)} lines; frames {len(frames)}")
