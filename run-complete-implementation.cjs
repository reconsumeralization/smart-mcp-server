const ProjectManager = require('./src/lib/ProjectManager');
const fs = require('fs').promises;

let logger;

async function getLogger() {
  if (!logger) {
    const loggerModule = await import('./src/logger.js');
    logger = loggerModule.default;
  }
  return logger;
}

async function runCompleteImplementation() {
  const log = await getLogger();
  log.info('🌟 Smart MCP Server - Complete Implementation Runner');
  log.info('='.repeat(60));
  log.info('');

  const projectManager = new ProjectManager();

  try {
    // Generate initial status report
    log.info('📊 Generating initial status report...');
    const initialReport = await projectManager.generateProgressReport();

    log.info(`\n📈 Current Status: ${initialReport.overall.progress}`);
    log.info(`📊 Progress: ${initialReport.overall.percentage}`);
    log.info('');

    // Show phase status
    log.info('📋 Phase Status:');
    initialReport.phases.forEach(phase => {
      log.info(`  ${phase.icon} Phase ${phase.phase}: ${phase.name} - ${phase.status}`);
    });
    log.info('');

    // Run all phases
    await projectManager.runAllPhases();

    // Generate final report
    log.info('\n📊 Generating final implementation report...');
    const finalReport = await projectManager.generateProgressReport();

    // Save final report
    await fs.writeFile('reports/final-implementation-report.json', JSON.stringify(finalReport, null, 2));

    log.info('\n🎉 Implementation Complete!');
    log.info('📊 Final Report saved to: reports/final-implementation-report.json');
    log.info('');
    log.info('🚀 Next Steps:');
    finalReport.nextSteps.forEach(step => log.info(`  • ${step}`));
    log.info('');
    log.info('💡 Recommendations:');
    finalReport.recommendations.forEach(rec => log.info(`  • ${rec}`));
    log.info('');
    log.info('🤖 You can now use the Gemini CLI Assistant:');
    log.info('   node gemini-cli.cjs');

  } catch (error) {
    const log = await getLogger();
    log.error('❌ Implementation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runCompleteImplementation().catch(async (error) => {
    const log = await getLogger();
    log.error(error)
  });
}

module.exports = { runCompleteImplementation }; 