#!/usr/bin/env node
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const INVENTORY_PATH = path.join('reports', 'markdown_inventory.json');
const OUT_MERMAID = path.join('reports', 'markdown_hierarchy.mmd');
const OUT_HTML = path.join('reports', 'markdown_hierarchy.html');
const OUT_JSON = path.join('reports', 'markdown_hierarchy.json');

function buildEnhancedTree(inventory) {
  const root = { 
    name: 'root', 
    type: 'directory', 
    children: {}, 
    metadata: { 
      totalFiles: 0, 
      totalSize: 0, 
      totalWords: 0,
      categories: new Set()
    } 
  };
  
  for (const item of inventory) {
    const parts = item.path.split(path.sep);
    let current = root;
    
    // Update root metadata
    root.metadata.totalFiles++;
    root.metadata.totalSize += item.size;
    root.metadata.totalWords += item.words;
    root.metadata.categories.add(item.category);
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      
      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          type: isFile ? 'file' : 'directory',
          children: isFile ? null : {},
          metadata: isFile ? {
            ...item,
            fileName: path.basename(part, '.md'),
            extension: path.extname(part)
          } : {
            totalFiles: 0,
            totalSize: 0,
            totalWords: 0,
            categories: new Set()
          },
          path: parts.slice(0, i + 1).join(path.sep)
        };
      }
      
      // Update directory metadata
      if (!isFile) {
        current.children[part].metadata.totalFiles++;
        current.children[part].metadata.totalSize += item.size;
        current.children[part].metadata.totalWords += item.words;
        current.children[part].metadata.categories.add(item.category);
      }
      
      current = current.children[part];
    }
  }
  
  // Convert Sets to Arrays for JSON serialization
  function convertSetsToArrays(node) {
    if (node.metadata && node.metadata.categories instanceof Set) {
      node.metadata.categories = Array.from(node.metadata.categories);
    }
    if (node.children) {
      for (const child of Object.values(node.children)) {
        convertSetsToArrays(child);
      }
    }
  }
  
  convertSetsToArrays(root);
  return root;
}

function generateAdvancedMermaid(tree, inventory) {
  const lines = [
    'graph TD',
    '  classDef fileNode fill:#e1f5fe,stroke:#01579b,stroke-width:2px',
    '  classDef dirNode fill:#f3e5f5,stroke:#4a148c,stroke-width:2px',
    '  classDef rootNode fill:#e8f5e8,stroke:#1b5e20,stroke-width:3px',
    '  classDef businessDoc fill:#fff3e0,stroke:#e65100,stroke-width:2px',
    '  classDef technicalDoc fill:#fce4ec,stroke:#880e4f,stroke-width:2px',
    '  classDef complianceDoc fill:#f1f8e9,stroke:#33691e,stroke-width:2px',
    '  classDef exampleDoc fill:#e0f2f1,stroke:#004d40,stroke-width:2px',
    ''
  ];
  
  const nodeIds = new Map();
  let nodeCounter = 0;
  
  function getNodeId(nodePath) {
    if (!nodeIds.has(nodePath)) {
      nodeIds.set(nodePath, `node${nodeCounter++}`);
    }
    return nodeIds.get(nodePath);
  }
  
  function addNode(node, parentId = null) {
    const nodeId = getNodeId(node.path || 'root');
    const isRoot = !parentId;
    
    if (node.type === 'file') {
      const fileName = path.basename(node.name, '.md');
      const sizeKB = (node.metadata.size / 1024).toFixed(1);
      const words = node.metadata.words.toLocaleString();
      const category = node.metadata.category;
      
      lines.push(`  ${nodeId}["📄 ${fileName}<br/>${sizeKB}KB • ${words} words<br/>Category: ${category}"]`);
      
      // Apply category-specific styling
      switch (category) {
        case 'business':
          lines.push(`  class ${nodeId} businessDoc`);
          break;
        case 'technical':
          lines.push(`  class ${nodeId} technicalDoc`);
          break;
        case 'compliance':
          lines.push(`  class ${nodeId} complianceDoc`);
          break;
        case 'examples':
          lines.push(`  class ${nodeId} exampleDoc`);
          break;
        default:
          lines.push(`  class ${nodeId} fileNode`);
      }
    } else {
      const dirName = isRoot ? 'Smart MCP Server Docs' : node.name;
      const fileCount = node.metadata.totalFiles;
      const totalSizeKB = (node.metadata.totalSize / 1024).toFixed(1);
      const categories = node.metadata.categories.join(', ');
      
      if (isRoot) {
        lines.push(`  ${nodeId}["🏠 ${dirName}<br/>${fileCount} files • ${totalSizeKB}KB<br/>Categories: ${categories}"]`);
        lines.push(`  class ${nodeId} rootNode`);
      } else {
        lines.push(`  ${nodeId}["📁 ${dirName}<br/>${fileCount} files • ${totalSizeKB}KB"]`);
        lines.push(`  class ${nodeId} dirNode`);
      }
    }
    
    if (parentId) {
      lines.push(`  ${parentId} --> ${nodeId}`);
    }
    
    if (node.children) {
      for (const child of Object.values(node.children)) {
        addNode(child, nodeId);
      }
    }
  }
  
  addNode(tree);
  
  lines.push('');
  lines.push('  %% Legend');
  lines.push('  legend["📊 Legend<br/>📄 Markdown Files<br/>📁 Directories<br/>🏠 Root Directory"]');
  lines.push('  class legend rootNode');
  
  return lines.join('\n');
}

