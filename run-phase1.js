const fs = require('fs').promises;
const path = require('path');

let logger;

async function getLogger() {
  if (!logger) {
    const loggerModule = await import('./src/logger.js');
    logger = loggerModule.default;
  }
  return logger;
}

async function runPhase1() {
  const log = await getLogger();
  log.info('🚀 Starting Phase 1: Documentation Consolidation\n');
  
  // Task 1.1: Markdown File Inventory
  log.info('📋 Task 1.1: Markdown File Inventory');
  const projectFiles = [];
  
  async function findMarkdownFiles(dir, excludePatterns) {
    const files = [];
    
    async function traverse(currentDir) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          if (!excludePatterns.some(pattern => entry.name.includes(pattern))) {
            await traverse(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    }
    
    await traverse(dir);
    return files;
  }
  
  const projectRoot = process.cwd();
  const excludePatterns = ['node_modules', '.git', 'dist', 'build', 'coverage'];
  const markdownFiles = await findMarkdownFiles(projectRoot, excludePatterns);
  
  let totalSize = 0;
  let totalWords = 0;
  const byType = {};
  
  for (const filePath of markdownFiles) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);
      const relativePath = path.relative(projectRoot, filePath);
      
      // Categorize content
      const fileName = path.basename(filePath).toLowerCase();
      let type = 'technical';
      if (fileName.includes('readme')) type = 'main';
      else if (fileName.includes('contributing')) type = 'community';
      else if (fileName.includes('example') || filePath.includes('examples')) type = 'examples';
      else if (content.toLowerCase().includes('compliance')) type = 'compliance';
      
      const fileInfo = {
        path: filePath,
        relativePath,
        content,
        type,
        size: stats.size,
        wordCount: content.split(/\s+/).length
      };
      
      projectFiles.push(fileInfo);
      totalSize += stats.size;
      totalWords += fileInfo.wordCount;
      byType[type] = (byType[type] || 0) + 1;
      
      log.info(`   ✅ ${relativePath} (${type})`);
    } catch (error) {
      log.error(`   ❌ Error: ${filePath}`);
    }
  }
  
  log.info(`\n📊 Inventory Complete:
- Total files: ${projectFiles.length}
- Total size: ${(totalSize / 1024).toFixed(1)} KB
- Total words: ${totalWords.toLocaleString()}
- Types: ${Object.entries(byType).map(([type, count]) => `${type}(${count})`).join(', ')}\n`);

  // Task 1.2: Content Structure Design
  log.info('🏗️ Task 1.2: Content Structure Design');
  
  const contentHierarchy = {
    'Introduction': {
      order: 1,
      files: projectFiles.filter(f => f.type === 'main' || f.relativePath.includes('README.md'))
    },
    'Architecture & Design': {
      order: 2,
      files: projectFiles.filter(f => 
        f.type === 'technical' && (
          f.content.toLowerCase().includes('architecture') ||
          f.relativePath.includes('COMPREHENSIVE')
        )
      )
    },
    'Integration Guides': {
      order: 3,
      files: projectFiles.filter(f => 
        f.type === 'technical' && (
          f.content.toLowerCase().includes('integration') ||
          f.relativePath.includes('A2A') ||
          f.relativePath.includes('gemini')
        )
      )
    },
    'Compliance & Policies': {
      order: 4,
      files: projectFiles.filter(f => f.type === 'compliance')
    },
    'Development & Testing': {
      order: 5,
      files: projectFiles.filter(f => 
        f.type === 'technical' && f.content.toLowerCase().includes('testing')
      )
    },
    'Deployment': {
      order: 6,
      files: projectFiles.filter(f => 
        f.relativePath.includes('DEPLOYMENT')
      )
    },
    'Examples': {
      order: 7,
      files: projectFiles.filter(f => f.type === 'examples')
    },
    'Community': {
      order: 8,
      files: projectFiles.filter(f => f.type === 'community')
    }
  };
  
  let sectionNumber = 1;
  for (const [sectionName, sectionData] of Object.entries(contentHierarchy)) {
    sectionData.number = sectionNumber++;
    if (sectionData.files) {
      log.info(`   ${sectionData.number}. ${sectionName} (${sectionData.files.length} files)`);
    }
  }
  
  log.info('\n✅ Content structure designed\n');
  
  // Task 1.3: Markdown Consolidation
  log.info('🔧 Task 1.3: Markdown Consolidation');
  
  let consolidatedContent = `# Smart MCP Server - Comprehensive Documentation

**Version:** 2.0.0  
**Generated:** ${new Date().toISOString().split('T')[0]}  

## About This Document

This comprehensive documentation consolidates all project documentation, guides, and technical specifications for the Smart MCP Server.

## Table of Contents

`;
  
  // Add TOC
  const sortedSections = Object.entries(contentHierarchy)
    .sort(([,a], [,b]) => a.order - b.order);
  
  for (const [sectionName, sectionData] of sortedSections) {
    if (sectionData.files && sectionData.files.length > 0) {
      consolidatedContent += `${sectionData.number}. [${sectionName}](#${sectionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')})\n`;
    }
  }
  
  consolidatedContent += '\n---\n\n';
  
  // Add content sections
  for (const [sectionName, sectionData] of sortedSections) {
    if (sectionData.files && sectionData.files.length > 0) {
      consolidatedContent += `# ${sectionData.number}. ${sectionName}\n\n`;
      
      let subsectionNumber = 1;
      for (const file of sectionData.files) {
        const fileName = path.basename(file.relativePath, '.md');
        consolidatedContent += `## ${sectionData.number}.${subsectionNumber} ${fileName}\n\n`;
        
        // Clean and add file content
        let fileContent = file.content;
        fileContent = fileContent.replace(/^#\s+.+$/m, ''); // Remove main title
        fileContent = fileContent.replace(/^(#{1,4})/gm, (match, hashes) => '##' + hashes); // Adjust heading levels
        
        consolidatedContent += fileContent + '\n\n---\n\n';
        subsectionNumber++;
      }
    }
  }
  
  // Add appendix
  consolidatedContent += `# Appendices

## Appendix A: File Structure

\`\`\`
${projectFiles.map(f => f.relativePath).sort().join('\n')}
\`\`\`

## Appendix B: Statistics

- Total Documentation Files: ${projectFiles.length}
- Total Content Size: ${(totalSize / 1024).toFixed(1)} KB
- Total Word Count: ${totalWords.toLocaleString()}
- Generation Date: ${new Date().toISOString()}

`;
  
  // Save consolidated documentation
  await fs.writeFile('CONSOLIDATED_DOCUMENTATION.md', consolidatedContent);
  log.info('   ✅ Consolidated documentation saved to CONSOLIDATED_DOCUMENTATION.md');
  
  // Task 1.4: Generate HTML version
  log.info('\n📄 Task 1.4: Generating HTML version');
  
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>Smart MCP Server - Comprehensive Documentation</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 20px; 
            line-height: 1.6;
        }
        h1, h2, h3 { color: #333; }
        h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
        h2 { border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        code { 
            background: #f4f4f4; 
            padding: 2px 4px; 
            border-radius: 3px; 
            font-family: 'Courier New', monospace;
        }
        pre { 
            background: #f4f4f4; 
            padding: 15px; 
            border-radius: 5px; 
            overflow-x: auto;
            border-left: 4px solid #007acc;
        }
        blockquote {
            border-left: 4px solid #ddd;
            margin: 0;
            padding-left: 20px;
            color: #666;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
    </style>
</head>
<body>
    ${require('marked').parse(consolidatedContent)}
</body>
</html>`;
  
  await fs.writeFile('CONSOLIDATED_DOCUMENTATION.html', htmlContent);
  log.info('   ✅ HTML documentation saved to CONSOLIDATED_DOCUMENTATION.html');
  
  log.info('\nPhase 1 Complete\n');
}

if (require.main === module) {
  runPhase1().catch(async (error) => {
    const log = await getLogger();
    log.error('Phase 1 execution failed:', error);
    process.exit(1);
  });
}

module.exports = runPhase1;