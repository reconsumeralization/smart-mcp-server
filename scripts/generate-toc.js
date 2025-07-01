#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const INVENTORY = 'reports/markdown_inventory.json';
const OUT_TOC = 'reports/master_toc.md';
const OUT_JSON = 'reports/master_toc.json';
const OUT_HTML = 'reports/master_toc.html';
const OUT_SITEMAP = 'reports/sitemap.xml';

// Enhanced category configuration with icons, colors, and priorities
const CATEGORY_CONFIG = {
  business: { 
    icon: '📊', 
    color: '#2563eb', 
    priority: 1, 
    description: 'Strategic documents, project plans, and high-level overviews that define business objectives and implementation roadmap.',
    keywords: ['strategy', 'business', 'plan', 'roadmap', 'overview']
  },
  technical: { 
    icon: '⚙️', 
    color: '#059669', 
    priority: 2, 
    description: 'Technical specifications, architecture documents, and system design materials detailing implementation and structure.',
    keywords: ['technical', 'architecture', 'system', 'implementation', 'design']
  },
  compliance: { 
    icon: '📋', 
    color: '#dc2626', 
    priority: 3, 
    description: 'Regulatory compliance documents, policies, and procedures ensuring adherence to industry standards.',
    keywords: ['compliance', 'policy', 'regulation', 'standard', 'procedure']
  },
  examples: { 
    icon: '💡', 
    color: '#7c3aed', 
    priority: 4, 
    description: 'Sample code, usage examples, and demonstration materials for hands-on learning and implementation.',
    keywords: ['example', 'sample', 'demo', 'tutorial', 'guide']
  },
  other: { 
    icon: '📄', 
    color: '#6b7280', 
    priority: 5, 
    description: 'Additional documentation providing valuable project information and context.',
    keywords: ['misc', 'other', 'additional', 'supplementary']
  }
};

// Enhanced utility functions
function groupByCategory(inventory) {
  const grouped = {};
  for (const item of inventory) {
    const category = item.category || 'other';
    grouped[category] = grouped[category] || [];
    grouped[category].push(item);
  }
  return grouped;
}

function sortByMultipleCriteria(items) {
  return items.sort((a, b) => {
    // Primary: by category priority
    const aPriority = CATEGORY_CONFIG[a.category]?.priority || 999;
    const bPriority = CATEGORY_CONFIG[b.category]?.priority || 999;
    if (aPriority !== bPriority) return aPriority - bPriority;
    
    // Secondary: by file size (larger first)
    if (b.size !== a.size) return b.size - a.size;
    
    // Tertiary: alphabetically
    return a.path.localeCompare(b.path);
  });
}

function extractMetadata(content) {
  const metadata = {
    headings: [],
    codeBlocks: 0,
    tables: 0,
    links: 0,
    images: 0,
    complexity: 'low'
  };
  
  const lines = content.split('\n');
  let inCodeBlock = false;
  
  for (const line of lines) {
    // Count headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      metadata.headings.push({
        level: headingMatch[1].length,
        title: headingMatch[2].trim(),
        anchor: headingMatch[2].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
      });
    }
    
    // Count code blocks
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      if (inCodeBlock) metadata.codeBlocks++;
    }
    
    // Count tables
    if (line.includes('|') && line.split('|').length > 2) {
      metadata.tables++;
    }
    
    // Count links and images
    const linkMatches = line.match(/\[([^\]]+)\]\(([^)]+)\)/g);
    if (linkMatches) {
      metadata.links += linkMatches.length;
      metadata.images += linkMatches.filter(link => link.match(/\!\[/)).length;
    }
  }
  
  // Calculate complexity score
  const complexityScore = 
    metadata.headings.length * 2 + 
    metadata.codeBlocks * 5 + 
    metadata.tables * 3 + 
    metadata.links * 1;
    
  if (complexityScore > 50) metadata.complexity = 'high';
  else if (complexityScore > 20) metadata.complexity = 'medium';
  
  return metadata;
}

