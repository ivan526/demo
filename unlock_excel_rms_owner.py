#!/usr/bin/env python3
"""
Windows 下 Excel RMS/IRM 文件的“有权限导出”辅助脚本。

重要说明：
  - 本脚本不会破解、绕过、爆破或规避 RMS/IRM 权限保护。
  - 脚本只通过本机已安装的 Microsoft Excel 桌面版 COM 自动化接口打开文件。
  - 只有当前 Windows/Office 登录账号本来就被组织策略授权移除 IRM 时，
    Excel 的 Permission.RemoveAll() 调用才会成功。
  - 典型适用场景：文件 owner、被授权管理员或被组织策略允许导出的账号，
    需要批量把自己有权限处理的 Excel 文件导出到另一个目录。

运行要求：
  - Windows 系统
  - 已安装 Microsoft Excel 桌面版
  - PowerShell 可用
  - 当前 Windows/Office 用户必须对目标文件具备相应权限

使用示例：
  python unlock_excel_rms_owner.py report.xlsx --output report-unprotected.xlsx
  python unlock_excel_rms_owner.py C:\\docs --output C:\\exported
  python unlock_excel_rms_owner.py C:\\docs --dry-run
  python unlock_excel_rms_owner.py C:\\docs --output C:\\exported --report C:\\exported\\report.json
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable

# 只处理常见 Excel 工作簿格式；如果后续需要支持其它格式，可在这里扩展。
EXCEL_EXTENSIONS = {".xlsx", ".xlsm", ".xlsb", ".xls"}


@dataclass(frozen=True)
class ExportResult:
    """单个文件调用 Excel COM 导出后的原始结果。"""

    source: Path  # 源 Excel 文件路径
    target: Path  # 导出后的目标文件路径
    ok: bool  # True 表示 Excel/PowerShell 处理成功
    message: str  # 成功提示或失败原因


@dataclass(frozen=True)
class ReportEntry:
    """最终报告中的单条文件处理记录。"""

    source: Path  # 源 Excel 文件路径
    target: Path  # 计划写入或实际写入的目标路径
    status: str  # success / failed / skipped / planned
    reason: str  # 状态说明；失败和跳过时这里会包含具体原因


def is_windows() -> bool:
    """判断当前 Python 是否运行在 Windows 上。"""
    return os.name == "nt"


def ps_literal(value: str) -> str:
    """把普通字符串转成 PowerShell 单引号字符串字面量。

    Windows 路径中可能包含空格、括号或其它字符；用单引号包裹能减少转义
    问题。PowerShell 单引号字符串内部的单引号需要写成两个单引号。
    """
    return "'" + value.replace("'", "''") + "'"


def default_output_root(source_root: Path) -> Path:
    """目录批处理模式下的默认输出目录。

    例如输入目录是 C:\\docs，则默认输出到同级的 C:\\docs_unprotected，
    避免把导出的未保护副本写回源目录导致覆盖或混淆。
    """
    return source_root.parent / f"{source_root.name}_unprotected"


def is_relative_to(path: Path, parent: Path) -> bool:
    """兼容性封装：判断 path 是否位于 parent 目录树下。"""
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


def is_excel_file(path: Path) -> bool:
    """判断路径是否是需要处理的 Excel 文件。

    Excel 打开文件时会生成类似 '~$xxx.xlsx' 的临时锁文件，这类文件不是
    真实工作簿，必须跳过，否则批量处理时容易报错。
    """
    return path.is_file() and not path.name.startswith("~$") and path.suffix.lower() in EXCEL_EXTENSIONS


def iter_excel_files(path: Path, output_root: Path | None = None) -> Iterable[Path]:
    """遍历输入文件或目录，产出所有需要处理的 Excel 文件。

    - 输入是单个文件时：只有扩展名匹配且不是临时锁文件才会产出。
    - 输入是目录时：默认递归遍历该目录及所有子目录。
    - 如果 output_root 位于输入目录内部，则遍历时跳过 output_root，避免把
      刚导出的文件再次当作源文件处理。
    """
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
    """根据输入模式计算单个源文件对应的输出路径。

    目录模式会保留源目录中的相对子目录结构：
      source_root/a/b/test.xlsx -> output/a/b/test.xlsx

    单文件模式下，如果没有指定 --output，则默认在源文件旁边生成
    '<原文件名>.unprotected<扩展名>'。
    """
    if directory_mode:
        output_root = output if output is not None else default_output_root(source_root)
        return output_root / source.relative_to(source_root)

    if output is None:
        return source.with_name(f"{source.stem}.unprotected{source.suffix}")
    if output.is_dir() or str(output).endswith(("/", "\\")):
        return output / source.name
    return output


def build_powershell_script(input_file: Path, output_file: Path) -> str:
    """生成实际调用 Excel COM 的 PowerShell 脚本。

    Python 负责文件遍历、路径计算和报告汇总；真正打开 Excel 工作簿并尝试
    移除 IRM 权限的动作在 PowerShell 中完成，因为 Windows 上 Excel COM
    自动化接口对 PowerShell 支持较直接。
    """
    input_literal = ps_literal(str(input_file))
    output_literal = ps_literal(str(output_file))
    return f"""
