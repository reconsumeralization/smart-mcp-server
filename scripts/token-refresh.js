#!/usr/bin/env node

/**
 * Gemini Token Refresh CLI Tool
 * Ensures MCP and A2A protocol compliance
 */

import fs from 'fs/promises';
import path from 'path';
import tokenManager from '../src/lib/token-manager.js';
import logger from '../src/logger.js';

class TokenRefreshCLI {
  constructor() {
    this.commands = {
      'generate': this.generateNewToken.bind(this),
      'refresh': this.refreshExistingToken.bind(this),
      'validate': this.validateToken.bind(this),
      'info': this.showTokenInfo.bind(this),
      'export': this.exportTokens.bind(this),
      'help': this.showHelp.bind(this)
    };
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';

    if (!this.commands[command]) {
      console.error(`❌ Unknown command: ${command}`);
      this.showHelp();
      process.exit(1);
    }

    try {
      await this.commands[command](args.slice(1));
    } catch (error) {
      console.error('❌ Error:', error.message);
      logger.error('Token refresh CLI error:', error);
      process.exit(1);
    }
  }

  async generateNewToken(args) {
    console.log('🔄 Generating new MCP/A2A compliant Gemini token...\n');

    try {
      const tokenData = await tokenManager.generateNewGeminiToken();
      
      console.log('✅ New token generated successfully!');
      console.log('\n📋 Token Information:');
      console.log(`   Token ID: gemini_primary`);
      console.log(`   Type: ${tokenData.type}`);
      console.log(`   Created: ${tokenData.created_at}`);
      console.log(`   Expires: ${tokenData.expires_at}`);
      console.log(`   MCP Compliant: ${tokenData.mcp_compliant ? '✅' : '❌'}`);
      console.log(`   A2A Compliant: ${tokenData.a2a_compliant ? '✅' : '❌'}`);
      console.log(`   Scopes: ${tokenData.scopes.join(', ')}`);

      // Update .env file if it exists
      await this.updateEnvFile(tokenData.apiKey);

      console.log('\n🔧 Next Steps:');
      console.log('   1. Restart your application to use the new token');
      console.log('   2. Verify the token works with: npm run token-validate');
      console.log('   3. Check the logs for any authentication issues');

    } catch (error) {
      console.error('❌ Failed to generate token:', error.message);
      throw error;
    }
  }

  async refreshExistingToken(args) {
    console.log('🔄 Refreshing existing Gemini token...\n');

    try {
      const tokenData = await tokenManager.refreshGeminiToken();
      
      console.log('✅ Token refreshed successfully!');
      console.log('\n📋 Updated Token Information:');
      console.log(`   Token ID: gemini_primary`);
      console.log(`   Type: ${tokenData.type}`);
      console.log(`   Created: ${tokenData.created_at}`);
      console.log(`   Expires: ${tokenData.expires_at}`);
      console.log(`   MCP Compliant: ${tokenData.mcp_compliant ? '✅' : '❌'}`);
      console.log(`   A2A Compliant: ${tokenData.a2a_compliant ? '✅' : '❌'}`);

      // Update .env file if it exists
      await this.updateEnvFile(tokenData.apiKey);

      console.log('\n✅ Environment updated with new token');

    } catch (error) {
      console.error('❌ Failed to refresh token:', error.message);
      throw error;
    }
  }

  async validateToken(args) {
    console.log('🔍 Validating current Gemini token...\n');

    try {
      const tokenData = await tokenManager.getCurrentGeminiToken();
      
      // Validate compliance
      const mcpValid = tokenManager.validateMCPCompliance(tokenData);
      const a2aValid = tokenManager.validateA2ACompliance(tokenData);
      const timeValid = tokenManager.isTokenValid(tokenData);

      console.log('📋 Token Validation Results:');
      console.log(`   Token ID: gemini_primary`);
      console.log(`   MCP Compliance: ${mcpValid ? '✅ Valid' : '❌ Invalid'}`);
      console.log(`   A2A Compliance: ${a2aValid ? '✅ Valid' : '❌ Invalid'}`);
      console.log(`   Time Validity: ${timeValid ? '✅ Valid' : '❌ Expired'}`);
      console.log(`   Expires: ${tokenData.expires_at}`);

      if (mcpValid && a2aValid && timeValid) {
        console.log('\n✅ Token is fully compliant and valid!');
      } else {
        console.log('\n⚠️  Token has issues. Consider refreshing with: npm run token-refresh');
      }

    } catch (error) {
      console.error('❌ Token validation failed:', error.message);
      console.log('\n💡 Try generating a new token with: npm run token-generate');
      throw error;
    }
  }

