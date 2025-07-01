#!/usr/bin/env node
import fs from 'fs/promises';
import { existsSync, statSync, lstatSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT = path.resolve('.');
const REPORT_PATH = path.join('reports', 'markdown_inventory.json');
const DETAILED_REPORT_PATH = path.join('reports', 'markdown_inventory_detailed.json');
const SUMMARY_REPORT_PATH = path.join('reports', 'markdown_inventory_summary.md');

/** Recursively walk directory and return markdown files */
async function walk(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', '.github', 'coverage', 'dist', 'build', 'tmp'].includes(entry.name)) continue;
      files.push(...await walk(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

/** Categorize file path with enhanced logic */
function categorize(filePath) {
  const lower = filePath.toLowerCase();
  const segments = lower.split(path.sep);
  
  // Check directory-based categorization first
  if (segments.includes('compliance') || segments.includes('legal')) return 'compliance';
  if (segments.includes('examples') || segments.includes('example') || segments.includes('samples')) return 'examples';
  if (segments.includes('docs') || segments.includes('documentation')) {
    if (lower.includes('api') || lower.includes('technical') || lower.includes('architecture')) return 'technical';
    if (lower.includes('business') || lower.includes('plan') || lower.includes('strategy')) return 'business';
  }
  
  // Content-based categorization
  if (lower.includes('compliance') || lower.includes('policy') || lower.includes('legal')) return 'compliance';
  if (lower.includes('example') || lower.includes('demo') || lower.includes('sample')) return 'examples';
  if (lower.includes('financial') || lower.includes('architecture') || lower.includes('design') || 
      lower.includes('api') || lower.includes('technical') || lower.includes('integration')) return 'technical';
  if (lower.includes('plan') || lower.includes('roadmap') || lower.includes('overview') || 
      lower.includes('business') || lower.includes('strategy') || lower.includes('implementation')) return 'business';
  if (lower.includes('readme') || lower.includes('getting-started') || lower.includes('quickstart')) return 'documentation';
  
  return 'other';
}

/** Parse internal markdown links with enhanced detection */
function extractLinks(content) {
  const links = new Set();
  
  // Standard markdown links
  const markdownRegex = /\]\(([^)]+\.md[^)]*)\)/gi;
  let match;
  while ((match = markdownRegex.exec(content)) !== null) {
    links.add(match[1].split('#')[0]); // Remove anchor fragments
  }
  
  // Reference-style links
  const refRegex = /\[([^\]]+)\]:\s*([^\s]+\.md[^\s]*)/gi;
  while ((match = refRegex.exec(content)) !== null) {
    links.add(match[2].split('#')[0]);
  }
  
  return Array.from(links);
}

/** Extract headings from markdown content */
function extractHeadings(content) {
  const headings = [];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const title = match[2].trim();
      headings.push({ level, title, line: i + 1 });
    }
  }
  
  return headings;
}

/** Extract code blocks and their languages */
function extractCodeBlocks(content) {
  const codeBlocks = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    codeBlocks.push({
      language: match[1] || 'text',
      content: match[2].trim(),
      length: match[2].trim().split('\n').length
    });
  }
  
  return codeBlocks;
}

/** Calculate readability metrics */
function calculateReadability(content) {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const characters = content.replace(/\s/g, '').length;
  
  const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;
  const avgCharsPerWord = words.length > 0 ? characters / words.length : 0;
  
  return {
    sentences: sentences.length,
    words: words.length,
    characters: characters,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 100) / 100,
    avgCharsPerWord: Math.round(avgCharsPerWord * 100) / 100
  };
}

/** Generate summary report in markdown format */
async function generateSummaryReport(report) {
  const { stats, inventory, duplicates } = report;
  
  let summary = `# Markdown Inventory Summary Report

**Generated:** ${new Date().toLocaleString()}  
**Total Files:** ${stats.totalFiles}  
**Total Words:** ${stats.totalWords.toLocaleString()}  
**Total Size:** ${(stats.totalSize / 1024).toFixed(1)} KB  

## 📊 Statistics Overview

### Files by Category
`;

  for (const [category, count] of Object.entries(stats.categories)) {
    const percentage = ((count / stats.totalFiles) * 100).toFixed(1);
    summary += `- **${category}**: ${count} files (${percentage}%)\n`;
  }

  summary += `\n### Content Analysis
- **Average file size**: ${(stats.avgFileSize / 1024).toFixed(1)} KB
- **Average words per file**: ${Math.round(stats.avgWordsPerFile)}
- **Files with code blocks**: ${stats.filesWithCode}
- **Total code blocks**: ${stats.totalCodeBlocks}
- **Duplicate files detected**: ${duplicates.length}

## 📁 File Inventory

| File | Category | Size (KB) | Words | Headings | Code Blocks |
|------|----------|-----------|-------|----------|-------------|
`;

  for (const file of inventory.sort((a, b) => a.path.localeCompare(b.path))) {
    const sizeKB = (file.size / 1024).toFixed(1);
    summary += `| [${file.path}](${file.path}) | ${file.category} | ${sizeKB} | ${file.readability.words} | ${file.headings.length} | ${file.codeBlocks.length} |\n`;
  }

  if (duplicates.length > 0) {
    summary += `\n## ⚠️ Duplicate Files Detected

The following files have identical content:

`;
    for (const group of duplicates) {
      summary += `### Duplicate Group\n`;
      for (const file of group) {
        summary += `- ${file}\n`;
      }
      summary += '\n';
    }
  }

  summary += `\n## 🔗 Link Analysis

### Internal Links Summary
- **Total internal links**: ${stats.totalInternalLinks}
- **Unique linked files**: ${stats.uniqueLinkedFiles}
- **Files with broken links**: ${stats.brokenLinksCount}

### Most Referenced Files
`;

  const linkCounts = {};
  for (const file of inventory) {
    for (const link of file.links) {
      linkCounts[link] = (linkCounts[link] || 0) + 1;
    }
  }

  const sortedLinks = Object.entries(linkCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);

  for (const [file, count] of sortedLinks) {
    summary += `- **${file}**: referenced ${count} times\n`;
  }

  await fs.writeFile(SUMMARY_REPORT_PATH, summary);
}

