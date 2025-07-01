import fs from 'fs/promises';
import path from 'path';
import logger from '../logger.js';

/**
 * Enhanced documentation consolidation tool with improved error handling and validation
 * @param {object} params - Parameters
 * @param {string} [params.outputFile] - Output file name (default: 'CONSOLIDATED_DOCUMENTATION.md')
 * @param {string[]} [params.includePatterns] - File patterns to include (default: ['*.md'])
 * @param {string[]} [params.excludePatterns] - File patterns to exclude
 * @param {boolean} [params.generateToc] - Generate table of contents (default: true)
 * @param {number} [params.maxFileSize] - Maximum file size in bytes (default: 10MB)
 * @returns {Promise<object>} Consolidation result
 */
export async function mcp_documentation_consolidate(params = {}) {
  logger.info('Executing enhanced mcp_documentation_consolidate', { params });

  try {
    // Input validation and defaults
    const {
      outputFile = 'CONSOLIDATED_DOCUMENTATION.md',
      includePatterns = ['*.md'],
      excludePatterns = ['node_modules/**', '.git/**', 'CONSOLIDATED_*.md'],
      generateToc = true,
      maxFileSize = 10 * 1024 * 1024 // 10MB
    } = params;

    // Validate output file name
    if (!outputFile || typeof outputFile !== 'string') {
      throw new Error('Invalid output file name');
    }

    // Validate file size limit
    if (typeof maxFileSize !== 'number' || maxFileSize <= 0) {
      throw new Error('Invalid max file size');
    }

    const startTime = Date.now();
    const processedFiles = [];
    const errors = [];
    let totalSize = 0;
    let totalWords = 0;

    // Find markdown files
    const markdownFiles = await findMarkdownFiles('.', includePatterns, excludePatterns);
    
    if (markdownFiles.length === 0) {
      return {
        success: false,
        error: 'No markdown files found matching the criteria',
        stats: { filesProcessed: 0, totalSize: 0, totalWords: 0 }
      };
    }

    // Process files with enhanced error handling
    const fileContents = [];
    const tableOfContents = [];

    for (const file of markdownFiles) {
      try {
        const stats = await fs.stat(file);
        
        // Check file size
        if (stats.size > maxFileSize) {
          logger.warn(`Skipping large file: ${file} (${stats.size} bytes)`);
          errors.push(`File too large: ${file}`);
          continue;
        }

        const content = await fs.readFile(file, 'utf-8');
        const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
        
        // Extract title from file content or use filename
        const title = extractTitle(content) || path.basename(file, '.md');
        
        fileContents.push({
          file,
          title,
          content: content.trim(),
          size: stats.size,
          wordCount,
          lastModified: stats.mtime
        });

        if (generateToc) {
          tableOfContents.push(`- [${title}](#${title.toLowerCase().replace(/[^a-z0-9]/g, '-')})`);
        }

        processedFiles.push({
          file,
          size: stats.size,
          wordCount,
          lastModified: stats.mtime.toISOString()
        });

        totalSize += stats.size;
        totalWords += wordCount;

        logger.info(`Processed: ${file} (${(stats.size / 1024).toFixed(1)} KB, ${wordCount} words)`);

      } catch (error) {
        logger.error(`Error processing file ${file}:`, error);
        errors.push(`Error processing ${file}: ${error.message}`);
      }
    }

    // Generate consolidated content
    let consolidatedContent = '';

    // Add header
    consolidatedContent += `# Consolidated Documentation\n\n`;
    consolidatedContent += `Generated on: ${new Date().toISOString()}\n`;
    consolidatedContent += `Files processed: ${processedFiles.length}\n`;
    consolidatedContent += `Total size: ${(totalSize / 1024).toFixed(1)} KB\n`;
    consolidatedContent += `Total words: ${totalWords.toLocaleString()}\n\n`;

    // Add table of contents
    if (generateToc && tableOfContents.length > 0) {
      consolidatedContent += `## Table of Contents\n\n`;
      consolidatedContent += tableOfContents.join('\n') + '\n\n';
      consolidatedContent += `---\n\n`;
    }

    // Add file contents
    for (const fileData of fileContents) {
      consolidatedContent += `# ${fileData.title}\n\n`;
      consolidatedContent += `**Source:** \`${fileData.file}\`\n`;
      consolidatedContent += `**Last Modified:** ${fileData.lastModified.toISOString()}\n`;
      consolidatedContent += `**Size:** ${(fileData.size / 1024).toFixed(1)} KB\n`;
      consolidatedContent += `**Words:** ${fileData.wordCount.toLocaleString()}\n\n`;
      consolidatedContent += fileData.content + '\n\n';
      consolidatedContent += `---\n\n`;
    }

    // Write output file with error handling
    try {
      await fs.writeFile(outputFile, consolidatedContent, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write output file: ${error.message}`);
    }

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    const result = {
      success: true,
      outputFile,
      stats: {
        filesProcessed: processedFiles.length,
        totalSize,
        totalWords,
        outputSize: consolidatedContent.length,
        processingTimeMs: processingTime,
        errorsCount: errors.length
      },
      processedFiles,
      errors: errors.length > 0 ? errors : undefined
    };

    logger.info('Documentation consolidation completed successfully', result.stats);
    return result;

  } catch (error) {
    logger.error('mcp_documentation_consolidate failed', { error: error.message });
    throw new Error(`Documentation consolidation failed: ${error.message}`);
  }
}

/**
 * Find markdown files matching patterns
 */
async function findMarkdownFiles(dir, includePatterns, excludePatterns) {
  const files = [];
  
  async function scanDirectory(currentDir) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative('.', fullPath);
        
        // Check exclude patterns
        if (excludePatterns.some(pattern => minimatch(relativePath, pattern))) {
          continue;
        }
        
        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.isFile() && includePatterns.some(pattern => minimatch(entry.name, pattern))) {
          files.push(relativePath);
        }
      }
    } catch (error) {
      logger.warn(`Cannot read directory ${currentDir}: ${error.message}`);
    }
  }
  
  await scanDirectory(dir);
  return files.sort();
}

/**
 * Extract title from markdown content
 */
function extractTitle(content) {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return trimmed.substring(2).trim();
    }
  }
  return null;
}

/**
 * Simple minimatch implementation for pattern matching
 */
function minimatch(str, pattern) {
  const regexPattern = pattern
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]');
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(str);
}

export default {
  mcp_documentation_consolidate
}; 