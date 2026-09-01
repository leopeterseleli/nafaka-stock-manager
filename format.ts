export const TZS = (value: number | string | null | undefined) => {
  const n = Number(value ?? 0);
  return `TZS ${n.toLocaleString("en-TZ", { maximumFractionDigits: 0 })}`;
};

export const KG = (value: number | string | null | undefined) => {
  const n = Number(value ?? 0);
  return `${n.toLocaleString("en-TZ", { maximumFractionDigits: 2 })} kg`;
};

export const num = (value: unknown) => Number(value ?? 0);

export const today = () => new Date().toISOString().slice(0, 10);

export const daysBetween = (from: string, to = today()) =>
  Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000);

export const fmtDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString("en-GB") : "-";
