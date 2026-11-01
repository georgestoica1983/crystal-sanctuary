/**
 * Score numbers that stay readable at any size: full digits below 100,000,
 * then 124.5K, 3.12M, 2.05B, 1.20T, and e-notation (1.2e15) beyond that.
 */
export function formatScore(n: number): string {
  const v = Math.round(n);
  const a = Math.abs(v);
  if (!Number.isFinite(v)) return "∞";
  if (a < 100_000) return v.toLocaleString("en-US");
  if (a >= 1e15) return v.toExponential(1).replace("e+", "e");
  const units: Array<[number, string]> = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (let i = 0; i < units.length; i++) {
    let [size, unit] = units[i];
    if (a >= size) {
      // 999,999 reads 1M, not 1000K
      if (a / size >= 999.95 && i > 0) [size, unit] = units[i - 1];
      const x = v / size;
      const digits = Math.abs(x) >= 100 ? 1 : 2;
      return `${x.toFixed(digits).replace(/\.?0+$/, "")}${unit}`;
    }
  }
  return v.toLocaleString("en-US");
}
