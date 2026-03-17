type ClassDictionary = Record<string, boolean>;
type ClassArray = ReadonlyArray<ClassValue>;
export type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassDictionary
  | ClassArray;

function flatten(input: ClassValue, out: string[]) {
  if (!input) return;

  if (typeof input === "string" || typeof input === "number") {
    out.push(String(input));
    return;
  }

  if (Array.isArray(input)) {
    for (const v of input) flatten(v, out);
    return;
  }

  if (typeof input === "object") {
    for (const [k, v] of Object.entries(input)) {
      if (v) out.push(k);
    }
  }
}

export function cn(...inputs: ReadonlyArray<ClassValue>): string {
  const out: string[] = [];
  for (const i of inputs) flatten(i, out);
  return out.join(" ");
}
