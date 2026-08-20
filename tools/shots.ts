/**
 * Captures the card thumbnail of one or more experiments.
 *
 *   bun tools/shots.ts             every experiment of the manifest
 *   bun tools/shots.ts jarvis      only this one
 *
 * The page is served from dist/, so build first. Per-experiment options live
 * in experiments.json under "shot": a URL fragment, a wait in milliseconds,
 * whether to click (some experiments open on a title screen worth keeping,
 * others need the click to start), and whether to keep the pointer moving
 * during that wait (some only come alive while someone is there).
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const DIST = join(ROOT, "dist");
const OUT = join(ROOT, "site", "public", "thumbs");
const PORT = 4321;

/** Rendered at 1200 wide, downscaled to 800: the layout stays desktop. */
const WIDTH = 1200;
const HEIGHT = 750;
const THUMB_WIDTH = 800;
const THUMB_HEIGHT = 500;

type Shot = { hash?: string; wait?: number; click?: boolean; move?: boolean };
type Experiment = { slug: string; shot?: Shot };

if (!existsSync(join(DIST, "index.html"))) {
  throw new Error(`${DIST} is empty: run "sh build.sh" first`);
}

const manifest: Experiment[] = await Bun.file(join(ROOT, "experiments.json")).json();
const wanted = process.argv.slice(2);
const targets = wanted.length ? manifest.filter((e) => wanted.includes(e.slug)) : manifest;

if (targets.length === 0) {
  throw new Error(`no experiment matches ${wanted.join(", ")}`);
}

const server = Bun.serve({
  port: PORT,
  routes: { "/*": { dir: DIST } },
  fetch: () => new Response("not found", { status: 404 }),
});

for (const { slug, shot = {} } of targets) {
  const { hash = "", wait = 7000, click = true, move = false } = shot;
  /** The constructor sizes the window; resize() sizes the viewport itself. */
  const view = new Bun.WebView({ headless: true, width: WIDTH, height: HEIGHT });
  try {
    await view.navigate(`http://localhost:${PORT}/${slug}/${hash ? `#${hash}` : ""}`);
    await view.resize(WIDTH, HEIGHT);
    await Bun.sleep(6000);
    if (click) await view.click(WIDTH / 2, HEIGHT / 2);
    if (move) {
      const steps = Math.max(1, Math.round(wait / 120));
      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 4;
        await view.cdp("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: WIDTH / 2 + Math.cos(angle) * WIDTH * 0.17,
          y: HEIGHT / 2 + Math.sin(angle) * HEIGHT * 0.17,
        });
        await Bun.sleep(120);
      }
    } else {
      await Bun.sleep(wait);
    }
    const target = join(OUT, `${slug}.webp`);
    const frame = new Bun.Image(await view.screenshot());
    await frame.resize(THUMB_WIDTH, THUMB_HEIGHT).webp({ quality: 82 }).write(target);
    console.log(`ok   ${slug} (${Math.round(Bun.file(target).size / 1024)} kB)`);
  } catch (error) {
    console.log(`fail ${slug}: ${(error as Error).message}`);
  }
  await view.close();
}

server.stop(true);
