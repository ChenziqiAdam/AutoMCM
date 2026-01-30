import BaseAgent from './base-agent.js';
import LatexCompiler from '../tools/latex-compiler.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Writer Agent - Specialized for writing and compiling LaTeX papers
 */
class WriterAgent extends BaseAgent {
  constructor(workspacePath) {
    super('writer');
    this.workspacePath = workspacePath;
    this.compiler = new LatexCompiler(workspacePath);
  }

  /**
   * Initialize LaTeX environment
   */
  async initialize() {
    const hasLatex = await this.compiler.checkInstallation();

    if (hasLatex) {
      const version = await this.compiler.getVersion();
      console.log(`✓ LaTeX available: ${version}`);
      return true;
    } else {
      console.log('⚠️  LaTeX not found. Install pdflatex or configure engine.');
      return false;
    }
  }

  /**
   * Generate LaTeX section
   */
  generateSection(sectionName, content, equations = []) {
    console.log(`\n📝 WRITER MODE: Generating ${sectionName} section...\n`);

    let latex = `\\section{${sectionName}}\n\n`;
    latex += content + '\n\n';

    // Add equations
    if (equations.length > 0) {
      equations.forEach((eq, i) => {
        latex += `\\begin{equation}\n`;
        latex += `  ${eq.latex}\n`;
        if (eq.label) {
          latex += `  \\label{${eq.label}}\n`;
        }
        latex += `\\end{equation}\n\n`;

        if (eq.description) {
          latex += `where ${eq.description}\n\n`;
        }
      });
    }

    return latex;
  }

  /**
   * Scan figures directory and get all available figures
   */
  async scanFiguresDirectory() {
    try {
      const figuresPath = path.join(this.workspacePath, 'figures');
      const files = await fs.readdir(figuresPath);
      const figures = files
        .filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.pdf'))
        .map((f, idx) => ({
          filename: f,
          path: `figures/${f}`,
          label: f.replace(/\.(png|jpg|pdf)$/, '').replace(/[_-]/g, '_'),
          caption: this._generateFigureCaption(f),
          number: idx + 1
        }));
      return figures;
    } catch (error) {
      console.warn('⚠️  Could not scan figures directory:', error.message);
      return [];
    }
  }

  /**
   * Generate descriptive caption from filename
   */
  _generateFigureCaption(filename) {
    const name = filename.replace(/\.(png|jpg|pdf)$/, '');
    const words = name.split(/[_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1));
    return words.join(' ');
  }

  /**
   * Create complete paper structure
   */
  async generatePaper(problemTitle, sections, automcmParser) {
    console.log('\n📄 WRITER MODE: Generating complete paper...\n');

    // Get metadata from AUTOMCM.md
    const variables = automcmParser.getVariableRegistry();
    const assumptions = automcmParser.getAssumptions();

    // Scan for available figures
    const availableFigures = await this.scanFiguresDirectory();
    console.log(`   Found ${availableFigures.length} figures to include\n`);

    // Build LaTeX document
    let latex = this._generatePreamble();

    latex += `\\title{${problemTitle}}\n`;
    latex += `\\author{Team}\n`;
    latex += `\\date{\\today}\n\n`;

    latex += `\\begin{document}\n\n`;
    latex += `\\maketitle\n\n`;

    // Abstract/Summary
    if (sections.summary) {
      latex += `\\begin{abstract}\n${sections.summary}\n\\end{abstract}\n\n`;
    }

    // Table of contents (optional)
    // latex += `\\tableofcontents\n\\newpage\n\n`;

    // Main sections
    if (sections.introduction) {
      latex += this.generateSection('Introduction', sections.introduction);
    }

    if (sections.assumptions) {
      latex += `\\section{Assumptions}\n\n`;
      latex += `We make the following assumptions:\n\n`;
      latex += `\\begin{enumerate}\n`;
      assumptions.forEach(a => {
        latex += `  \\item ${a.text}\n`;
      });
      latex += `\\end{enumerate}\n\n`;
    }

    if (sections.model) {
      latex += this.generateSection('Mathematical Model', sections.model.content, sections.model.equations);
    }

    if (sections.results) {
      latex += this.generateSection('Results', sections.results);
    }

    // Include all available figures
    if (availableFigures.length > 0) {
      latex += this._generateAllFiguresSection(availableFigures);
    }

    if (sections.conclusion) {
      latex += this.generateSection('Conclusion', sections.conclusion);
    }

    // Variables table
    latex += this._generateVariableTable(variables);

    // References
    latex += `\n\\bibliographystyle{plain}\n`;
    latex += `\\bibliography{references}\n\n`;

    latex += `\\end{document}\n`;

    // Save to file
    const paperPath = path.join(this.workspacePath, 'paper.tex');
    await fs.writeFile(paperPath, latex, 'utf8');

    console.log(`✓ Paper saved: ${paperPath}`);

    return {
      path: paperPath,
      latex
    };
  }

