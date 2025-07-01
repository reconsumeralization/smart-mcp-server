#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import process from 'process';

const SRC = 'CONSOLIDATED_DOCUMENTATION.md';
const BUILD_DIR = 'build';
const PDF_OUT = path.join(BUILD_DIR, 'Smart-MCP-Docs.pdf');
const HTML_OUT = path.join(BUILD_DIR, 'Smart-MCP-Docs.html');
const DOCX_OUT = path.join(BUILD_DIR, 'Smart-MCP-Docs.docx');
const EPUB_OUT = path.join(BUILD_DIR, 'Smart-MCP-Docs.epub');
const TEMPLATE = 'latex-template.tex';
const STYLES_CSS = 'docs/styles.css';
const COVER_IMAGE = 'docs/cover.png';

// Enhanced pandoc options for better output quality
const PANDOC_OPTIONS = [
  '--from markdown+smart',
  '--toc',
  '--toc-depth=4',
  '--highlight-style=tango',
  '--number-sections',
  '--standalone',
  '--filter pandoc-crossref',
  '--citeproc',
  '--metadata title="Smart MCP Server Documentation"',
  '--metadata author="Smart MCP Team"',
  '--metadata subject="Model Context Protocol Server Implementation"',
  '--metadata keywords="MCP,AI,Server,Documentation,API"',
  `--metadata date="${new Date().toISOString().split('T')[0]}"`
];

// Format-specific configurations
const FORMAT_CONFIGS = {
  PDF: {
    extensions: ['--pdf-engine=xelatex', '--variable geometry:margin=1in'],
    fallbacks: ['--pdf-engine=pdflatex', '--pdf-engine=wkhtmltopdf'],
    description: 'High-quality PDF for printing and archival'
  },
  HTML: {
    extensions: ['--self-contained', '--embed-resources', '--standalone'],
    fallbacks: ['--standalone'],
    description: 'Self-contained HTML for web viewing'
  },
  DOCX: {
    extensions: ['--reference-doc=docs/reference.docx'],
    fallbacks: [],
    description: 'Microsoft Word format for collaborative editing'
  },
  EPUB: {
    extensions: ['--epub-metadata=docs/metadata.xml', '--epub-stylesheet=docs/epub.css'],
    fallbacks: [],
    description: 'E-book format for mobile reading'
  }
};

async function ensureBuildDir() {
  if (!existsSync(BUILD_DIR)) {
    await fs.mkdir(BUILD_DIR, { recursive: true });
    console.log(`📁 Created ${BUILD_DIR} directory`);
  }
}

async function validateDependencies() {
  const dependencies = ['pandoc'];
  const missing = [];
  
  for (const dep of dependencies) {
    try {
      execSync(`${dep} -v`, { stdio: 'ignore' });
      continue;
    } catch {
      // ignore
    }
    // manual fallback
    if (process.platform === 'win32' && existsSync('C:/Program Files/Pandoc/pandoc.exe')) {
      // consider installed
      continue;
    }
    missing.push(dep);
  }
  
  if (missing.length > 0) {
    console.error(`❌ Missing dependencies: ${missing.join(', ')}`);
    console.error('Please install pandoc: https://pandoc.org/installing.html');
    return false;
  }
  
  return true;
}

async function checkOptionalAssets() {
  const assets = [
    { path: TEMPLATE, description: 'LaTeX template for PDF styling' },
    { path: STYLES_CSS, description: 'CSS stylesheet for HTML output' },
    { path: COVER_IMAGE, description: 'Cover image for EPUB' },
    { path: 'docs/reference.docx', description: 'Reference document for DOCX styling' },
    { path: 'docs/metadata.xml', description: 'EPUB metadata file' },
    { path: 'docs/epub.css', description: 'EPUB stylesheet' }
  ];
  
  console.log('🔍 Checking optional assets...');
  for (const asset of assets) {
    const exists = existsSync(asset.path);
    const status = exists ? '✅' : '⚠️';
    console.log(`  ${status} ${asset.path} - ${asset.description}`);
  }
  console.log();
}

function buildPandocCommand(outputFile, extraOptions = []) {
  const options = [...PANDOC_OPTIONS, ...extraOptions];
  
  // Add template for PDF if available
  if (existsSync(TEMPLATE) && outputFile.endsWith('.pdf')) {
    options.push(`--template=${TEMPLATE}`);
  }
  
  // Add CSS for HTML if available
  if (existsSync(STYLES_CSS) && outputFile.endsWith('.html')) {
    options.push(`--css=${STYLES_CSS}`);
  }
  
  // Add cover image for EPUB if available
  if (existsSync(COVER_IMAGE) && outputFile.endsWith('.epub')) {
    options.push(`--epub-cover-image=${COVER_IMAGE}`);
  }
  
  return `pandoc "${SRC}" ${options.join(' ')} -o "${outputFile}"`;
}