async function main() {
  console.log('🔍 Starting enhanced markdown inventory analysis...');
  
  const mdFiles = await walk(ROOT);
  const inventory = [];
  const hashMap = new Map();
  const linkCounts = {};

  console.log(`📁 Found ${mdFiles.length} markdown files`);

  for (const file of mdFiles) {
    const rel = path.relative(ROOT, file);
    const content = await fs.readFile(file, 'utf8');
    const size = statSync(file).size;
    const category = categorize(rel);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    const links = extractLinks(content);
    const headings = extractHeadings(content);
    const codeBlocks = extractCodeBlocks(content);
    const readability = calculateReadability(content);
    const hierarchy = rel.split(path.sep);
    const lastModified = statSync(file).mtime.toISOString();

    // Count link references
    for (const link of links) {
      linkCounts[link] = (linkCounts[link] || 0) + 1;
    }

    inventory.push({
      path: rel,
      size,
      category,
      hash,
      links,
      headings,
      codeBlocks,
      readability,
      hierarchy,
      lastModified,
      words: readability.words
    });

    const arr = hashMap.get(hash) || [];
    arr.push(rel);
    hashMap.set(hash, arr);

    console.log(`✅ Processed: ${rel} (${category})`);
  }

  const duplicates = Array.from(hashMap.values()).filter(arr => arr.length > 1);
  const totalSize = inventory.reduce((sum, f) => sum + f.size, 0);
  const totalWords = inventory.reduce((sum, f) => sum + f.words, 0);
  const totalCodeBlocks = inventory.reduce((sum, f) => sum + f.codeBlocks.length, 0);
  const filesWithCode = inventory.filter(f => f.codeBlocks.length > 0).length;
  const totalInternalLinks = inventory.reduce((sum, f) => sum + f.links.length, 0);
  const uniqueLinkedFiles = new Set(inventory.flatMap(f => f.links)).size;

  const stats = {
    totalFiles: inventory.length,
    totalWords,
    totalSize,
    avgFileSize: totalSize / inventory.length,
    avgWordsPerFile: totalWords / inventory.length,
    categories: inventory.reduce((acc, f) => { 
      acc[f.category] = (acc[f.category] || 0) + 1; 
      return acc; 
    }, {}),
    duplicatesCount: duplicates.length,
    totalCodeBlocks,
    filesWithCode,
    totalInternalLinks,
    uniqueLinkedFiles,
    brokenLinksCount: 0 // TODO: Implement broken link detection
  };

  const report = { 
    generated: new Date().toISOString(), 
    stats, 
    inventory, 
    duplicates,
    linkAnalysis: linkCounts
  };

  // Ensure reports directory exists
  if (!existsSync('reports')) {
    await fs.mkdir('reports', { recursive: true });
  }

  // Write detailed JSON report
  await fs.writeFile(DETAILED_REPORT_PATH, JSON.stringify(report, null, 2));
  
  // Write basic JSON report for backward compatibility
  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
  
  // Generate and write markdown summary
  await generateSummaryReport(report);

  console.log(`\n📊 Analysis Complete!`);
  console.log(`📄 Basic report: ${REPORT_PATH}`);
  console.log(`📄 Detailed report: ${DETAILED_REPORT_PATH}`);
  console.log(`📄 Summary report: ${SUMMARY_REPORT_PATH}`);
  console.log(`\n🎯 Key Metrics:`);
  console.log(`   • ${stats.totalFiles} files analyzed`);
  console.log(`   • ${stats.totalWords.toLocaleString()} total words`);
  console.log(`   • ${(stats.totalSize / 1024).toFixed(1)} KB total size`);
  console.log(`   • ${stats.duplicatesCount} duplicate groups found`);
  console.log(`   • ${stats.filesWithCode} files contain code blocks`);
}

main().catch(err => {
  console.error('❌ Error during analysis:', err);
  process.exit(1);
});