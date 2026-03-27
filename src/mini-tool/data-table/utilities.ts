import type { SerializableDataTableRow } from "./schema.js";

export function sortData(
  data: SerializableDataTableRow[],
  key: string,
  direction: "asc" | "desc",
  locale = "en-US",
): SerializableDataTableRow[] {
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });

  return [...data].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal == null && bVal == null) {
      return 0;
    }
    if (aVal == null) {
      return 1;
    }
    if (bVal == null) {
      return -1;
    }

    if (typeof aVal === "number" && typeof bVal === "number") {
      const diff = aVal - bVal;
      return direction === "asc" ? diff : -diff;
    }

    if (typeof aVal === "boolean" && typeof bVal === "boolean") {
      const diff = aVal === bVal ? 0 : aVal ? 1 : -1;
      return direction === "asc" ? diff : -diff;
    }

    if (Array.isArray(aVal) && Array.isArray(bVal)) {
      const diff = aVal.length - bVal.length;
      return direction === "asc" ? diff : -diff;
    }

    if (typeof aVal === "string" && typeof bVal === "string") {
      const numA = parseNumericLike(aVal);
      const numB = parseNumericLike(bVal);
      if (numA != null && numB != null) {
        const diff = numA - numB;
        return direction === "asc" ? diff : -diff;
      }

      if (/^\d{4}-\d{2}-\d{2}/.test(aVal) && /^\d{4}-\d{2}-\d{2}/.test(bVal)) {
        const diff = new Date(aVal).getTime() - new Date(bVal).getTime();
        return direction === "asc" ? diff : -diff;
      }
    }

    const comparison = collator.compare(String(aVal), String(bVal));
    return direction === "asc" ? comparison : -comparison;
  });
}

function stableStringify(value: unknown): string {
  if (value == null) {
    return "null";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(",")}}`;
  }

  return JSON.stringify(String(value));
}

function hashString(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

function getRowIdentifier(row: SerializableDataTableRow, identifierKey?: string): string {
  const candidate = (identifierKey ? row[identifierKey] : undefined) ?? row.name ?? row.title ?? row.id;

  if (candidate == null) {
    return "";
  }

  if (Array.isArray(candidate)) {
    return candidate.map((entry) => (entry === null ? "null" : String(entry))).join(", ");
  }

  return String(candidate).trim();
}

export function createDataTableRowKeys(rows: SerializableDataTableRow[], identifierKey?: string): string[] {
  const canonicalRows = rows.map((row) => stableStringify(row));
  const baseKeys = rows.map((row, index) => {
    const identifier = getRowIdentifier(row, identifierKey);
    if (identifier) {
      return `id:${identifier}`;
    }

    return `row:${hashString(canonicalRows[index])}`;
  });

  const baseCounts = new Map<string, number>();
  for (const key of baseKeys) {
    baseCounts.set(key, (baseCounts.get(key) ?? 0) + 1);
  }

  const used = new Map<string, number>();

  return rows.map((_, index) => {
    const base = baseKeys[index];
    if ((baseCounts.get(base) ?? 0) === 1) {
      return base;
    }

    const fingerprint = hashString(canonicalRows[index]);
    let disambiguated = `${base}::${fingerprint}`;
    const seen = used.get(disambiguated) ?? 0;
    used.set(disambiguated, seen + 1);
    if (seen > 0) {
      disambiguated = `${disambiguated}::d${seen + 1}`;
    }

    return disambiguated;
  });
}

export function parseNumericLike(input: string): number | null {
  let source = input.replace(/[\u00A0\u202F\s]/g, "").trim();
  if (!source) {
    return null;
  }

  source = source.replace(/^\((.*)\)$/g, "-$1");
  source = source.replace(/[%$€£¥₩₹₽₺₪₫฿₦₴₡₲₵₸]/g, "");

  function hasGroupedThousands(value: string, sep: "," | "."): boolean {
    const unsigned = value.replace(/^[+-]/, "");
    const parts = unsigned.split(sep);
    if (parts.length < 2 || parts.some((entry) => entry.length === 0)) {
      return false;
    }
    if (!/^\d{1,3}$/.test(parts[0]) || parts[0] === "0") {
      return false;
    }

    return parts.slice(1).every((entry) => /^\d{3}$/.test(entry));
  }

  const lastComma = source.lastIndexOf(",");
  const lastDot = source.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    const decimalSep = lastComma > lastDot ? "," : ".";
    const thousandSep = decimalSep === "," ? "." : ",";
    source = source.split(thousandSep).join("");
    source = source.replace(decimalSep, ".");
  } else if (lastComma !== -1) {
    if (hasGroupedThousands(source, ",")) {
      source = source.replace(/,/g, "");
    } else {
      const fractionLength = source.length - lastComma - 1;
      source = fractionLength >= 1 && fractionLength <= 3 ? source.replace(/,/g, ".") : source.replace(/,/g, "");
    }
  } else if (lastDot !== -1) {
    if (hasGroupedThousands(source, ".") || (source.match(/\./g) || []).length > 1) {
      source = source.replace(/\./g, "");
    }
  }

  const compactMatch = source.match(/^([+-]?\d+\.?\d*|\d*\.\d+)([KMBTPG]B?|B)$/i);
  if (compactMatch) {
    const baseNumber = Number(compactMatch[1]);
    if (Number.isNaN(baseNumber)) {
      return null;
    }

    const suffix = compactMatch[2].toUpperCase();
    if (suffix === "B") {
      const likelyBytes = Number.isInteger(baseNumber) && baseNumber < 1024;
      return likelyBytes ? baseNumber : baseNumber * 1e9;
    }

    const multipliers: Record<string, number> = {
      K: 1e3,
      KB: 1024,
      M: 1e6,
      MB: 1024 ** 2,
      G: 1e9,
      GB: 1024 ** 3,
      T: 1e12,
      TB: 1024 ** 4,
      P: 1e15,
      PB: 1024 ** 5,
    };

    return baseNumber * (multipliers[suffix] ?? 1);
  }

  if (/^[+-]?(?:\d+\.?\d*|\d*\.\d+)$/.test(source)) {
    const parsed = Number(source);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}
