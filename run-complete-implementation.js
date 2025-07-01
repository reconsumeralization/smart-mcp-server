import ProjectManager from './src/lib/ProjectManager.js';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import logger from './src/logger.js';

async function runCompleteImplementation() {
  logger.info('🌟 Smart MCP Server - Complete Implementation Runner');
  logger.info('='.repeat(60));
  logger.info('');
  
  const projectManager = new ProjectManager();
  
  try {
    // Generate initial status report
    logger.info('📊 Generating initial status report...');
    const initialReport = await projectManager.generateProgressReport();
    
    logger.info(`\n📈 Current Status: ${initialReport.overall.progress}`);
    logger.info(`📊 Progress: ${initialReport.overall.percentage}`);
    logger.info('');
    
    // Show phase status
    logger.info('📋 Phase Status:');
    initialReport.phases.forEach(phase => {
      logger.info(`  ${phase.icon} Phase ${phase.phase}: ${phase.name} - ${phase.status}`);
    });
    logger.info('');
    
    // Run all phases
    await projectManager.runAllPhases();
    
    // Generate final report
    logger.info('\n📊 Generating final implementation report...');
    const finalReport = await projectManager.generateProgressReport();
    
    // Save final report
    await fs.writeFile('reports/final-implementation-report.json', JSON.stringify(finalReport, null, 2));
    
    logger.info('\n🎉 Implementation Complete!');
    logger.info('📊 Final Report saved to: reports/final-implementation-report.json');
    logger.info('');
    logger.info('🚀 Next Steps:');
    finalReport.nextSteps.forEach(step => logger.info(`  • ${step}`));
    logger.info('');
    logger.info('💡 Recommendations:');
    finalReport.recommendations.forEach(rec => logger.info(`  • ${rec}`));
    logger.info('');
    logger.info('🤖 You can now use the Gemini CLI Assistant:');
    logger.info('   node gemini-cli.cjs');
    
  } catch (error) {
    logger.error('❌ Implementation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCompleteImplementation().catch(error => logger.error(error));
}

export { runCompleteImplementation };