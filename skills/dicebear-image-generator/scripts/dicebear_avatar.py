#!/usr/bin/env python3
"""Discover and download DiceBear 10.x avatars through the public HTTP API."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen


API_ROOT = "https://api.dicebear.com/10.x"
FORMATS = {"svg", "png", "jpg", "jpeg", "webp", "avif"}
STYLE_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
USER_AGENT = "Codex-DiceBear-Skill/1.0"


def fetch(url: str) -> tuple[bytes, str]:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(request, timeout=30) as response:
            return response.read(), response.headers.get("Content-Type", "")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace").strip()
        if exc.code == 429:
            raise RuntimeError("DiceBear rate limit reached; retry later or self-host the API.") from exc
        raise RuntimeError(f"DiceBear returned HTTP {exc.code}: {detail or exc.reason}") from exc
    except URLError as exc:
        raise RuntimeError(f"Could not reach DiceBear: {exc.reason}") from exc


def fetch_json(url: str) -> dict:
    body, _ = fetch(url)
    try:
        value = json.loads(body)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"DiceBear returned invalid JSON from {url}") from exc
    if not isinstance(value, dict):
        raise RuntimeError(f"DiceBear returned unexpected JSON from {url}")
    return value


def validate_style(style: str) -> None:
    if not STYLE_RE.fullmatch(style):
        raise RuntimeError("Style names must be lowercase kebab-case.")
    styles = fetch_json(API_ROOT).get("styles", [])
    if style not in styles:
        raise RuntimeError(f"Unknown DiceBear 10.x style: {style}")


def parse_options(values: list[str]) -> dict[str, str]:
    options: dict[str, str] = {}
    for value in values:
        key, separator, option_value = value.partition("=")
        if not separator or not key or not option_value:
            raise RuntimeError(f"Option must use key=value syntax: {value}")
        if key == "seed":
            raise RuntimeError("Pass the seed with --seed, not --option.")
        if key in options:
            raise RuntimeError(f"Option provided more than once: {key}")
        options[key] = option_value
    return options


def validate_options(style: str, options: dict[str, str]) -> None:
    supported = fetch_json(f"{API_ROOT}/{quote(style, safe='')}/options.json")
    unknown = sorted(set(options) - set(supported))
    if unknown:
        raise RuntimeError(
            "Unsupported option name(s): "
            + ", ".join(unknown)
            + ". Run the options command to inspect exact names and values."
        )


def command_styles() -> None:
    styles = fetch_json(API_ROOT).get("styles")
    if not isinstance(styles, list):
        raise RuntimeError("DiceBear style listing has an unexpected shape.")
    print("\n".join(str(style) for style in styles))


def command_options(style: str) -> None:
    validate_style(style)
    options = fetch_json(f"{API_ROOT}/{quote(style, safe='')}/options.json")
    print(json.dumps(options, indent=2, sort_keys=True))


def command_generate(args: argparse.Namespace) -> None:
    validate_style(args.style)
    options = parse_options(args.option)
    validate_options(args.style, options)

    output = Path(args.output).expanduser()
    file_format = output.suffix.lower().lstrip(".")
    if file_format not in FORMATS:
        raise RuntimeError(
            "Output extension must be .svg, .png, .jpg, .jpeg, .webp, or .avif."
        )
    endpoint_format = "jpg" if file_format == "jpeg" else file_format
    query = urlencode({"seed": args.seed, **options}, safe=",")
    url = f"{API_ROOT}/{quote(args.style, safe='')}/{endpoint_format}?{query}"
    body, content_type = fetch(url)
    if content_type.startswith("application/json"):
        raise RuntimeError(f"DiceBear returned JSON instead of an image: {body.decode(errors='replace')}")

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(body)
    print(f"Saved {output.resolve()}")
    print(f"Source {url}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)

    commands.add_parser("styles", help="List live DiceBear 10.x style names")

    options = commands.add_parser("options", help="Print live options for one style")
    options.add_argument("style")

    generate = commands.add_parser("generate", help="Generate one avatar image")
    generate.add_argument("--style", required=True)
    generate.add_argument("--seed", required=True)
    generate.add_argument("--output", required=True)
    generate.add_argument(
        "--option",
        action="append",
        default=[],
        metavar="KEY=VALUE",
        help="DiceBear option; repeat for multiple options",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        if args.command == "styles":
            command_styles()
        elif args.command == "options":
            command_options(args.style)
        else:
            command_generate(args)
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
