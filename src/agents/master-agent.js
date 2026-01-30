import BaseAgent from './base-agent.js';
import WorkspaceManager from '../core/workspace.js';
import AutomcmParser from '../core/automcm-parser.js';
import ArtifactStore from '../core/artifact-store.js';
import ProblemAnalyzer from '../core/problem-analyzer.js';
import RAGSystem from '../core/rag-system.js';
import MCMDatabase from '../core/mcm-database.js';
import LatexCompiler from '../tools/latex-compiler.js';
import DataManager from '../utils/data-manager.js';
import path from 'path';
import fs from 'fs/promises';

/**
 * Master Agent - Orchestrates the entire AutoMCM workflow
 * Spawns specialized clone agents and coordinates their work
 */
class MasterAgent extends BaseAgent {
  constructor(eventEmitter = null) {
    super('general');
    this.phase = 'idle'; // idle, planning, execution
    this.clones = [];
    this.workspace = null;
    this.parser = null;
    this.artifactStore = null;
    this.eventEmitter = eventEmitter; // For emitting events to frontend

    // Phase 6: RAG and template systems
    this.problemAnalyzer = new ProblemAnalyzer();
    this.mcmDatabase = new MCMDatabase();
    this.ragSystem = new RAGSystem(this.mcmDatabase);
  }

  /**
   * Initialize workspace for a new MCM problem
   */
  async initializeWorkspace(workspacePath, problemData) {
    this.phase = 'planning';

    console.log('🚀 Initializing AutoMCM workspace...');
    console.log(`📁 Workspace: ${workspacePath}`);
    console.log(`📋 Problem: ${problemData.title || 'Untitled'}`);

    // Create workspace directory structure
    this.workspace = new WorkspaceManager(workspacePath);
    const workspaceInfo = await this.workspace.initialize(problemData);

    // Initialize AUTOMCM.md parser
    this.parser = new AutomcmParser(workspaceInfo.automcm);
    await this.parser.load();

    // Initialize artifact store with event emitter
    this.artifactStore = new ArtifactStore(workspacePath, this.eventEmitter);
    await this.artifactStore.initialize();

    // Initialize data manager
    this.dataManager = new DataManager(workspacePath);

    // Log initialization
    await this.parser.logProgress('Workspace initialized');

    console.log('✅ Workspace ready\n');

    return {
      status: 'initialized',
      workspace: workspaceInfo,
      phase: this.phase
    };
  }

  /**
   * Spawn a specialized clone agent
   */
  spawnClone(mode, task) {
    console.log(`🤖 Spawning ${mode} clone for: ${task.substring(0, 50)}...`);

    const clone = new BaseAgent(mode);
    this.clones.push({
      id: `${mode}-${Date.now()}`,
      agent: clone,
      mode,
      task,
      status: 'running'
    });

    return clone;
  }

  /**
   * Analyze problem using AI + RAG system
   */
  async analyzeProblemWithRAG(problemStatement) {
    console.log('\n🔍 Analyzing problem with RAG system...\n');

    // Step 1: AI-powered problem analysis
    const analysis = this.problemAnalyzer.analyzeProblem(problemStatement);

    // Step 2: Get relevant historical solutions via RAG (async call)
    const ragContext = await this.ragSystem.getContextForTask(
      problemStatement,
      analysis.modelTypes[0]
    );

    // Step 3: Generate comprehensive summary
    const summary = this.problemAnalyzer.generateSummary({
      ...analysis,
      historicalSolutions: ragContext?.solutions || [],
    });

    console.log('✅ Problem analysis complete');
    console.log(`   Model types: ${analysis.modelTypes?.join(', ') || 'Not identified'}`);
    console.log(`   Complexity: ${analysis.complexity || 'medium'}`);
    console.log(`   Found ${ragContext?.solutions?.length || 0} similar solutions\n`);

    return {
      analysis,
      ragContext,
      summary,
    };
  }

  /**
   * Execute planning phase (enhanced with RAG)
   */
  async executePlanningPhase(problemStatement) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 PLANNING PHASE STARTED');
    console.log('='.repeat(80) + '\n');
    this.phase = 'planning';

