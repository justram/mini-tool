import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const USAGE = "Usage: npx tsx scripts/archive-backlog.ts [--dry-run] [--help]";
const BACKLOG_PATH = resolve(process.cwd(), "scratch/BACKLOG.md");
const ARCHIVE_PATH = resolve(process.cwd(), "scratch/ARCHIVE.md");

type CliOptions = {
  dryRun: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  return {
    dryRun: argv.includes("--dry-run"),
  };
}

function formatArchiveTimestamp(date: Date): string {
  const iso = date.toISOString().slice(0, 19).replace("T", " ");
  return `${iso} UTC`;
}

function isChecklistItem(line: string): boolean {
  return /^- \[(?: |x|X)\] /.test(line.trimStart());
}

function isChecklistDone(line: string): boolean {
  return /^- \[(?:x|X)\] /.test(line.trimStart());
}

function stripCompletedSectionIfEmpty(lines: string[]): string[] {
  const result: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() !== "## Completed") {
      result.push(line);
      continue;
    }

    let cursor = index + 1;
    const section: string[] = [];
    while (cursor < lines.length && !lines[cursor].startsWith("## ")) {
      section.push(lines[cursor]);
      cursor += 1;
    }

    const hasChecklistItems = section.some((entry) => entry.trimStart().startsWith("- ["));
    if (hasChecklistItems) {
      result.push(line, ...section);
    }

    index = cursor - 1;
  }

  return result;
}

function trimTrailingBlankLines(lines: string[]): string[] {
  let end = lines.length;
  while (end > 0 && lines[end - 1]?.trim() === "") {
    end -= 1;
  }

  return lines.slice(0, end);
}

type PartitionedBacklog = {
  movedItems: string[][];
  keptLines: string[];
};

function partitionBacklogLines(lines: string[]): PartitionedBacklog {
  const movedItems: string[][] = [];
  const keptLines: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!isChecklistItem(line)) {
      keptLines.push(line);
      continue;
    }

    const itemLines = [line];
    let cursor = index + 1;

    while (cursor < lines.length && !isChecklistItem(lines[cursor]) && !lines[cursor].startsWith("## ")) {
      itemLines.push(lines[cursor]);
      cursor += 1;
    }

    if (isChecklistDone(line)) {
      movedItems.push(itemLines);
    } else {
      keptLines.push(...itemLines);
    }

    index = cursor - 1;
  }

  return { movedItems, keptLines };
}

function run(options: CliOptions): number {
  if (!existsSync(BACKLOG_PATH)) {
    console.error(`[archive-backlog] Missing backlog file: ${BACKLOG_PATH}`);
    return 1;
  }

  const backlogText = readFileSync(BACKLOG_PATH, "utf8");
  const backlogLines = backlogText.split(/\r?\n/u);

  const { movedItems, keptLines } = partitionBacklogLines(backlogLines);

  if (movedItems.length === 0) {
    console.log("[archive-backlog] No completed items found in scratch/BACKLOG.md.");
    return 0;
  }

  const cleanedBacklogLines = trimTrailingBlankLines(stripCompletedSectionIfEmpty(keptLines));
  const cleanedBacklogText = `${cleanedBacklogLines.join("\n")}\n`;

  const archiveHeader = "# Archive";
  const archiveIntro = `## ${formatArchiveTimestamp(new Date())} — moved from scratch/BACKLOG.md`;
  const movedBody = movedItems.map((item) => item.join("\n")).join("\n");
  const archiveBody = `${archiveIntro}\n\n${movedBody}\n`;

  let archiveText = `${archiveHeader}\n\n${archiveBody}`;
  if (existsSync(ARCHIVE_PATH)) {
    const previous = readFileSync(ARCHIVE_PATH, "utf8").trimEnd();
    archiveText = `${previous}\n\n${archiveBody}`;
  }

  if (options.dryRun) {
    console.log(`[archive-backlog] dry-run: would move ${movedItems.length} completed item(s).`);
    return 0;
  }

  writeFileSync(BACKLOG_PATH, cleanedBacklogText, "utf8");
  writeFileSync(ARCHIVE_PATH, archiveText, "utf8");

  console.log(`[archive-backlog] Moved ${movedItems.length} completed item(s) to scratch/ARCHIVE.md.`);
  return 0;
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    return;
  }

  const exitCode = run(parseArgs(argv));
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

main();
