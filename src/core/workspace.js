import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Workspace Manager - Handles workspace creation and file organization
 */
class WorkspaceManager {
  constructor(workspacePath) {
    this.workspacePath = workspacePath;
    this.automcmPath = path.join(workspacePath, 'AUTOMCM.md');
  }

  /**
   * Initialize workspace directory structure
   */
  async initialize(problemData = {}) {
    console.log(`📁 Creating workspace: ${this.workspacePath}`);

    // Create main workspace directory
    await fs.mkdir(this.workspacePath, { recursive: true });

    // Create subdirectories
    const subdirs = [
      'models',      // Python code
      'figures',     // Generated plots
      'sections',    // LaTeX sections
      'references',  // Downloaded papers
      'data',        // Datasets
      'artifacts'    // Misc outputs
    ];

    for (const dir of subdirs) {
      const dirPath = path.join(this.workspacePath, dir);
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`  ✓ Created ${dir}/`);
    }

    // Generate AUTOMCM.md from template
    await this.generateAutomcmFile(problemData);

    // Create initial LaTeX structure
    await this.createLatexStructure();

    console.log('✅ Workspace initialized\n');

    return {
      path: this.workspacePath,
      automcm: this.automcmPath,
      subdirs
    };
  }

  /**
   * Generate AUTOMCM.md from template with problem data
   */
  async generateAutomcmFile(problemData) {
    const templatePath = path.join(__dirname, '../../templates/AUTOMCM_template.md');
    let template = await fs.readFile(templatePath, 'utf8');

    // Replace placeholders
    const replacements = {
      '{PROBLEM_TITLE}': problemData.title || 'Untitled Problem',
      '{CONTEST_TYPE}': problemData.contestType || 'MCM',
      '{YEAR}': problemData.year || new Date().getFullYear(),
      '{PROBLEM_ID}': problemData.problemId || 'TBD',
      '{TIMESTAMP}': new Date().toISOString(),
      '{PROBLEM_DESCRIPTION}': problemData.description || '**Upload the problem PDF to extract the full problem statement to problem.md**'
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      template = template.replace(new RegExp(placeholder, 'g'), value);
    }

    await fs.writeFile(this.automcmPath, template, 'utf8');
    console.log('  ✓ Generated AUTOMCM.md');
  }

  /**
   * Create initial LaTeX file structure
   */
  async createLatexStructure() {
    const mainTexPath = path.join(this.workspacePath, 'paper.tex');

    const mainTex = `\\documentclass[twocolumn]{article}
\\usepackage{amsmath,amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}

% Custom macros (will be populated from AUTOMCM.md)
\\newcommand{\\vect}[1]{\\mathbf{#1}}
\\newcommand{\\norm}[1]{\\left\\lVert#1\\right\\rVert}

\\title{MCM Paper}
\\author{Team}
\\date{\\today}

\\begin{document}

\\maketitle

% Sections will be included here
% \\input{sections/introduction}
% \\input{sections/model}
% \\input{sections/results}
% \\input{sections/conclusion}

\\bibliographystyle{plain}
\\bibliography{references}

\\end{document}
`;

    await fs.writeFile(mainTexPath, mainTex, 'utf8');
    console.log('  ✓ Created paper.tex');
  }

  /**
   * Check if workspace exists
   */
  async exists() {
    try {
      await fs.access(this.workspacePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get workspace info
   */
  async getInfo() {
    const exists = await this.exists();
    if (!exists) {
      return { exists: false };
    }

    const files = await fs.readdir(this.workspacePath);
    const hasAutomcm = files.includes('AUTOMCM.md');

    return {
      exists: true,
      path: this.workspacePath,
      hasAutomcm,
      files
    };
  }
}

export default WorkspaceManager;
