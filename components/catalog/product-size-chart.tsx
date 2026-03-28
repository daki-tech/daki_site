"use client";

interface ProductSizeChartProps {
  sizeChart: string;
}

interface SizeChartRow {
  [key: string]: string | undefined;
}

const headerLabels: Record<string, string> = {
  size: "Розмір",
  chest: "Обхват грудей (см)",
  waist: "Обхват талії (см)",
  hips: "Обхват стегон (см)",
};

// Columns hidden from customers (admin-only data)
const HIDDEN_COLUMNS = new Set(["available", "в наявності"]);

function renderTable(headers: string[], dataRows: (string | undefined)[][]) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-xs font-semibold text-neutral-800 mb-6">
        <span className="text-base">📐</span> Таблиця розмірів
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={`pb-3 text-[11px] font-semibold text-neutral-400 ${i === 0 ? "text-left pl-1" : "text-center"}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rIdx) => (
              <tr key={rIdx} className="border-b border-neutral-100 last:border-b-0">
                {row.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    className={`py-4 ${cIdx === 0 ? "text-left pl-1 font-semibold text-neutral-900" : "text-center text-neutral-500 min-w-[60px]"}`}
                  >
                    {cell ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ProductSizeChart({ sizeChart }: ProductSizeChartProps) {
  // Try parsing as JSON array first (admin form saves JSON)
  let jsonRows: SizeChartRow[] | null = null;
  try {
    const parsed = JSON.parse(sizeChart);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object") {
      jsonRows = parsed;
    }
  } catch {
    // Not JSON, fall through to text parsing
  }

  if (jsonRows && jsonRows.length > 0) {
    const keys = Object.keys(jsonRows[0]).filter((k) => jsonRows![0][k] !== undefined && !HIDDEN_COLUMNS.has(k.toLowerCase()));
    if (keys.length === 0) return null;

    const headers = keys.map((k) => headerLabels[k.toLowerCase()] ?? k);
    const data = jsonRows.map((row) => keys.map((k) => row[k]));
    return renderTable(headers, data);
  }

  // Fallback: text-based parsing
  const lines = sizeChart
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  const separator = lines[0].includes("\t")
    ? "\t"
    : lines[0].includes("|")
      ? "|"
      : /\s{2,}/.test(lines[0])
        ? /\s{2,}/
        : ",";

  const rows = lines.map((line) =>
    (typeof separator === "string" ? line.split(separator) : line.split(separator))
      .map((cell) => cell.trim())
      .filter(Boolean)
  );

  // Filter out hidden columns by header name
  const headerRow = rows[0];
  const visibleIndices = headerRow.map((h, i) => HIDDEN_COLUMNS.has(h.toLowerCase()) ? -1 : i).filter((i) => i !== -1);
  const filteredHeaders = visibleIndices.map((i) => headerRow[i]);
  const filteredData = rows.slice(1).map((row) => visibleIndices.map((i) => row[i]));

  return renderTable(filteredHeaders, filteredData);
}
