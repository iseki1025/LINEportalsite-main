"""Create a reproducible inventory of the static site and its local references."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from collections import Counter, defaultdict
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit


REFERENCE_ATTRIBUTES = {"href", "src", "poster", "data-src", "action"}
IGNORED_SCHEMES = {"data", "http", "https", "javascript", "mailto", "tel"}
ASSET_SUFFIXES = {
    ".avif",
    ".bmp",
    ".gif",
    ".ico",
    ".jpeg",
    ".jpg",
    ".png",
    ".svg",
    ".webp",
}


class ReferenceParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.references: list[tuple[str, str, str]] = []
        self.inline_style_count = 0
        self.style_tag_count = 0
        self.script_tag_count = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if "style" in attributes:
            self.inline_style_count += 1
        if tag == "style":
            self.style_tag_count += 1
        if tag == "script":
            self.script_tag_count += 1
        for attribute in REFERENCE_ATTRIBUTES:
            value = attributes.get(attribute)
            if value:
                self.references.append((tag, attribute, value.strip()))


def tracked_files(root: Path) -> list[Path]:
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=root,
        check=True,
        capture_output=True,
    )
    return [root / name for name in result.stdout.decode("utf-8").split("\0") if name]


def classify(path: Path, root: Path) -> str:
    relative = path.relative_to(root).as_posix()
    name = path.name
    if relative.startswith("old_design/") or name in {"index_old.html", "style_old.css"}:
        return "old"
    if name.startswith("admin-") or name in {"admin.html", "migrate-csv-to-firestore.html"}:
        return "admin"
    if path.suffix.lower() == ".html":
        return "public"
    return "support"


def resolve_reference(source: Path, raw_value: str, root: Path) -> Path | None:
    if not raw_value or raw_value.startswith("#") or "${" in raw_value:
        return None
    parsed = urlsplit(raw_value)
    if parsed.scheme.lower() in IGNORED_SCHEMES or parsed.netloc:
        return None
    path_text = unquote(parsed.path)
    if not path_text:
        return None
    local_path = Path(*PurePosixPath(path_text.lstrip("/")).parts)
    if parsed.path.startswith("/"):
        return root / local_path
    return source.parent / local_path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    all_files = tracked_files(root)
    node_files = [
        path for path in all_files if path.relative_to(root).as_posix().startswith("node_modules/")
    ]
    files = [path for path in all_files if path not in node_files]
    counts = Counter()
    sizes = Counter()
    html_pages: dict[str, dict[str, object]] = {}
    local_references: list[dict[str, object]] = []
    referenced_paths: set[Path] = set()

    for path in files:
        suffix = path.suffix.lower() or "[no extension]"
        counts[suffix] += 1
        sizes[suffix] += path.stat().st_size

        if suffix != ".html":
            continue
        page_class = classify(path, root)
        html_parser = ReferenceParser()
        html_parser.feed(path.read_text(encoding="utf-8"))
        relative_source = path.relative_to(root).as_posix()
        html_pages[relative_source] = {
            "class": page_class,
            "inline_style_attributes": html_parser.inline_style_count,
            "style_tags": html_parser.style_tag_count,
            "script_tags": html_parser.script_tag_count,
        }
        for tag, attribute, value in html_parser.references:
            target = resolve_reference(path, value, root)
            if target is None:
                continue
            normalized = target.resolve(strict=False)
            try:
                relative_target = normalized.relative_to(root.resolve()).as_posix()
            except ValueError:
                relative_target = str(normalized)
            exists = normalized.exists()
            if exists and page_class != "old":
                referenced_paths.add(normalized)
            local_references.append(
                {
                    "source": relative_source,
                    "source_class": page_class,
                    "tag": tag,
                    "attribute": attribute,
                    "value": value,
                    "target": relative_target,
                    "exists": exists,
                }
            )

    css_url_pattern = re.compile(r"url\(\s*(['\"]?)(.*?)\1\s*\)", re.IGNORECASE)
    for path in files:
        if path.suffix.lower() != ".css":
            continue
        source_class = classify(path, root)
        for match in css_url_pattern.finditer(path.read_text(encoding="utf-8")):
            target = resolve_reference(path, match.group(2), root)
            if target is not None and target.resolve(strict=False).exists() and source_class != "old":
                referenced_paths.add(target.resolve(strict=False))

    hash_groups: defaultdict[str, list[str]] = defaultdict(list)
    for path in files:
        if path.is_file() and not path.as_posix().startswith((root / "node_modules").as_posix()):
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            hash_groups[digest].append(path.relative_to(root).as_posix())

    active_asset_files = [
        path
        for path in files
        if path.suffix.lower() in ASSET_SUFFIXES
        and not path.relative_to(root).as_posix().startswith("old_design/")
    ]
    report = {
        "totals_by_extension": {
            suffix: {"count": counts[suffix], "bytes": sizes[suffix]}
            for suffix in sorted(counts)
        },
        "tracked_node_modules": {
            "count": len(node_files),
            "bytes": sum(path.stat().st_size for path in node_files),
        },
        "html_pages": html_pages,
        "html_class_counts": dict(Counter(item["class"] for item in html_pages.values())),
        "broken_active_html_references": [
            ref for ref in local_references if ref["source_class"] != "old" and not ref["exists"]
        ],
        "broken_old_html_references": [
            ref for ref in local_references if ref["source_class"] == "old" and not ref["exists"]
        ],
        "unreferenced_image_candidates": [
            path.relative_to(root).as_posix()
            for path in active_asset_files
            if path.resolve() not in referenced_paths
        ],
        "duplicate_file_groups": [
            paths for paths in hash_groups.values() if len(paths) > 1
        ],
    }
    output = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        destination = args.output if args.output.is_absolute() else root / args.output
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(output, encoding="utf-8", newline="\n")
    else:
        print(output, end="")


if __name__ == "__main__":
    main()
