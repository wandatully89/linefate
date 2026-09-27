# linefate

You have a stack trace that points at `server.ts:412`. The file has been
edited fifty times since that trace was captured, and `git blame` on the
current file tells you nothing about a line number that no longer exists in
the same place. You want one answer: in the file as it is now, where did that
line go, or did it get deleted?

That's the only question this tool answers. Given an old version of a file, a
new version of a file, and a line number in the old version, it tells you
either the corresponding line number in the new version, or that the line was
removed.

It is not a diff viewer. It doesn't print hunks, doesn't colorize output,
doesn't try to detect renames or moved blocks. It computes the same edit
script a line-based diff would, then walks it to answer one lookup.

## Usage

Build once:

```
tsc
```

Then run it against two versions of a file:

```
node dist/cli.js old/server.ts new/server.ts 412
```

If the line survived:

```
old/server.ts:412 -> new/server.ts:398
  const timeout = config.requestTimeoutMs ?? DEFAULT_TIMEOUT;
```

If the line was removed:

```
old/server.ts:412 was deleted, not present in new/server.ts
  const timeout = config.requestTimeoutMs ?? DEFAULT_TIMEOUT;
```

Line numbers are 1-indexed, the same convention every editor and stack trace
uses.

## How it works

`src/diff.ts` implements the Myers O(ND) shortest-edit-script algorithm
directly against arrays of lines: no third-party diff library, just the
standard forward pass over edit distances followed by a backtrack that
replays the path as a sequence of equal/insert/delete steps.

`fateOfOldLine` then does the actual lookup: scan the edit script for the
step whose old-side index matches the requested line. If it's part of an
`equal` step, report the paired new-side line number. If it's part of a
`delete` step, report that it's gone.

## Tests

```
npm test
```

Runs `tsc` then hands the compiled output to Node's built-in test runner
(`node --test`). No test framework dependency, same as everything else here.

## Limits

- Whole files are loaded into memory and diffed in O((N+M)D) time, where D is
  the edit distance. Fine for source files, not meant for huge generated
  logs.
- No rename or block-move detection. A line deleted from one spot and
  retyped identically somewhere else shows up as `deleted`, not `moved`.
- Line-based only, there's no word-level or character-level diffing.

## License

MIT, see LICENSE.
