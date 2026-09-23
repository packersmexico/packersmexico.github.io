import fs from "node:fs";

const readJSON = (path) => JSON.parse(fs.readFileSync(new URL("../" + path, import.meta.url), "utf8"));
const config = readJSON("newsroom/orchestrator-config.json");
const board = readJSON("newsroom/state-board.json");
const routes = readJSON("newsroom/route-registry.json");
const schema = readJSON("newsroom/case-schema.json");

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

assert(JSON.stringify(config.workflow) === JSON.stringify(["00","01","02","03","03.5","04","05"]), "canonical workflow changed");
assert(config.publication_firewall.required_stage === "05", "publication firewall must remain at 05");
assert(config.publication_firewall.required_state === "READY_FOR_CLICK", "READY_FOR_CLICK requirement missing");
assert(config.manual_intake.enabled === true, "manual intake must remain enabled");
assert(config.controllers.SIGNAL_CONTROLLER.output_stage === "00", "signals must route to 00");
assert(config.controllers.SIGNAL_CONTROLLER.may_publish === false, "signal controller cannot publish");
assert(config.controllers.QUINIELA_CONTROLLER.may_publish === false, "quiniela controller cannot publish");
assert(config.controllers.WEEK_CONTROLLER.may_publish === false, "week controller cannot publish");
assert(config.controllers.DATA_CONTROLLER.may_publish === false, "data controller cannot publish");
assert(config.future_integration.sports_analytics.namespace === "PMX-ANA-*", "PMX-ANA namespace reservation missing");
assert(config.future_integration.sports_analytics.implementation_enabled === false, "sports analytics implementation must remain disabled");
assert(config.future_integration.sports_analytics.academic_repo_separation_required === true, "academic/product repo separation must remain required");
assert(board.mode === "SHADOW", "state board must start in SHADOW");
assert(board.publication_firewall === "HOLD_05", "state board publication firewall must start HOLD_05");

const requiredPlatforms = ["x","instagram","facebook","tiktok","whatsapp"];
for (const platform of requiredPlatforms) {
  const route = routes.routes.find((item) => item.week === 3 && item.platform === platform);
  assert(Boolean(route), "missing W3 route for " + platform);
  if (route) {
    assert(route.status === "ACTIVE", "W3 route is not ACTIVE for " + platform);
    assert(route.path.startsWith("/go/w03-"), "unexpected W3 route path for " + platform);
    assert(Boolean(route.utm_campaign), "utm_campaign missing for " + platform);
  }
}

assert(schema.properties && schema.properties.analysis, "future analysis reference object missing from case schema");
assert(schema.properties && schema.properties.evidence, "case evidence contract missing");
assert(schema.properties && schema.properties.controller, "case controller contract missing");
assert(board.generated_from === "newsroom/cases/*.json", "state board must be generated from individual case files");
assert(board.cases.length >= 2, "verified current cases were not seeded");

if (errors.length) {
  console.error("NEWSROOM CORE QA · HOLD");
  errors.forEach((error) => console.error("- " + error));
  process.exit(1);
}

console.log("NEWSROOM CORE QA · PASS");
console.log("Mode:", board.mode);
console.log("Workflow:", config.workflow.join(" → "));
console.log("Controllers:", Object.keys(config.controllers).join(", "));
console.log("Hub routes W3:", routes.routes.length);
console.log("PMX-ANA:", config.future_integration.sports_analytics.status);