  /**
   * Generate LaTeX preamble
   */
  _generatePreamble() {
    return `\\documentclass[12pt]{article}

% Packages
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{booktabs}
\\usepackage{geometry}
\\usepackage{cite}

% Page layout
\\geometry{
  a4paper,
  margin=1in
}

% Custom commands
\\newcommand{\\vect}[1]{\\mathbf{#1}}
\\newcommand{\\norm}[1]{\\left\\lVert#1\\right\\rVert}
\\newcommand{\\abs}[1]{\\left|#1\\right|}

`;
  }

  /**
   * Generate comprehensive figures section
   */
  _generateAllFiguresSection(figures) {
    if (figures.length === 0) return '';

    let latex = `\\section{Visualizations and Graphical Analysis}\n\n`;
    latex += `This section presents the comprehensive visualizations generated from our model experiments and analysis.\n\n`;

    figures.forEach((fig, idx) => {
      latex += `\\subsection{${fig.caption}}\n\n`;
      latex += `Figure~\\ref{fig:${fig.label}} shows the ${fig.caption.toLowerCase()}. `;
      latex += `This visualization provides insights into the model behavior and validates our theoretical predictions.\n\n`;

      latex += `\\begin{figure}[htbp]\n`;
      latex += `  \\centering\n`;
      latex += `  \\includegraphics[width=0.85\\textwidth]{${fig.path}}\n`;
      latex += `  \\caption{${fig.caption}}\n`;
      latex += `  \\label{fig:${fig.label}}\n`;
      latex += `\\end{figure}\n\n`;

      // Add detailed analysis placeholder
      latex += `The results shown in Figure~\\ref{fig:${fig.label}} demonstrate [TODO: Add detailed analysis of this figure]. `;
      latex += `Key observations include:\n`;
      latex += `\\begin{itemize}\n`;
      latex += `  \\item Observation 1: [TODO: Describe first key finding]\n`;
      latex += `  \\item Observation 2: [TODO: Describe second key finding]\n`;
      latex += `  \\item Observation 3: [TODO: Describe implications]\n`;
      latex += `\\end{itemize}\n\n`;
    });

    return latex;
  }

  /**
   * Generate variable table
   */
  _generateVariableTable(variables) {
    if (variables.length === 0) return '';

    let latex = `\\section*{Nomenclature}\n\n`;
    latex += `\\begin{table}[h]\n`;
    latex += `\\centering\n`;
    latex += `\\begin{tabular}{cll}\n`;
    latex += `\\toprule\n`;
    latex += `Symbol & Definition & Units \\\\\n`;
    latex += `\\midrule\n`;

    variables.forEach(v => {
      const symbol = v.symbol.replace(/_/g, '\\_');
      latex += `$${symbol}$ & ${v.definition} & ${v.units} \\\\\n`;
    });

    latex += `\\bottomrule\n`;
    latex += `\\end{tabular}\n`;
    latex += `\\caption{Variables and their definitions}\n`;
    latex += `\\end{table}\n\n`;

    return latex;
  }

