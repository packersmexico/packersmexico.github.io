import puppeteer from "puppeteer-core";
import fs from "node:fs";

const chromePath = process.env.CHROME_PATH;
if (!chromePath) throw new Error("Chrome/Chromium executable not found.");

const browser = await puppeteer.launch({
  headless: true,
  executablePath: chromePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});

const targets = [
  { name: "mobile", width: 390, height: 844, isMobile: true, deviceScaleFactor: 1 },
  { name: "desktop", width: 1440, height: 1200, isMobile: false, deviceScaleFactor: 1 }
];

const reports = [];
let failed = false;

for (const target of targets) {
  const page = await browser.newPage();
  await page.setViewport(target);
  const consoleErrors = [], pageErrors = [], failedSameOrigin = [], httpErrors = [];
  page.on("console", msg => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", err => pageErrors.push(String(err)));
  page.on("requestfailed", req => {
    if (req.url().startsWith("http://127.0.0.1:8000/")) failedSameOrigin.push({url:req.url(),error:req.failure()?.errorText||"unknown"});
  });
  page.on("response", res => { if (res.status() >= 400) httpErrors.push({url:res.url(),status:res.status()}); });

  await page.goto("http://127.0.0.1:8000/?pmx_test=1", {waitUntil:"networkidle0",timeout:30000});
  await page.screenshot({path:`qa-artifacts/hub-rivalries-${target.name}.png`,fullPage:true});

  const audit = await page.evaluate(() => {
    const text=document.body.innerText;
    const q=window.PMX_CONFIG?.quiniela || {};
    const logo=document.querySelector(".brand-logo");
    return {
      bodyTheme:document.body.classList.contains("theme-rivalries"),
      capsuleVisible:!document.getElementById("capsule-banner")?.hidden,
      capsuleLabel:document.getElementById("capsule-label")?.textContent?.trim()||"",
      capsuleMatchup:document.getElementById("capsule-matchup")?.textContent?.trim()||"",
      heroPrimary:document.getElementById("game-heading-primary")?.textContent?.trim()||"",
      heroSecondary:document.getElementById("game-heading-secondary")?.textContent?.trim()||"",
      logoSrc:logo?.getAttribute("src")||"",
      quinielaHidden:Boolean(document.getElementById("quiniela-section")?.hidden),
      quinielaWeek:q.week||"",
      quinielaUrl:q.url||"",
      staleWeek4Visible:/WEEK 4/i.test(text),
      socialCount:document.querySelectorAll("#social-links a").length,
      horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth
    };
  });

  const checks = {
    theme:audit.bodyTheme,
    capsule:audit.capsuleVisible,
    label:audit.capsuleLabel==="WEEK 5 · RIVALRIES",
    matchup:audit.capsuleMatchup==="BEARS @ PACKERS",
    hero:audit.heroPrimary==="BEARS" && audit.heroSecondary==="@ PACKERS",
    logo:audit.logoSrc.endsWith("PMX_LOGO_HISTORICO_HORIZONTAL_CANVA_MASTER_V1.1.svg"),
    quinielaW5:audit.quinielaHidden && audit.quinielaWeek==="WEEK 5" && audit.quinielaUrl.endsWith("/quiniela/w05/") && !audit.staleWeek4Visible,
    socials:audit.socialCount===5,
    noOverflow:!audit.horizontalOverflow,
    noPageErrors:pageErrors.length===0,
    noConsoleErrors:consoleErrors.length===0,
    noHttpErrors:httpErrors.length===0,
    noLocalRequestFailures:failedSameOrigin.length===0
  };

  const pass=Object.values(checks).every(Boolean);
  if(!pass) failed=true;
  reports.push({target:target.name,pass,checks,audit,consoleErrors,pageErrors,httpErrors,failedSameOrigin});
  await page.close();
}

await browser.close();
fs.writeFileSync("qa-artifacts/report.json",JSON.stringify(reports,null,2));
console.log(JSON.stringify(reports,null,2));
if(failed) process.exit(1);