async function generateOutput(format, outputFile, extraOptions = []) {
  const config = FORMAT_CONFIGS[format];
  const startTime = Date.now();
  
  try {
    console.log(`🔄 Generating ${format}... (${config.description})`);
    
    // Try primary command first
    let cmd = buildPandocCommand(outputFile, [...config.extensions, ...extraOptions]);
    
    try {
      execSync(cmd, { stdio: 'pipe' });
    } catch (primaryError) {
      console.warn(`⚠️  Primary ${format} generation failed, trying fallback...`);
      
      // Try fallback options
      for (const fallback of config.fallbacks) {
        try {
          cmd = buildPandocCommand(outputFile, [fallback, ...extraOptions]);
          execSync(cmd, { stdio: 'pipe' });
          break;
        } catch (fallbackError) {
          continue;
        }
      }
    }
    
    const duration = Date.now() - startTime;
    const stats = await fs.stat(outputFile);
    const sizeKB = Math.round(stats.size / 1024);
    
    console.log(`✅ ${format} generated: ${outputFile} (${sizeKB}KB, ${duration}ms)`);
    return { success: true, size: stats.size, duration };
    
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`❌ ${format} generation failed (${duration}ms):`, err.message);
    return { success: false, size: 0, duration, error: err.message };
  }
}

async function generateProgressiveFormats() {
  const results = [];
  const startTime = Date.now();
  
  // Generate in order of complexity (simplest first)
  const formats = [
    { name: 'HTML', file: HTML_OUT, options: [] },
    { name: 'DOCX', file: DOCX_OUT, options: [] },
    { name: 'EPUB', file: EPUB_OUT, options: [] },
    { name: 'PDF', file: PDF_OUT, options: ['--variable geometry:margin=1in'] }
  ];
  
  for (const { name, file, options } of formats) {
    const result = await generateOutput(name, file, options);
    results.push({ 
      format: name, 
      file, 
      ...result 
    });
    
    // Short pause between generations to prevent resource conflicts
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const totalDuration = Date.now() - startTime;
  return { results, totalDuration };
}

async function generateSummaryReport(results, totalDuration) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 EXPORT SUMMARY REPORT');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalSize = successful.reduce((sum, r) => sum + r.size, 0);
  
  console.log(`📈 Overall Statistics:`);
  console.log(`   • Total Time: ${totalDuration}ms`);
  console.log(`   • Success Rate: ${successful.length}/${results.length} (${Math.round(successful.length/results.length*100)}%)`);
  console.log(`   • Total Output Size: ${Math.round(totalSize / 1024)}KB`);
  console.log();
  
  console.log(`📋 Format Details:`);
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    const size = result.success ? `${Math.round(result.size / 1024)}KB` : 'N/A';
    const duration = `${result.duration}ms`;
    
    console.log(`   ${status} ${result.format.padEnd(6)} ${result.file.padEnd(35)} ${size.padStart(8)} ${duration.padStart(8)}`);
    
    if (!result.success && result.error) {
      console.log(`      └─ Error: ${result.error}`);
    }
  }
  
  if (failed.length > 0) {
    console.log(`\n⚠️  Failed Formats:`);
    for (const fail of failed) {
      console.log(`   • ${fail.format}: ${fail.error || 'Unknown error'}`);
    }
    console.log(`\n💡 Troubleshooting Tips:`);
    console.log(`   • Ensure pandoc is installed and up to date`);
    console.log(`   • Check that LaTeX is installed for PDF generation`);
    console.log(`   • Verify all referenced assets exist`);
  }
  
  console.log('\n' + '='.repeat(60));
  
  return {
    successful: successful.length,
    total: results.length,
    totalSize,
    totalDuration
  };
}

async function main() {
  console.log('🚀 Smart MCP Documentation Export Tool');
  console.log('=====================================\n');
  
  // Validate source file
  if (!existsSync(SRC)) {
    console.error(`❌ Source file not found: ${SRC}`);
    console.error('💡 Run docs:consolidate first to generate the consolidated documentation.');
    process.exit(1);
  }
  
  // Check file size and provide feedback
  const srcStats = await fs.stat(SRC);
  const srcSizeKB = Math.round(srcStats.size / 1024);
  console.log(`📄 Source: ${SRC} (${srcSizeKB}KB)`);
  
  if (srcSizeKB > 1000) {
    console.log('⚠️  Large source file detected - export may take longer');
  }
  
  // Validate dependencies
  if (!(await validateDependencies())) {
    process.exit(1);
  }
  
  // Check optional assets
  await checkOptionalAssets();
  
  // Ensure build directory exists
  await ensureBuildDir();
  
  console.log('🔄 Starting progressive documentation export...\n');
  
  // Generate all formats
  const { results, totalDuration } = await generateProgressiveFormats();
  
  // Generate summary report
  const summary = await generateSummaryReport(results, totalDuration);
  
  // Exit with appropriate code
  if (summary.successful === 0) {
    console.error('\n💥 All export formats failed!');
    process.exit(1);
  } else if (summary.successful < summary.total) {
    console.log('\n⚠️  Some formats failed - partial success');
    process.exit(2);
  } else {
    console.log('\n🎉 All formats generated successfully!');
    process.exit(0);
  }
}

// Enhanced error handling
main().catch(err => {
  console.error('\n💥 Export process crashed:', err.message);
  console.error('Stack trace:', err.stack);
  process.exit(1);
});