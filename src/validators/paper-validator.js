/**
 * Paper Validator - Validates MCM paper completeness and quality
 */
class PaperValidator {
  constructor() {
    this.minPages = 12;
    this.targetPages = 15;
    this.maxPages = 25;
    this.minFigures = 4;
    this.minTables = 2;
    this.minEquations = 5;
    this.minReferences = 5;
  }

  /**
   * Validate complete paper for MCM submission
   */
  validatePaper(latexContent) {
    const results = {
      valid: true,
      score: 0,
      maxScore: 100,
      checks: [],
      warnings: [],
      errors: [],
      metrics: {}
    };

    // Run all validation checks
    this._checkPageCount(latexContent, results);
    this._checkStructure(latexContent, results);
    this._checkFigures(latexContent, results);
    this._checkTables(latexContent, results);
    this._checkEquations(latexContent, results);
    this._checkReferences(latexContent, results);
    this._checkSections(latexContent, results);
    this._checkQuality(latexContent, results);

    // Calculate final score
    results.score = this._calculateScore(results.checks);
    results.valid = results.errors.length === 0 && results.score >= 70;

    return results;
  }

  /**
   * Check estimated page count
   */
  _checkPageCount(content, results) {
    const wordCount = content.split(/\s+/).length;
    const estimatedPages = Math.ceil(wordCount / 450); // ~450 words per page

    results.metrics.wordCount = wordCount;
    results.metrics.estimatedPages = estimatedPages;

    if (estimatedPages < this.minPages) {
      results.errors.push(`Paper too short: ${estimatedPages} pages (minimum: ${this.minPages})`);
      results.checks.push({ name: 'Page Count', pass: false, score: 0 });
    } else if (estimatedPages < this.targetPages) {
      results.warnings.push(`Paper below target: ${estimatedPages} pages (target: ${this.targetPages})`);
      results.checks.push({ name: 'Page Count', pass: true, score: 10 });
    } else if (estimatedPages > this.maxPages) {
      results.warnings.push(`Paper very long: ${estimatedPages} pages (max: ${this.maxPages})`);
      results.checks.push({ name: 'Page Count', pass: true, score: 15 });
    } else {
      results.checks.push({ name: 'Page Count', pass: true, score: 20 });
    }
  }

