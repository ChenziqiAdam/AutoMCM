#!/usr/bin/env node

import MasterAgent from './agents/master-agent.js';
import config from './core/config.js';
import fs from 'fs';
import path from 'path';

/**
 * AutoMCM CLI Entry Point
 */
class AutoMCM {
  constructor() {
    this.master = new MasterAgent();
  }

  /**
   * Display banner
   */
  displayBanner() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║           AutoMCM v0.1.0                     ║');
    console.log('║  Mathematical Contest Modeling AI Workspace  ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('\n');
  }

  /**
   * Run interactive mode
   */
  async run() {
    this.displayBanner();

    // Check if API key is configured
    const apiKey = config.get('llm.api_key');
    if (!apiKey || apiKey.startsWith('${')) {
      console.error('❌ Error: ANTHROPIC_API_KEY not set');
      console.log('Please create a .env file with your API key:');
      console.log('  cp .env.example .env');
      console.log('  # Edit .env and add your key');
      process.exit(1);
    }

    console.log('✓ Configuration loaded');
    console.log(`✓ Model: ${config.get('llm.model')}`);
    console.log('\n');

    // Demo workflow
    await this.runDemo();
  }

  /**
   * Demo workflow
   */
  async runDemo() {
    console.log('=== DEMO: AutoMCM Workflow ===\n');

    // Initialize workspace
    const workspacePath = './workspace/demo_problem';
    await this.master.initializeWorkspace(workspacePath, {
      title: 'Demo MCM Problem'
    });

    // Example problem
    const problemStatement = `
Problem: Optimize Emergency Vehicle Routing

You are tasked with developing a mathematical model to optimize emergency vehicle
routing in an urban environment. The model should minimize response time while
considering:
- Traffic patterns (time-varying)
- Multiple emergency types (fire, medical, police)
- Vehicle availability and location
- Road network constraints

Deliverables:
1. Mathematical model with clearly defined variables
2. Solution algorithm
3. Sensitivity analysis on key parameters
4. Visualizations showing optimal routes
5. Recommendations for dispatcher system
    `.trim();

    // Planning phase
    console.log('\n' + '='.repeat(60));
    const planResult = await this.master.executePlanningPhase(problemStatement);

    console.log('\n📄 PLANNING RESULTS:');
    console.log('-'.repeat(60));
    console.log('\n🔍 RAG ANALYSIS:');
    console.log(planResult.ragAnalysis);
    console.log('\n📝 PROBLEM PARSE:');
    console.log(planResult.parse);
    console.log('\n🔬 RESEARCH:');
    console.log(planResult.research);
    console.log('\n📋 PROPOSED PLAN:');
    console.log(planResult.plan);
    console.log('\n' + '-'.repeat(60));

    console.log('\nWould you like to approve this plan? [For demo, auto-approving]\n');

    // Execution phase
    console.log('='.repeat(60));
    const execResult = await this.master.executeImplementationPhase(planResult.plan);

    console.log('\n✅ EXECUTION COMPLETE\n');
    console.log('📊 Model Status: Implemented');
    console.log('📝 Paper Status: Drafted');
    console.log(`📁 Workspace: ${workspacePath}`);

    // Demonstrate workspace features
    console.log('\n' + '='.repeat(60));
    console.log('📦 Workspace Features Demo:\n');

    const parser = this.master.getParser();
    const artifactStore = this.master.getArtifactStore();

    // Show artifact stats
    const stats = artifactStore.getStats();
    console.log(`Artifacts tracked: ${stats.total}`);
    if (stats.total > 0) {
      console.log('By type:', stats.byType);
    }

    // Show variable registry
    const variables = parser.getVariableRegistry();
    console.log(`\nVariables registered: ${variables.length}`);

    // Show assumptions
    const assumptions = parser.getAssumptions();
    console.log(`Assumptions documented: ${assumptions.length}`);

    console.log('\n' + '='.repeat(60));
    console.log('Demo complete! 🎉');
    console.log('\nNext steps:');
    console.log('  1. Review generated files in workspace/');
    console.log('  2. Run sensitivity analysis');
    console.log('  3. Compile LaTeX paper');
    console.log('  4. Generate final PDF');
  }
}

// Run CLI
const app = new AutoMCM();
app.run().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
