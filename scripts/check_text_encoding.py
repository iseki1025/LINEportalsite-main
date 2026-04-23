from pathlib import Path


TEXT_EXTENSIONS = {
    ".bat",
    ".css",
    ".csv",
    ".editorconfig",
    ".html",
    ".js",
    ".json",
    ".md",
    ".py",
    ".svg",
    ".txt",
}

SKIP_PARTS = {".git", "node_modules"}

MOJIBAKE_MARKERS = (
    "\u7e5d",
    "\u7e3a",
    "\u7e67",
    "\u8b41",
    "\u87b3",
    "\u8f63",
    "\u873f",
    "\u8373",
    "\u9aea",
    "\u9b1f",
    "\u86ef",
    "\u8b5b",
)


def is_text_path(path: Path) -> bool:
    return path.name == ".editorconfig" or path.suffix.lower() in TEXT_EXTENSIONS


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    failures = []

    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        if any(part in SKIP_PARTS for part in path.parts):
            continue
        if not is_text_path(path):
            continue

        rel = path.relative_to(root).as_posix()
        data = path.read_bytes()

        if data.startswith(b"\xff\xfe") or data.startswith(b"\xfe\xff"):
            failures.append((rel, "UTF-16 BOM detected"))
            continue
        if data.startswith(b"\xef\xbb\xbf"):
            failures.append((rel, "UTF-8 BOM detected"))
            data = data[3:]

        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError as exc:
            failures.append((rel, f"not valid UTF-8: {exc}"))
            continue

        crlf = data.count(b"\r\n")
        lf = data.count(b"\n") - crlf
        cr = data.count(b"\r") - crlf
        if (crlf and lf) or cr:
            failures.append((rel, f"mixed line endings: CRLF={crlf}, LF={lf}, CR={cr}"))

        marker_hits = [marker for marker in MOJIBAKE_MARKERS if marker in text]
        if marker_hits:
            failures.append((rel, "possible mojibake markers: " + ", ".join(marker_hits)))

    if failures:
        print("Encoding check failed:")
        for rel, reason in failures:
            print(f"- {rel}: {reason}")
        return 1

    print("Encoding check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
