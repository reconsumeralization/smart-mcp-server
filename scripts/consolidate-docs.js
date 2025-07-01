#!/usr/bin/env node
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import process from 'process';

const INVENTORY = 'reports/markdown_inventory.json';
const TOC = 'reports/master_toc.md';
const OUTPUT = 'CONSOLIDATED_DOCUMENTATION.md';

const INTRO = `# Smart MCP Server – Consolidated Documentation\n\n> This file is auto-generated. Do not edit manually.\n\nGenerated: ${new Date().toISOString()}\n`;

function parseTOC(tocText) {
  const lines = tocText.split(/\r?\n/).filter(l => l.match(/\[(.+?)\]\((.+?)\)/));
  return lines.map(l => {
    const m = l.match(/([0-9.]+)\s+\[(.+?)\]\((.+?)\)/);
    if (!m) return null;
    return { num: m[1], title: m[2], path: m[3].replace(/\\/g, '/') };
  }).filter(Boolean);
}

async function main() {
  if (!existsSync(INVENTORY) || !existsSync(TOC)) {
    console.error('Run docs:inventory and TOC generator first.');
    process.exit(1);
  }
  const tocEntries = parseTOC(await fs.readFile(TOC, 'utf8'));
  let output = INTRO + '\n';
  for (const entry of tocEntries) {
    let md;
    try {
      md = await fs.readFile(entry.path, 'utf8');
    } catch {
      console.warn(`Missing source ${entry.path}`);
      continue;
    }
    // Re-level headings: prepend section numbers
    md = md.replace(/^(#{1,6})\s+(.*)$/gm, (match, hashes, text) => {
      return `${hashes} ${entry.num} ${text}`;
    });
    output += `\n\n---\n\n# ${entry.num} ${entry.title}\n\n`;
    output += md.trim() + '\n';
  }
  await fs.writeFile(OUTPUT, output);
  console.log(`Consolidated documentation written to ${OUTPUT}`);
}

main().catch(e => { console.error(e); process.exit(1); }); 