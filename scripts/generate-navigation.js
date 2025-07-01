#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';

const TOC_PATH = 'reports/master_toc.md';
const NAV_OUT = 'reports/navigation.json';
const BREADCRUMB_OUT = 'reports/breadcrumbs.json';
const SITEMAP_OUT = 'reports/sitemap.xml';
const SEARCH_INDEX_OUT = 'reports/search-index.json';
const ANALYTICS_OUT = 'reports/navigation-analytics.json';

// Enhanced navigation structure with categories and metadata
const CATEGORY_MAPPING = {
  'Business': { 
    icon: '📊', 
    color: '#2563eb', 
    priority: 1, 
    description: 'Business plans, strategies, and implementation guides',
    keywords: ['business', 'plan', 'strategy', 'implementation', 'roadmap']
  },
  'Technical': { 
    icon: '⚙️', 
    color: '#059669', 
    priority: 2,
    description: 'Technical documentation, architecture, and system design',
    keywords: ['technical', 'architecture', 'system', 'api', 'integration']
  },
  'Compliance': { 
    icon: '📋', 
    color: '#dc2626', 
    priority: 3,
    description: 'Compliance requirements, policies, and regulatory documentation',
    keywords: ['compliance', 'policy', 'regulation', 'security', 'audit']
  },
  'Examples': { 
    icon: '💡', 
    color: '#7c3aed', 
    priority: 4,
    description: 'Code examples, tutorials, and implementation samples',
    keywords: ['example', 'tutorial', 'sample', 'demo', 'guide']
  },
  'Other': { 
    icon: '📄', 
    color: '#6b7280', 
    priority: 5,
    description: 'General documentation and miscellaneous resources',
    keywords: ['documentation', 'readme', 'misc', 'general']
  }
};

// Configuration for enhanced features
const CONFIG = {
  baseUrl: process.env.DOCS_BASE_URL || 'https://smart-mcp-docs.com',
  enableAnalytics: true,
  enableSearchIndex: true,
  enableContentHashing: true,
  maxSearchResults: 50,
  searchBoostFactors: {
    title: 3,
    category: 2,
    keywords: 1.5,
    content: 1
  }
};

async function ensureOutputDir() {
  const outputDir = path.dirname(NAV_OUT);
  if (!existsSync(outputDir)) {
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }
}

async function getFileMetadata(filePath) {
  if (!existsSync(filePath)) {
    return { exists: false, size: 0, modified: null, hash: null };
  }
  
  try {
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    const hash = CONFIG.enableContentHashing ? 
      crypto.createHash('sha256').update(content).digest('hex').substring(0, 16) : null;
    
    return {
      exists: true,
      size: stats.size,
      modified: stats.mtime.toISOString(),
      hash,
      wordCount: content.split(/\s+/).length,
      lineCount: content.split('\n').length
    };
  } catch (error) {
    console.warn(`Warning: Could not read metadata for ${filePath}:`, error.message);
    return { exists: false, size: 0, modified: null, hash: null };
  }
}

function parseTableOfContents(tocContent) {
  const lines = tocContent.split(/\r?\n/);
  const structure = [];
  let currentCategory = null;
  
  for (const line of lines) {
    // Match category headers (e.g., "1. **Business**")
    const categoryMatch = line.match(/^\d+\.\s+\*\*(.+?)\*\*/);
    if (categoryMatch) {
      currentCategory = {
        name: categoryMatch[1],
        items: [],
        ...CATEGORY_MAPPING[categoryMatch[1]] || { 
          icon: '📄', 
          color: '#6b7280', 
          priority: 99,
          description: 'Uncategorized documentation',
          keywords: []
        }
      };
      structure.push(currentCategory);
      continue;
    }
    
    // Match document links (e.g., "   1.1 [DOCUMENT.md](path/to/document.md)")
    const linkMatch = line.match(/^\s+\d+\.\d+\s+\[(.+?)\]\((.+?)\)/);
    if (linkMatch && currentCategory) {
      const [, title, filePath] = linkMatch;
      const normalizedPath = filePath.replace(/\\/g, '/');
      
      currentCategory.items.push({
        title: title.replace(/\.md$/, ''),
        path: normalizedPath,
        filename: path.basename(normalizedPath),
        category: currentCategory.name,
        rawTitle: title
      });
    }
  }
  
  return structure;
}