  async showTokenInfo(args) {
    console.log('📋 Current Token Information:\n');

    try {
      const tokenData = await tokenManager.getCurrentGeminiToken();
      const exportData = await tokenManager.exportTokens();

      console.log('🔑 Primary Token:');
      console.log(`   Type: ${tokenData.type}`);
      console.log(`   Version: ${tokenData.version}`);
      console.log(`   Created: ${tokenData.created_at}`);
      console.log(`   Expires: ${tokenData.expires_at}`);
      console.log(`   Valid: ${tokenManager.isTokenValid(tokenData) ? '✅' : '❌'}`);

      console.log('\n🛡️  Compliance:');
      console.log(`   MCP Compliant: ${tokenData.mcp_compliant ? '✅' : '❌'}`);
      console.log(`   A2A Compliant: ${tokenData.a2a_compliant ? '✅' : '❌'}`);
      console.log(`   MCP Version: ${tokenData.compliance.mcp_version}`);
      console.log(`   A2A Version: ${tokenData.compliance.a2a_version}`);
      console.log(`   Security Level: ${tokenData.compliance.security_level}`);

      console.log('\n🔧 Capabilities:');
      Object.entries(tokenData.capabilities).forEach(([key, value]) => {
        console.log(`   ${key}: ${value ? '✅' : '❌'}`);
      });

      console.log('\n🎯 Scopes:');
      tokenData.scopes.forEach(scope => {
        console.log(`   • ${scope}`);
      });

      console.log('\n📊 All Tokens:');
      Object.entries(exportData).forEach(([tokenId, data]) => {
        console.log(`   ${tokenId}: ${data.type} (${data.mcp_compliant ? 'MCP' : 'Non-MCP'}/${data.a2a_compliant ? 'A2A' : 'Non-A2A'})`);
      });

    } catch (error) {
      console.error('❌ Failed to get token info:', error.message);
      console.log('\n💡 Try generating a new token with: npm run token-generate');
    }
  }

  async exportTokens(args) {
    console.log('📤 Exporting token data...\n');

    try {
      const exportData = await tokenManager.exportTokens();
      const exportFile = path.join(process.cwd(), 'token-export.json');
      
      await fs.writeFile(exportFile, JSON.stringify(exportData, null, 2));
      
      console.log('✅ Token data exported successfully!');
      console.log(`   File: ${exportFile}`);
      console.log(`   Tokens: ${Object.keys(exportData).length}`);
      
      console.log('\n📋 Exported Tokens:');
      Object.entries(exportData).forEach(([tokenId, data]) => {
        console.log(`   ${tokenId}:`);
        console.log(`     Type: ${data.type}`);
        console.log(`     Created: ${data.created_at}`);
        console.log(`     Expires: ${data.expires_at}`);
        console.log(`     MCP: ${data.mcp_compliant ? '✅' : '❌'}`);
        console.log(`     A2A: ${data.a2a_compliant ? '✅' : '❌'}`);
      });

      console.log('\n⚠️  Note: Sensitive data (API keys) are not included in the export for security.');

    } catch (error) {
      console.error('❌ Failed to export tokens:', error.message);
      throw error;
    }
  }

  async updateEnvFile(apiKey) {
    const envFile = path.join(process.cwd(), '.env');
    
    try {
      // Check if .env file exists
      let envContent = '';
      try {
        envContent = await fs.readFile(envFile, 'utf8');
      } catch (error) {
        // File doesn't exist, create new content
        console.log('📝 Creating new .env file...');
      }

      // Update or add GEMINI_API_KEY
      const lines = envContent.split('\n');
      let keyUpdated = false;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('GEMINI_API_KEY=')) {
          lines[i] = `GEMINI_API_KEY=${apiKey}`;
          keyUpdated = true;
          break;
        }
      }

      if (!keyUpdated) {
        lines.push(`GEMINI_API_KEY=${apiKey}`);
      }

      // Write back to file
      await fs.writeFile(envFile, lines.join('\n'));
      console.log('✅ Updated .env file with new token');

    } catch (error) {
      console.warn('⚠️  Could not update .env file:', error.message);
      console.log(`💡 Please manually add: GEMINI_API_KEY=${apiKey}`);
    }
  }

  showHelp() {
    console.log(`
🔑 Gemini Token Refresh CLI - MCP/A2A Compliant

Usage: node scripts/token-refresh.js <command>

Commands:
  generate    Generate a new MCP/A2A compliant token
  refresh     Refresh the existing token
  validate    Validate current token compliance
  info        Show detailed token information
  export      Export token metadata (no sensitive data)
  help        Show this help message

Examples:
  node scripts/token-refresh.js generate
  node scripts/token-refresh.js validate
  node scripts/token-refresh.js info

Environment:
  The tool will automatically update your .env file with the new token.
  Make sure to restart your application after token refresh.

Compliance:
  ✅ MCP (Model Context Protocol) v1.0
  ✅ A2A (Agent-to-Agent) v1.0
  ✅ Secure token storage with AES-256-GCM encryption
  ✅ Automatic token expiration and refresh

For more information, see the documentation.
`);
  }
}

// Run the CLI
const cli = new TokenRefreshCLI();
cli.run().catch(error => {
  console.error('❌ CLI Error:', error.message);
  process.exit(1);
});