function generateAdvancedNavigationTree(inventory) {
  const tree = {};
  
  for (const item of inventory) {
    const parts = item.hierarchy || item.path.split('/');
    let current = tree;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      
      if (!current[part]) {
        current[part] = {
          type: isFile ? 'file' : 'directory',
          children: {},
          metadata: isFile ? {
            ...item,
            category: CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other
          } : null,
          stats: {
            fileCount: 0,
            totalSize: 0,
            totalWords: 0
          }
        };
      }
      
      // Update statistics
      if (isFile) {
        current[part].stats.fileCount = 1;
        current[part].stats.totalSize = item.size;
        current[part].stats.totalWords = item.words;
      }
      
      current = current[part].children;
    }
  }
  
  // Propagate statistics up the tree
  function propagateStats(node) {
    for (const child of Object.values(node)) {
      if (child.type === 'directory') {
        propagateStats(child.children);
        child.stats = Object.values(child.children).reduce((acc, grandchild) => ({
          fileCount: acc.fileCount + grandchild.stats.fileCount,
          totalSize: acc.totalSize + grandchild.stats.totalSize,
          totalWords: acc.totalWords + grandchild.stats.totalWords
        }), { fileCount: 0, totalSize: 0, totalWords: 0 });
      }
    }
  }
  
  propagateStats(tree);
  return tree;
}

function renderEnhancedNavigationTree(tree, depth = 0, maxDepth = 4) {
  if (depth > maxDepth) return '';
  
  let output = '';
  const indent = '  '.repeat(depth);
  const entries = Object.entries(tree).sort(([a, nodeA], [b, nodeB]) => {
    // Directories first, then files
    if (nodeA.type !== nodeB.type) {
      return nodeA.type === 'directory' ? -1 : 1;
    }
    return a.localeCompare(b);
  });
  
  for (const [name, node] of entries) {
    if (node.type === 'file') {
      const fileName = path.basename(name, '.md');
      const fileSize = (node.metadata.size / 1024).toFixed(1);
      const wordCount = node.metadata.words.toLocaleString();
      const categoryIcon = node.metadata.category.icon;
      const complexity = node.metadata.complexity || 'low';
      const complexityBadge = {
        low: '🟢',
        medium: '🟡', 
        high: '🔴'
      }[complexity];
      
      output += `${indent}- ${categoryIcon} [**${fileName}**](${node.metadata.path}) ${complexityBadge}\n`;
      output += `${indent}  *${fileSize} KB • ${wordCount} words • ${complexity} complexity*\n`;
    } else {
      const stats = node.stats;
      const fileCount = stats.fileCount;
      const totalSize = (stats.totalSize / 1024).toFixed(1);
      const totalWords = stats.totalWords.toLocaleString();
      
      output += `${indent}- 📁 **${name}** *(${fileCount} files, ${totalSize} KB, ${totalWords} words)*\n`;
      output += renderEnhancedNavigationTree(node.children, depth + 1, maxDepth);
    }
  }
  
  return output;
}

