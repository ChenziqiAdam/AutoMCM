/**
 * Problem Analyzer
 * Analyzes MCM problem statements and suggests relevant model archetypes and historical solutions
 */

import TemplateLibrary from './template-library.js';
import MCMDatabase from './mcm-database.js';

class ProblemAnalyzer {
  constructor() {
    this.templateLibrary = new TemplateLibrary();
    this.mcmDatabase = new MCMDatabase();

    // Keyword mapping for problem classification
    this.keywordMap = {
      optimization: ['optimize', 'maximize', 'minimize', 'best', 'optimal', 'efficient', 'improve'],
      differential_equations: ['change over time', 'rate of', 'dynamics', 'growth', 'decay', 'population', 'spread'],
      statistical: ['predict', 'forecast', 'estimate', 'probability', 'likelihood', 'trend', 'correlation'],
      network: ['network', 'graph', 'route', 'path', 'flow', 'connectivity', 'shortest'],
      simulation: ['simulate', 'model behavior', 'scenario', 'what-if', 'Monte Carlo', 'agent'],
      machine_learning: ['learn', 'pattern', 'classify', 'cluster', 'neural', 'predict from data'],
    };
  }

  /**
   * Analyze problem text and suggest approaches
   */
  analyzeProblem(problemText) {
    const text = problemText.toLowerCase();
    const keywords = this.extractKeywords(text);
    const modelTypes = this.identifyModelTypes(text);
    const techniques = this.suggestTechniques(text, modelTypes);
    const historicalSolutions = this.findSimilarSolutions(keywords, modelTypes);
    const archetypes = this.suggestArchetypes(modelTypes);

    return {
      keywords,
      modelTypes,
      techniques,
      archetypes,
      historicalSolutions: historicalSolutions.slice(0, 5), // Top 5
      deliverables: this.identifyDeliverables(text),
      dataNeeds: this.identifyDataNeeds(text),
      complexity: this.assessComplexity(text, modelTypes),
    };
  }

