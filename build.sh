#!/bin/sh
# Builds every experiment into one static tree.
#
# A folder under experiments/ that has a package.json is built with Bun and
# contributes its dist/; any other folder is copied as is. Adding an
# experiment therefore means dropping a folder, nothing else.
set -eu

out="${1:-dist}"

rm -rf "$out"
mkdir -p "$out"
if [ -f site/package.json ]; then
  (cd site && bun install --frozen-lockfile && bun run build)
  cp -R site/dist/. "$out"/
else
  cp -R site/. "$out"/
fi

for dir in experiments/*/; do
  name=$(basename "$dir")
  if [ -f "$dir/package.json" ]; then
    (cd "$dir" && bun install --frozen-lockfile && bun run build)
    cp -R "$dir/dist" "$out/$name"
  else
    cp -R "$dir" "$out/$name"
  fi
done

# The analytics tag lives in one file and is injected into every page of the
# output. It must not contain an ampersand: awk reads one in a replacement as
# "the matched text".
if [ -s site/analytics.html ]; then
  snippet=$(tr -d '\n' < site/analytics.html)
  find "$out" -name '*.html' | while read -r page; do
    awk -v tag="$snippet" '{ sub(/<\/head>/, tag "</head>"); print }' "$page" > "$page.tmp"
    mv "$page.tmp" "$page"
  done
fi
rm -f "$out/analytics.html"

echo "built $(find "$out" -name index.html | wc -l) pages into $out"
