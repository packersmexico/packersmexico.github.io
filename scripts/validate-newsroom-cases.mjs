import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "newsroom/orchestrator-config.json"), "utf8"));
const casesDir = path.join(root, "newsroom/cases");
const errors = [];
const ids = new Set();
const canonical = ["00","01","02","03","03.5","04","05"];

const files = fs.readdirSync(casesDir).filter((name) => name.endsWith(".json")).sort();

for (const file of files) {
  const item = JSON.parse(fs.readFileSync(path.join(casesDir, file), "utf8"));
  const expectedFile = item.pmx_id + ".json";

  if (!item.pmx_id || !/^PMX-[A-Z0-9-]+$/.test(item.pmx_id)) errors.push(file + ": invalid pmx_id");
  if (file !== expectedFile) errors.push(file + ": filename must equal PMX_ID.json");
  if (ids.has(item.pmx_id)) errors.push(file + ": duplicate PMX_ID");
  ids.add(item.pmx_id);

  if (JSON.stringify(item.workflow?.canonical) !== JSON.stringify(canonical)) errors.push(file + ": canonical workflow changed");
  if (!item.workflow?.current_stage) errors.push(file + ": current_stage missing");
  if (!item.workflow?.gate_state) errors.push(file + ": gate_state missing");
  if (!item.publication?.firewall) errors.push(file + ": publication firewall missing");
  if (!item.evidence?.status) errors.push(file + ": evidence status missing");

  const platforms = item.publication?.platforms || {};
  for (const [platform, state] of Object.entries(platforms)) {
    if (state.status === "PUBLISHED" && !state.url && !state.external_id) {
      errors.push(file + ": " + platform + " PUBLISHED without URL/ID evidence");
    }
  }

  if (item.publication?.postpublication_qa === "PASS") {
    for (const [platform, state] of Object.entries(platforms)) {
      if (state.status !== "NOT_APPLICABLE" && (state.status !== "PUBLISHED" || (!state.url && !state.external_id))) {
        errors.push(file + ": POSTPUBLICATION PASS requires platform evidence for " + platform);
      }
    }
  }

  if (item.pmx_id.startsWith("PMX-ANA-") && config.future_integration.sports_analytics.implementation_enabled !== true) {
    errors.push(file + ": PMX-ANA implementation is reserved/disabled");
  }
}

if (errors.length) {
  console.error("NEWSROOM CASE QA · HOLD");
  errors.forEach((error) => console.error("- " + error));
  process.exit(1);
}

console.log("NEWSROOM CASE QA · PASS");
console.log("Cases:", files.length);
