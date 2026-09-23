import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const registry = JSON.parse(fs.readFileSync(path.join(root, "newsroom/route-registry.json"), "utf8"));
const writeMode = process.argv.includes("--write");
const errors = [];

function expectedTarget(route) {
  const params = new URLSearchParams({
    utm_source: route.utm_source,
    utm_medium: route.utm_medium,
    utm_campaign: route.utm_campaign,
    utm_content: route.utm_content
  });
  return (route.target_path || "/") + "?" + params.toString();
}

function render(route) {
  const target = expectedTarget(route);
  const escaped = target.replaceAll("&", "&amp;");
  return `<!doctype html>
<html lang="es-MX">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta http-equiv="refresh" content="0;url=${escaped}">
  <title>${route.title || "PACKERS MÉXICO"}</title>
  <script>window.location.replace("${target}");</script>
</head>
<body><p><a href="${escaped}">Abrir PACKERS MÉXICO</a></p></body>
</html>
`;
}

for (const route of registry.routes) {
  if (route.status !== "ACTIVE") continue;
  const relative = route.path.replace(/^\//, "") + "index.html";
  const filePath = path.join(root, relative);
  const target = expectedTarget(route);

  if (writeMode) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, render(route));
    console.log("ROUTE WRITTEN", route.path, "→", target);
    continue;
  }

  if (!fs.existsSync(filePath)) {
    errors.push("missing route file: " + relative);
    continue;
  }

  const html = fs.readFileSync(filePath, "utf8");
  if (!html.includes(target)) errors.push("route target mismatch: " + route.path);
}

if (errors.length) {
  console.error("HUB ROUTER QA · HOLD");
  errors.forEach((error) => console.error("- " + error));
  process.exit(1);
}

console.log("HUB ROUTER QA · PASS");
console.log("Active routes:", registry.routes.filter((r) => r.status === "ACTIVE").length);