function generateInteractiveHTML(tree, inventory) {
  const stats = {
    totalFiles: inventory.length,
    totalSize: inventory.reduce((sum, item) => sum + item.size, 0),
    totalWords: inventory.reduce((sum, item) => sum + item.words, 0),
    categories: [...new Set(inventory.map(item => item.category))]
  };
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart MCP Server - Documentation Hierarchy</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #2196F3 0%, #21CBF3 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header p {
            margin: 0;
            opacity: 0.9;
            font-size: 1.1em;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #2196F3;
            margin-bottom: 5px;
        }
        .stat-label {
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .diagram-container {
            padding: 30px;
            text-align: center;
        }
        .controls {
            margin-bottom: 20px;
        }
        .btn {
            background: #2196F3;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin: 0 5px;
            font-size: 14px;
        }
        .btn:hover {
            background: #1976D2;
        }
        #diagram {
            border: 1px solid #ddd;
            border-radius: 8px;
            background: white;
            min-height: 400px;
        }
        .footer {
            background: #263238;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📚 Documentation Hierarchy</h1>
            <p>Smart MCP Server - Interactive Documentation Structure</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${stats.totalFiles}</div>
                <div class="stat-label">Total Files</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.totalWords.toLocaleString()}</div>
                <div class="stat-label">Total Words</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${(stats.totalSize / 1024).toFixed(1)} KB</div>
                <div class="stat-label">Total Size</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.categories.length}</div>
                <div class="stat-label">Categories</div>
            </div>
        </div>
        
        <div class="diagram-container">
            <div class="controls">
                <button class="btn" onclick="zoomIn()">🔍 Zoom In</button>
                <button class="btn" onclick="zoomOut()">🔍 Zoom Out</button>
                <button class="btn" onclick="resetZoom()">↻ Reset</button>
                <button class="btn" onclick="downloadSVG()">💾 Download SVG</button>
            </div>
            <div id="diagram"></div>
        </div>
        
        <div class="footer">
            Generated on ${new Date().toLocaleString()} • Smart MCP Server Documentation Hierarchy Generator v2.0
        </div>
    </div>

    <script>
        mermaid.initialize({ 
            startOnLoad: true,
            theme: 'default',
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis'
            }
        });

        const mermaidCode = \`${generateAdvancedMermaid(tree, inventory).replace(/`/g, '\\`')}\`;
        
        mermaid.render('diagram-svg', mermaidCode).then(({svg}) => {
            document.getElementById('diagram').innerHTML = svg;
        });

        let currentZoom = 1;
        
        function zoomIn() {
            currentZoom *= 1.2;
            applyZoom();
        }
        
        function zoomOut() {
            currentZoom /= 1.2;
            applyZoom();
        }
        
        function resetZoom() {
            currentZoom = 1;
            applyZoom();
        }
        
        function applyZoom() {
            const svg = document.querySelector('#diagram svg');
            if (svg) {
                svg.style.transform = \`scale(\${currentZoom})\`;
                svg.style.transformOrigin = 'center center';
            }
        }
        
        function downloadSVG() {
            const svg = document.querySelector('#diagram svg');
            if (svg) {
                const svgData = new XMLSerializer().serializeToString(svg);
                const blob = new Blob([svgData], {type: 'image/svg+xml'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'documentation-hierarchy.svg';
                a.click();
                URL.revokeObjectURL(url);
            }
        }
    </script>
</body>
</html>`;
}