  /**
   * Compile paper to PDF
   */
  async compilePaper(texFile = null) {
    console.log('\n🔨 WRITER MODE: Compiling LaTeX to PDF...\n');

    const paperPath = texFile || path.join(this.workspacePath, 'paper.tex');

    try {
      const result = await this.compiler.compile(paperPath);

      if (result.success) {
        console.log('\n✅ PDF generated successfully!\n');

        const pdfPath = paperPath.replace('.tex', '.pdf');
        console.log(`📄 PDF: ${pdfPath}`);

        return {
          success: true,
          pdfPath
        };
      } else {
        console.log('\n❌ Compilation failed\n');

        // Parse and display errors
        const errorReport = this.compiler.generateErrorReport(result.errors);

        console.log('Errors found:');
        errorReport.errors.forEach((err, i) => {
          console.log(`\n${i + 1}. ${err.type}: ${err.message}`);
          console.log(`   Suggestion: ${err.suggestion}`);
        });

        return {
          success: false,
          errors: result.errors,
          errorReport
        };
      }
    } catch (error) {
      console.log('\n❌ Compilation error\n');
      console.log(error.message || error.error);

      return {
        success: false,
        error: error.message || error.error
      };
    }
  }

  /**
   * Generate figure inclusion code
   */
  generateFigureCode(figurePath, caption, label) {
    return `
\\begin{figure}[h]
  \\centering
  \\includegraphics[width=0.8\\textwidth]{${figurePath}}
  \\caption{${caption}}
  \\label{fig:${label}}
\\end{figure}
`.trim();
  }

  /**
   * Generate table from data
   */
  generateTable(headers, rows, caption, label) {
    const numCols = headers.length;
    const colSpec = 'c'.repeat(numCols);

    let latex = `\\begin{table}[h]\n`;
    latex += `\\centering\n`;
    latex += `\\begin{tabular}{${colSpec}}\n`;
    latex += `\\toprule\n`;
    latex += headers.join(' & ') + ' \\\\\n';
    latex += `\\midrule\n`;

    rows.forEach(row => {
      latex += row.join(' & ') + ' \\\\\n';
    });

    latex += `\\bottomrule\n`;
    latex += `\\end{tabular}\n`;
    latex += `\\caption{${caption}}\n`;
    latex += `\\label{tab:${label}}\n`;
    latex += `\\end{table}\n`;

    return latex;
  }

  /**
   * Clean auxiliary files
   */
  async cleanAuxFiles() {
    console.log('\n🧹 Cleaning auxiliary files...\n');
    await this.compiler.cleanAuxFiles();
  }

  /**
   * Fix common LaTeX errors automatically
   */
  async autoFixErrors(texContent, errors) {
    let fixed = texContent;

    for (const error of errors) {
      // Fix missing $ in math mode
      if (error.message.includes('Missing $')) {
        // This is simplified - real implementation would be more sophisticated
        fixed = this._fixMathMode(fixed);
      }

      // Fix undefined control sequences
      if (error.message.includes('Undefined control sequence')) {
        // Extract command name and suggest package
        const match = error.message.match(/\\([a-zA-Z]+)/);
        if (match) {
          console.log(`⚠️  Undefined command: \\${match[1]}`);
          console.log(`   Try adding: \\usepackage{...}`);
        }
      }
    }

    return fixed;
  }

  /**
   * Fix math mode delimiters (simplified)
   */
  _fixMathMode(content) {
    // This is a very basic implementation
    // Real implementation would use proper parsing

    // Ensure equation environments are properly closed
    const lines = content.split('\n');
    const fixed = [];

    lines.forEach(line => {
      // Check for common patterns that need math mode
      if (line.match(/[a-zA-Z]\^[0-9]/) && !line.includes('$')) {
        // Likely needs math mode
        fixed.push('$' + line + '$');
      } else {
        fixed.push(line);
      }
    });

    return fixed.join('\n');
  }

  /**
   * Generate summary sheet (1-page overview)
   */
  async generateSummarySheet(title, summary, keyResults) {
    const latex = `\\documentclass[12pt]{article}
\\usepackage{geometry}
\\geometry{a4paper, margin=0.75in}
\\usepackage{graphicx}

\\title{${title}}
\\author{Team}
\\date{\\today}

\\begin{document}
\\maketitle

\\section*{Summary}
${summary}

\\section*{Key Results}
\\begin{itemize}
${keyResults.map(r => `  \\item ${r}`).join('\n')}
\\end{itemize}

\\end{document}
`.trim();

    const summaryPath = path.join(this.workspacePath, 'summary.tex');
    await fs.writeFile(summaryPath, latex, 'utf8');

    console.log(`✓ Summary sheet saved: ${summaryPath}`);

    return summaryPath;
  }
}

export default WriterAgent;
