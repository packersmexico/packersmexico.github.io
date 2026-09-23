import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const casesDir = path.join(root, "newsroom", "cases");
const boardPath = path.join(root, "newsroom", "state-board.json");
const writeMode = process.argv.includes("--write");

const caseFiles = fs.existsSync(casesDir)
  ? fs.readdirSync(casesDir).filter((name) => name.endsWith(".json")).sort()
  : [];

const cases = caseFiles.map((name) => {
  const full = path.join(casesDir, name);
  const item = JSON.parse(fs.readFileSync(full, "utf8"));
  return {
    pmx_id: item.pmx_id,
    title: item.title || "",
    case_type: item.case_type,
    controller: item.controller || null,
    current_stage: item.workflow.current_stage,
    gate_state: item.workflow.gate_state,
    publication_firewall: item.publication.firewall,
    postpublication_qa: item.publication.postpublication_qa || "NOT_APPLICABLE",
    evidence_status: item.evidence.status,
    updated_at: item.updated_at || null,
    file: "newsroom/cases/" + name
  };
});

const counts = cases.reduce((acc, item) => {
  acc.total += 1;
  acc.by_gate[item.gate_state] = (acc.by_gate[item.gate_state] || 0) + 1;
  acc.by_controller[item.controller || "NONE"] = (acc.by_controller[item.controller || "NONE"] || 0) + 1;
  return acc;
}, { total: 0, by_gate: {}, by_controller: {} });

const board = {
  version: "1.1",
  mode: "SHADOW",
  publication_firewall: "HOLD_05",
  generated_from: "newsroom/cases/*.json",
  cases,
  counts,
  notes: [
    "State Board is a generated index; controllers should update individual case files, not this file directly.",
    "Historical chat state is not migrated unless current evidence is verified.",
    "PMX-ANA-* remains reserved and disabled."
  ]
};

const serialized = JSON.stringify(board, null, 2) + "\n";

if (writeMode) {
  fs.writeFileSync(boardPath, serialized);
  console.log("STATE BOARD WRITE · PASS");
  console.log("Cases:", cases.length);
  process.exit(0);
}

const current = fs.readFileSync(boardPath, "utf8");
if (current !== serialized) {
  console.error("STATE BOARD QA · HOLD");
  console.error("Run: node scripts/build-state-board.mjs --write");
  process.exit(1);
}

console.log("STATE BOARD QA · PASS");
console.log("Cases:", cases.length);
