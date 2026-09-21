import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../js/weekly-manifest.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const m = sandbox.window.PMX_WEEKLY_MANIFEST;
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

assert(m && typeof m === "object", "PMX_WEEKLY_MANIFEST missing");
if (m) {
  assert(Number.isInteger(m.operationalWeek) && m.operationalWeek >= 1 && m.operationalWeek <= 18, "operationalWeek invalid");
  assert(m.game && m.game.week === m.operationalWeek, "game.week must match operationalWeek");
  assert(m.quiniela && Array.isArray(m.quiniela.participants) && m.quiniela.participants.length === 9, "quiniela requires 9 base participants");
  assert(m.quiniela.capture.games === 16, "Week 3 capture must contain 16 games");
  assert(m.quiniela.capture.expectedPicks === m.quiniela.capture.games * m.quiniela.capture.participants, "expectedPicks mismatch");
  assert(m.quiniela.capture.shareState === "NO_COMPARTIR_AUN" || Boolean(m.quiniela.capture.cutoff) || m.quiniela.capture.cutoffPolicy === "DIRECTION_MANUAL_CLOSE", "shareable capture requires cutoff or explicit Direction manual-close policy");
  assert(m.quiniela.public.week <= m.operationalWeek, "public quiniela week cannot exceed operational week");
  assert(m.wingstop.venueWording === "Casa Oficial de Packers en CDMX", "Wingstop venue wording LOCK changed");
  assert(m.wingstop.publicationState === "HOLD_05", "Wingstop must remain behind 05 gate");
  assert(m.routing.publication === "HOLD_05_READY_FOR_CLICK_REQUIRED", "publication firewall changed");
}

const w3 = JSON.parse(fs.readFileSync(new URL("../quiniela-control/weeks/week-03.json", import.meta.url), "utf8"));
assert(w3.schedule.length === 16, "W3 schedule must contain 16 games");
assert(new Set(w3.schedule.map(g => g.game)).size === 16, "W3 game IDs must be unique");
assert(w3.capture.expected_picks === w3.capture.total * w3.schedule.length, "W3 expected picks mismatch");
assert(w3.public_url === null, "W3 public URL must remain null before public release");\nassert(w3.capture.form_url === m.quiniela.capture.formUrl, "W3 form URL mismatch between snapshot and manifest");

if (errors.length) {
  console.error("WEEKLY MANIFEST QA · HOLD");
  errors.forEach(e => console.error("- " + e));
  process.exit(1);
}

console.log("WEEKLY MANIFEST QA · PASS");
console.log("Operational Week:", m.operationalWeek);
console.log("Game:", m.game.matchup, m.game.dateLabel, m.game.time, "CDMX");
console.log("Quiniela capture:", m.quiniela.capture.status);
console.log("Public Quiniela:", "WEEK " + m.quiniela.public.week);
console.log("Publication:", m.routing.publication);
