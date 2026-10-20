const { chromium } = require("/opt/node22/lib/node_modules/playwright");
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const p = await b.newPage({ viewport: { width: 800, height: 900 }, deviceScaleFactor: 2 });
  await p.goto("file:///home/user/anatomy-tryouts/drs-blog/charts.html");
  for (const id of ["figure-1-overtakes", "figure-3-teams-vs-rules", "figure-2-speed"]) await (await p.$("#" + id)).screenshot({ path: "/home/user/anatomy-tryouts/drs-blog/" + id + ".png" });
  await b.close();
})();
