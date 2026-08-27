---
name: dicebear-image-generator
description: Generate deterministic DiceBear avatar image files or integrate DiceBear into an application. Use for avatar generation, style discovery, DiceBear URL construction, and current DiceBear library/API code; do not use for free-form image generation.
---

# DiceBear Image Generator

Use DiceBear 10.x. For direct image generation, prefer the bundled HTTP API helper; it validates live style and option metadata before saving the image:

```bash
python3 "$SKILL_DIR/scripts/dicebear_avatar.py" styles
python3 "$SKILL_DIR/scripts/dicebear_avatar.py" options lorelei
python3 "$SKILL_DIR/scripts/dicebear_avatar.py" generate \
  --style lorelei \
  --seed 'user-123' \
  --output ./avatar.svg \
  --option backgroundColor=b6e3f4 \
  --option borderRadius=50
```

Resolve `$SKILL_DIR/scripts/dicebear_avatar.py` relative to this `SKILL.md`, not the user's working directory. Preserve the user's seed exactly; the same style, seed, options, and DiceBear version produce deterministic output. If no style is specified, inspect `styles` and choose one that fits the request. Prefer SVG unless the consumer requires a raster format. Public API raster output is limited to 256 x 256 pixels.

## Current API rules

- Before writing DiceBear integration code, read <https://www.dicebear.com/llms.txt> and the relevant style page or live `options.json`.
- HTTP API: `https://api.dicebear.com/10.x/<style>/svg?seed=<seed>`. The seed and every option are query parameters; array values are comma-separated.
- Component options end in `Variant`, such as `eyesVariant`, not `eyes`. Unknown HTTP parameters are silently ignored, so verify option names rather than guessing.
- Do not use pre-10 forms: `avatars.dicebear.com`, `/api/<style>/<seed>.svg`, `@dicebear/collection`, individual JavaScript style packages, `createAvatar()`, `radius`, or unsuffixed component options.
- For application code, use the native DiceBear 10 core matching the project's language. Do not introduce JavaScript into a non-JavaScript project just to generate avatars.

## Delivery and licensing

Save the requested artifact at the user's target path and show or link it when the environment supports previews. Report the style, seed, and non-default options so the image can be reproduced.

DiceBear software and avatar artwork do not share one license. Before publishing or using an avatar commercially, check the selected style at <https://www.dicebear.com/licenses/> and include attribution when its license requires it. The public HTTP API is intended for non-commercial use and is rate-limited; for commercial use, high volume, or availability guarantees, use a native library, the DiceBear CLI, or a self-hosted API.