$ErrorActionPreference = 'Stop'
$excel = $null
$workbook = $null
try {{
    # 启动本机 Excel COM 对象。这里使用的是当前 Windows/Office 登录身份，
    # 不会也不能伪造其它用户身份。
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false

    # 第三个参数为 $false 表示不以只读方式打开，便于后续 SaveAs。
    $workbook = $excel.Workbooks.Open({input_literal}, $false, $false)

    $permissionWasEnabled = $false
    try {{
        $permissionWasEnabled = [bool]$workbook.Permission.Enabled
        if ($permissionWasEnabled) {{
            # 这是 Office 公开的授权 API 调用：只有当前 Office 身份被策略允许
            # 移除 IRM/RMS 权限时才会成功；权限不足会抛异常并进入失败报告。
            $workbook.Permission.RemoveAll()
        }}
    }} catch {{
        throw "Excel opened the workbook, but IRM permissions could not be removed for the current user: $($_.Exception.Message)"
    }}

    # 保留原工作簿格式，避免 xls/xlsx/xlsm/xlsb 之间发生意外格式转换。
    $format = $workbook.FileFormat
    $workbook.SaveAs({output_literal}, $format)
    $workbook.Close($false)
    $workbook = $null

    # 用 JSON 输出结构化结果，方便 Python 端解析。
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
    # 确保 Excel 进程和 COM 对象被释放，减少批量处理后残留 EXCEL.EXE 的概率。
    if ($excel -ne $null) {{
        try {{ $excel.Quit() | Out-Null }} catch {{ }}
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
    }}
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}}
"""


def export_with_excel(input_file: Path, output_file: Path, timeout: int) -> ExportResult:
    """对单个 Excel 文件执行导出。

    返回 ExportResult，而不是直接抛异常，便于批量模式下一个文件失败后继续
    处理其它文件，并在最后统一生成结果报告。
    """
    output_file.parent.mkdir(parents=True, exist_ok=True)
    script = build_powershell_script(input_file.resolve(), output_file.resolve())
    try:
        completed = subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return ExportResult(input_file, output_file, False, f"Timed out after {timeout} seconds")

    stdout = completed.stdout.strip()
    message = completed.stderr.strip() or stdout or f"PowerShell exited with {completed.returncode}"
    ok = completed.returncode == 0

    # PowerShell 脚本最后一行会输出 JSON；如果解析失败，则保留原始 stdout/stderr
    # 作为错误信息，方便定位 Excel COM 或 PowerShell 异常。
    if stdout:
        last_line = stdout.splitlines()[-1]
        try:
            payload = json.loads(last_line)
            ok = bool(payload.get("ok", ok)) and completed.returncode == 0
            message = str(payload.get("message", message))
        except json.JSONDecodeError:
            pass

    return ExportResult(input_file, output_file, ok, message)


def report_entry_to_dict(entry: ReportEntry) -> dict[str, str]:
    """把报告记录转换为可 JSON 序列化的字典。"""
    return {
        "source": str(entry.source),
        "target": str(entry.target),
        "status": entry.status,
        "reason": entry.reason,
    }


def print_report(entries: list[ReportEntry]) -> None:
    """在控制台打印本次处理的汇总报告。"""
    counts = {"success": 0, "failed": 0, "skipped": 0, "planned": 0}
    for entry in entries:
        if entry.status in counts:
            counts[entry.status] += 1

    print("\n=== Result Report ===")
    print(f"Total: {len(entries)}")
    print(f"Success: {counts['success']}")
    print(f"Failed: {counts['failed']}")
    print(f"Skipped: {counts['skipped']}")
    print(f"Planned: {counts['planned']}")

    if counts["success"]:
        print("\nSuccessful files:")
        for entry in entries:
            if entry.status == "success":
                print(f"  OK    {entry.source} -> {entry.target}")

    if counts["failed"]:
        print("\nFailed files:")
        for entry in entries:
            if entry.status == "failed":
                print(f"  FAIL  {entry.source} -> {entry.target}: {entry.reason}")

    if counts["skipped"]:
        print("\nSkipped files:")
        for entry in entries:
            if entry.status == "skipped":
                print(f"  SKIP  {entry.source} -> {entry.target}: {entry.reason}")

    if counts["planned"]:
        print("\nPlanned files:")
        for entry in entries:
            if entry.status == "planned":
                print(f"  PLAN  {entry.source} -> {entry.target}")


def write_report(report_path: Path, entries: list[ReportEntry]) -> None:
    """把处理结果写入 JSON 报告文件。

    JSON 报告适合后续用脚本读取、归档或发送给其它流程。控制台报告和 JSON
    报告使用同一批 ReportEntry 数据，确保两者内容一致。
    """
    report_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "summary": {
            "total": len(entries),
            "success": sum(1 for entry in entries if entry.status == "success"),
            "failed": sum(1 for entry in entries if entry.status == "failed"),
            "skipped": sum(1 for entry in entries if entry.status == "skipped"),
            "planned": sum(1 for entry in entries if entry.status == "planned"),
        },
        "files": [report_entry_to_dict(entry) for entry in entries],
    }
    report_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nReport written to: {report_path}")


def parse_args(argv: list[str]) -> argparse.Namespace:
    """解析命令行参数。"""
    parser = argparse.ArgumentParser(
        description=(
            "通过本机 Excel COM API 导出 Excel 文件；仅当当前登录账号被策略授权时才会移除 IRM。"
        )
    )
    parser.add_argument("input", type=Path, help="要处理的 Excel 文件或目录")
    parser.add_argument("--output", "-o", type=Path, help="输出文件或输出目录")
    parser.add_argument(
        "--recursive",
        "-r",
        action="store_true",
        help="兼容旧版本的参数；目录输入现在始终递归处理",
    )
    parser.add_argument("--overwrite", action="store_true", help="允许覆盖已存在的输出文件")
    parser.add_argument("--timeout", type=int, default=120, help="每个文件的处理超时时间（秒）")
    parser.add_argument("--dry-run", action="store_true", help="只显示计划，不打开 Excel、不写出文件")
    parser.add_argument("--report", type=Path, help="可选：把逐文件处理结果写入 JSON 报告")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    """脚本入口：完成参数校验、批量处理和结果报告。"""
    args = parse_args(argv)
    source_root = args.input.expanduser()
    output = args.output.expanduser() if args.output else None

    # 先验证输入路径，避免后续逻辑给出不明确的错误。
    if not source_root.exists():
        print(f"Input does not exist: {source_root}", file=sys.stderr)
        return 2

    directory_mode = source_root.is_dir()
    output_root = output if directory_mode and output is not None else None
    files = list(iter_excel_files(source_root, output_root))
    if not files:
        print("No Excel files found.", file=sys.stderr)
        return 1

    # 非 dry-run 时才创建输出目录，避免用户只是预览时产生新目录。
    batch_mode = directory_mode or len(files) > 1
    if not args.dry_run:
        if directory_mode:
            (output if output is not None else default_output_root(source_root)).mkdir(parents=True, exist_ok=True)
        elif batch_mode and output is not None:
            output.mkdir(parents=True, exist_ok=True)

    # Excel COM 只在 Windows 上可用；dry-run 不需要调用 COM，因此允许在其它系统预览。
    if not is_windows() and not args.dry_run:
        print("This script must run on Windows because it requires Excel COM automation.", file=sys.stderr)
        return 2

    entries: list[ReportEntry] = []
    failures = 0
    for source in files:
        target = target_for_file(source, source_root, output, directory_mode)

        # 防止用户把输出路径设置为源文件本身，即使传了 --overwrite 也不允许。
        if source.resolve() == target.resolve():
            failures += 1
            reason = "refusing to overwrite source file; choose a different --output"
            entries.append(ReportEntry(source, target, "skipped", reason))
            print(f"SKIP  {source} -> {target} ({reason})")
            continue

        # 默认不覆盖已有输出，避免误删已有导出结果；需要覆盖时显式传 --overwrite。
        if target.exists() and not args.overwrite:
            failures += 1
            reason = "target exists; use --overwrite"
            entries.append(ReportEntry(source, target, "skipped", reason))
            print(f"SKIP  {source} -> {target} ({reason})")
            continue

        # dry-run 只记录计划，不会启动 Excel，也不会创建目标文件。
        if args.dry_run:
            entries.append(ReportEntry(source, target, "planned", "dry run; not processed"))
            print(f"PLAN  {source} -> {target}")
            continue

        # 实际调用 Excel COM 处理文件，并把成功/失败都纳入最终报告。
        result = export_with_excel(source, target, args.timeout)
        status = "OK" if result.ok else "FAIL"
        entry_status = "success" if result.ok else "failed"
        entries.append(ReportEntry(result.source, result.target, entry_status, result.message))
        print(f"{status}  {result.source} -> {result.target}: {result.message}")
        if not result.ok:
            failures += 1

    print_report(entries)
    if args.report is not None:
        write_report(args.report.expanduser(), entries)

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