async function main() {
  console.log('📊 Generating Enhanced Documentation Hierarchy...');
  
  if (!existsSync(INVENTORY_PATH)) {
    console.error('❌ Inventory report not found. Run npm run docs:inventory first.');
    process.exit(1);
  }
  
  console.log('📖 Loading inventory data...');
  const inventoryData = JSON.parse(await fs.readFile(INVENTORY_PATH, 'utf8'));
  const inventory = inventoryData.inventory;
  
  console.log('🌳 Building enhanced tree structure...');
  const tree = buildEnhancedTree(inventory);
  
  console.log('🎨 Generating advanced Mermaid diagram...');
  const mermaidContent = generateAdvancedMermaid(tree, inventory);
  
  console.log('🌐 Creating interactive HTML visualization...');
  const htmlContent = generateInteractiveHTML(tree, inventory);
  
  console.log('📊 Preparing structured JSON data...');
  const jsonData = {
    metadata: {
      generated: new Date().toISOString(),
      totalFiles: inventory.length,
      totalWords: inventory.reduce((sum, item) => sum + item.words, 0),
      totalSize: inventory.reduce((sum, item) => sum + item.size, 0),
      generator: 'Smart MCP Server Hierarchy Generator v2.0'
    },
    tree: tree,
    statistics: {
      categories: [...new Set(inventory.map(item => item.category))],
      largestFiles: [...inventory].sort((a, b) => b.size - a.size).slice(0, 5),
      mostWords: [...inventory].sort((a, b) => b.words - a.words).slice(0, 5)
    }
  };
  
  // Ensure reports directory exists
  if (!existsSync('reports')) {
    await fs.mkdir('reports', { recursive: true });
  }
  
  console.log('💾 Writing output files...');
  await Promise.all([
    fs.writeFile(OUT_MERMAID, mermaidContent),
    fs.writeFile(OUT_HTML, htmlContent),
    fs.writeFile(OUT_JSON, JSON.stringify(jsonData, null, 2))
  ]);
  
  console.log('✅ Enhanced Documentation Hierarchy generated successfully!');
  console.log(`📄 Mermaid Diagram: ${OUT_MERMAID}`);
  console.log(`🌐 Interactive HTML: ${OUT_HTML}`);
  console.log(`📊 JSON Data: ${OUT_JSON}`);
  console.log(`📈 Statistics:`);
  console.log(`   • Processed ${inventory.length} files`);
  console.log(`   • Total words: ${inventory.reduce((sum, item) => sum + item.words, 0).toLocaleString()}`);
  console.log(`   • Total size: ${(inventory.reduce((sum, item) => sum + item.size, 0) / 1024).toFixed(1)} KB`);
  console.log(`   • Categories: ${[...new Set(inventory.map(item => item.category))].join(', ')}`);
  console.log(`   • Tree depth: ${getMaxDepth(tree)} levels`);
}

function getMaxDepth(node, currentDepth = 0) {
  if (!node.children || Object.keys(node.children).length === 0) {
    return currentDepth;
  }
  
  let maxChildDepth = currentDepth;
  for (const child of Object.values(node.children)) {
    const childDepth = getMaxDepth(child, currentDepth + 1);
    maxChildDepth = Math.max(maxChildDepth, childDepth);
  }
  
  return maxChildDepth;
}

main().catch(err => {
  console.error('❌ Error generating enhanced hierarchy:', err);
  process.exit(1);
});