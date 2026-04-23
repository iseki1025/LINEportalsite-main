# Agent Instructions

This project contains Japanese text and must be edited as UTF-8.

Before editing Japanese files:

- Do not trust PowerShell `Get-Content` output as the source of truth for Japanese text.
- Read text files with an explicit UTF-8 decoder, for example `python -c` / Python scripts using `encoding="utf-8"`.
- Prefer small patches over whole-file rewrites.
- Never replace Japanese text with mojibake marker sequences.
- If a file appears garbled in terminal output, verify it with an explicit UTF-8 read before editing.
- Do not use `Set-Content` or `Out-File` without an explicit encoding.
- Keep site source files as UTF-8 without BOM unless there is a deliberate reason otherwise.

Useful check:

```powershell
python scripts/check_text_encoding.py
```

If the check reports non-UTF-8 files or suspicious mojibake, stop and fix the encoding issue before making unrelated edits.