async function enrichStructureWithMetadata(structure) {
  console.log('🔍 Enriching structure with file metadata...');
  
  for (const category of structure) {
    for (const item of category.items) {
      const metadata = await getFileMetadata(item.path);
      Object.assign(item, metadata);
      
      // Generate search keywords
      item.searchKeywords = [
        ...item.title.toLowerCase().split(/\s+/),
        ...category.keywords,
        item.category.toLowerCase(),
        item.filename.toLowerCase().replace(/\.[^/.]+$/, "")
      ].filter(Boolean);
      
      // Calculate relevance score based on various factors
      item.relevanceScore = calculateRelevanceScore(item, category);
    }
  }
  
  return structure;
}

function calculateRelevanceScore(item, category) {
  let score = 0;
  
  // Base score from category priority (lower priority = higher score)
  score += (6 - category.priority) * 10;
  
  // Boost for existing files
  if (item.exists) score += 20;
  
  // Boost for larger files (more content)
  if (item.wordCount) {
    score += Math.min(item.wordCount / 100, 15);
  }
  
  // Boost for recently modified files
  if (item.modified) {
    const daysSinceModified = (Date.now() - new Date(item.modified).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceModified < 30) score += 10;
    else if (daysSinceModified < 90) score += 5;
  }
  
  // Boost for important document types
  const importantKeywords = ['readme', 'guide', 'api', 'getting-started', 'overview'];
  if (importantKeywords.some(keyword => item.title.toLowerCase().includes(keyword))) {
    score += 15;
  }
  
  return Math.round(score);
}

