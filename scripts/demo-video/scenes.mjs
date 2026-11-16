// Records the Dropwise demo: a silent walk through the landing page and every dashboard page, with real requests
// sent through the gateway while the Requests page is on screen. Writes the frames, an encoder timeline, and the
// timed voice-over script (markdown + SRT) for you to read over the video.
//
//   node scenes.mjs <work-dir>        (Chrome must already be running with --remote-debugging-port=9333)
//
// Real model calls: 5 requests through the gateway (one Opus, the rest Haiku or cached), about $0.03 at most.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { recorder, timeline } from "./recorder.mjs";

const work = process.argv[2];
if (!work) throw new Error("usage: node scenes.mjs <work-dir>");
mkdirSync(work, { recursive: true });
const GW = process.env.GATEWAY_URL || "http://localhost:8088";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// DRY=1: walk every page on saved demo data and send nothing to the gateway. Free; used to check selectors and timing.
const DRY = process.env.DRY === "1";

// ---- the real requests -------------------------------------------------------------------------------------------
const calls = [];
async function gw(label, prompt, { key = "team-search", defer, maxTokens = 1200 } = {}) {
  if (DRY) {
    await sleep(3000);
    return { label, dry: true };
  }
  const headers = { "content-type": "application/json", "x-dropwise-key": key };
  if (defer) headers["x-dropwise-defer"] = defer;
  const res = await fetch(`${GW}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: "anthropic/claude-opus-5-5", max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(120_000),
  });
  const body = await res.json().catch(() => null);
  const info = {
    label,
    status: res.status,
    routed_to: res.headers.get("x-dropwise-routed-to"),
    cache: res.headers.get("x-dropwise-cache"),
    water: res.headers.get("x-dropwise-water-ml"),
    job_id: body?.job_id ?? null,
    answered: Boolean(body?.choices?.[0]?.message?.content),
  };
  calls.push(info);
  console.log("call", JSON.stringify(info));
  if (res.status >= 400) throw new Error(`${label}: gateway answered ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return info;
}

const EASY = "Give me three tips for a good night's sleep.";
const WEATHER = "What's the weather like in Chennai right now?";
const HARD = "Is 2^31 - 1 prime? Prove it in a few lines.";
const DEFERRED = "Summarize why caching reduces energy use, in two sentences.";

// ---- narration: lines are marked as they begin; scenes wait for each line to finish at a calm pace --------------------
const markers = [];
let speakUntil = 0;
const words = (s) => s.trim().split(/\s+/).length;
const spoken = (s) => (words(s) / 2.3 + 0.4) * 1000;
const scene = (name) => markers.push({ at: Date.now(), kind: "scene", name });
const line = (text) => {
  markers.push({ at: Date.now(), kind: "line", text, ms: spoken(text) });
  speakUntil = Date.now() + spoken(text);
};
const finish = async () => {
  const left = speakUntil - Date.now();
  if (left > 0) await sleep(left);
  await sleep(350); // a breath between lines
};

// ---- the walk -----------------------------------------------------------------------------------------------------
const d = await recorder({ port: 9333, out: join(work, "frames"), label: "dw" });
if (DRY) {
  const nav = d.nav;
  d.nav = (path, settle) => nav(path.includes("demo=1") ? path : `${path}${path.includes("?") ? "&" : "?"}demo=1`, settle);
}
await d.nav("/", 3500);
const start = Date.now() + 600;
await d.start();
await sleep(600);

let failure = null;
try {
scene("1. The problem");
line("AI answers use water, and nobody can see how much. Dropwise sits in front of the Bifrost AI gateway, and uses Tavily search to keep each water figure sourced.");
await d.hold(6);
await d.scrollBy(850, 1800);
await d.hold(3);
await finish();
line("Bifrost carries each request to the model; Tavily finds the evidence.");
await d.scrollBy(900, 1800);
await d.hold(1.5);
await d.scrollBy(900, 1800);
await finish();

scene("2. Real requests, live");
await d.nav("/dashboard/requests", 3500);
line("Real requests: Dropwise, then Bifrost, then Claude.");
await d.hold(1.5);
await finish();

line("An easy prompt asked of Opus goes to Haiku, and Bifrost forwards it.");
await Promise.all([gw("easy", EASY), finish()]);
await d.hold(1);

line("Asked again, it comes from cache: no call to Bifrost at all.");
await Promise.all([gw("easy again", EASY), finish()]);
await d.hold(1);

line("A time-sensitive question skips the cache on purpose.");
await Promise.all([gw("weather", WEATHER), finish()]);
await d.hold(1);

line("A hard prompt stays on Opus, through Bifrost.");
await Promise.all([gw("hard", HARD, { maxTokens: 800 }), finish()]);
await d.hold(1);

await d.scrollBy(520, 1500);
line("Every request gets a receipt: measured tokens, estimated water.");
await d.hold(2.5);
await finish();
await d.click('tr[id^="req-"]');
await d.hold(3);

scene("3. The receipt");
line("Each receipt cites registry versions; the water factors were found with Tavily, so numbers trace to sources.");
await d.scrollBy(700, 1800);
await d.hold(2);
await d.scrollBy(700, 1800);
await finish();

scene("4. Overview");
await d.nav("/dashboard", 3500);
line("Measured numbers are labelled measured. Water is always an estimated range, from Tavily-found factors.");
await d.hold(4);
await d.scrollBy(850, 1800);
await d.hold(1.5);
await d.scrollBy(850, 1800);
await finish();

scene("5. Budgets");
await d.nav("/dashboard/budgets", 3500);
line("Budgets are per team key, including Bifrost virtual keys. Alert at eighty percent; the limit is soft.");
await d.hold(3);
await d.scrollBy(800, 1800);
await finish();

scene("6. Before and after");
await d.nav("/dashboard/benchmark", 3500);
line("Same two hundred requests, Bifrost alone versus Dropwise: about twenty-two percent fewer calls, twenty-four percent fewer tokens.");
await d.hold(3);
await d.scrollBy(900, 1800);
await d.hold(1.5);
await finish();
line("The answers are replayed recordings, so cost is a what-if, and the page says so.");
await d.scrollBy(900, 1800);
await d.hold(1.5);
await d.scrollBy(900, 1800);
await finish();

scene("7. Routing and cache");
await d.nav("/dashboard/routing", 3500);
line("The classifier is plain rules: no model call, no Tavily search. A hard prompt like this stays on the large model.");
await d.hold(2);
await d.click("Is 2^31 - 1 prime?");
await d.hold(3.5);
await d.scrollBy(850, 1800);
await d.hold(1.5);
await finish();

scene("8. Time shifting");
await d.nav("/dashboard/schedule", 3500);
line("A request can be deferred. I'll send one with a six hour deadline.");
await Promise.all([gw("deferred", DEFERRED, { key: "team-support", defer: "6h", maxTokens: 400 }), finish()]);
await d.hold(1);
await d.scrollBy(700, 1600);
// At some hours the current hour is already the quietest, and the job runs at once; otherwise it waits for a quieter one.
const waiting = DRY ? true : await d.evaluate(`[...document.querySelectorAll("button")].some((b) => b.innerText.trim() === "Run now")`);
console.log("deferred job is", waiting ? "scheduled for a later hour" : "already run (now was the quietest hour)");
if (waiting) {
  line("It is scheduled for the quietest hour in the profile, not now. Run now sends it through the same Bifrost path.");
  await d.hold(2);
  await finish();
  if (!DRY) {
    await d.click("Run now");
    await d.waitFor(d.text("Receipt →"), { timeout: 90_000 });
  }
} else {
  line("This hour is already the quietest, so it runs now through the same Bifrost path, and says why.");
  await d.hold(2);
  await finish();
}
line("The profile is illustrative, and the water estimate doesn't change with the hour, so we claim no saving.");
await d.hold(1.5);
if (!DRY) {
  await d.click("Receipt →");
  await d.hold(2.5);
  await d.scrollBy(700, 1600);
}
await finish();

scene("9. Claim checker");
await d.nav("/claims", 3500);
line("Now a live claim check. Haiku splits the claim, and Tavily adds live sources.");
await d.hold(2.5);
await finish();
await d.click("button[aria-pressed]");
await d.waitFor(d.text("split by a model"), { timeout: 90_000 });
await d.hold(1.5);
line("It is checked against the registry and Tavily's sources. The verdict is overstated, with its citations.");
await d.scrollBy(700, 1800);
await d.hold(1.5);
await finish();

scene("10. The registry");
await d.nav("/registry", 3500);
line("Each factor has a source and a date. Tavily found two of the eight.");
await d.hold(1.5);
await d.scrollBy(750, 1800);
await finish();
await d.click("tr[role=button]");
await d.hold(3.5);
await d.press("Escape");
await d.hold(1);
line("Now a live search: Tavily looks for a newer source, Haiku reads the figure through Bifrost, and code checks the quote.");
await d.scrollTo("Check for newer sources");
await finish();
await d.click("Check for newer sources");
await d.waitFor(d.text("before ·"), { timeout: 90_000 });
await d.hold(1.5);
line("The old 2016 figure is flagged stale by the 2024 report, and a person accepts any change.");
await d.scrollBy(500, 1800);
await d.hold(1.5);
await finish();

scene("11. Close");
await d.nav("/", 3000);
line("Dropwise: Bifrost carries the requests, Tavily keeps the numbers sourced, and all is labelled measured or estimated. Open source. Thank you.");
await d.evaluate(`window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })`);
await finish();
await d.hold(1.5);

} catch (e) {
  failure = e;
  console.error("recording stopped early:", e.message);
}
const end = Date.now();
d.stop();

// ---- outputs -------------------------------------------------------------------------------------------------------
const t = timeline({ frames: d.frames, cuts: d.cuts, start, end, markers });
const hhmm = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
const srtTime = (s) => {
  const ms = Math.round(s * 1000);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
writeFileSync(join(work, "timeline.txt"), t.lines.map((l) => `${l.t.toFixed(3)}\t${l.file}`).join("\n") + "\n");

let md = `# Dropwise demo: voice-over script with timings\n\nThe silent video runs **${hhmm(t.duration)}**. Play it and read each line at its time; the pace assumed is about 2.3 words a second, so each line ends before the next starts.\n\n| Time | Scene | You say |\n|---|---|---|\n`;
let srt = "";
let n = 1;
for (const m of t.marks) {
  if (m.kind === "scene") md += `| **${hhmm(m.t)}** | **${m.name}** | |\n`;
  else {
    md += `| ${hhmm(m.t)} to ${hhmm(m.t + m.ms / 1000)} | | ${m.text} |\n`;
    srt += `${n++}\n${srtTime(m.t)} --> ${srtTime(m.t + m.ms / 1000)}\n${m.text}\n\n`;
  }
}
md += `\n## Real requests made for this recording\n\n\`\`\`json\n${JSON.stringify(calls, null, 2)}\n\`\`\`\n`;
writeFileSync(join(work, "script.md"), md);
writeFileSync(join(work, "script.srt"), srt);
writeFileSync(join(work, "calls.json"), JSON.stringify(calls, null, 2));
console.log(`done: ${t.lines.length} frames, ${hhmm(t.duration)} of video`);
d.close();
process.exit(failure ? 1 : 0);
