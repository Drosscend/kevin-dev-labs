/**
 * Captures the card thumbnail of one or more experiments.
 *
 *   bun tools/shots.ts             every experiment of the manifest
 *   bun tools/shots.ts jarvis      only this one
 *
 * The page is served from dist/, so build first. Per-experiment options live
 * in experiments.json under "shot": a URL fragment, a wait in milliseconds,
 * and whether to click (some experiments open on a title screen worth
 * keeping, others need the click to start).
 */
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const DIST = `${ROOT}dist`;
const OUT = `${ROOT}site/public/thumbs`;
const PORT = 4321;

/** Rendered at 1200 wide, captured at 800: the layout stays desktop. */
const WIDTH = 1200;
const HEIGHT = 750;
const SCALE = 2 / 3;

function chromePath() {
  const home = process.env.USERPROFILE ?? process.env.HOME;
  const cache = `${home}/.cache/puppeteer/chrome`;
  const versions = Array.from(new Bun.Glob("*/chrome-win64/chrome.exe").scanSync(cache))
    .concat(Array.from(new Bun.Glob("*/chrome-linux64/chrome").scanSync(cache)))
    .sort();
  if (versions.length === 0) {
    throw new Error(`no chrome in ${cache}: run "bunx puppeteer browsers install chrome"`);
  }
  return `${cache}/${versions[versions.length - 1]}`;
}

if (!existsSync(`${DIST}/index.html`)) {
  throw new Error(`${DIST} is empty: run "sh build.sh" first`);
}

const manifest = await Bun.file(`${ROOT}experiments.json`).json();
const wanted = process.argv.slice(2);
const targets = wanted.length
  ? manifest.filter((e: { slug: string }) => wanted.includes(e.slug))
  : manifest;

if (targets.length === 0) {
  throw new Error(`no experiment matches ${wanted.join(", ")}`);
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith("/")) path += "index.html";
    const file = Bun.file(DIST + path);
    return (await file.exists()) ? new Response(file) : new Response("not found", { status: 404 });
  },
});

const browser = await puppeteer.launch({
  executablePath: chromePath(),
  headless: true,
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--hide-scrollbars",
    "--mute-audio",
  ],
});

for (const experiment of targets) {
  const { slug, shot = {} } = experiment;
  const { hash = "", wait = 7000, click = true } = shot;
  const page = await browser.newPage();
  await page.setViewport({
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: SCALE,
  });
  try {
    const target = `http://localhost:${PORT}/${slug}/${hash ? `#${hash}` : ""}`;
    await page.goto(target, { waitUntil: "load", timeout: 60_000 });
    await Bun.sleep(6000);
    if (click) await page.mouse.click(WIDTH / 2, HEIGHT / 2);
    await Bun.sleep(wait);
    await page.screenshot({ path: `${OUT}/${slug}.webp`, type: "webp", quality: 82 });
    const size = Math.round(Bun.file(`${OUT}/${slug}.webp`).size / 1024);
    console.log(`ok   ${slug} (${size} kB)`);
  } catch (error) {
    console.log(`fail ${slug}: ${(error as Error).message}`);
  }
  await page.close();
}

await browser.close();
server.stop(true);
