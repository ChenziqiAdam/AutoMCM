import BaseAgent from './base-agent.js';
import WebSearch from '../tools/web-search.js';
import TemplateLibrary from '../core/template-library.js';

/**
 * Researcher Agent - Specialized for finding papers, data, and approaches
 */
class ResearcherAgent extends BaseAgent {
  constructor(config = {}) {
    super('researcher');
    this.webSearch = new WebSearch({
      maxResults: config.maxResults || 10,
      serpapiKey: config.serpapiKey
    });
    this.templateLibrary = new TemplateLibrary();
    this.enableRealSearch = config.enableRealSearch !== false;
  }

  /**
   * Research a problem and provide recommendations
   */
  async researchProblem(problemStatement) {
    console.log('\n🔬 RESEARCHER MODE: Analyzing problem...\n');

    const research = {
      problemAnalysis: null,
      suggestedArchetypes: null,
      papers: null,
      datasets: null,
      historicalSolutions: null,
      recommendations: null
    };

    // Step 1: Analyze problem type
    console.log('Step 1: Identifying problem type...');
    research.suggestedArchetypes = this.templateLibrary.suggestArchetype(problemStatement);

    if (research.suggestedArchetypes.primary) {
      console.log(`✓ Primary type: ${research.suggestedArchetypes.primary.archetype}`);
      console.log(`  Confidence: ${(research.suggestedArchetypes.primary.confidence * 100).toFixed(0)}%`);
    }

    // Step 2: Search for relevant papers
    console.log('\nStep 2: Searching for academic papers...');
    const keywords = this._extractKeywords(problemStatement);

    // Try arXiv first (free API), then fallback to simulated
    if (this.enableRealSearch) {
      try {
        const arxivPapers = await this.webSearch.searchArxiv(keywords.join(' '));
        research.papers = { results: arxivPapers, count: arxivPapers.length, query: keywords.join(' ') };
        console.log(`✓ Retrieved ${arxivPapers.length} papers from arXiv`);
      } catch (error) {
        console.warn(`⚠️ Real search failed, using simulated: ${error.message}`);
        research.papers = await this.webSearch.searchPapers(keywords.join(' '));
      }
    } else {
      research.papers = await this.webSearch.searchPapers(keywords.join(' '));
    }

    if (research.papers.results.length > 0) {
      console.log(`✓ Found ${research.papers.results.length} relevant papers`);

      // Extract techniques from papers
      const techniques = this.webSearch.extractTechniques(research.papers.results);
      console.log(`  Identified techniques: ${techniques.slice(0, 3).join(', ')}`);
    }

    // Step 3: Find relevant datasets
    console.log('\nStep 3: Finding relevant datasets...');
    research.datasets = await this.webSearch.findDatasets(keywords);
    console.log(`✓ Found ${research.datasets.datasets.length} potential data sources`);

    // Step 4: Search historical MCM solutions
    console.log('\nStep 4: Searching historical MCM solutions...');
    research.historicalSolutions = await this.webSearch.searchMCMSolutions();
    console.log(`✓ Found ${research.historicalSolutions.solutions.length} similar solutions`);

    // Step 5: Generate recommendations
    console.log('\nStep 5: Generating recommendations...');
    if (research.suggestedArchetypes.primary) {
      research.recommendations = this.templateLibrary.generateRecommendations(
        research.suggestedArchetypes.primary.type,
        problemStatement
      );
      console.log('✓ Recommendations generated');
    }

    console.log('\n✅ Research complete\n');

    return research;
  }

  /**
   * Format research findings for display
   */
  formatFindings(research) {
    let report = '\n' + '='.repeat(70) + '\n';
    report += 'RESEARCH FINDINGS\n';
    report += '='.repeat(70) + '\n\n';

    // Problem Type
    if (research.suggestedArchetypes?.primary) {
      const primary = research.suggestedArchetypes.primary;
      report += '📊 PROBLEM TYPE\n';
      report += '-'.repeat(70) + '\n';
      report += `Primary: ${primary.archetype}\n`;
      report += `Confidence: ${(primary.confidence * 100).toFixed(0)}%\n\n`;

      report += 'Recommended Techniques:\n';
      primary.techniques.slice(0, 5).forEach((tech, i) => {
        report += `  ${i + 1}. ${tech}\n`;
      });
      report += '\n';
    }

    // Papers
    if (research.papers?.results?.length > 0) {
      report += '📚 RELEVANT PAPERS (Top 3)\n';
      report += '-'.repeat(70) + '\n';

      research.papers.results.slice(0, 3).forEach((paper, i) => {
        report += `${i + 1}. ${paper.title}\n`;
        report += `   ${paper.authors.join(', ')} (${paper.year})\n`;
        report += `   ${paper.venue}\n`;
        report += `   Citations: ${paper.citations} | Relevance: ${(paper.relevanceScore * 100).toFixed(0)}%\n\n`;
      });
    }

    // Datasets
    if (research.datasets?.datasets?.length > 0) {
      report += '📊 RECOMMENDED DATASETS (Top 3)\n';
      report += '-'.repeat(70) + '\n';

      research.datasets.datasets.slice(0, 3).forEach((ds, i) => {
        report += `${i + 1}. ${ds.name}\n`;
        report += `   URL: ${ds.url}\n`;
        report += `   Categories: ${ds.categories.join(', ')}\n`;
        report += `   Format: ${ds.format}\n\n`;
      });
    }

    // Historical Solutions
    if (research.historicalSolutions?.solutions?.length > 0) {
      report += '🏆 SIMILAR MCM SOLUTIONS\n';
      report += '-'.repeat(70) + '\n';

      research.historicalSolutions.solutions.forEach((sol, i) => {
        report += `${i + 1}. ${sol.year} Problem ${sol.problem}: ${sol.title}\n`;
        report += `   Award: ${sol.award}\n`;
        report += `   Approach: ${sol.approach}\n`;
        report += `   Techniques: ${sol.keyTechniques.join(', ')}\n\n`;
      });
    }

    // Recommendations
    if (research.recommendations) {
      report += '💡 RECOMMENDATIONS\n';
      report += '-'.repeat(70) + '\n';
      report += `Model Type: ${research.recommendations.modelType}\n\n`;

      if (research.recommendations.tips?.length > 0) {
        report += 'Tips:\n';
        research.recommendations.tips.forEach((tip, i) => {
          report += `  ${i + 1}. ${tip}\n`;
        });
        report += '\n';
      }

      if (research.recommendations.commonPitfalls?.length > 0) {
        report += 'Common Pitfalls to Avoid:\n';
        research.recommendations.commonPitfalls.forEach((pitfall, i) => {
          report += `  ⚠️  ${pitfall}\n`;
        });
        report += '\n';
      }
    }

    report += '='.repeat(70) + '\n';

    return report;
  }

  /**
   * Extract keywords from problem statement
   */
  _extractKeywords(text) {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'should', 'could', 'may', 'might', 'must', 'can'
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));

    // Count frequency
    const freq = {};
    words.forEach(word => {
      freq[word] = (freq[word] || 0) + 1;
    });

    // Get top keywords
    const sorted = Object.entries(freq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);

    return sorted;
  }

  /**
   * Generate bibliography from papers
   */
  generateBibliography(papers) {
    return papers.map((paper, i) => {
      return this.webSearch.generateBibtex(paper, `ref${i + 1}`);
    }).join('\n\n');
  }
}

export default ResearcherAgent;