  /**
   * Check document structure
   */
  _checkStructure(content, results) {
    let score = 0;
    const hasDocumentClass = /\\documentclass/.test(content);
    const hasBeginDocument = /\\begin\{document\}/.test(content);
    const hasEndDocument = /\\end\{document\}/.test(content);
    const hasTitle = /\\title\{/.test(content);
    const hasAbstract = /\\begin\{abstract\}|\\section\*?\{Summary\}/.test(content);

    if (!hasDocumentClass || !hasBeginDocument || !hasEndDocument) {
      results.errors.push('Invalid LaTeX document structure');
      results.checks.push({ name: 'Document Structure', pass: false, score: 0 });
      return;
    }

    if (hasTitle) score += 2;
    if (hasAbstract) score += 3;

    results.checks.push({ name: 'Document Structure', pass: true, score: 5 + score });
  }

  /**
   * Check figures
   */
  _checkFigures(content, results) {
    const figureMatches = content.match(/\\begin\{figure\}/g) || [];
    const figureCount = figureMatches.length;
    const includegraphicsCount = (content.match(/\\includegraphics/g) || []).length;
    const figureRefs = (content.match(/\\ref\{fig:/g) || []).length;

    results.metrics.figureCount = figureCount;
    results.metrics.includegraphicsCount = includegraphicsCount;
    results.metrics.figureReferences = figureRefs;

    if (figureCount < this.minFigures) {
      results.errors.push(`Insufficient figures: ${figureCount} (minimum: ${this.minFigures})`);
      results.checks.push({ name: 'Figures', pass: false, score: 0 });
    } else {
      let score = 15;
      if (figureCount >= 6) score += 5; // Bonus for more figures
      if (figureRefs >= figureCount * 0.8) score += 5; // Bonus if most figures are referenced
      results.checks.push({ name: 'Figures', pass: true, score });
    }

    // Check if figures have captions
    const captionCount = (content.match(/\\caption\{/g) || []).length;
    if (captionCount < figureCount) {
      results.warnings.push(`Some figures missing captions (${captionCount}/${figureCount})`);
    }
  }

  /**
   * Check tables
   */
  _checkTables(content, results) {
    const tableCount = (content.match(/\\begin\{table\}|\\begin\{tabular\}/g) || []).length;

    results.metrics.tableCount = tableCount;

    if (tableCount < this.minTables) {
      results.warnings.push(`Few tables: ${tableCount} (recommended: ${this.minTables}+)`);
      results.checks.push({ name: 'Tables', pass: true, score: 5 });
    } else {
      results.checks.push({ name: 'Tables', pass: true, score: 10 });
    }
  }

  /**
   * Check equations
   */
  _checkEquations(content, results) {
    const equationCount = (content.match(/\\begin\{equation\}|\\begin\{align\}/g) || []).length;
    const inlineMathCount = (content.match(/\$[^$]+\$/g) || []).length;

    results.metrics.equationCount = equationCount;
    results.metrics.inlineMathCount = inlineMathCount;

    if (equationCount < this.minEquations) {
      results.warnings.push(`Few numbered equations: ${equationCount} (recommended: ${this.minEquations}+)`);
      results.checks.push({ name: 'Equations', pass: true, score: 5 });
    } else {
      results.checks.push({ name: 'Equations', pass: true, score: 10 });
    }

    // Check if equations are labeled
    const labelCount = (content.match(/\\label\{eq:/g) || []).length;
    if (labelCount < equationCount * 0.5) {
      results.warnings.push('Consider labeling more equations for referencing');
    }
  }

  /**
   * Check references/bibliography
   */
  _checkReferences(content, results) {
    const hasBibliography = /\\bibliography\{|\\begin\{thebibliography\}/.test(content);
    const citeCount = (content.match(/\\cite\{/g) || []).length;

    results.metrics.citationCount = citeCount;
    results.metrics.hasBibliography = hasBibliography;

    if (!hasBibliography) {
      results.warnings.push('No bibliography section found');
      results.checks.push({ name: 'References', pass: true, score: 3 });
    } else if (citeCount < this.minReferences) {
      results.warnings.push(`Few citations: ${citeCount} (recommended: ${this.minReferences}+)`);
      results.checks.push({ name: 'References', pass: true, score: 5 });
    } else {
      results.checks.push({ name: 'References', pass: true, score: 10 });
    }
  }

  /**
   * Check required sections
   */
  _checkSections(content, results) {
    const sections = {
      introduction: /\\section\*?\{.*[Ii]ntroduction.*\}/,
      model: /\\section\*?\{.*[Mm]odel.*\}|\\section\*?\{.*[Mm]ethodology.*\}/,
      results: /\\section\*?\{.*[Rr]esult.*\}|\\section\*?\{.*[Ee]xperiment.*\}/,
      conclusion: /\\section\*?\{.*[Cc]onclusion.*\}/,
      assumptions: /\\section\*?\{.*[Aa]ssumption.*\}/
    };

    const sectionCount = (content.match(/\\section/g) || []).length;
    results.metrics.sectionCount = sectionCount;

    let foundSections = 0;
    let missingSections = [];

    for (const [name, pattern] of Object.entries(sections)) {
      if (pattern.test(content)) {
        foundSections++;
      } else {
        missingSections.push(name);
      }
    }

    if (missingSections.length > 0) {
      results.warnings.push(`Missing recommended sections: ${missingSections.join(', ')}`);
    }

    if (foundSections >= 4) {
      results.checks.push({ name: 'Required Sections', pass: true, score: 15 });
    } else {
      results.errors.push(`Missing critical sections: ${missingSections.slice(0, 3).join(', ')}`);
      results.checks.push({ name: 'Required Sections', pass: false, score: 5 });
    }
  }

  /**
   * Check overall quality indicators
   */
  _checkQuality(content, results) {
    let score = 0;

    // Check for packages
    const hasAmsmath = /\\usepackage\{amsmath\}/.test(content);
    const hasGraphicx = /\\usepackage\{graphicx\}/.test(content);
    if (hasAmsmath && hasGraphicx) score += 2;

    // Check for proper formatting
    const hasProperSpacing = /\\begin\{document\}\s*\n\s*\n/.test(content);
    if (hasProperSpacing) score += 1;

    // Check content density (not too sparse)
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 200) score += 2; // Good content density

    // Check for lists (indicates structured content)
    const hasLists = /\\begin\{itemize\}|\\begin\{enumerate\}/.test(content);
    if (hasLists) score += 2;

    // Check for subsections (indicates detailed structure)
    const subsectionCount = (content.match(/\\subsection/g) || []).length;
    if (subsectionCount >= 5) score += 3;

    results.checks.push({ name: 'Quality Indicators', pass: true, score });
  }

  /**
   * Calculate total score
   */
  _calculateScore(checks) {
    return checks.reduce((sum, check) => sum + check.score, 0);
  }

  /**
   * Generate validation report
   */
  generateReport(validationResults) {
    let report = '='.repeat(70) + '\n';
    report += 'MCM PAPER VALIDATION REPORT\n';
    report += '='.repeat(70) + '\n\n';

    report += `Overall Status: ${validationResults.valid ? '✅ READY FOR SUBMISSION' : '❌ NEEDS IMPROVEMENT'}\n`;
    report += `Quality Score: ${validationResults.score}/${validationResults.maxScore}\n\n`;

    report += 'METRICS:\n';
    report += '-'.repeat(70) + '\n';
    for (const [key, value] of Object.entries(validationResults.metrics)) {
      const displayKey = key.replace(/([A-Z])/g, ' $1').toLowerCase();
      report += `  ${displayKey}: ${value}\n`;
    }

    if (validationResults.errors.length > 0) {
      report += '\n❌ ERRORS (MUST FIX):\n';
      report += '-'.repeat(70) + '\n';
      validationResults.errors.forEach((err, i) => {
        report += `  ${i + 1}. ${err}\n`;
      });
    }

    if (validationResults.warnings.length > 0) {
      report += '\n⚠️  WARNINGS (RECOMMENDED):\n';
      report += '-'.repeat(70) + '\n';
      validationResults.warnings.forEach((warn, i) => {
        report += `  ${i + 1}. ${warn}\n`;
      });
    }

    report += '\nDETAILED CHECKS:\n';
    report += '-'.repeat(70) + '\n';
    validationResults.checks.forEach(check => {
      const status = check.pass ? '✓' : '✗';
      report += `  ${status} ${check.name}: ${check.score} points\n`;
    });

    report += '\n' + '='.repeat(70) + '\n';

    return report;
  }

  /**
   * Quick validation for paper expansion decision
   */
  needsExpansion(latexContent) {
    const wordCount = latexContent.split(/\s+/).length;
    const estimatedPages = Math.ceil(wordCount / 450);
    const figureCount = (latexContent.match(/\\begin\{figure\}/g) || []).length;
    const hasExperimentalSection = /\\section\{.*[Ee]xperiment.*\}|\\section\{.*[Rr]esult.*\}|\\section\{.*[Vv]alidation.*\}/.test(latexContent);

    return {
      needsExpansion: estimatedPages < this.minPages || figureCount < this.minFigures || !hasExperimentalSection,
      estimatedPages,
      figureCount,
      hasExperimentalSection,
      reasons: [
        estimatedPages < this.minPages ? `Too short (${estimatedPages} pages)` : null,
        figureCount < this.minFigures ? `Insufficient figures (${figureCount})` : null,
        !hasExperimentalSection ? 'Missing experimental validation' : null
      ].filter(Boolean)
    };
  }
}

export default PaperValidator;
