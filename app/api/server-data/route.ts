import { NextResponse } from "next/server";
import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

const SERVER_ROOT_DIR = "server-data/";
const SERVER_DATA_ROOT = path.join(process.cwd(), "public", "server-data");

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedPath = url.searchParams.get("path") ?? SERVER_ROOT_DIR;
  const normalized = normalizeDirectoryPath(requestedPath);
  const relative = normalized.replace(/^server-data\/?/, "");
  const target = path.join(SERVER_DATA_ROOT, relative);
  const resolved = path.resolve(target);

  if (!resolved.startsWith(path.resolve(SERVER_DATA_ROOT))) {
    return NextResponse.json({ error: "路径越界" }, { status: 400 });
  }

  try {
    const dirents = await readdir(resolved, { withFileTypes: true });
    const entries = await filterEntriesWithCsv(dirents, resolved, normalized);

    return NextResponse.json({ entries, path: normalized });
  } catch (error) {
    return NextResponse.json({ error: "无法访问目录" }, { status: 404 });
  }
}

async function filterEntriesWithCsv(dirents: Dirent[], parentFsPath: string, normalizedPath: string) {
  const entries: Array<{ name: string; path: string; isDirectory: boolean }> = [];
  for (const entry of dirents) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    const entryFsPath = path.join(parentFsPath, entry.name);
    if (entry.isFile()) {
      if (!isCsvFile(entry.name)) {
        continue;
      }
      entries.push(toResponseEntry(entry, normalizedPath));
      continue;
    }
    if (!entry.isDirectory()) {
      continue;
    }
    const containsCsv = await hasCsvWithin(entryFsPath);
    if (!containsCsv) {
      continue;
    }
    entries.push(toResponseEntry(entry, normalizedPath));
  }
  return entries;
}

async function hasCsvWithin(directoryPath: string): Promise<boolean> {
  const queue: string[] = [directoryPath];
  while (queue.length) {
    const current = queue.shift();
    if (!current) {
      continue;
    }
    let dirents: Dirent[];
    try {
      dirents = await readdir(current, { withFileTypes: true });
    } catch (error) {
      continue;
    }
    for (const entry of dirents) {
      if (entry.name.startsWith(".")) {
        continue;
      }
      if (entry.isFile() && isCsvFile(entry.name)) {
        return true;
      }
      if (entry.isDirectory()) {
        queue.push(path.join(current, entry.name));
      }
    }
  }
  return false;
}

function toResponseEntry(entry: Dirent, normalizedPath: string) {
  const entryPath = path.posix.join(normalizedPath, entry.name) + (entry.isDirectory() ? "/" : "");
  return {
    name: entry.name,
    path: entryPath,
    isDirectory: entry.isDirectory(),
  };
}

function isCsvFile(name: string): boolean {
  return name.toLowerCase().endsWith(".csv");
}

function normalizeDirectoryPath(input: string): string {
  let normalized = input.trim();
  if (!normalized) {
    normalized = SERVER_ROOT_DIR;
  }
  normalized = normalized.replace(/^\.\/?/, "");
  normalized = normalized.replace(/^\//, "");
  if (!normalized.startsWith(SERVER_ROOT_DIR)) {
    normalized = `${SERVER_ROOT_DIR}${normalized}`;
  }
  if (!normalized.endsWith("/")) {
    normalized += "/";
  }
  return normalized;
}
