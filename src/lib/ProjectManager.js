const fs = require('fs').promises;
const { execSync } = require('child_process');

let logger;

async function getLogger() {
  if (!logger) {
    const loggerModule = await import('./logger.js');
    logger = loggerModule.default;
  }
  return logger;
}

class ProjectManager {
  constructor() {
    this.projectRoot = process.cwd();
    this.phases = [
      'Documentation Consolidation',
      'AI Image Generation',
      'Organization Structure',
      'Gap Analysis',
      'Design Implementation',
      'Code Development',
      'Gemini CLI Agent'
    ];
  }
  
  async getProjectStatus() {
    const status = {
      phases: {},
      overall: 'in_progress',
      lastUpdated: new Date()
    };
    
    // Check each phase completion
    for (let i = 0; i < this.phases.length; i++) {
      const phaseNum = i + 1;
      const phaseScript = `phase${phaseNum}-${this.phases[i].toLowerCase().replace(/\s+/g, '-')}.cjs`;
      
      try {
        await fs.access(phaseScript);
        status.phases[this.phases[i]] = 'completed';
      } catch {
        status.phases[this.phases[i]] = 'pending';
      }
    }
    
    // Check overall completion
    const completedPhases = Object.values(status.phases).filter(s => s === 'completed').length;
    if (completedPhases === this.phases.length) {
      status.overall = 'completed';
    } else if (completedPhases > 0) {
      status.overall = 'in_progress';
    } else {
      status.overall = 'not_started';
    }
    
    return status;
  }
  
  async generateProgressReport() {
    const status = await this.getProjectStatus();
    const completedCount = Object.values(status.phases).filter(s => s === 'completed').length;
    const progressPercentage = Math.round((completedCount / this.phases.length) * 100);
    
    const report = {
      title: 'Smart MCP Server - Implementation Progress Report',
      generatedAt: new Date(),
      overall: {
        status: status.overall,
        progress: `${completedCount}/${this.phases.length} phases completed`,
        percentage: `${progressPercentage}%`
      },
      phases: Object.entries(status.phases).map(([name, phaseStatus], index) => ({
        phase: index + 1,
        name,
        status: phaseStatus,
        icon: phaseStatus === 'completed' ? '✅' : phaseStatus === 'in_progress' ? '🔄' : '⏳'
      })),
      nextSteps: this.getNextSteps(status),
      recommendations: this.getRecommendations(status)
    };
    
    return report;
  }
  
  getNextSteps(status) {
    const nextSteps = [];
    
    for (const [phaseName, phaseStatus] of Object.entries(status.phases)) {
      if (phaseStatus === 'pending') {
        nextSteps.push(`Complete ${phaseName}`);
        break; // Only show the next immediate step
      }
    }
    
    if (nextSteps.length === 0) {
      nextSteps.push('All phases completed! Begin production deployment.');
    }
    
    return nextSteps;
  }
  
  getRecommendations(status) {
    const recommendations = [];
    
    if (status.overall === 'completed') {
      recommendations.push('Run comprehensive testing before production deployment');
      recommendations.push('Set up monitoring and alerting systems');
      recommendations.push('Create backup and disaster recovery procedures');
    } else {
      recommendations.push('Continue with the next phase in sequence');
      recommendations.push('Review completed phases for potential improvements');
      recommendations.push('Keep documentation updated as you progress');
    }
    
    return recommendations;
  }
  
  async runAllPhases() {
    const log = await getLogger();
    log.info('🚀 Running all implementation phases...');
    
    for (let i = 1; i <= this.phases.length; i++) {
      const phaseName = this.phases[i - 1];
      const phaseScript = `phase${i}-${phaseName.toLowerCase().replace(/\s+/g, '-')}.cjs`;
      
      try {
        log.info(`\n📋 Starting Phase ${i}: ${phaseName}`);
        execSync(`node ${phaseScript}`, { stdio: 'inherit' });
        log.info(`✅ Phase ${i} completed successfully`);
      } catch (error) {
        log.error(`❌ Phase ${i} failed:`, error.message);
        break;
      }
    }
    
    log.info('\n🎉 All phases execution completed!');
    const report = await this.generateProgressReport();
    log.info(`📊 Final Status: ${report.overall.progress} (${report.overall.percentage})`);
  }
}

module.exports = ProjectManager;