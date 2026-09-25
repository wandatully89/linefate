#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { diffLines, fateOfOldLine } from "./diff.js";

function splitLines(text: string): string[] {
  // drop a single trailing newline so files that end in \n don't report
  // one phantom extra line
  const normalized = text.replace(/\r\n/g, "\n");
  const withoutTrailingNewline = normalized.endsWith("\n")
    ? normalized.slice(0, -1)
    : normalized;
  return withoutTrailingNewline.length === 0
    ? []
    : withoutTrailingNewline.split("\n");
}

function readLines(path: string): string[] {
  try {
    return splitLines(readFileSync(path, "utf8"));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`could not read ${path}: ${message}`);
    process.exit(1);
  }
}

function usage(): never {
  console.error("usage: linefate <old-file> <new-file> <old-line-number>");
  console.error("");
  console.error("example: linefate v1/server.ts v2/server.ts 42");
  process.exit(1);
}

function main(argv: string[]): void {
  if (argv.length !== 3) {
    usage();
  }
  const [oldPath, newPath, lineArg] = argv;
  const lineNumber = Number.parseInt(lineArg, 10);
  if (!Number.isInteger(lineNumber) || lineNumber < 1) {
    console.error(`"${lineArg}" is not a valid line number`);
    process.exit(1);
  }

  const oldLines = readLines(oldPath);
  const newLines = readLines(newPath);

  if (lineNumber > oldLines.length) {
    console.error(`${oldPath} only has ${oldLines.length} lines`);
    process.exit(1);
  }

  const edits = diffLines(oldLines, newLines);
  const fate = fateOfOldLine(edits, lineNumber);
  const sourceText = oldLines[lineNumber - 1];

  switch (fate.status) {
    case "kept":
      console.log(`${oldPath}:${lineNumber} -> ${newPath}:${fate.newLine}`);
      console.log(`  ${sourceText}`);
      break;
    case "deleted":
      console.log(`${oldPath}:${lineNumber} was deleted, not present in ${newPath}`);
      console.log(`  ${sourceText}`);
      break;
    case "not-found":
      // should not happen: every old line is either kept or deleted in the
      // edit script, this only guards against a diff.ts bug
      console.error(`internal error: line ${lineNumber} was not covered by the diff`);
      process.exit(1);
  }
}

main(process.argv.slice(2));
