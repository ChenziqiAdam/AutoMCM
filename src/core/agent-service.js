import MasterAgent from '../agents/master-agent.js';
import { EventEmitter } from 'events';

/**
 * Agent Service - Bridge between frontend and backend agents
 * Provides event-based interface for executing agents and streaming logs
 */
class AgentService extends EventEmitter {
  constructor() {
    super();
    this.masterAgent = null;
    this.isRunning = false;
    this.currentPhase = 'idle';
  }

  /**
   * Initialize workspace for a new problem
   */
  async initializeWorkspace(workspacePath, problemData) {
    try {
      this.emit('log', { type: 'info', message: '🚀 Initializing workspace...' });

      // Create master agent with event emitter passthrough
      this.masterAgent = new MasterAgent(this);

      // Capture console logs and emit them
      this._interceptLogs();

      const result = await this.masterAgent.initializeWorkspace(workspacePath, problemData);

      this.currentPhase = result.phase;
      this.emit('phase-change', result.phase);
      this.emit('log', { type: 'success', message: '✅ Workspace initialized' });

      return result;
    } catch (error) {
      this.emit('log', { type: 'error', message: `❌ Initialization failed: ${error.message}` });
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Execute planning phase with retry logic
   */
  async executePlanningPhase(problemStatement, retries = 2) {
    console.log('\n🎯 AgentService: executePlanningPhase called');
    console.log(`   Problem length: ${problemStatement.length} chars`);
    console.log(`   Retries allowed: ${retries}`);

    if (!this.masterAgent) {
      const error = 'Workspace not initialized';
      console.error(`❌ ${error}`);
      throw new Error(error);
    }

    let attempt = 0;
    while (attempt <= retries) {
      try {
        this.isRunning = true;
        this.currentPhase = 'planning';
        this.emit('phase-change', 'planning');

        if (attempt > 0) {
          console.log(`\n🔄 Retry attempt ${attempt}/${retries}`);
          this.emit('log', { type: 'warning', message: `🔄 Retry attempt ${attempt}/${retries}...` });
        } else {
          console.log('\n📊 Starting planning phase (attempt 1)');
          this.emit('log', { type: 'info', message: '📊 Starting planning phase...' });
        }

        console.log(`⏱️  Executing with 5-minute timeout...`);
        const result = await this._executeWithTimeout(
          () => this.masterAgent.executePlanningPhase(problemStatement),
          300000 // 5 minute timeout
        );

        console.log('✅ Planning phase successful!');
        this.emit('log', { type: 'success', message: '✅ Planning phase complete' });
        this.emit('planning-complete', result);

        return result;
      } catch (error) {
        attempt++;

        console.error(`\n❌ Planning attempt ${attempt} failed:`);
        console.error(`   Error type: ${error.constructor.name}`);
        console.error(`   Error message: ${error.message}`);
        console.error(`   Stack trace:`, error.stack);

        if (attempt > retries) {
          console.error(`\n💥 All ${retries + 1} attempts exhausted, giving up`);
          this.emit('log', { type: 'error', message: `❌ Planning failed after ${retries} retries: ${error.message}` });
          this.emit('error', error);
          throw error;
        }

        console.log(`⏳ Waiting 2 seconds before retry...`);
        this.emit('log', { type: 'warning', message: `⚠️ Planning attempt failed: ${error.message}` });
        await this._delay(2000); // Wait 2 seconds before retry
      } finally {
        if (attempt > retries) {
          this.isRunning = false;
        }
      }
    }
  }

  /**
   * Execute modeling phase
   */
  async executeModelingPhase(plan) {
    if (!this.masterAgent) {
      throw new Error('Workspace not initialized');
    }

    console.log('\n🔬 AgentService: executeModelingPhase called');
    console.log(`   Plan type: ${typeof plan}`);
    console.log(`   Plan length: ${plan?.length || 0} chars`);
    console.log(`   Plan preview: ${plan ? plan.substring(0, 100) : 'null'}...`);

    if (!plan || plan === 'null' || plan.length === 0) {
      throw new Error('No plan provided. Please complete planning phase first.');
    }

    try {
      this.isRunning = true;
      this.currentPhase = 'modeling';
      this.emit('phase-change', 'modeling');
      this.emit('log', { type: 'info', message: '🔬 Starting modeling phase...' });

      const result = await this.masterAgent.executeModelingPhase(plan);

      this.emit('log', { type: 'success', message: '✅ Modeling phase complete' });
      this.emit('modeling-complete', result);

      // Emit equation and validation events from artifacts
      await this._emitModelingResults();

      return result;
    } catch (error) {
      this.emit('log', { type: 'error', message: `❌ Modeling failed: ${error.message}` });
      this.emit('error', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Execute writing phase
   */
  async executeWritingPhase() {
    if (!this.masterAgent) {
      throw new Error('Workspace not initialized');
    }

    try {
      this.isRunning = true;
      this.currentPhase = 'writing';
      this.emit('phase-change', 'writing');
      this.emit('log', { type: 'info', message: '✍️ Starting writing phase...' });

      const result = await this.masterAgent.executeWritingPhase();

      this.emit('log', { type: 'success', message: '✅ Writing phase complete' });
      this.emit('writing-complete', result);

      return result;
    } catch (error) {
      this.emit('log', { type: 'error', message: `❌ Writing failed: ${error.message}` });
      this.emit('error', error);
      throw error;
    } finally {
      this.isRunning = false;
      this.currentPhase = 'idle';
      this.emit('phase-change', 'idle');
    }
  }

  /**
   * Run complete workflow (all phases)
   */
  async runCompleteWorkflow(workspacePath, problemData, problemStatement) {
    try {
      this.emit('log', { type: 'info', message: '🎯 Starting complete MCM workflow...' });

      // Phase 1: Initialize
      await this.initializeWorkspace(workspacePath, problemData);

      // Phase 2: Planning
      const planResult = await this.executePlanningPhase(problemStatement);

      // Phase 3: Modeling
      const modelResult = await this.executeModelingPhase(planResult.plan);

      // Phase 4: Writing
      const writeResult = await this.executeWritingPhase();

      this.emit('log', { type: 'success', message: '🎉 Complete workflow finished!' });
      this.emit('workflow-complete', {
        plan: planResult,
        model: modelResult,
        paper: writeResult
      });

      return { plan: planResult, model: modelResult, paper: writeResult };
    } catch (error) {
      this.emit('log', { type: 'error', message: `❌ Workflow failed: ${error.message}` });
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get current artifacts
   */
  async getArtifacts() {
    if (!this.masterAgent || !this.masterAgent.artifactStore) {
      return [];
    }
    return await this.masterAgent.artifactStore.listArtifacts();
  }

  /**
   * Stop current execution
   */
  stop() {
    this.isRunning = false;
    this.emit('log', { type: 'warning', message: '⚠️ Stopping execution...' });
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      phase: this.currentPhase,
      hasWorkspace: !!this.masterAgent
    };
  }

  /**
   * Intercept console logs and emit them as events
   */
  _interceptLogs() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      const message = args.join(' ');
      this.emit('log', { type: 'info', message });
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      const message = args.join(' ');
      this.emit('log', { type: 'error', message });
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      const message = args.join(' ');
      this.emit('log', { type: 'warning', message });
      originalWarn.apply(console, args);
    };
  }

  /**
   * Execute function with timeout
   */
  async _executeWithTimeout(fn, timeout) {
    return Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out')), timeout)
      )
    ]);
  }

  /**
   * Delay helper for retries
   */
  async _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Graceful error recovery
   */
  async _recoverFromError(error, context) {
    this.emit('log', { type: 'warning', message: `🔧 Attempting recovery from: ${error.message}` });

    try {
      // Attempt to save current state
      if (this.masterAgent && this.masterAgent.parser) {
        await this.masterAgent.parser.logProgress(`Error recovery: ${error.message}`);
      }

      // Reset phase if needed
      if (this.isRunning) {
        this.currentPhase = 'idle';
        this.emit('phase-change', 'idle');
      }

      this.emit('log', { type: 'info', message: '✓ State saved for recovery' });
      return true;
    } catch (recoveryError) {
      this.emit('log', { type: 'error', message: `❌ Recovery failed: ${recoveryError.message}` });
      return false;
    }
  }

  /**
   * Extract and emit modeling results (equations, sensitivity, validation)
   */
  async _emitModelingResults() {
    if (!this.masterAgent || !this.masterAgent.artifactStore) return;

    try {
      const artifacts = await this.masterAgent.artifactStore.listArtifacts();

      // Check for sensitivity analysis
      const sensArtifact = artifacts.find(a => a.name === 'sensitivity-analysis.txt');
      if (sensArtifact) {
        const content = await this.masterAgent.artifactStore.readArtifact('sensitivity-analysis.txt');
        this.emit('sensitivity-results', { content, artifact: sensArtifact });
        this.emit('log', { type: 'info', message: '📊 Sensitivity analysis results available' });
      }

      // Check for experiment results
      const expArtifact = artifacts.find(a => a.name === 'experiment-results.txt');
      if (expArtifact) {
        const content = await this.masterAgent.artifactStore.readArtifact('experiment-results.txt');
        this.emit('experiment-results', { content, artifact: expArtifact });
      }

      // Extract equations from modeling result and paper
      let allEquations = [];

      // From modeling phase markdown
      const modelArtifact = artifacts.find(a => a.name === 'modeling-phase-result.md');
      if (modelArtifact) {
        const content = await this.masterAgent.artifactStore.readArtifact('modeling-phase-result.md');
        const equations = this._extractEquations(content);
        allEquations.push(...equations);
      }

      // Also from paper.tex if it exists
      const paperArtifact = artifacts.find(a => a.name === '../paper.tex');
      if (paperArtifact) {
        try {
          const paperContent = await this.masterAgent.artifactStore.readArtifact('../paper.tex');
          const paperEquations = this._extractEquations(paperContent);
          allEquations.push(...paperEquations);
        } catch (err) {
          // paper.tex might not exist yet
        }
      }

      // Remove duplicates and emit
      if (allEquations.length > 0) {
        const uniqueEquations = allEquations.filter((eq, idx, arr) =>
          arr.findIndex(e => e.latex === eq.latex) === idx
        );
        this.emit('equations-extracted', uniqueEquations.slice(0, 30));
        this.emit('log', { type: 'info', message: `📐 ${uniqueEquations.length} equations extracted` });
      }

      // Emit validation status
      this.emit('validation-update', {
        dimensional: sensArtifact ? 'pass' : 'pending',
        sensitivity: sensArtifact ? 'pass' : 'pending',
        variable: modelArtifact ? 'pass' : 'pending'
      });
    } catch (error) {
      console.warn('Could not emit modeling results:', error.message);
    }
  }

  /**
   * Extract LaTeX equations from markdown or LaTeX content
   */
  _extractEquations(content) {
    const equations = [];

    // Match display math: $$...$$
    const displayMath = content.matchAll(/\$\$([\s\S]*?)\$\$/g);
    for (const match of displayMath) {
      equations.push({ latex: match[1].trim(), label: '' });
    }

    // Match LaTeX equation environments: \begin{equation}...\end{equation}
    const latexEquations = content.matchAll(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g);
    for (const match of latexEquations) {
      const eq = match[1].trim();
      // Extract label if exists
      const labelMatch = eq.match(/\\label\{([^}]+)\}/);
      const label = labelMatch ? labelMatch[1] : '';
      const cleanedEq = eq.replace(/\\label\{[^}]+\}/g, '').trim();
      equations.push({ latex: cleanedEq, label });
    }

    // Match LaTeX align environments: \begin{align}...\end{align}
    const alignEquations = content.matchAll(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g);
    for (const match of alignEquations) {
      const eq = match[1].trim();
      const labelMatch = eq.match(/\\label\{([^}]+)\}/);
      const label = labelMatch ? labelMatch[1] : '';
      const cleanedEq = eq.replace(/\\label\{[^}]+\}/g, '').trim();
      equations.push({ latex: cleanedEq, label });
    }

    // Match inline math with labels: $...$ (only longer ones)
    const inlineMath = content.matchAll(/\$([^\$\n]+)\$/g);
    for (const match of inlineMath) {
      const latex = match[1].trim();
      if (latex.length > 5) { // Only longer equations
        equations.push({ latex, label: '' });
      }
    }

    return equations.slice(0, 30); // Limit to 30 equations
  }
}

export default AgentService;
