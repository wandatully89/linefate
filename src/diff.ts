// Myers O(ND) diff, reduced to the one thing linefate needs: a line-by-line
// edit script we can walk to answer "what happened to line N".

export type Edit =
  | { op: "equal"; aIndex: number; bIndex: number }
  | { op: "insert"; bIndex: number }
  | { op: "delete"; aIndex: number };

type Frontier = Record<number, number>;

// Forward pass: for each edit distance d, record the furthest-reaching x
// on every diagonal k, and snapshot that state so backtrack() can replay it.
function computeTrace(a: string[], b: string[]): Frontier[] {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const v: Frontier = { 1: 0 };
  const trace: Frontier[] = [];

  for (let d = 0; d <= max; d++) {
    trace.push({ ...v });
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[k - 1] < v[k + 1])) {
        x = v[k + 1];
      } else {
        x = v[k - 1] + 1;
      }
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[k] = x;
      if (x >= n && y >= m) {
        return trace;
      }
    }
  }
  return trace;
}

// Walk the trace backwards from (n, m) to (0, 0), turning frontier jumps
// into concrete equal/insert/delete steps, then reverse into forward order.
function backtrack(a: string[], b: string[], trace: Frontier[]): Edit[] {
  let x = a.length;
  let y = b.length;
  const edits: Edit[] = [];

  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d];
    const k = x - y;
    const prevK = k === -d || (k !== d && v[k - 1] < v[k + 1]) ? k + 1 : k - 1;
    const prevX = v[prevK];
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      edits.push({ op: "equal", aIndex: x - 1, bIndex: y - 1 });
      x--;
      y--;
    }

    if (d > 0) {
      if (x === prevX) {
        edits.push({ op: "insert", bIndex: y - 1 });
      } else {
        edits.push({ op: "delete", aIndex: x - 1 });
      }
    }

    x = prevX;
    y = prevY;
  }

  return edits.reverse();
}

export function diffLines(a: string[], b: string[]): Edit[] {
  const trace = computeTrace(a, b);
  return backtrack(a, b, trace);
}

export type Fate =
  | { status: "kept"; newLine: number }
  | { status: "deleted" }
  | { status: "not-found" };

// oldLineNumber is 1-indexed, matching what a human would point at in an editor.
export function fateOfOldLine(edits: Edit[], oldLineNumber: number): Fate {
  const targetIndex = oldLineNumber - 1;
  for (const edit of edits) {
    if (edit.op === "equal" && edit.aIndex === targetIndex) {
      return { status: "kept", newLine: edit.bIndex + 1 };
    }
    if (edit.op === "delete" && edit.aIndex === targetIndex) {
      return { status: "deleted" };
    }
  }
  return { status: "not-found" };
}
