export interface Flow {
  read: number;
  write: number;
}

export function flowTotal(f: Flow): number {
  return f.read + f.write;
}

export function addFlow(a: Flow, b: Flow): Flow {
  return { read: a.read + b.read, write: a.write + b.write };
}

export function scaleFlow(f: Flow, k: number): Flow {
  return { read: f.read * k, write: f.write * k };
}

export function capFlow(f: Flow, maxTotal: number): Flow {
  const total = flowTotal(f);
  if (total <= maxTotal) return f;
  if (maxTotal <= 0 || total === 0) return { read: 0, write: 0 };
  return scaleFlow(f, maxTotal / total);
}
