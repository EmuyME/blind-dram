"""
Excel の A 列（地域）と C 列（蒸留所名）から
lib/data/distillery-by-region.ts を再生成する。

使用例:
  python scripts/generate-distillery-from-xlsx.py path/to/250522_蒸留所名表記ゆれ.xlsx

openpyxl が必要: pip install openpyxl
"""
from __future__ import annotations

import sys
from collections import defaultdict
from pathlib import Path


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python scripts/generate-distillery-from-xlsx.py <path-to-xlsx>", file=sys.stderr)
        sys.exit(1)
    xlsx = Path(sys.argv[1]).resolve()
    if not xlsx.is_file():
        print(f"File not found: {xlsx}", file=sys.stderr)
        sys.exit(1)

    try:
        import openpyxl
    except ImportError:
        print("pip install openpyxl", file=sys.stderr)
        sys.exit(1)

    wb = openpyxl.load_workbook(str(xlsx), read_only=True, data_only=True)
    ws = wb.active
    by_region: dict[str, list[str]] = defaultdict(list)
    for row in ws.iter_rows(min_col=1, max_col=3, values_only=True):
        a, _, c = row[0], row[1], row[2]
        if a is None or c is None:
            continue
        sa, sc = str(a).strip(), str(c).strip()
        if sa == "地域" or not sa or not sc:
            continue
        by_region[sa].append(sc)
    wb.close()

    for k in by_region:
        seen: set[str] = set()
        uniq: list[str] = []
        for x in by_region[k]:
            if x not in seen:
                seen.add(x)
                uniq.append(x)
        by_region[k] = sorted(uniq)

    regions = sorted(by_region.keys())
    root = Path(__file__).resolve().parents[1]
    out = root / "lib" / "data" / "distillery-by-region.ts"

    lines: list[str] = []
    lines.append("/**")
    lines.append(f" * 蒸留所候補（地域 → 名称）")
    lines.append(f" * 自動生成: {xlsx.name} の A列=地域, C列=蒸留所名（日）")
    lines.append(f" * 再生成: python scripts/generate-distillery-from-xlsx.py \"{xlsx}\"")
    lines.append(" */")
    lines.append("export const DISTILLERY_REGIONS_ORDER = [")
    for r in regions:
        lines.append(f"  {repr(r)},")
    lines.append("] as const;")
    lines.append("")
    lines.append("export const DISTILLERY_BY_REGION: Record<string, readonly string[]> = {")

    for r in regions:
        lines.append(f"  {repr(r)}: [")
        for d in by_region[r]:
            lines.append(f"    {repr(d)},")
        lines.append("  ],")

    lines.append("} as const;")
    lines.append("")
    lines.append("export type DistillerySheetRegion = (typeof DISTILLERY_REGIONS_ORDER)[number];")
    lines.append("")

    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
