import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { type Plugin, defineConfig } from "vite";

type Experiment = {
  slug: string;
  title: string;
  line: string;
  stack: string;
};

const MANIFEST = fileURLToPath(new URL("../experiments.json", import.meta.url));

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function card({ slug, title, line, stack }: Experiment) {
  return `        <li>
          <a
            href="/${slug}/"
            class="group block overflow-hidden rounded-lg border border-border bg-card transition duration-300 hover:border-primary/40 hover:shadow-xl"
          >
            <span class="block overflow-hidden">
              <img
                src="/thumbs/${slug}.webp"
                alt=""
                width="800"
                height="500"
                loading="lazy"
                class="aspect-[8/5] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            </span>
            <span class="block p-5">
              <span class="flex items-baseline justify-between gap-3">
                <span
                  class="font-display text-lg font-semibold tracking-tight transition-colors group-hover:text-primary"
                  >${escape(title)}</span
                >
                <span
                  class="text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  aria-hidden="true"
                  >&rarr;</span
                >
              </span>
              <span class="mt-1 block text-sm leading-relaxed text-muted-foreground">
                ${escape(line)}
              </span>
              <span
                class="mt-3 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
              >
                ${escape(stack)}
              </span>
            </span>
          </a>
        </li>`;
}

/**
 * Turns experiments.json into the grid of cards. The same manifest drives
 * tools/shots.ts, so an experiment is described in exactly one place.
 */
function cards(): Plugin {
  return {
    name: "labs-cards",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const manifest: Experiment[] = JSON.parse(readFileSync(MANIFEST, "utf8"));
        return html.replace("<!-- cards -->", manifest.map(card).join("\n\n"));
      },
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), cards()],
  server: { port: 5190, strictPort: true },
});