  /**
   * Extract important keywords from problem text
   */
  extractKeywords(text) {
    const keywords = new Set();

    // Domain keywords
    const domainKeywords = [
      'climate', 'energy', 'health', 'economics', 'traffic', 'population',
      'environment', 'sustainability', 'finance', 'ecology', 'urban', 'agriculture',
    ];

    domainKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        keywords.add(keyword);
      }
    });

    // Action keywords
    Object.entries(this.keywordMap).forEach(([category, words]) => {
      words.forEach(word => {
        if (text.includes(word)) {
          keywords.add(category);
        }
      });
    });

    return Array.from(keywords);
  }

  /**
   * Identify likely model types based on problem description
   */
  identifyModelTypes(text) {
    const scores = {};

    Object.entries(this.keywordMap).forEach(([modelType, keywords]) => {
      let score = 0;
      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          score += 1;
        }
      });
      if (score > 0) {
        scores[modelType] = score;
      }
    });

    // Sort by score and return types
    return Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3) // Top 3 model types
      .map(([type, score]) => type);
  }

  /**
   * Suggest specific techniques for identified model types
   */
  suggestTechniques(text, modelTypes) {
    const techniqueMap = {
      optimization: ['linear programming', 'genetic algorithms', 'gradient descent', 'dynamic programming'],
      differential_equations: ['Runge-Kutta methods', 'Euler method', 'system dynamics', 'bifurcation analysis'],
      statistical: ['regression analysis', 'ARIMA', 'hypothesis testing', 'Monte Carlo simulation'],
      network: ['Dijkstra algorithm', 'maximum flow', 'graph theory', 'network analysis'],
      simulation: ['agent-based modeling', 'discrete event simulation', 'system dynamics', 'Monte Carlo'],
      machine_learning: ['neural networks', 'random forests', 'SVM', 'clustering (k-means)'],
    };

    const techniques = new Set();

    modelTypes.forEach(type => {
      if (techniqueMap[type]) {
        techniqueMap[type].forEach(tech => techniques.add(tech));
      }
    });

    // Add context-specific techniques
    if (text.includes('time series') || text.includes('forecast')) {
      techniques.add('ARIMA');
      techniques.add('exponential smoothing');
    }
    if (text.includes('spatial') || text.includes('geographic')) {
      techniques.add('spatial analysis');
      techniques.add('GIS methods');
    }
    if (text.includes('uncertainty') || text.includes('risk')) {
      techniques.add('sensitivity analysis');
      techniques.add('uncertainty quantification');
    }

    return Array.from(techniques).slice(0, 5); // Top 5
  }

  /**
   * Find similar historical solutions
   */
  findSimilarSolutions(keywords, modelTypes) {
    const results = this.mcmDatabase.smartSearch({
      keywords,
      modelType: modelTypes[0], // Use primary model type
    });

    return results;
  }

  /**
   * Suggest relevant archetypes from template library
   */
  suggestArchetypes(modelTypes) {
    const archetypes = [];

    modelTypes.forEach(type => {
      const template = this.templateLibrary.getTemplate(type);
      if (template) {
        archetypes.push({
          type,
          name: template.name,
          description: template.description,
          suitableFor: template.suitableFor,
        });
      }
    });

    return archetypes;
  }

  /**
   * Identify deliverables from problem text
   */
  identifyDeliverables(text) {
    const deliverables = [];

    if (text.includes('model') || text.includes('formulation')) {
      deliverables.push('Mathematical model with clear assumptions');
    }
    if (text.includes('predict') || text.includes('forecast')) {
      deliverables.push('Prediction results with confidence intervals');
    }
    if (text.includes('sensitivity') || text.includes('robust')) {
      deliverables.push('Sensitivity analysis (±20% parameter variation)');
    }
    if (text.includes('visualiz') || text.includes('plot') || text.includes('graph')) {
      deliverables.push('Visualizations (time series, heatmaps, etc.)');
    }
    if (text.includes('recommend') || text.includes('suggest') || text.includes('policy')) {
      deliverables.push('Recommendations and policy implications');
    }

    // Default MCM deliverables
    if (deliverables.length === 0) {
      deliverables.push(
        'Mathematical model',
        'Validation and testing',
        'Results and visualizations',
        'Summary sheet (1 page)'
      );
    }

    return deliverables;
  }

  /**
   * Identify data needs
   */
  identifyDataNeeds(text) {
    const dataNeeds = [];

    // Domain-specific data
    if (text.includes('climate') || text.includes('weather')) {
      dataNeeds.push('Climate data (NOAA, NASA)');
    }
    if (text.includes('population') || text.includes('demographic')) {
      dataNeeds.push('Population data (Census, World Bank)');
    }
    if (text.includes('economic') || text.includes('finance') || text.includes('market')) {
      dataNeeds.push('Economic data (Federal Reserve, World Bank)');
    }
    if (text.includes('health') || text.includes('disease') || text.includes('epidemic')) {
      dataNeeds.push('Health data (WHO, CDC)');
    }
    if (text.includes('traffic') || text.includes('transport')) {
      dataNeeds.push('Transportation data (DOT, local transit authorities)');
    }
    if (text.includes('energy')) {
      dataNeeds.push('Energy data (EIA, IEA)');
    }

    if (dataNeeds.length === 0) {
      dataNeeds.push('Domain-specific datasets', 'Historical data for validation');
    }

    return dataNeeds;
  }

  /**
   * Assess problem complexity
   */
  assessComplexity(text, modelTypes) {
    let complexity = 'medium';

    // Indicators of high complexity
    if (modelTypes.length > 2) {
      complexity = 'high'; // Multiple model types needed
    }
    if (text.includes('multi-objective') || text.includes('trade-off')) {
      complexity = 'high';
    }
    if (text.includes('stochastic') || text.includes('uncertainty') || text.includes('random')) {
      complexity = 'high';
    }
    if (text.includes('nonlinear') || text.includes('chaotic')) {
      complexity = 'high';
    }

    // Indicators of low complexity
    if (modelTypes.length === 1 && (modelTypes[0] === 'optimization' || modelTypes[0] === 'statistical')) {
      complexity = 'medium';
    }
    if (text.includes('simple') || text.includes('basic') || text.includes('introductory')) {
      complexity = 'low';
    }

    return complexity;
  }

  /**
   * Generate a structured problem summary
   */
  generateSummary(analysis) {
    // Ensure all arrays exist with defaults
    const modelTypes = analysis.modelTypes || [];
    const keywords = analysis.keywords || [];
    const archetypes = analysis.archetypes || [];
    const techniques = analysis.techniques || [];
    const deliverables = analysis.deliverables || [];
    const dataNeeds = analysis.dataNeeds || [];
    const historicalSolutions = analysis.historicalSolutions || [];

    return `
# Problem Analysis Summary

## Identified Characteristics
- **Model Types**: ${modelTypes.join(', ') || 'Not identified'}
- **Complexity**: ${analysis.complexity || 'medium'}
- **Keywords**: ${keywords.join(', ') || 'None'}

## Suggested Approaches
${archetypes.length > 0 ? archetypes.map(a => `- **${a.name}**: ${a.description}`).join('\n') : '- No specific archetypes identified'}

## Recommended Techniques
${techniques.length > 0 ? techniques.map(t => `- ${t}`).join('\n') : '- Basic modeling techniques'}

## Deliverables
${deliverables.length > 0 ? deliverables.map(d => `- [ ] ${d}`).join('\n') : '- [ ] Mathematical model\n- [ ] Validation and testing\n- [ ] Results and visualizations'}

## Data Requirements
${dataNeeds.length > 0 ? dataNeeds.map(d => `- ${d}`).join('\n') : '- Domain-specific datasets'}

## Similar Historical Solutions
${historicalSolutions.length > 0 ? historicalSolutions.map(sol =>
  `- **${sol.title}** (${sol.year}, ${sol.award}): ${sol.summary}`
).join('\n') : '- No similar solutions found in database'}
    `.trim();
  }
}

export default ProblemAnalyzer;
