import { test } from "node:test";
import assert from "node:assert/strict";
import { diffLines, fateOfOldLine } from "./diff.js";

function equalPairs(edits: ReturnType<typeof diffLines>): Array<[number, number]> {
  return edits
    .filter((e): e is Extract<typeof e, { op: "equal" }> => e.op === "equal")
    .map((e) => [e.aIndex, e.bIndex]);
}

test("diffLines: two empty files produce no edits", () => {
  assert.deepEqual(diffLines([], []), []);
});

test("diffLines: identical files are all equal steps", () => {
  const lines = ["a", "b", "c"];
  const edits = diffLines(lines, lines);
  assert.deepEqual(equalPairs(edits), [
    [0, 0],
    [1, 1],
    [2, 2],
  ]);
  assert.ok(edits.every((e) => e.op === "equal"));
});

test("diffLines: everything deleted when new file is empty", () => {
  const edits = diffLines(["a", "b", "c"], []);
  assert.deepEqual(edits, [
    { op: "delete", aIndex: 0 },
    { op: "delete", aIndex: 1 },
    { op: "delete", aIndex: 2 },
  ]);
});

test("diffLines: everything inserted when old file is empty", () => {
  const edits = diffLines([], ["a", "b", "c"]);
  assert.deepEqual(edits, [
    { op: "insert", bIndex: 0 },
    { op: "insert", bIndex: 1 },
    { op: "insert", bIndex: 2 },
  ]);
});

test("diffLines: single line changed in the middle keeps the surrounding lines equal", () => {
  const edits = diffLines(["a", "b", "c"], ["a", "x", "c"]);
  assert.deepEqual(edits, [
    { op: "equal", aIndex: 0, bIndex: 0 },
    { op: "delete", aIndex: 1 },
    { op: "insert", bIndex: 1 },
    { op: "equal", aIndex: 2, bIndex: 1 },
  ]);
});

test("diffLines: duplicate lines each map to their own occurrence", () => {
  const edits = diffLines(["dup", "dup", "dup"], ["dup", "dup"]);
  assert.deepEqual(equalPairs(edits), [
    [0, 0],
    [1, 1],
  ]);
  assert.deepEqual(
    edits.filter((e) => e.op === "delete"),
    [{ op: "delete", aIndex: 2 }],
  );
});

test("fateOfOldLine: kept line reports its new line number", () => {
  const edits = diffLines(["a", "b", "c"], ["a", "x", "b", "c"]);
  assert.deepEqual(fateOfOldLine(edits, 2), { status: "kept", newLine: 3 });
  assert.deepEqual(fateOfOldLine(edits, 3), { status: "kept", newLine: 4 });
});

test("fateOfOldLine: deleted line is reported as deleted", () => {
  const edits = diffLines(["a", "b", "c"], ["a", "c"]);
  assert.deepEqual(fateOfOldLine(edits, 2), { status: "deleted" });
});

test("fateOfOldLine: line number past the edit script is not-found", () => {
  const edits = diffLines(["a", "b"], ["a", "b"]);
  assert.deepEqual(fateOfOldLine(edits, 99), { status: "not-found" });
});

test("fateOfOldLine: every line of the old file resolves to kept or deleted", () => {
  const oldLines = ["a", "b", "c", "d", "e"];
  const edits = diffLines(oldLines, ["z", "a", "c", "e", "e"]);
  for (let i = 1; i <= oldLines.length; i++) {
    assert.notEqual(fateOfOldLine(edits, i).status, "not-found");
  }
});
