const logger = require('./src/logger');
const fs = require('fs').promises;
const path = require('path');

async function consolidateDocumentation() {
  logger.info('🚀 Phase 1: Documentation Consolidation Starting...\n');
  
  // Task 1.1: Find project markdown files
  logger.info('📋 Task 1.1: Analyzing markdown files...');
  
  const projectFiles = [
    'README.md',
    'A2A_INTEGRATION.md', 
    'COMPREHENSIVE_A2A_SYSTEM_PLAN.md',
    'DEPLOYMENT.md',
    'CONTRIBUTING.md',
    'CODE_OF_CONDUCT.md',
    'TROUBLESHOOTING.md',
    'gemini.md',
    'PROJECT_IMPLEMENTATION_PLAN.md',
    'docs/COMPREHENSIVE_A2A_FINANCIAL_SYSTEM_PLAN.md',
    'docs/FINANCIAL_SERVICES_ARCHITECTURE.md',
    'docs/context-aware-selector.md',
    'docs/freight-logistics-integration.md',
    'docs/gemini-integration.md',
    'docs/workflow-testing.md',
    'docs/compliance/stripe_services_and_policies.md',
    'examples/README.md'
  ];
  
  const files = [];
  let totalSize = 0;
  let totalWords = 0;
  
  for (const filePath of projectFiles) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);
      
      files.push({
        path: filePath,
        content: content,
        size: stats.size,
        wordCount: content.split(/\s+/).length
      });
      
      totalSize += stats.size;
      totalWords += content.split(/\s+/).length;
      
      logger.info(`   ✅ ${filePath} (${(stats.size/1024).toFixed(1)} KB)`);
    } catch (_error) {
      logger.warn(`   ❌ Missing: ${filePath}`);
    }
  }
  
  logger.info(`\n📊 Analysis Complete:
- Files processed: ${files.length}
- Total size: ${(totalSize / 1024).toFixed(1)} KB  
- Total words: ${totalWords.toLocaleString()}\n`);

  // Task 1.3: Generate consolidated documentation
  logger.info('🔧 Task 1.3: Consolidating documentation...');
  
  let consolidated = `# Smart MCP Server - Comprehensive Documentation

**Version:** 2.0.0  
**Generated:** ${new Date().toISOString().split('T')[0]}  
**Total Files:** ${files.length}  
**Total Content:** ${(totalSize / 1024).toFixed(1)} KB  

## About This Document

This comprehensive documentation consolidates all project documentation, guides, and technical specifications for the Smart MCP Server - an AI-powered financial and document management system.

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & System Design](#2-architecture--system-design)  
3. [Integration Guides](#3-integration-guides)
4. [Financial Services](#4-financial-services)
5. [Development & Testing](#5-development--testing)
6. [Deployment & Operations](#6-deployment--operations)
7. [Community & Contributing](#7-community--contributing)
8. [Implementation Plans](#8-implementation-plans)
9. [Appendices](#9-appendices)

---

`;

  // Section 1: Project Overview
  const overviewFiles = files.filter(f => 
    f.path.includes('README.md') && !f.path.includes('examples')
  );
  
  if (overviewFiles.length > 0) {
    consolidated += '# 1. Project Overview\n\n';
    for (const file of overviewFiles) {
      const fileName = path.basename(file.path, '.md');
      consolidated += `## 1.1 ${fileName}\n\n${file.content}\n\n---\n\n`;
    }
  }

  // Section 2: Architecture & System Design
  const archFiles = files.filter(f => 
    f.path.includes('COMPREHENSIVE_A2A') || 
    f.path.includes('FINANCIAL_SERVICES_ARCHITECTURE') ||
    f.path.includes('context-aware-selector')
  );
  
  if (archFiles.length > 0) {
    consolidated += '# 2. Architecture & System Design\n\n';
    let subsection = 1;
    for (const file of archFiles) {
      const fileName = path.basename(file.path, '.md');
      consolidated += `## 2.${subsection} ${fileName}\n\n${file.content}\n\n---\n\n`;
      subsection++;
    }
  }

  // Section 3: Integration Guides  
  const integrationFiles = files.filter(f => 
    f.path.includes('A2A_INTEGRATION') ||
    f.path.includes('gemini-integration') ||
    f.path.includes('freight-logistics')
  );
  
  if (integrationFiles.length > 0) {
    consolidated += '# 3. Integration Guides\n\n';
    let subsection = 1;
    for (const file of integrationFiles) {
      const fileName = path.basename(file.path, '.md');
      consolidated += `## 3.${subsection} ${fileName}\n\n${file.content}\n\n---\n\n`;
      subsection++;
    }
  }

  // Section 4: Financial Services
  const financeFiles = files.filter(f => 
    f.path.includes('stripe_services') ||
    f.path.includes('FINANCIAL_SERVICES')
  );
  
  if (financeFiles.length > 0) {
    consolidated += '# 4. Financial Services\n\n';
    let subsection = 1;
    for (const file of financeFiles) {
      const fileName = path.basename(file.path, '.md');
      consolidated += `## 4.${subsection} ${fileName}\n\n${file.content}\n\n---\n\n`;
      subsection++;
    }
  }

  // Section 5: Development & Testing
  const devFiles = files.filter(f => 
    f.path.includes('workflow-testing') ||
    f.path.includes('TROUBLESHOOTING')
  );
  
  if (devFiles.length > 0) {
    consolidated += '# 5. Development & Testing\n\n';
    let subsection = 1;
    for (const file of devFiles) {
      const fileName = path.basename(file.path, '.md');
      consolidated += `## 5.${subsection} ${fileName}\n\n${file.content}\n\n---\n\n`;
      subsection++;
    }
  }

  // Section 6: Deployment & Operations
  const deployFiles = files.filter(f => 
    f.path.includes('DEPLOYMENT')
  );
  
  if (deployFiles.length > 0) {
    consolidated += '# 6. Deployment & Operations\n\n';
    let subsection = 1;
    for (const file of deployFiles) {
      const fileName = path.basename(file.path, '.md');
      consolidated += `## 6.${subsection} ${fileName}\n\n${file.content}\n\n---\n\n`;
      subsection++;
    }
  }

  // Section 7: Community & Contributing
  const communityFiles = files.filter(f => 
    f.path.includes('CONTRIBUTING') ||
    f.path.includes('CODE_OF_CONDUCT')
  );
  
  if (communityFiles.length > 0) {
    consolidated += '# 7. Community & Contributing\n\n';
    let subsection = 1;
    for (const file of communityFiles) {
      const fileName = path.basename(file.path, '.md');
      consolidated += `## 7.${subsection} ${fileName}\n\n${file.content}\n\n---\n\n`;
      subsection++;
    }
  }

  // Section 8: Implementation Plans
  const planFiles = files.filter(f => 
    f.path.includes('PROJECT_IMPLEMENTATION_PLAN') ||
    f.path.includes('gemini.md')
  );
  
  if (planFiles.length > 0) {
    consolidated += '# 8. Implementation Plans\n\n';
    let subsection = 1;
    for (const file of planFiles) {
      const fileName = path.basename(file.path, '.md');
      consolidated += `## 8.${subsection} ${fileName}\n\n${file.content}\n\n---\n\n`;
      subsection++;
    }
  }

  // Section 9: Appendices
  consolidated += `# 9. Appendices

## Appendix A: File Structure

\`\`\`
${files.map(f => f.path).sort().join('\n')}
\`\`\`

## Appendix B: Documentation Statistics

- **Total Files**: ${files.length}
- **Total Size**: ${(totalSize / 1024).toFixed(1)} KB
- **Total Words**: ${totalWords.toLocaleString()}
- **Average File Size**: ${(totalSize / files.length / 1024).toFixed(1)} KB
- **Generated**: ${new Date().toISOString()}

## Appendix C: File Details

${files.map(f => `- **${f.path}**: ${(f.size/1024).toFixed(1)} KB, ${f.wordCount.toLocaleString()} words`).join('\n')}

---
*This documentation was automatically generated by the Smart MCP Server Documentation Consolidation Tool as part of Phase 1 implementation.*
`;

  // Save consolidated documentation
  await fs.writeFile('CONSOLIDATED_DOCUMENTATION.md', consolidated);
  logger.info('   ✅ Saved: CONSOLIDATED_DOCUMENTATION.md');
  
  logger.info('\n🎉 Phase 1 Complete! Generated comprehensive documentation.');
  logger.info(`📄 Output: CONSOLIDATED_DOCUMENTATION.md (${(consolidated.length/1024).toFixed(1)} KB)`);
}

consolidateDocumentation().catch(logger.error); 