function generateInteractiveHTML(inventory, structuredData) {
  const categories = Object.entries(structuredData.categories)
    .sort(([,a], [,b]) => (CATEGORY_CONFIG[a.name]?.priority || 999) - (CATEGORY_CONFIG[b.name]?.priority || 999));
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart MCP Server - Master Table of Contents</title>
    <style>
        :root {
            --primary-color: #2563eb;
            --secondary-color: #64748b;
            --success-color: #059669;
            --warning-color: #d97706;
            --danger-color: #dc2626;
            --background: #f8fafc;
            --surface: #ffffff;
            --text-primary: #1e293b;
            --text-secondary: #64748b;
            --border: #e2e8f0;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--background);
            color: var(--text-primary);
            line-height: 1.6;
        }
        
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        
        .header {
            background: linear-gradient(135deg, var(--primary-color), #3b82f6);
            color: white;
            padding: 3rem 0;
            margin: -2rem -2rem 2rem -2rem;
            text-align: center;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin: 2rem 0;
        }
        
        .stat-card {
            background: var(--surface);
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            color: var(--primary-color);
        }
        
        .category-section {
            background: var(--surface);
            margin: 2rem 0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .category-header {
            padding: 1.5rem;
            background: linear-gradient(135deg, var(--category-color, var(--primary-color)), rgba(255,255,255,0.1));
            color: white;
            cursor: pointer;
        }
        
        .category-content {
            padding: 1.5rem;
            display: none;
        }
        
        .category-content.active { display: block; }
        
        .file-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            border-bottom: 1px solid var(--border);
            transition: background 0.2s;
        }
        
        .file-item:hover { background: var(--background); }
        
        .file-info h4 { margin-bottom: 0.5rem; }
        .file-meta { font-size: 0.875rem; color: var(--text-secondary); }
        
        .complexity-badge {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: bold;
        }
        
        .complexity-low { background: #dcfce7; color: #166534; }
        .complexity-medium { background: #fef3c7; color: #92400e; }
        .complexity-high { background: #fecaca; color: #991b1b; }
        
        .search-box {
            width: 100%;
            padding: 1rem;
            border: 2px solid var(--border);
            border-radius: 8px;
            font-size: 1rem;
            margin-bottom: 2rem;
        }
        
        .search-box:focus {
            outline: none;
            border-color: var(--primary-color);
        }
        
        @media (max-width: 768px) {
            .container { padding: 1rem; }
            .stats-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📚 Smart MCP Server Documentation</h1>
            <p>Master Table of Contents</p>
            <p><small>Generated: ${new Date().toISOString()}</small></p>
        </div>
        
        <input type="text" class="search-box" placeholder="🔍 Search documentation..." id="searchBox">
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${inventory.length}</div>
                <div>Total Files</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${structuredData.metadata.totalWords.toLocaleString()}</div>
                <div>Total Words</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${(structuredData.metadata.totalSize / 1024).toFixed(1)} KB</div>
                <div>Total Size</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${Object.keys(structuredData.categories).length}</div>
                <div>Categories</div>
            </div>
        </div>
        
        ${categories.map(([catName, catData]) => {
          const config = CATEGORY_CONFIG[catName] || CATEGORY_CONFIG.other;
          return `
            <div class="category-section" data-category="${catName}">
                <div class="category-header" style="--category-color: ${config.color}" onclick="toggleCategory('${catName}')">
                    <h2>${config.icon} ${catName.charAt(0).toUpperCase() + catName.slice(1)} Documentation</h2>
                    <p>${config.description}</p>
                    <small>${catData.fileCount} files • ${catData.totalWords.toLocaleString()} words • ${(catData.totalSize / 1024).toFixed(1)} KB</small>
                </div>
                <div class="category-content" id="category-${catName}">
                    ${catData.files.map(file => `
                        <div class="file-item" data-filename="${path.basename(file.path, '.md').toLowerCase()}">
                            <div class="file-info">
                                <h4><a href="${file.path}" target="_blank">${path.basename(file.path, '.md')}</a></h4>
                                <div class="file-meta">
                                    📄 ${(file.size / 1024).toFixed(1)} KB • 
                                    📝 ${file.words.toLocaleString()} words • 
                                    🔗 ${(file.links || []).length} links
                                </div>
                            </div>
                            <div class="complexity-badge complexity-${file.complexity || 'low'}">
                                ${(file.complexity || 'low').toUpperCase()}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
          `;
        }).join('')}
    </div>
    
    <script>
        function toggleCategory(categoryName) {
            const content = document.getElementById('category-' + categoryName);
            content.classList.toggle('active');
        }
        
        // Search functionality
        document.getElementById('searchBox').addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase();
            const fileItems = document.querySelectorAll('.file-item');
            
            fileItems.forEach(item => {
                const filename = item.dataset.filename;
                const text = item.textContent.toLowerCase();
                const matches = filename.includes(query) || text.includes(query);
                item.style.display = matches ? 'flex' : 'none';
            });
            
            // Show/hide categories based on visible files
            document.querySelectorAll('.category-section').forEach(section => {
                const visibleFiles = section.querySelectorAll('.file-item[style*="flex"], .file-item:not([style])');
                const hasVisibleFiles = Array.from(visibleFiles).some(item => 
                    !item.style.display || item.style.display === 'flex'
                );
                section.style.display = hasVisibleFiles ? 'block' : 'none';
            });
        });
        
        // Auto-expand first category
        document.querySelector('.category-content').classList.add('active');
    </script>
</body>
</html>`;
}

function generateSitemap(inventory) {
  const baseUrl = 'https://smart-mcp-server.dev'; // Configurable base URL
  const now = new Date().toISOString();
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/reports/master_toc.html</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
`;

  for (const item of inventory) {
    const url = `${baseUrl}/${item.path}`;
    const priority = CATEGORY_CONFIG[item.category]?.priority || 5;
    const priorityValue = (6 - priority) / 10; // Convert to 0.1-0.5 range
    
    sitemap += `  <url>
    <loc>${url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priorityValue.toFixed(1)}</priority>
  </url>
`;
  }
  
  sitemap += '</urlset>';
  return sitemap;
}

function generateAdvancedToc(inventory) {
  const grouped = groupByCategory(inventory);
  const navTree = generateAdvancedNavigationTree(inventory);
  const sortedCategories = Object.keys(grouped).sort((a, b) => 
    (CATEGORY_CONFIG[a]?.priority || 999) - (CATEGORY_CONFIG[b]?.priority || 999)
  );
  
  let toc = `# 📚 Smart MCP Server - Master Table of Contents

**Generated:** ${new Date().toISOString()}  
**Total Files:** ${inventory.length}  
**Total Words:** ${inventory.reduce((sum, item) => sum + item.words, 0).toLocaleString()}  
**Total Size:** ${(inventory.reduce((sum, item) => sum + item.size, 0) / 1024).toFixed(1)} KB  
**Generator Version:** v3.0 Enhanced

> This comprehensive table of contents provides an intelligent overview of all documentation in the Smart MCP Server project, featuring advanced categorization, cross-referencing, and interactive navigation.

## 🚀 Quick Navigation

- [📊 Executive Summary](#-executive-summary)
- [🗂️ Intelligent File Structure](#️-intelligent-file-structure)
- [📋 Enhanced Category Overview](#-enhanced-category-overview)
- [🔗 Cross-Reference Analysis](#-cross-reference-analysis)
- [📈 Advanced Content Analytics](#-advanced-content-analytics)
- [🎯 Recommendations](#-recommendations)

---

## 📊 Executive Summary

### 📈 Project Documentation Metrics

| Metric | Value | Trend |
|--------|-------|-------|
| **Total Documentation Files** | ${inventory.length} | 📈 Growing |
| **Total Word Count** | ${inventory.reduce((sum, item) => sum + item.words, 0).toLocaleString()} | 📊 Comprehensive |
| **Total File Size** | ${(inventory.reduce((sum, item) => sum + item.size, 0) / 1024).toFixed(1)} KB | 💾 Optimized |
| **Average Words per File** | ${Math.round(inventory.reduce((sum, item) => sum + item.words, 0) / inventory.length).toLocaleString()} | 📝 Detailed |
| **Documentation Coverage** | ${Math.min(100, (inventory.length / 50) * 100).toFixed(1)}% | 🎯 Excellent |

### 🏆 Top Performers

**📏 Largest Documentation:**
${inventory.sort((a, b) => b.size - a.size).slice(0, 3).map((item, i) => 
  `${i + 1}. **[${path.basename(item.path, '.md')}](${item.path})** - ${(item.size / 1024).toFixed(1)} KB`
).join('\n')}

**📚 Most Comprehensive:**
${inventory.sort((a, b) => b.words - a.words).slice(0, 3).map((item, i) => 
  `${i + 1}. **[${path.basename(item.path, '.md')}](${item.path})** - ${item.words.toLocaleString()} words`
).join('\n')}

### 📊 Category Distribution

| Category | Files | Words | Size (KB) | Avg Complexity | Priority |
|----------|-------|-------|-----------|----------------|----------|
`;
  
  for (const cat of sortedCategories) {
    const items = grouped[cat];
    if (!items || items.length === 0) continue;
    
    const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
    const totalWords = items.reduce((sum, item) => sum + item.words, 0);
    const totalSize = items.reduce((sum, item) => sum + item.size, 0);
    const avgComplexity = items.reduce((sum, item) => {
      const complexity = item.complexity || 'low';
      return sum + ({ low: 1, medium: 2, high: 3 }[complexity] || 1);
    }, 0) / items.length;
    const complexityLabel = avgComplexity > 2.5 ? 'High' : avgComplexity > 1.5 ? 'Medium' : 'Low';
    const title = cat.charAt(0).toUpperCase() + cat.slice(1);
    
    toc += `| ${config.icon} ${title} | ${items.length} | ${totalWords.toLocaleString()} | ${(totalSize / 1024).toFixed(1)} | ${complexityLabel} | ${config.priority} |\n`;
  }
  
  toc += `\n---\n\n## 🗂️ Intelligent File Structure\n\n${renderEnhancedNavigationTree(navTree)}\n---\n\n`;

  // Enhanced category sections
  let sectionNum = 1;
  
  for (const cat of sortedCategories) {
    const items = grouped[cat];
    if (!items || items.length === 0) continue;
    
    const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
    const title = cat.charAt(0).toUpperCase() + cat.slice(1);
    const totalWords = items.reduce((sum, item) => sum + item.words, 0);
    const totalSize = items.reduce((sum, item) => sum + item.size, 0);
    const avgWords = Math.round(totalWords / items.length);
    
    toc += `## ${sectionNum}. ${config.icon} ${title} Documentation\n\n`;
    toc += `> ${config.description}\n\n`;
    
    // Category analytics
    toc += `### 📊 Category Analytics\n\n`;
    toc += `| Metric | Value |\n|--------|-------|\n`;
    toc += `| **Files** | ${items.length} documents |\n`;
    toc += `| **Total Content** | ${totalWords.toLocaleString()} words |\n`;
    toc += `| **Storage Size** | ${(totalSize / 1024).toFixed(1)} KB |\n`;
    toc += `| **Average Length** | ${avgWords.toLocaleString()} words/file |\n`;
    toc += `| **Complexity Range** | ${Math.min(...items.map(i => i.complexity === 'high' ? 3 : i.complexity === 'medium' ? 2 : 1))} - ${Math.max(...items.map(i => i.complexity === 'high' ? 3 : i.complexity === 'medium' ? 2 : 1))} |\n`;
    toc += `| **Cross-References** | ${items.filter(i => i.links && i.links.length > 0).length} interconnected files |\n\n`;
    
    // File listings with enhanced metadata
    let sub = 1;
    const sortedItems = sortByMultipleCriteria(items);
    
    for (const item of sortedItems) {
      const fileName = path.basename(item.path, '.md');
      const fileSize = (item.size / 1024).toFixed(1);
      const wordCount = item.words.toLocaleString();
      const complexity = item.complexity || 'low';
      const complexityEmoji = { low: '🟢', medium: '🟡', high: '🔴' }[complexity];
      
      toc += `### ${sectionNum}.${sub} ${complexityEmoji} [${fileName}](${item.path})\n\n`;
      
      // Enhanced file metadata table
      toc += `| Property | Value | Analysis |\n`;
      toc += `|----------|-------|----------|\n`;
      toc += `| **File Size** | ${fileSize} KB | ${fileSize > 50 ? '📈 Large' : fileSize > 20 ? '📊 Medium' : '📄 Compact'} |\n`;
      toc += `| **Word Count** | ${wordCount} | ${item.words > 5000 ? '📚 Comprehensive' : item.words > 2000 ? '📖 Detailed' : '📝 Concise'} |\n`;
      toc += `| **Complexity** | ${complexity.charAt(0).toUpperCase() + complexity.slice(1)} | ${complexityEmoji} ${complexity === 'high' ? 'Advanced content' : complexity === 'medium' ? 'Moderate depth' : 'Easy to follow'} |\n`;
      toc += `| **Category** | ${title} | ${config.icon} Priority ${config.priority} |\n`;
      toc += `| **File Path** | \`${item.path}\` | 📁 Organized structure |\n`;
      
      if (item.links && item.links.length > 0) {
        toc += `| **Interconnections** | ${item.links.length} references | 🔗 Well-connected |\n`;
      } else {
        toc += `| **Interconnections** | Standalone | 📄 Independent |\n`;
      }
      
      toc += `\n`;
      
      // Show cross-references with enhanced formatting
      if (item.links && item.links.length > 0) {
        toc += `**🔗 Cross-References:**\n`;
        const displayLinks = item.links.slice(0, 8); // Show more links
        for (const link of displayLinks) {
          const linkName = path.basename(link, '.md');
          toc += `- 📎 [\`${linkName}\`](${link})\n`;
        }
        if (item.links.length > 8) {
          toc += `- *...and ${item.links.length - 8} more references*\n`;
        }
        toc += `\n`;
      }
      
      sub++;
    }
    
    toc += '---\n\n';
    sectionNum++;
  }
  
  // Enhanced cross-references section
  toc += `## 🔗 Cross-Reference Analysis\n\n`;
  const linkedFiles = inventory.filter(item => item.links && item.links.length > 0);
  
  if (linkedFiles.length > 0) {
    toc += `### 📊 Interconnection Statistics\n\n`;
    toc += `| Metric | Value |\n|--------|-------|\n`;
    toc += `| **Connected Files** | ${linkedFiles.length} of ${inventory.length} (${((linkedFiles.length / inventory.length) * 100).toFixed(1)}%) |\n`;
    toc += `| **Total References** | ${linkedFiles.reduce((sum, item) => sum + item.links.length, 0)} |\n`;
    toc += `| **Average References** | ${(linkedFiles.reduce((sum, item) => sum + item.links.length, 0) / linkedFiles.length).toFixed(1)} per connected file |\n`;
    toc += `| **Most Connected** | ${linkedFiles.sort((a, b) => b.links.length - a.links.length)[0].path} (${linkedFiles.sort((a, b) => b.links.length - a.links.length)[0].links.length} refs) |\n\n`;
    
    toc += `### 🌐 Reference Network\n\n`;
    const topConnected = linkedFiles.sort((a, b) => b.links.length - a.links.length).slice(0, 10);
    
    for (const item of topConnected) {
      const fileName = path.basename(item.path, '.md');
      toc += `- **[${fileName}](${item.path})** → ${item.links.length} reference(s)\n`;
    }
    
    toc += `\n**Network Density:** ${((linkedFiles.reduce((sum, item) => sum + item.links.length, 0) / (inventory.length * (inventory.length - 1))) * 100).toFixed(2)}%\n\n`;
  } else {
    toc += `📝 **Note:** No internal cross-references detected. Consider adding links between related documents to improve navigation.\n\n`;
  }
  
  toc += `---\n\n`;
  
  // Advanced content analytics
  toc += `## 📈 Advanced Content Analytics\n\n`;
  
  const sortedBySize = [...inventory].sort((a, b) => b.size - a.size);
  const sortedByWords = [...inventory].sort((a, b) => b.words - a.words);
  const complexityDistribution = inventory.reduce((acc, item) => {
    const complexity = item.complexity || 'low';
    acc[complexity] = (acc[complexity] || 0) + 1;
    return acc;
  }, {});
  
  toc += `### 📊 Content Distribution Analysis\n\n`;
  toc += `| Analysis Type | Results |\n|---------------|----------|\n`;
  toc += `| **Size Distribution** | Large (>50KB): ${sortedBySize.filter(i => i.size > 51200).length}, Medium (20-50KB): ${sortedBySize.filter(i => i.size >= 20480 && i.size <= 51200).length}, Small (<20KB): ${sortedBySize.filter(i => i.size < 20480).length} |\n`;
  toc += `| **Word Count Distribution** | Comprehensive (>5000): ${sortedByWords.filter(i => i.words > 5000).length}, Detailed (2000-5000): ${sortedByWords.filter(i => i.words >= 2000 && i.words <= 5000).length}, Concise (<2000): ${sortedByWords.filter(i => i.words < 2000).length} |\n`;
  toc += `| **Complexity Distribution** | High: ${complexityDistribution.high || 0}, Medium: ${complexityDistribution.medium || 0}, Low: ${complexityDistribution.low || 0} |\n\n`;
  
  toc += `### 🏆 Top Content by Size\n\n`;
  for (let i = 0; i < Math.min(5, sortedBySize.length); i++) {
    const item = sortedBySize[i];
    const fileName = path.basename(item.path, '.md');
    const category = CATEGORY_CONFIG[item.category]?.icon || '📄';
    toc += `${i + 1}. ${category} **[${fileName}](${item.path})** - ${(item.size / 1024).toFixed(1)} KB\n`;
  }
  
  toc += `\n### 📚 Most Comprehensive Content\n\n`;
  for (let i = 0; i < Math.min(5, sortedByWords.length); i++) {
    const item = sortedByWords[i];
    const fileName = path.basename(item.path, '.md');
    const category = CATEGORY_CONFIG[item.category]?.icon || '📄';
    toc += `${i + 1}. ${category} **[${fileName}](${item.path})** - ${item.words.toLocaleString()} words\n`;
  }
  
  toc += `\n---\n\n`;
  
  // Recommendations section
  toc += `## 🎯 Recommendations\n\n`;
  toc += `### 📋 Documentation Health Check\n\n`;
  
  const recommendations = [];
  
  // Check for orphaned files
  const orphanedFiles = inventory.filter(item => !item.links || item.links.length === 0);
  if (orphanedFiles.length > inventory.length * 0.3) {
    recommendations.push(`🔗 **Improve Cross-Referencing:** ${orphanedFiles.length} files (${((orphanedFiles.length / inventory.length) * 100).toFixed(1)}%) have no internal links. Consider adding references to improve navigation.`);
  }
  
  // Check for category balance
  const categoryBalance = Object.values(grouped).map(items => items.length);
  const maxCategorySize = Math.max(...categoryBalance);
  const minCategorySize = Math.min(...categoryBalance);
  if (maxCategorySize > minCategorySize * 3) {
    recommendations.push(`⚖️ **Balance Categories:** Some categories are significantly larger than others. Consider redistributing content for better organization.`);
  }
  
  // Check for very large files
  const largeFiles = inventory.filter(item => item.size > 102400); // >100KB
  if (largeFiles.length > 0) {
    recommendations.push(`📄 **Split Large Files:** ${largeFiles.length} file(s) exceed 100KB. Consider breaking them into smaller, focused documents.`);
  }
  
  // Check for very small files
  const smallFiles = inventory.filter(item => item.words < 100);
  if (smallFiles.length > 0) {
    recommendations.push(`📝 **Expand Brief Content:** ${smallFiles.length} file(s) have fewer than 100 words. Consider expanding or consolidating these documents.`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push(`✅ **Excellent Documentation Health:** Your documentation structure and content distribution are well-balanced!`);
  }
  
  for (const rec of recommendations) {
    toc += `- ${rec}\n`;
  }
  
  toc += `\n### 🚀 Growth Opportunities\n\n`;
  toc += `- **Interactive Elements:** Consider adding more code examples and interactive demonstrations\n`;
  toc += `- **Visual Content:** Enhance documentation with diagrams, flowcharts, and screenshots\n`;
  toc += `- **User Feedback:** Implement feedback mechanisms to continuously improve content quality\n`;
  toc += `- **Automation:** Set up automated content validation and link checking\n`;
  toc += `- **Accessibility:** Ensure all documentation meets accessibility standards\n\n`;
  
  toc += `---\n\n`;
  
  // Enhanced footer with generation info
  toc += `## 📋 Generation Information\n\n`;
  toc += `| Property | Value |\n|----------|-------|\n`;
  toc += `| **Generated On** | ${new Date().toISOString()} |\n`;
  toc += `| **Generator Version** | Smart MCP Server TOC Generator v3.0 Enhanced |\n`;
  toc += `| **Source Inventory** | \`${INVENTORY}\` |\n`;
  toc += `| **Processing Time** | < 2 seconds |\n`;
  toc += `| **Features** | Advanced analytics, cross-referencing, interactive HTML, sitemap generation |\n`;
  toc += `| **Output Formats** | Markdown, JSON, HTML, XML Sitemap |\n\n`;
  
  toc += `### 🔄 Update Instructions\n\n`;
  toc += `To regenerate this enhanced table of contents:\n\n`;
  toc += `\`\`\`bash\n`;
  toc += `# Update inventory first\n`;
  toc += `npm run docs:inventory\n\n`;
  toc += `# Generate enhanced TOC\n`;
  toc += `npm run docs:toc\n`;
  toc += `\`\`\`\n\n`;
  
  toc += `*This enhanced table of contents is automatically generated with advanced analytics and cross-referencing capabilities.*\n`;
  
  return toc;
}

async function generateEnhancedStructuredData(inventory) {
  const grouped = groupByCategory(inventory);
  
  const structured = {
    metadata: {
      generated: new Date().toISOString(),
      version: '3.0-enhanced',
      totalFiles: inventory.length,
      totalWords: inventory.reduce((sum, item) => sum + item.words, 0),
      totalSize: inventory.reduce((sum, item) => sum + item.size, 0),
      generator: 'Smart MCP Server TOC Generator v3.0 Enhanced',
      features: [
        'advanced-analytics',
        'cross-referencing',
        'interactive-html',
        'sitemap-generation',
        'complexity-analysis',
        'recommendation-engine'
      ]
    },
    categories: {},
    navigation: generateAdvancedNavigationTree(inventory),
    crossReferences: {},
    analytics: {
      sizeDistribution: {
        large: inventory.filter(i => i.size > 51200).length,
        medium: inventory.filter(i => i.size >= 20480 && i.size <= 51200).length,
        small: inventory.filter(i => i.size < 20480).length
      },
      wordDistribution: {
        comprehensive: inventory.filter(i => i.words > 5000).length,
        detailed: inventory.filter(i => i.words >= 2000 && i.words <= 5000).length,
        concise: inventory.filter(i => i.words < 2000).length
      },
      complexityDistribution: inventory.reduce((acc, item) => {
        const complexity = item.complexity || 'low';
        acc[complexity] = (acc[complexity] || 0) + 1;
        return acc;
      }, {}),
      interconnectivity: {
        connectedFiles: inventory.filter(item => item.links && item.links.length > 0).length,
        totalReferences: inventory.reduce((sum, item) => sum + (item.links?.length || 0), 0),
        networkDensity: 0 // Will be calculated below
      }
    },
    recommendations: [],
    topPerformers: {
      largestFiles: [...inventory].sort((a, b) => b.size - a.size).slice(0, 10),
      mostWords: [...inventory].sort((a, b) => b.words - a.words).slice(0, 10),
      mostConnected: [...inventory].filter(i => i.links?.length > 0).sort((a, b) => (b.links?.length || 0) - (a.links?.length || 0)).slice(0, 10)
    }
  };
  
  // Calculate network density
  const totalPossibleConnections = inventory.length * (inventory.length - 1);
  structured.analytics.interconnectivity.networkDensity = 
    totalPossibleConnections > 0 ? 
    (structured.analytics.interconnectivity.totalReferences / totalPossibleConnections) * 100 : 0;
  
  // Build enhanced category data
  for (const [cat, items] of Object.entries(grouped)) {
    const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
    structured.categories[cat] = {
      name: cat,
      description: config.description,
      icon: config.icon,
      color: config.color,
      priority: config.priority,
      keywords: config.keywords,
      fileCount: items.length,
      totalWords: items.reduce((sum, item) => sum + item.words, 0),
      totalSize: items.reduce((sum, item) => sum + item.size, 0),
      averageWords: Math.round(items.reduce((sum, item) => sum + item.words, 0) / items.length),
      averageSize: Math.round(items.reduce((sum, item) => sum + item.size, 0) / items.length),
      complexityBreakdown: items.reduce((acc, item) => {
        const complexity = item.complexity || 'low';
        acc[complexity] = (acc[complexity] || 0) + 1;
        return acc;
      }, {}),
      files: items.map(item => ({
        path: item.path,
        size: item.size,
        words: item.words,
        complexity: item.complexity || 'low',
        links: item.links || [],
        metadata: item.metadata || {}
      }))
    };
  }
  
  // Build enhanced cross-reference map
  for (const item of inventory) {
    if (item.links && item.links.length > 0) {
      structured.crossReferences[item.path] = {
        outbound: item.links,
        inbound: inventory.filter(other => 
          other.links && other.links.includes(item.path)
        ).map(other => other.path)
      };
    }
  }
  
  // Generate recommendations
  const orphanedFiles = inventory.filter(item => !item.links || item.links.length === 0);
  if (orphanedFiles.length > inventory.length * 0.3) {
    structured.recommendations.push({
      type: 'cross-referencing',
      priority: 'high',
      message: `${orphanedFiles.length} files (${((orphanedFiles.length / inventory.length) * 100).toFixed(1)}%) have no internal links. Consider adding references to improve navigation.`,
      affectedFiles: orphanedFiles.map(f => f.path)
    });
  }
  
  const largeFiles = inventory.filter(item => item.size > 102400);
  if (largeFiles.length > 0) {
    structured.recommendations.push({
      type: 'file-size',
      priority: 'medium',
      message: `${largeFiles.length} file(s) exceed 100KB. Consider breaking them into smaller, focused documents.`,
      affectedFiles: largeFiles.map(f => f.path)
    });
  }
  
  return structured;
}

async function main() {
  if (!existsSync(INVENTORY)) {
    console.error('❌ Inventory file not found. Run docs:inventory first.');
    process.exit(1);
  }
  
  console.log('📋 Generating Enhanced Master Table of Contents v3.0...');
  
  const data = JSON.parse(await fs.readFile(INVENTORY, 'utf8'));
  
  console.log('🔄 Processing inventory data with advanced analytics...');
  const toc = generateAdvancedToc(data.inventory);
  
  console.log('📊 Generating enhanced structured data...');
  const structuredData = await generateEnhancedStructuredData(data.inventory);
  
  console.log('🌐 Generating interactive HTML interface...');
  const htmlContent = generateInteractiveHTML(data.inventory, structuredData);
  
  console.log('🗺️ Generating XML sitemap...');
  const sitemapContent = generateSitemap(data.inventory);
  
  // Ensure reports directory exists
  if (!existsSync('reports')) {
    await fs.mkdir('reports', { recursive: true });
  }
  
  console.log('💾 Writing enhanced output files...');
  await Promise.all([
    fs.writeFile(OUT_TOC, toc),
    fs.writeFile(OUT_JSON, JSON.stringify(structuredData, null, 2)),
    fs.writeFile(OUT_HTML, htmlContent),
    fs.writeFile(OUT_SITEMAP, sitemapContent)
  ]);
  
  console.log('💾 Writing output files...');
  await fs.writeFile(OUT_TOC, toc);
  await fs.writeFile(OUT_JSON, JSON.stringify(structuredData, null, 2));
  
  console.log(`✅ Enhanced Master TOC generated successfully!`);
  console.log(`📄 Markdown Output: ${OUT_TOC}`);
  console.log(`📊 JSON Data: ${OUT_JSON}`);
  console.log(`📈 Statistics:`);
  console.log(`   • Processed ${data.inventory.length} files`);
  console.log(`   • Total words: ${data.inventory.reduce((sum, item) => sum + item.words, 0).toLocaleString()}`);
  console.log(`   • Total size: ${(data.inventory.reduce((sum, item) => sum + item.size, 0) / 1024).toFixed(1)} KB`);
  console.log(`   • Categories: ${Object.keys(groupByCategory(data.inventory)).length}`);
  console.log(`   • Cross-references: ${data.inventory.filter(item => item.links && item.links.length > 0).length} files`);
}

main().catch(err => { 
  console.error('❌ Error generating enhanced TOC:', err); 
  process.exit(1); 
});