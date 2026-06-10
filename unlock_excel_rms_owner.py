#!/usr/bin/env python3
"""
Owner-authorized Excel RMS/IRM export helper for Windows.

This script does not crack, bypass, or brute-force RMS/IRM protection. It uses the
locally installed Microsoft Excel COM automation API with the currently signed-in
Windows/Office account. Removing IRM permissions only succeeds when Excel and the
organization's policy already allow that account to do so, for example for the
file owner or an administrator with appropriate rights.

Requirements:
  - Windows
  - Microsoft Excel desktop app installed
  - PowerShell available on PATH
  - The current Windows/Office user must be authorized for the protected file

Examples:
  python unlock_excel_rms_owner.py report.xlsx --output report-unprotected.xlsx
  python unlock_excel_rms_owner.py C:\\docs --output C:\\exported
  python unlock_excel_rms_owner.py C:\\docs --dry-run
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

EXCEL_EXTENSIONS = {".xlsx", ".xlsm", ".xlsb", ".xls"}


@dataclass(frozen=True)
class ExportResult:
    source: Path
    target: Path
    ok: bool
    message: str


def is_windows() -> bool:
    return os.name == "nt"


def ps_literal(value: str) -> str:
    """Return a single-quoted PowerShell string literal."""
    return "'" + value.replace("'", "''") + "'"


def default_output_root(source_root: Path) -> Path:
    """Return the default output directory for directory mode."""
    return source_root.parent / f"{source_root.name}_unprotected"


def is_relative_to(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


def is_excel_file(path: Path) -> bool:
    return path.is_file() and not path.name.startswith("~$") and path.suffix.lower() in EXCEL_EXTENSIONS


def iter_excel_files(path: Path, output_root: Path | None = None) -> Iterable[Path]:
    if path.is_file():
        if is_excel_file(path):
            yield path
        return

    resolved_output = output_root.resolve() if output_root is not None and output_root.exists() else None
    for item in sorted(path.rglob("*")):
        if resolved_output is not None and is_relative_to(item.resolve(), resolved_output):
            continue
        if is_excel_file(item):
            yield item


def target_for_file(source: Path, source_root: Path, output: Path | None, directory_mode: bool) -> Path:
    if directory_mode:
        output_root = output if output is not None else default_output_root(source_root)
        return output_root / source.relative_to(source_root)

    if output is None:
        return source.with_name(f"{source.stem}.unprotected{source.suffix}")
    if output.is_dir() or str(output).endswith(("/", "\\")):
        return output / source.name
    return output


def build_powershell_script(input_file: Path, output_file: Path) -> str:
    input_literal = ps_literal(str(input_file))
    output_literal = ps_literal(str(output_file))
    return f"""
$ErrorActionPreference = 'Stop'
$excel = $null
$workbook = $null
try {{
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false

    $workbook = $excel.Workbooks.Open({input_literal}, $false, $false)

    $permissionWasEnabled = $false
    try {{
        $permissionWasEnabled = [bool]$workbook.Permission.Enabled
        if ($permissionWasEnabled) {{
            # This is an authorized Office API call. It only succeeds when the
            # current Office identity has policy permission to remove IRM.
            $workbook.Permission.RemoveAll()
        }}
    }} catch {{
        throw "Excel opened the workbook, but IRM permissions could not be removed for the current user: $($_.Exception.Message)"
    }}

    $format = $workbook.FileFormat
    $workbook.SaveAs({output_literal}, $format)
    $workbook.Close($false)
    $workbook = $null

    $payload = @{{ ok = $true; permissionWasEnabled = $permissionWasEnabled; message = 'Exported successfully' }} | ConvertTo-Json -Compress
    Write-Output $payload
}} catch {{
    if ($workbook -ne $null) {{
        try {{ $workbook.Close($false) | Out-Null }} catch {{ }}
    }}
    $payload = @{{ ok = $false; message = $_.Exception.Message }} | ConvertTo-Json -Compress
    Write-Output $payload
    exit 1
}} finally {{
    if ($excel -ne $null) {{
        try {{ $excel.Quit() | Out-Null }} catch {{ }}
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
    }}
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}}
"""


def export_with_excel(input_file: Path, output_file: Path, timeout: int) -> ExportResult:
    output_file.parent.mkdir(parents=True, exist_ok=True)
    script = build_powershell_script(input_file.resolve(), output_file.resolve())
    completed = subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )

    stdout = completed.stdout.strip()
    message = completed.stderr.strip() or stdout or f"PowerShell exited with {completed.returncode}"
    ok = completed.returncode == 0

    if stdout:
        last_line = stdout.splitlines()[-1]
        try:
            payload = json.loads(last_line)
            ok = bool(payload.get("ok", ok)) and completed.returncode == 0
            message = str(payload.get("message", message))
        except json.JSONDecodeError:
            pass

    return ExportResult(input_file, output_file, ok, message)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Export Excel files through the local Excel COM API and remove IRM "
            "only when the current signed-in account is authorized by policy."
        )
    )
    parser.add_argument("input", type=Path, help="Excel file or directory to process")
    parser.add_argument("--output", "-o", type=Path, help="Output file or directory")
    parser.add_argument(
        "--recursive",
        "-r",
        action="store_true",
        help="Deprecated compatibility flag; directory inputs are always processed recursively",
    )
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing output files")
    parser.add_argument("--timeout", type=int, default=120, help="Timeout per file in seconds")
    parser.add_argument("--dry-run", action="store_true", help="Show planned work without opening Excel")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    source_root = args.input.expanduser()
    output = args.output.expanduser() if args.output else None

    if not source_root.exists():
        print(f"Input does not exist: {source_root}", file=sys.stderr)
        return 2

    directory_mode = source_root.is_dir()
    output_root = output if directory_mode and output is not None else None
    files = list(iter_excel_files(source_root, output_root))
    if not files:
        print("No Excel files found.", file=sys.stderr)
        return 1

    batch_mode = directory_mode or len(files) > 1
    if not args.dry_run:
        if directory_mode:
            (output if output is not None else default_output_root(source_root)).mkdir(parents=True, exist_ok=True)
        elif batch_mode and output is not None:
            output.mkdir(parents=True, exist_ok=True)

    if not is_windows() and not args.dry_run:
        print("This script must run on Windows because it requires Excel COM automation.", file=sys.stderr)
        return 2

    failures = 0
    for source in files:
        target = target_for_file(source, source_root, output, directory_mode)
        if source.resolve() == target.resolve():
            failures += 1
            print(f"SKIP  {source} -> {target} (refusing to overwrite source file; choose a different --output)")
            continue

        if target.exists() and not args.overwrite:
            failures += 1
            print(f"SKIP  {source} -> {target} (target exists; use --overwrite)")
            continue

        if args.dry_run:
            print(f"PLAN  {source} -> {target}")
            continue

        result = export_with_excel(source, target, args.timeout)
        status = "OK" if result.ok else "FAIL"
        print(f"{status}  {result.source} -> {result.target}: {result.message}")
        if not result.ok:
            failures += 1

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
