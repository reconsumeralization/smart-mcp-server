#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import process from 'process';

const SRC = 'PROJECT_IMPLEMENTATION_PLAN.md';
const BUILD_DIR = 'build';
const PDF_OUT = path.join(BUILD_DIR, 'PROJECT_IMPLEMENTATION_PLAN.pdf');
const HTML_OUT = path.join(BUILD_DIR, 'PROJECT_IMPLEMENTATION_PLAN.html');
const DOCX_OUT = path.join(BUILD_DIR, 'PROJECT_IMPLEMENTATION_PLAN.docx');
const TEMPLATE = 'latex-template.tex';

// Enhanced pandoc options for better output quality
const PANDOC_OPTIONS = [
  '--from markdown',
  '--toc',
  '--toc-depth=3',
  '--highlight-style=tango',
  '--number-sections',
  '--standalone',
  '--metadata title="Project Implementation Plan"',
  '--metadata author="Smart MCP Team"',
  `--metadata date="${new Date().toISOString().split('T')[0]}"`
];

async function ensureBuildDir() {
  if (!existsSync(BUILD_DIR)) {
    await fs.mkdir(BUILD_DIR, { recursive: true });
    console.log(`Created ${BUILD_DIR} directory`);
  }
}

function buildPandocCommand(outputFile, extraOptions = []) {
  const options = [...PANDOC_OPTIONS, ...extraOptions];
  if (existsSync(TEMPLATE) && outputFile.endsWith('.pdf')) {
    options.push(`--template=${TEMPLATE}`);
  }
  return `pandoc ${SRC} ${options.join(' ')} -o ${outputFile}`;
}

async function generateOutput(format, outputFile, extraOptions = []) {
  try {
    console.log(`Generating ${format.toUpperCase()}...`);
    const cmd = buildPandocCommand(outputFile, extraOptions);
    execSync(cmd, { stdio: 'inherit' });
    console.log(`✓ ${format.toUpperCase()} generated: ${outputFile}`);
    return true;
  } catch (err) {
    console.error(`✗ ${format.toUpperCase()} generation failed:`, err.message);
    return false;
  }
}

async function main() {
  // Validate source file
  if (!existsSync(SRC)) {
    console.error(`${SRC} not found.`);
    process.exit(1);
  }

  // Ensure build directory exists
  await ensureBuildDir();

  console.log('Starting PDF export...\n');

  const results = [];

  // Generate PDF (primary format)
  const pdfSuccess = await generateOutput('PDF', PDF_OUT, [
    '--pdf-engine=xelatex',
    '--variable geometry:margin=1in'
  ]);
  results.push({ format: 'PDF', success: pdfSuccess, file: PDF_OUT });

  // Generate HTML (fallback)
  const htmlSuccess = await generateOutput('HTML', HTML_OUT, [
    '--self-contained'
  ]);
  results.push({ format: 'HTML', success: htmlSuccess, file: HTML_OUT });

  // Generate DOCX (for editing)
  const docxSuccess = await generateOutput('DOCX', DOCX_OUT);
  results.push({ format: 'DOCX', success: docxSuccess, file: DOCX_OUT });

  // Summary report
  console.log('\n' + '='.repeat(50));
  console.log('EXPORT SUMMARY');
  console.log('='.repeat(50));
  
  for (const { format, success, file } of results) {
    const status = success ? '✓' : '✗';
    let size = '';
    if (success && existsSync(file)) {
      try {
        const stats = await fs.stat(file);
        size = `(${Math.round(stats.size / 1024)}KB)`;
      } catch (err) {
        // Ignore stat errors
      }
    }
    console.log(`${status} ${format.padEnd(6)} ${success ? file : 'FAILED'} ${size}`);
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`\n${successCount}/${results.length} formats generated successfully`);

  if (successCount === 0) {
    console.error('All export formats failed!');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