function generateNavigation(structure) {
  const navigation = {};
  const allPages = [];
  
  // Flatten all pages with category context
  structure.forEach(category => {
    category.items.forEach(item => {
      allPages.push({
        ...item,
        categoryIcon: category.icon,
        categoryColor: category.color,
        categoryPriority: category.priority,
        categoryDescription: category.description
      });
    });
  });
  
  // Sort pages by relevance score for better navigation order
  allPages.sort((a, b) => {
    if (a.category !== b.category) {
      return a.categoryPriority - b.categoryPriority;
    }
    return b.relevanceScore - a.relevanceScore;
  });
  
  // Generate enhanced navigation links
  allPages.forEach((page, index) => {
    const prevPage = index > 0 ? allPages[index - 1] : null;
    const nextPage = index < allPages.length - 1 ? allPages[index + 1] : null;
    
    // Find related pages (same category, similar keywords)
    const relatedPages = allPages
      .filter(p => p.path !== page.path)
      .map(p => ({
        ...p,
        similarity: calculateSimilarity(page, p)
      }))
      .filter(p => p.similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map(p => ({ path: p.path, title: p.title, category: p.category, similarity: p.similarity }));
    
    navigation[page.path] = {
      title: page.title,
      category: page.category,
      categoryIcon: page.categoryIcon,
      categoryColor: page.categoryColor,
      categoryDescription: page.categoryDescription,
      filename: page.filename,
      exists: page.exists,
      size: page.size,
      modified: page.modified,
      hash: page.hash,
      wordCount: page.wordCount,
      lineCount: page.lineCount,
      relevanceScore: page.relevanceScore,
      searchKeywords: page.searchKeywords,
      index: index + 1,
      total: allPages.length,
      prev: prevPage ? {
        path: prevPage.path,
        title: prevPage.title,
        category: prevPage.category
      } : null,
      next: nextPage ? {
        path: nextPage.path,
        title: nextPage.title,
        category: nextPage.category
      } : null,
      siblings: allPages
        .filter(p => p.category === page.category && p.path !== page.path)
        .map(p => ({ path: p.path, title: p.title, relevanceScore: p.relevanceScore }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore),
      related: relatedPages
    };
  });
  
  return { navigation, allPages, structure };
}

function calculateSimilarity(page1, page2) {
  let similarity = 0;
  
  // Same category bonus
  if (page1.category === page2.category) similarity += 0.4;
  
  // Keyword overlap
  const keywords1 = new Set(page1.searchKeywords);
  const keywords2 = new Set(page2.searchKeywords);
  const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
  const union = new Set([...keywords1, ...keywords2]);
  
  if (union.size > 0) {
    similarity += (intersection.size / union.size) * 0.6;
  }
  
  return similarity;
}

function generateBreadcrumbs(structure) {
  const breadcrumbs = {};
  
  structure.forEach(category => {
    category.items.forEach(item => {
      breadcrumbs[item.path] = [
        { title: 'Home', path: '/', icon: '🏠' },
        { 
          title: category.name, 
          path: `#${category.name.toLowerCase()}`,
          icon: category.icon,
          description: category.description
        },
        { 
          title: item.title, 
          path: item.path, 
          current: true,
          exists: item.exists,
          modified: item.modified
        }
      ];
    });
  });
  
  return breadcrumbs;
}

function generateSearchIndex(allPages) {
  if (!CONFIG.enableSearchIndex) return null;
  
  console.log('🔍 Building search index...');
  
  const searchIndex = {
    generated: new Date().toISOString(),
    totalDocuments: allPages.length,
    indexedDocuments: allPages.filter(p => p.exists).length,
    index: {}
  };
  
  allPages.forEach(page => {
    if (!page.exists) return;
    
    searchIndex.index[page.path] = {
      title: page.title,
      category: page.category,
      categoryIcon: page.categoryIcon,
      path: page.path,
      keywords: page.searchKeywords,
      relevanceScore: page.relevanceScore,
      wordCount: page.wordCount,
      modified: page.modified,
      searchBoost: calculateSearchBoost(page)
    };
  });
  
  return searchIndex;
}

function calculateSearchBoost(page) {
  let boost = 1.0;
  
  // Boost important documents
  const importantTerms = ['readme', 'getting-started', 'overview', 'guide', 'api'];
  if (importantTerms.some(term => page.title.toLowerCase().includes(term))) {
    boost *= 1.5;
  }
  
  // Boost by category priority
  boost *= (6 - page.categoryPriority) * 0.2 + 0.8;
  
  // Boost recently modified documents
  if (page.modified) {
    const daysSinceModified = (Date.now() - new Date(page.modified).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceModified < 7) boost *= 1.3;
    else if (daysSinceModified < 30) boost *= 1.1;
  }
  
  return Math.round(boost * 100) / 100;
}

function generateSitemap(allPages) {
  console.log('🗺️  Generating enhanced XML sitemap...');
  
  const now = new Date().toISOString();
  
  let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ';
  sitemap += 'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';
  
  // Add homepage
  sitemap += '  <url>\n';
  sitemap += `    <loc>${CONFIG.baseUrl}/</loc>\n`;
  sitemap += `    <lastmod>${now}</lastmod>\n`;
  sitemap += '    <changefreq>weekly</changefreq>\n';
  sitemap += '    <priority>1.0</priority>\n';
  sitemap += '  </url>\n';
  
  // Add category index pages
  const categories = [...new Set(allPages.map(p => p.category))];
  categories.forEach(category => {
    sitemap += '  <url>\n';
    sitemap += `    <loc>${CONFIG.baseUrl}/category/${category.toLowerCase()}</loc>\n`;
    sitemap += `    <lastmod>${now}</lastmod>\n`;
    sitemap += '    <changefreq>weekly</changefreq>\n';
    sitemap += '    <priority>0.9</priority>\n';
    sitemap += '  </url>\n';
  });
  
  // Add all documentation pages
  allPages
    .filter(page => page.exists)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .forEach(page => {
      const priority = calculateSitemapPriority(page);
      const changefreq = calculateChangeFreq(page);
      
      sitemap += '  <url>\n';
      sitemap += `    <loc>${CONFIG.baseUrl}/${page.path}</loc>\n`;
      sitemap += `    <lastmod>${page.modified || now}</lastmod>\n`;
      sitemap += `    <changefreq>${changefreq}</changefreq>\n`;
      sitemap += `    <priority>${priority}</priority>\n`;
      sitemap += '  </url>\n';
    });
  
  sitemap += '</urlset>';
  return sitemap;
}

function calculateSitemapPriority(page) {
  let priority = 0.5;
  
  // Boost by category priority
  priority += (6 - page.categoryPriority) * 0.1;
  
  // Boost by relevance score
  priority += Math.min(page.relevanceScore / 100, 0.3);
  
  // Cap at 0.9 (reserve 1.0 for homepage)
  return Math.min(priority, 0.9).toFixed(1);
}

function calculateChangeFreq(page) {
  if (!page.modified) return 'monthly';
  
  const daysSinceModified = (Date.now() - new Date(page.modified).getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceModified < 7) return 'weekly';
  if (daysSinceModified < 30) return 'monthly';
  if (daysSinceModified < 90) return 'quarterly';
  return 'yearly';
}

async function generateStats(structure, allPages) {
  console.log('📊 Generating comprehensive statistics...');
  
  const stats = {
    generated: new Date().toISOString(),
    categories: structure.length,
    totalDocuments: allPages.length,
    existingDocuments: allPages.filter(p => p.exists).length,
    missingDocuments: allPages.filter(p => !p.exists).length,
    totalWords: allPages.reduce((sum, p) => sum + (p.wordCount || 0), 0),
    totalSize: allPages.reduce((sum, p) => sum + (p.size || 0), 0),
    averageRelevanceScore: Math.round(allPages.reduce((sum, p) => sum + p.relevanceScore, 0) / allPages.length),
    categoryBreakdown: {},
    fileTypes: {},
    sizeDistribution: { small: 0, medium: 0, large: 0, xlarge: 0 },
    recentlyModified: allPages.filter(p => {
      if (!p.modified) return false;
      const daysSince = (Date.now() - new Date(p.modified).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince < 30;
    }).length,
    largestCategory: null,
    mostRelevantDocument: null,
    healthScore: 0
  };
  
  // Category breakdown with enhanced metrics
  structure.forEach(category => {
    const categoryItems = category.items;
    const existing = categoryItems.filter(item => item.exists);
    
    stats.categoryBreakdown[category.name] = {
      count: categoryItems.length,
      existing: existing.length,
      missing: categoryItems.filter(item => !item.exists).length,
      icon: category.icon,
      color: category.color,
      priority: category.priority,
      description: category.description,
      totalWords: existing.reduce((sum, item) => sum + (item.wordCount || 0), 0),
      averageRelevance: existing.length > 0 ? 
        Math.round(existing.reduce((sum, item) => sum + item.relevanceScore, 0) / existing.length) : 0,
      completionRate: Math.round((existing.length / categoryItems.length) * 100)
    };
  });
  
  // File type analysis
  allPages.forEach(page => {
    const ext = path.extname(page.filename).toLowerCase() || 'no-extension';
    stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
  });
  
  // Size distribution
  allPages.forEach(page => {
    const sizeKB = (page.size || 0) / 1024;
    if (sizeKB < 5) stats.sizeDistribution.small++;
    else if (sizeKB < 20) stats.sizeDistribution.medium++;
    else if (sizeKB < 100) stats.sizeDistribution.large++;
    else stats.sizeDistribution.xlarge++;
  });
  
  // Find largest category and most relevant document
  const largest = Object.entries(stats.categoryBreakdown)
    .reduce((max, [name, data]) => data.count > max.count ? { name, ...data } : max, { count: 0 });
  stats.largestCategory = largest.name;
  
  const mostRelevant = allPages
    .filter(p => p.exists)
    .reduce((max, page) => page.relevanceScore > max.relevanceScore ? page : max, { relevanceScore: 0 });
  stats.mostRelevantDocument = mostRelevant.path ? {
    path: mostRelevant.path,
    title: mostRelevant.title,
    category: mostRelevant.category,
    relevanceScore: mostRelevant.relevanceScore
  } : null;
  
  // Calculate overall health score
  const completionRate = stats.existingDocuments / stats.totalDocuments;
  const categoryHealth = Object.values(stats.categoryBreakdown)
    .reduce((sum, cat) => sum + cat.completionRate, 0) / stats.categories;
  const recentActivityBonus = Math.min(stats.recentlyModified / stats.totalDocuments, 0.2) * 100;
  
  stats.healthScore = Math.round(
    (completionRate * 50) + 
    (categoryHealth * 0.3) + 
    recentActivityBonus
  );
  
  return stats;
}

async function generateAnalytics(structure, allPages, navigation) {
  if (!CONFIG.enableAnalytics) return null;
  
  console.log('📈 Generating navigation analytics...');
  
  const analytics = {
    generated: new Date().toISOString(),
    summary: {
      totalPages: allPages.length,
      totalCategories: structure.length,
      averagePageSize: Math.round(allPages.reduce((sum, p) => sum + (p.size || 0), 0) / allPages.length),
      navigationDepth: Math.max(...structure.map(cat => cat.items.length)),
      crossReferences: 0
    },
    categoryAnalytics: {},
    pageRankings: {
      byRelevance: allPages
        .filter(p => p.exists)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 10)
        .map(p => ({ path: p.path, title: p.title, score: p.relevanceScore })),
      bySize: allPages
        .filter(p => p.exists && p.size)
        .sort((a, b) => b.size - a.size)
        .slice(0, 10)
        .map(p => ({ path: p.path, title: p.title, size: p.size })),
      byWords: allPages
        .filter(p => p.exists && p.wordCount)
        .sort((a, b) => b.wordCount - a.wordCount)
        .slice(0, 10)
        .map(p => ({ path: p.path, title: p.title, words: p.wordCount }))
    },
    recommendations: []
  };
  
  // Category-specific analytics
  structure.forEach(category => {
    const items = category.items.filter(item => item.exists);
    analytics.categoryAnalytics[category.name] = {
      documentCount: items.length,
      averageSize: items.length > 0 ? Math.round(items.reduce((sum, item) => sum + (item.size || 0), 0) / items.length) : 0,
      averageWords: items.length > 0 ? Math.round(items.reduce((sum, item) => sum + (item.wordCount || 0), 0) / items.length) : 0,
      topDocuments: items
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 3)
        .map(item => ({ path: item.path, title: item.title, score: item.relevanceScore }))
    };
  });
  
  // Count cross-references (related documents)
  analytics.summary.crossReferences = Object.values(navigation)
    .reduce((sum, nav) => sum + (nav.related ? nav.related.length : 0), 0);
  
  // Generate recommendations
  const missingDocs = allPages.filter(p => !p.exists);
  if (missingDocs.length > 0) {
    analytics.recommendations.push({
      type: 'missing_documents',
      priority: 'high',
      count: missingDocs.length,
      description: `${missingDocs.length} documents are referenced but missing`
    });
  }
  
  const lowContentDocs = allPages.filter(p => p.exists && p.wordCount && p.wordCount < 100);
  if (lowContentDocs.length > 0) {
    analytics.recommendations.push({
      type: 'low_content',
      priority: 'medium',
      count: lowContentDocs.length,
      description: `${lowContentDocs.length} documents have very little content (< 100 words)`
    });
  }
  
  const outdatedDocs = allPages.filter(p => {
    if (!p.modified) return false;
    const daysSince = (Date.now() - new Date(p.modified).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 180;
  });
  if (outdatedDocs.length > 0) {
    analytics.recommendations.push({
      type: 'outdated_content',
      priority: 'low',
      count: outdatedDocs.length,
      description: `${outdatedDocs.length} documents haven't been updated in over 6 months`
    });
  }
  
  return analytics;
}

async function main() {
  console.log('🚀 Enhanced Navigation Generator v2.0 Starting...\n');
  
  // Validate input file
  if (!existsSync(TOC_PATH)) {
    console.error(`❌ Master TOC not found at ${TOC_PATH}`);
    console.error('   Run the TOC generator first.');
    process.exit(1);
  }
  
  // Ensure output directory exists
  await ensureOutputDir();
  
  try {
    // Read and parse TOC
    console.log('📖 Reading master table of contents...');
    const tocContent = await fs.readFile(TOC_PATH, 'utf8');
    let structure = parseTableOfContents(tocContent);
    
    if (structure.length === 0) {
      console.error('❌ No valid structure found in TOC file');
      process.exit(1);
    }
    
    console.log(`✅ Parsed ${structure.length} categories`);
    
    // Enrich with metadata
    structure = await enrichStructureWithMetadata(structure);
    
    // Generate navigation data
    console.log('🧭 Generating enhanced navigation structure...');
    const { navigation, allPages } = generateNavigation(structure);
    
    // Generate breadcrumbs
    console.log('🍞 Generating breadcrumb navigation...');
    const breadcrumbs = generateBreadcrumbs(structure);
    
    // Generate search index
    const searchIndex = generateSearchIndex(allPages);
    
    // Generate sitemap
    const sitemap = generateSitemap(allPages);
    
    // Generate statistics
    const stats = await generateStats(structure, allPages);
    
    // Generate analytics
    const analytics = await generateAnalytics(structure, allPages, navigation);
    
    // Write output files
    console.log('\n💾 Writing enhanced output files...');
    
    const outputs = [
      { 
        file: NAV_OUT, 
        data: JSON.stringify({ navigation, stats, config: CONFIG }, null, 2), 
        desc: 'Enhanced navigation mapping' 
      },
      { 
        file: BREADCRUMB_OUT, 
        data: JSON.stringify(breadcrumbs, null, 2), 
        desc: 'Breadcrumb navigation' 
      },
      { 
        file: SITEMAP_OUT, 
        data: sitemap, 
        desc: 'Enhanced XML sitemap' 
      }
    ];
    
    if (searchIndex) {
      outputs.push({
        file: SEARCH_INDEX_OUT,
        data: JSON.stringify(searchIndex, null, 2),
        desc: 'Search index'
      });
    }
    
    if (analytics) {
      outputs.push({
        file: ANALYTICS_OUT,
        data: JSON.stringify(analytics, null, 2),
        desc: 'Navigation analytics'
      });
    }
    
    for (const { file, data, desc } of outputs) {
      await fs.writeFile(file, data);
      const size = Math.round(data.length / 1024);
      console.log(`✅ ${desc}: ${file} (${size}KB)`);
    }
    
    // Enhanced summary report
    console.log('\n' + '='.repeat(70));
    console.log('📋 ENHANCED NAVIGATION GENERATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`📚 Total Documents: ${stats.totalDocuments}`);
    console.log(`✅ Existing: ${stats.existingDocuments} (${Math.round((stats.existingDocuments/stats.totalDocuments)*100)}%)`);
    console.log(`❌ Missing: ${stats.missingDocuments}`);
    console.log(`📁 Categories: ${stats.categories}`);
    console.log(`📊 Health Score: ${stats.healthScore}/100`);
    console.log(`🏆 Largest Category: ${stats.largestCategory} (${stats.categoryBreakdown[stats.largestCategory]?.count} docs)`);
    console.log(`📝 Total Words: ${stats.totalWords.toLocaleString()}`);
    console.log(`💾 Total Size: ${Math.round(stats.totalSize/1024)}KB`);
    console.log(`⭐ Average Relevance: ${stats.averageRelevanceScore}`);
    console.log(`🔄 Recently Modified: ${stats.recentlyModified} documents`);
    
    if (stats.mostRelevantDocument) {
      console.log(`🎯 Most Relevant: ${stats.mostRelevantDocument.title} (${stats.mostRelevantDocument.relevanceScore})`);
    }
    
    console.log('\n📊 Category Breakdown:');
    Object.entries(stats.categoryBreakdown)
      .sort((a, b) => a[1].priority - b[1].priority)
      .forEach(([name, data]) => {
        const percentage = Math.round((data.existing / data.count) * 100);
        const avgWords = data.totalWords > 0 ? Math.round(data.totalWords / data.existing) : 0;
        console.log(`   ${data.icon} ${name}: ${data.existing}/${data.count} (${percentage}%) - Avg: ${avgWords} words, Relevance: ${data.averageRelevance}`);
      });
    
    if (analytics && analytics.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      analytics.recommendations.forEach(rec => {
        const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        console.log(`   ${priority} ${rec.description}`);
      });
    }
    
    if (stats.missingDocuments > 0) {
      console.log('\n⚠️  Missing Documents:');
      allPages.filter(p => !p.exists).forEach(page => {
        console.log(`   ❌ ${page.path} (${page.category})`);
      });
    }
    
    console.log('\n🎉 Enhanced navigation generation completed successfully!');
    console.log(`📊 Generated ${outputs.length} output files with comprehensive metadata and analytics.`);
    
  } catch (error) {
    console.error('❌ Navigation generation failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

main().catch(err => {
  console.error('💥 Unexpected error:', err);
  process.exit(1);
});