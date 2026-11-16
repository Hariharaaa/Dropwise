# How the demo video was made

The demo is a silent screen recording of the real stack, with a timed voice-over script. Nothing on screen is mocked: the requests go through the gateway to Bifrost and Anthropic, and the claim check and stale-factor search call Tavily.

- `scripts/demo-video/scenes.mjs` drives a separate Chrome window over the DevTools protocol, records its frames, sends five real requests through the gateway while the Requests page is on screen (an easy prompt, the same one again, a time-sensitive one, a hard one, and a deferred one), runs a live claim check and the live stale-factor search, and writes a timed voice-over script.
- `scripts/demo-video/trim.py` keeps the picture at normal speed while a line is spoken and speeds up the silent stretches (page loads, waiting for a model or a search).
- `scripts/demo-video/encode.swift` turns the frames into a 1920x1080 H.264 file.
- `scripts/demo-calls.sh` runs the same live requests one scene at a time from a terminal, if you want to record by hand. About $0.03 at most (Opus is called once; the repeat is a cache hit).

Run it with the stack up (`docker compose up --build`) and Chrome started with `--remote-debugging-port=9333`:

```bash
node scripts/demo-video/scenes.mjs <work-dir>
python3 scripts/demo-video/trim.py <work-dir>
swiftc -O scripts/demo-video/encode.swift -o encode && ./encode <work-dir>/timeline-trimmed.txt demo.mp4
```

Reset the gateway data first (so the dashboard starts empty and the cache is cold), and expect a few cents of model credit plus a few Tavily credits.