    try {
      // Step 1: Analyze problem with RAG
      console.log('━━━ Step 1: Analyzing problem (RAG-enhanced) ━━━');
      const ragAnalysis = await this.analyzeProblemWithRAG(problemStatement);
      console.log('✅ RAG analysis complete\n');

      // Step 2: Parse problem with LLM (emphasize actual problem)
      console.log('━━━ Step 2: Parsing problem details with LLM ━━━');
      const parseResult = await this.sendMessage(
        `IMPORTANT: The following is the ACTUAL MCM problem statement. Parse this problem and extract:
1. Problem type
2. Key requirements
3. Deliverables
4. Key concepts and challenges

THE ACTUAL PROBLEM STATEMENT:
=============================
${problemStatement}
=============================

Context from similar solutions:
${ragAnalysis.summary}

Provide a detailed analysis of THIS SPECIFIC PROBLEM above.`
      );
      console.log('✅ Problem parsed\n');

      // Step 3: Research (spawn researcher clone)
      console.log('━━━ Step 3: Researching approaches ━━━');
      const researcher = this.spawnClone('researcher', 'Find relevant papers and approaches');

      const researchResult = await researcher.sendMessage(
        `ACTUAL PROBLEM CONTEXT:
${problemStatement}

PARSED ANALYSIS:
${parseResult.message}

Based on THIS SPECIFIC PROBLEM above, find:
1. Relevant academic papers
2. Similar MCM solutions
3. Applicable mathematical techniques

Suggested techniques from analysis:
${ragAnalysis.analysis.techniques.join(', ')}`
      );
      console.log('✅ Research complete\n');

      // Step 4: Propose approach
      console.log('━━━ Step 4: Proposing detailed approach ━━━');
      const planResult = await this.sendMessage(
        `Based on the research findings, propose a detailed approach for THIS SPECIFIC PROBLEM:

PROBLEM STATEMENT:
${problemStatement}

RAG Analysis:
${ragAnalysis.summary}

Research:
${researchResult.message}

Propose a detailed plan that includes:
1. Mathematical model type (specific to this problem)
2. Implementation strategy
3. Validation approach
4. Potential challenges
5. Data requirements`
      );
      console.log('✅ Approach proposed\n');

      // Save planning results as artifact
      const planDocument = this._formatPlanDocument({
        ragAnalysis: ragAnalysis.summary,
        parse: parseResult.message,
        research: researchResult.message,
        plan: planResult.message,
        timestamp: new Date().toISOString()
      });

      if (this.artifactStore) {
        await this.artifactStore.saveArtifact({
          type: 'plan',
          name: 'planning-phase-result.md',
          content: planDocument,
          metadata: {
            phase: 'planning',
            version: '1.0',
            timestamp: new Date().toISOString()
          }
        });
        console.log('💾 Plan saved to: artifacts/planning-phase-result.md\n');
      }

      console.log('='.repeat(80));
      console.log('📋 PLANNING PHASE COMPLETE - READY FOR APPROVAL');
      console.log('='.repeat(80) + '\n');

      return {
        ragAnalysis: ragAnalysis.summary,
        parse: parseResult.message,
        research: researchResult.message,
        plan: planResult.message
      };
    } catch (error) {
      console.error('\n' + '='.repeat(80));
      console.error('❌ PLANNING PHASE FAILED');
      console.error('='.repeat(80));
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  /**
   * Execute modeling phase
   */
  async executeModelingPhase(approvedPlan) {
    console.log('\n' + '='.repeat(80));
    console.log('🔬 MODELING PHASE STARTED');
    console.log('='.repeat(80) + '\n');
    console.log(`   Received plan type: ${typeof approvedPlan}`);
    console.log(`   Received plan length: ${approvedPlan?.length || 0} chars`);
    console.log(`   Received plan preview: ${approvedPlan ? approvedPlan.substring(0, 150) : 'null'}...`);

    if (!approvedPlan || approvedPlan === 'null') {
      throw new Error('Invalid plan received. Plan is null or empty.');
    }

    this.phase = 'modeling';

    try {
      const modelerClone = this.spawnClone('modeler', 'Implement mathematical model');

      // Get data summary if available
      const dataSummary = this.dataManager.getSummary();
      const dataContext = dataSummary.fileCount > 0
        ? `\n\n## Available Data Files\n\nYou have access to the following data files in the workspace:\n${JSON.stringify(dataSummary, null, 2)}\n\nAll files are located in: ${dataSummary.dataDir}\nYou can read and process these files in your implementation.`
        : '';

      console.log('━━━ Step 1: Implementing model with comprehensive experiments ━━━');
      const modelResult = await modelerClone.sendMessage(
        `Implement this approved plan:\n${approvedPlan}

CRITICAL - SUBMISSION REQUIREMENTS:
This is for an MCM competition paper. You MUST create comprehensive experimental validation.

IMPORTANT - CODE REQUIREMENTS:
- Write COMPLETE, SELF-CONTAINED Python code in a SINGLE code block
- DO NOT use import statements for modules that don't exist (no "from analysis import", no "from utils import", etc.)
- ONLY use standard libraries: numpy, pandas, matplotlib, scipy, sklearn, networkx
- ALL functions and models must be defined WITHIN the code block
- Code must be executable as-is without external dependencies

Required Deliverables:
1. Python code for the complete model implementation
   - Define ALL functions inline (no external imports)
   - Use only standard scientific libraries (numpy, pandas, matplotlib, scipy, sklearn)
   - Include realistic synthetic data generation if no data provided

2. Multiple experiments (minimum 5):
   - Baseline case with realistic parameters
   - Parameter sensitivity analysis
   - Comparison of different scenarios/approaches
   - Edge case testing
   - Validation against known results or benchmarks

3. Rich visualizations (minimum 5 figures):
   - Time series plots showing model evolution
   - Heatmaps or contour plots for 2D parameter space
   - 3D surface plots where applicable
   - Comparison bar/line charts between scenarios
   - Convergence or error plots
   - Distribution or statistical plots

4. All figures must be:
   - High resolution (300 DPI)
   - Properly labeled with axis labels and units
   - Include legends where applicable
   - Saved to figures/ directory with descriptive names

5. Quantitative results:
   - Generate numerical results tables
   - Calculate key metrics and statistics
   - Document all experiment parameters and outcomes

${dataContext}

Remember: MCM judges expect thorough experimental validation. Generate diverse, comprehensive results that demonstrate model robustness and insights.

CRITICAL: Your code must be SELF-CONTAINED and EXECUTABLE. Do not reference external modules or files that don't exist.`
      );
      console.log('✅ Model implemented\n');

      // Initialize modeler agent for executing experiments
      const modelerAgent = new (await import('./modeler-agent.js')).default(this.workspace.workspacePath);
      await modelerAgent.initialize();
      const variableRegistry = await this.parser.getVariableRegistry();
      const modelCode = this._extractCodeFromMessage(modelResult.message);

      // Step 2: Run comprehensive experiments
      console.log('━━━ Step 2: Running comprehensive experiments ━━━');
      let experimentResults = null;
      if (!modelCode) {
        console.log('⚠️  Could not extract model code for experiments\n');
      } else {
        try {
          experimentResults = await modelerAgent.runComprehensiveExperiments(modelCode, variableRegistry);

          if (experimentResults.success) {
            console.log('✅ Comprehensive experiments complete\n');

            // Save experiment results
            if (this.artifactStore) {
              await this.artifactStore.saveArtifact({
                type: 'experiments',
                name: 'experiment-results.txt',
                content: experimentResults.summary,
                metadata: {
                  phase: 'modeling',
                  timestamp: new Date().toISOString()
                }
              });
              console.log('💾 Experiment results saved to: artifacts/experiment-results.txt\n');
            }
          } else {
            console.log('⚠️  Experiments had errors (model code may have bugs). Continuing with available results...\n');
            // Still try to save partial results
            if (experimentResults.error && this.artifactStore) {
              await this.artifactStore.saveArtifact({
                type: 'experiments',
                name: 'experiment-results.txt',
                content: `Experiments encountered errors:\n${experimentResults.error}\n\nStdout:\n${experimentResults.stdout || 'None'}`,
                metadata: {
                  phase: 'modeling',
                  status: 'partial',
                  timestamp: new Date().toISOString()
                }
              });
            }
          }
        } catch (error) {
          console.warn(`⚠️  Experiments failed: ${error.message}, continuing...`);
        }
      }

      // Step 3: Generate comprehensive visualizations (skip if experiments already generated figures)
      console.log('━━━ Step 3: Generating comprehensive visualizations ━━━');
      let visualizationResults = null;

      // Check if experiments already generated enough figures
      const figuresDir = path.join(this.workspace.workspacePath, 'figures');
      let existingFigures = [];
      try {
        existingFigures = await fs.readdir(figuresDir);
        existingFigures = existingFigures.filter(f => f.endsWith('.png'));
        console.log(`Found ${existingFigures.length} existing figures from experiments`);
      } catch (err) {
        // figures directory doesn't exist yet
      }

      // Only generate additional visualizations if we have fewer than 6 figures
      if (existingFigures.length >= 6) {
        console.log('✓ Sufficient figures already generated by experiments, skipping additional visualizations\n');
      } else if (!modelCode) {
        console.log('⚠️  Could not extract model code for visualizations\n');
      } else {
        try {
          visualizationResults = await modelerAgent.generateComprehensiveVisualizations(modelCode, variableRegistry);

          if (visualizationResults.success) {
            console.log('✅ Comprehensive visualizations generated\n');

            // Save visualization info
            if (this.artifactStore) {
              await this.artifactStore.saveArtifact({
                type: 'visualizations',
                name: 'visualization-summary.txt',
                content: visualizationResults.output,
                metadata: {
                  phase: 'modeling',
                  timestamp: new Date().toISOString()
                }
              });
              console.log('💾 Visualization summary saved to: artifacts/visualization-summary.txt\n');
            }
          } else {
            console.log('⚠️  Some visualizations failed, continuing...\n');
          }
        } catch (error) {
          console.warn(`⚠️  Visualization generation failed: ${error.message}, continuing...`);
        }
      }

      // Step 4: Auto-run sensitivity analysis
      console.log('━━━ Step 4: Running automated sensitivity analysis ━━━');
      let sensitivityResult = null;
      if (!modelCode) {
        console.log('⚠️  Could not extract model code for sensitivity analysis\n');
      } else {
        try {
          sensitivityResult = await modelerAgent.autoSensitivityAnalysis(modelCode, variableRegistry);

          if (sensitivityResult.success) {
            console.log('✅ Automated sensitivity analysis complete\n');

            // Save sensitivity results as artifact
            if (this.artifactStore) {
              await this.artifactStore.saveArtifact({
                type: 'analysis',
                name: 'sensitivity-analysis.txt',
                content: sensitivityResult.output,
                metadata: {
                  phase: 'modeling',
                  timestamp: new Date().toISOString()
                }
              });
              console.log('💾 Sensitivity results saved to: artifacts/sensitivity-analysis.txt\n');
            }
          } else {
            console.log('⚠️  Sensitivity analysis had issues, continuing...\n');
          }
        } catch (error) {
          console.warn(`⚠️  Sensitivity analysis failed: ${error.message}, continuing...`);
        }
      }

      // Save modeling results as artifact (including all experiments and visualizations)
      const modelDocument = this._formatModelDocument({
        plan: approvedPlan,
        model: modelResult.message,
        experiments: experimentResults?.summary || 'Not performed',
        visualizations: visualizationResults?.output || 'Not performed',
        sensitivityAnalysis: sensitivityResult?.output || 'Not performed',
        timestamp: new Date().toISOString()
      });

      if (this.artifactStore) {
        await this.artifactStore.saveArtifact({
          type: 'model',
          name: 'modeling-phase-result.md',
          content: modelDocument,
          metadata: {
            phase: 'modeling',
            version: '1.0',
            timestamp: new Date().toISOString()
          }
        });
        console.log('💾 Model saved to: artifacts/modeling-phase-result.md\n');
      }

      console.log('='.repeat(80));
      console.log('🔬 MODELING PHASE COMPLETE');
      console.log('='.repeat(80) + '\n');

      return {
        model: modelResult.message
      };
    } catch (error) {
      console.error('\n' + '='.repeat(80));
      console.error('❌ MODELING PHASE FAILED');
      console.error('='.repeat(80));
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  /**
   * Execute writing phase
   */
  async executeWritingPhase() {
    console.log('\n' + '='.repeat(80));
    console.log('✍️  WRITING PHASE');
    console.log('='.repeat(80) + '\n');
    this.phase = 'writing';

    try {
      const writerClone = this.spawnClone('writer', 'Write paper sections');

      // Gather modeling results and artifacts for the writer
      const modelingContext = await this._gatherModelingContext();

      console.log('━━━ Step 1: Writing comprehensive competition-ready paper ━━━');
      const paperResult = await writerClone.sendMessage(
        `Write a COMPLETE, SUBMISSION-READY MCM/ICM competition paper.

${modelingContext}

---

PAPER WRITING INSTRUCTIONS:

CRITICAL REQUIREMENTS FOR MCM SUBMISSION:
- Target length: 15-20 pages (excluding references)
- Must include ALL generated figures from figures/ directory
- Must include detailed experimental results with quantitative analysis
- Must demonstrate thorough validation and testing

Required Structure (with minimum content for each):

1. PREAMBLE AND SETUP
   - \\documentclass[12pt]{article}
   - All necessary packages (amsmath, graphicx, booktabs, etc.)
   - Custom commands for consistent notation

2. TITLE PAGE
   - Descriptive title
   - Team information
   - Summary sheet (1 page) with problem restatement and key findings

3. INTRODUCTION (2-3 pages)
   - Problem background and context
   - Real-world significance
   - Literature review (cite relevant papers)
   - Our approach and contributions
   - Paper organization roadmap

4. PROBLEM ANALYSIS (1-2 pages)
   - Detailed problem restatement
   - Key challenges identified
   - Scope and limitations

5. ASSUMPTIONS AND JUSTIFICATIONS (1 page)
   - List all assumptions from AUTOMCM.md
   - Justify each assumption with reasoning
   - Discuss impact on model validity

6. MODEL DEVELOPMENT (3-4 pages)
   - Mathematical formulation with detailed derivations
   - All equations properly numbered and explained
   - Variable definitions table (reference AUTOMCM.md)
   - Model parameters and their meanings
   - Explain physical/mathematical reasoning

7. SOLUTION METHODOLOGY (2-3 pages)
   - Algorithm description or solution approach
   - Implementation details
   - Computational complexity analysis
   - Numerical methods used

8. EXPERIMENTAL VALIDATION (4-5 pages) **CRITICAL SECTION**
   This must include:
   - Subsection for EACH experiment conducted
   - Baseline case results with detailed discussion
   - Sensitivity analysis results (include all figures)
   - Comparison scenarios with analysis
   - Edge case testing results
   - For EACH figure: Include in LaTeX, reference in text, discuss findings
   - Quantitative results tables
   - Statistical analysis where applicable

9. RESULTS DISCUSSION (2-3 pages)
   - Synthesize findings across all experiments
   - Interpret physical meaning of results
   - Compare with expectations or benchmarks
   - Discuss implications

10. MODEL STRENGTHS AND WEAKNESSES (1 page)
    - What the model does well
    - Limitations and assumptions impact
    - Potential improvements

11. CONCLUSION (1 page)
    - Summarize key findings
    - Answer the original problem
    - Future work suggestions

12. REFERENCES
    - Properly formatted bibliography

FIGURE AND TABLE REQUIREMENTS:
- Scan the workspace figures/ directory
- Include ALL generated figures (minimum 5)
- Each figure must have:
  * \\begin{figure}[htbp] environment
  * \\includegraphics with proper width
  * Descriptive caption explaining what is shown
  * Unique label for referencing
- Reference each figure in the text using \\ref{fig:...}
- Create results tables using booktabs
- Number all figures and tables consecutively

WRITING QUALITY:
- Professional academic tone
- Clear, precise technical writing
- Proper mathematical notation
- Smooth transitions between sections
- No handwaving - explain all steps

Reference variables from AUTOMCM.md variable registry.
Output the COMPLETE LaTeX code in a code block - this should be a FULL 15-20 page paper ready for submission.`
      );
      console.log('✅ Paper drafted\n');

      // Extract LaTeX from response and save to paper.tex
      console.log('━━━ Step 1.5: Saving paper.tex ━━━');
      const latexContent = this._extractLatexFromResponse(paperResult.message);
      const paperPath = path.join(this.workspace.workspacePath, 'paper.tex');
      await fs.writeFile(paperPath, latexContent, 'utf8');
      console.log('✅ paper.tex saved\n');

      // Save writing results as artifact
      const writingDocument = this._formatWritingDocument({
        paper: paperResult.message,
        timestamp: new Date().toISOString()
      });

      if (this.artifactStore) {
        await this.artifactStore.saveArtifact({
          type: 'document',
          name: 'writing-phase-result.md',
          content: writingDocument,
          metadata: {
            phase: 'writing',
            version: '1.0',
            timestamp: new Date().toISOString()
          }
        });
        console.log('💾 Writing results saved to: artifacts/writing-phase-result.md\n');
      }

      // Compile paper to PDF
      console.log('━━━ Step 2: Compiling paper to PDF ━━━');
      let pdfCompiled = false;
      try {
        const compiler = new LatexCompiler(this.workspace.workspacePath);

        // Check if LaTeX is installed
        const latexInstalled = await compiler.checkInstallation();
        if (!latexInstalled) {
          console.log('⚠️  LaTeX not installed - skipping PDF compilation');
          console.log('   Install LaTeX to enable PDF generation:');
          console.log('   • macOS: brew install --cask mactex-no-gui');
          console.log('   • Linux: sudo apt-get install texlive-latex-base');
          console.log('   • Windows: https://miktex.org/download\n');
          console.log('   Paper is available as LaTeX source: paper.tex\n');
        } else {
          const paperPath = path.join(this.workspace.workspacePath, 'paper.tex');
          const compileResult = await compiler.compile(paperPath);

          if (compileResult.success) {
            console.log('✅ PDF compiled successfully\n');
            pdfCompiled = true;
          } else {
            console.log('⚠️  PDF compilation failed (LaTeX file still available)\n');
          }
        }
      } catch (compileError) {
        console.log('⚠️  PDF compilation error (LaTeX file still available)');
        console.log('Error:', compileError.message || compileError.error || JSON.stringify(compileError), '\n');
      }

      // Step 3: Validate paper completeness and expand if needed
      console.log('━━━ Step 3: Validating paper completeness ━━━');
      const latexContentForValidation = await fs.readFile(paperPath, 'utf8');

      const validation = this._validatePaperCompleteness(latexContentForValidation);
      console.log(`📊 Paper validation results:`);
      console.log(`   Estimated pages: ${validation.estimatedPages}`);
      console.log(`   Figures included: ${validation.figureCount}`);
      console.log(`   Tables included: ${validation.tableCount}`);
      console.log(`   Equations: ${validation.equationCount}`);
      console.log(`   Sections: ${validation.sectionCount}\n`);

      // If paper is insufficient, expand it
      if (validation.estimatedPages < 12 || validation.figureCount < 4 || !validation.hasExperimentalSection) {
        console.log('⚠️  Paper needs expansion - generating additional content\n');
        console.log('━━━ Step 4: Expanding paper content ━━━');

        const expansionResult = await writerClone.sendMessage(
          `The current paper needs expansion to meet MCM submission standards.

Current status:
- Estimated pages: ${validation.estimatedPages} (target: 15-20)
- Figures: ${validation.figureCount} (minimum: 5)
- Tables: ${validation.tableCount}
- Has experimental validation: ${validation.hasExperimentalSection ? 'Yes' : 'No'}

Please EXPAND the paper by:

1. ${validation.estimatedPages < 12 ? `Adding more detailed content to reach 15-20 pages:
   - Expand the introduction with more background and literature review
   - Add detailed derivations in the model section
   - Expand experimental validation with more discussion of each result
   - Add a detailed sensitivity analysis discussion section
   - Include model validation and verification subsections
   - Add a comprehensive discussion section analyzing implications` : 'Content length is adequate'}

2. ${validation.figureCount < 4 ? `Include MORE figures - scan figures/ directory and add all available figures with:
   - Descriptive captions explaining what each shows
   - Discussion in the text referencing each figure
   - Proper LaTeX figure environments` : 'Figure count is adequate'}

3. ${!validation.hasExperimentalSection ? `Add comprehensive EXPERIMENTAL VALIDATION section (3-4 pages) with:
   - Multiple experiment subsections
   - Quantitative results tables
   - Statistical analysis
   - Comparison of different scenarios` : 'Experimental section exists'}

4. Add more depth everywhere:
   - Detailed mathematical derivations
   - Step-by-step algorithm explanations
   - Thorough results interpretation
   - Discussion of model implications
   - Comparison with literature or benchmarks

5. Add results tables showing quantitative outcomes from experiments

Please output the COMPLETE EXPANDED LaTeX document in a code block. This must be a full, submission-ready paper.`
        );

        // Save expanded paper
        const expandedLatex = this._extractLatexFromResponse(expansionResult.message);
        await fs.writeFile(paperPath, expandedLatex, 'utf8');
        console.log('✅ Paper expanded and saved\n');

        // Re-validate
        const newValidation = this._validatePaperCompleteness(expandedLatex);
        console.log(`📊 Updated paper validation:`);
        console.log(`   Estimated pages: ${newValidation.estimatedPages}`);
        console.log(`   Figures included: ${newValidation.figureCount}\n`);

        // Re-compile if needed
        if (pdfCompiled) {
          console.log('━━━ Step 5: Re-compiling expanded paper ━━━');
          try {
            const compiler = new LatexCompiler(this.workspace.workspacePath);
            const compileResult = await compiler.compile(paperPath);
            if (compileResult.success) {
              console.log('✅ Expanded PDF compiled successfully\n');
            }
          } catch (error) {
            console.log('⚠️  Re-compilation warning:', error.message, '\n');
          }
        }
      }

      console.log('='.repeat(80));
      console.log('✍️  WRITING PHASE COMPLETE');
      console.log('='.repeat(80) + '\n');

      return {
        paper: paperResult.message,
        pdfCompiled
      };
    } catch (error) {
      console.error('\n' + '='.repeat(80));
      console.error('❌ WRITING PHASE FAILED');
      console.error('='.repeat(80));
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  /**
   * Validate paper completeness for MCM submission
   */
  _validatePaperCompleteness(latexContent) {
    // Estimate page count (rough: 450 words per page, ~3 chars per word)
    const wordCount = latexContent.split(/\s+/).length;
    const estimatedPages = Math.ceil(wordCount / 450);

    // Count figures
    const figureCount = (latexContent.match(/\\begin{figure}/g) || []).length;

    // Count tables
    const tableCount = (latexContent.match(/\\begin{table}/g) || []).length;

    // Count equations
    const equationCount = (latexContent.match(/\\begin{equation}/g) || []).length;

    // Count sections
    const sectionCount = (latexContent.match(/\\section{/g) || []).length;

    // Check for experimental/results section
    const hasExperimentalSection = /\\section\{.*[Ee]xperiment.*\}|\\section\{.*[Rr]esult.*\}|\\section\{.*[Vv]alidation.*\}/.test(latexContent);

    return {
      estimatedPages,
      figureCount,
      tableCount,
      equationCount,
      sectionCount,
      hasExperimentalSection,
      isComplete: estimatedPages >= 12 && figureCount >= 4 && hasExperimentalSection
    };
  }

  /**
   * Extract LaTeX code from LLM response
   */
  _extractLatexFromResponse(message) {
    // Try to extract from code blocks (```latex or ```)
    const codeBlockMatch = message.match(/```(?:latex)?\n?([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // If no code block, check if the entire message looks like LaTeX
    if (message.includes('\\documentclass') && message.includes('\\begin{document}')) {
      return message.trim();
    }

    // Fallback: try to find LaTeX document in the text
    const latexStart = message.indexOf('\\documentclass');
    const latexEnd = message.lastIndexOf('\\end{document}');
    if (latexStart !== -1 && latexEnd !== -1) {
      return message.substring(latexStart, latexEnd + '\\end{document}'.length).trim();
    }

    // If no LaTeX found, return a basic template
    console.warn('⚠️  No LaTeX content found in response, using basic template');
    return `\\documentclass[12pt]{article}
\\usepackage{amsmath, amsfonts, graphicx}
\\title{Mathematical Modeling Paper}
\\author{Team}
\\date{\\today}
\\begin{document}
\\maketitle
\\section{Introduction}
${message}
\\end{document}`;
  }

  /**
   * Execute implementation phase (legacy method for complete workflow)
   */
  async executeImplementationPhase(approvedPlan) {
    console.log('\n⚙️  EXECUTION PHASE\n');
    this.phase = 'execution';

    // Spawn parallel clones for different tasks
    const modelerClone = this.spawnClone('modeler', 'Implement mathematical model');
    const writerClone = this.spawnClone('writer', 'Write paper sections');

    console.log('Step 1: Implementing model...');
    const modelResult = await modelerClone.sendMessage(
      `Implement this approved plan:\n${approvedPlan}\n\nCreate:\n1. Python code for the model\n2. Tests and validation\n3. Visualizations`
    );

    console.log('✓ Model implemented');

    console.log('\nStep 2: Writing paper...');
    const paperResult = await writerClone.sendMessage(
      `Write the paper based on:\n\nModel: ${modelResult.message}\n\nCreate LaTeX sections following AUTOMCM.md standards.`
    );

    console.log('✓ Paper drafted');

    return {
      model: modelResult.message,
      paper: paperResult.message
    };
  }

  /**
   * Get current phase
   */
  getPhase() {
    return this.phase;
  }

  /**
   * Get active clones
   */
  getClones() {
    return this.clones.filter(c => c.status === 'running');
  }

  /**
   * Execute multiple clones in parallel
   */
  async executeParallel(tasks) {
    console.log(`🚀 Executing ${tasks.length} tasks in parallel...`);

    const promises = tasks.map(async ({ mode, task, message }) => {
      const clone = this.spawnClone(mode, task);
      const result = await clone.sendMessage(message);

      // Mark clone as completed
      const cloneEntry = this.clones.find(c => c.agent === clone);
      if (cloneEntry) {
        cloneEntry.status = 'completed';
      }

      return { mode, task, result };
    });

    const results = await Promise.all(promises);
    console.log('✓ All parallel tasks completed\n');

    return results;
  }

  /**
   * Get AUTOMCM.md parser
   */
  getParser() {
    return this.parser;
  }

  /**
   * Get artifact store
   */
  getArtifactStore() {
    return this.artifactStore;
  }

  /**
   * Get workspace manager
   */
  getWorkspace() {
    return this.workspace;
  }

  /**
   * Format planning results as structured markdown document
   */
  _formatPlanDocument(planData) {
    return `# AutoMCM Planning Phase Results

**Generated**: ${planData.timestamp}
**Version**: 1.0
**Status**: Awaiting Approval

---

## 1. RAG Analysis

${planData.ragAnalysis}

---

## 2. Problem Parsing

${planData.parse}

---

## 3. Research Findings

${planData.research}

---

## 4. Proposed Approach

${planData.plan}

---

## Approval Checklist

- [ ] Problem understanding is accurate
- [ ] Research findings are relevant
- [ ] Proposed approach is feasible
- [ ] All deliverables are addressed
- [ ] Timeline and resources are reasonable

**Next Step**: Approve to proceed to execution phase
`;
  }

  /**
   * Format modeling results as structured markdown document
   */
  _formatModelDocument(modelData) {
    return `# AutoMCM Modeling Phase Results

**Generated**: ${modelData.timestamp}
**Version**: 1.0
**Status**: Implementation Complete

---

## 1. Approved Plan

${modelData.plan}

---

## 2. Model Implementation

${modelData.model}

---

## 3. Comprehensive Experiments

${modelData.experiments}

---

## 4. Comprehensive Visualizations

${modelData.visualizations}

---

## 5. Sensitivity Analysis (Automated)

${modelData.sensitivityAnalysis}

---

## Validation Checklist

- [ ] Code runs without errors
- [ ] Model produces expected outputs
- [ ] Comprehensive experiments completed (4+ types)
- [ ] Visualizations are generated (6+ figures)
- [ ] Sensitivity analysis completed
- [ ] Results are reasonable

**Next Step**: Proceed to writing phase
`;
  }

  /**
   * Gather modeling context for writing phase
   */
  async _gatherModelingContext() {
    let context = '## MODELING RESULTS AND ARTIFACTS\n\n';

    try {
      // Get list of all artifacts
      const artifacts = await this.artifactStore.listArtifacts();

      // Read modeling phase results
      const modelingArtifact = artifacts.find(a => a.name === 'modeling-phase-result.md');
      if (modelingArtifact) {
        const content = await this.artifactStore.readArtifact('modeling-phase-result.md');
        context += '### Model Implementation\n\n';
        context += content.substring(0, 5000); // First 5000 chars
        context += '\n\n';
      }

      // Read experiment results
      const experimentArtifact = artifacts.find(a => a.name === 'experiment-results.txt');
      if (experimentArtifact) {
        const content = await this.artifactStore.readArtifact('experiment-results.txt');
        context += '### Experiment Results\n\n';
        context += content;
        context += '\n\n';
      }

      // Read sensitivity analysis
      const sensitivityArtifact = artifacts.find(a => a.name === 'sensitivity-analysis.txt');
      if (sensitivityArtifact) {
        const content = await this.artifactStore.readArtifact('sensitivity-analysis.txt');
        context += '### Sensitivity Analysis\n\n';
        context += content;
        context += '\n\n';
      }

      // Read visualization summary
      const vizArtifact = artifacts.find(a => a.name === 'visualization-summary.txt');
      if (vizArtifact) {
        const content = await this.artifactStore.readArtifact('visualization-summary.txt');
        context += '### Generated Visualizations\n\n';
        context += content;
        context += '\n\n';
      }

      // List available figures
      const fs = await import('fs/promises');
      const path = await import('path');
      const figuresDir = path.join(this.workspace.workspacePath, 'figures');

      try {
        const figureFiles = await fs.readdir(figuresDir);
        const pngFiles = figureFiles.filter(f => f.endsWith('.png'));

        if (pngFiles.length > 0) {
          context += '### Available Figures\n\n';
          context += `Found ${pngFiles.length} figures in figures/ directory:\n\n`;
          pngFiles.forEach(file => {
            context += `- ${file}\n`;
          });
          context += '\n';
        }
      } catch (error) {
        context += '### Available Figures\n\nNo figures directory found.\n\n';
      }

      context += '\n---\n\n';
      context += 'USE THE ABOVE RESULTS AND FIGURES IN YOUR PAPER. Reference specific experiments, findings, and figures.\n\n';

    } catch (error) {
      console.warn('⚠️  Could not gather modeling context:', error.message);
      context += 'Note: Could not load modeling artifacts. Proceed with available information.\n\n';
    }

    return context;
  }

  /**
   * Extract code blocks from LLM message
   */
  _extractCodeFromMessage(message) {
    if (!message) {
      console.warn('⚠️  No message provided to extract code from');
      return null;
    }

    // Try multiple patterns in order of preference
    const patterns = [
      /```python\n([\s\S]*?)```/,      // ```python\n...```
      /```py\n([\s\S]*?)```/,          // ```py\n...```
      /```\n([\s\S]*?)```/              // ```\n...``` (no language)
    ];

    for (const regex of patterns) {
      const match = message.match(regex);
      if (match && match[1] && match[1].trim().length > 0) {
        console.log(`✓ Extracted ${match[1].length} chars of Python code`);
        return match[1];
      }
    }

    console.warn('⚠️  No Python code block found in message (searched for ```python, ```py, and ``` patterns)');
    console.log(`   Message preview: ${message.substring(0, 200)}...`);
    return null;
  }

  /**
   * Format writing results as structured markdown document
   */
  _formatWritingDocument(writingData) {
    return `# AutoMCM Writing Phase Results

**Generated**: ${writingData.timestamp}
**Version**: 1.0
**Status**: Writing Complete

---

## Paper Output

${writingData.paper}

---

## Deliverables Checklist

- [ ] All LaTeX sections are complete
- [ ] References are properly formatted
- [ ] Figures and tables are included
- [ ] Summary sheet is created (if required)
- [ ] Paper compiles without errors
- [ ] Document follows MCM/ICM formatting standards

**Next Step**: Review and compile LaTeX document
`;
  }
}

export default MasterAgent;
