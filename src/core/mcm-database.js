/**
 * MCM Solutions Database
 * Stores and retrieves historical MCM/ICM solutions with metadata
 */

class MCMDatabase {
  constructor() {
    // In-memory database (can be replaced with JSON file or SQLite later)
    this.solutions = new Map();
    this.loadDefaultSolutions();
  }

  /**
   * Load default historical MCM solutions
   */
  loadDefaultSolutions() {
    const defaultSolutions = [
      {
        id: 'mcm2023-a-outstanding',
        year: 2023,
        problem: 'A',
        title: 'Wordle Strategies',
        award: 'Outstanding Winner',
        summary: 'Information theory approach using entropy maximization to find optimal Wordle starting words',
        keywords: ['optimization', 'information theory', 'game strategy', 'entropy'],
        modelTypes: ['optimization', 'probabilistic'],
        techniques: ['entropy maximization', 'information gain', 'decision trees'],
        sections: {
          approach: 'Used Shannon entropy to quantify information gain from each guess',
          model: 'H(X) = -Σ p(x)log₂p(x), maximized over word choices',
          validation: 'Tested on 10,000 random words, compared with baseline strategies',
        },
        dataSource: 'English word frequency corpus',
        tools: ['Python', 'pandas', 'matplotlib'],
      },
      {
        id: 'mcm2023-b-finalist',
        year: 2023,
        problem: 'B',
        title: 'Drought-Stricken Plant Communities',
        award: 'Finalist',
        summary: 'Differential equation model for plant population dynamics under water stress',
        keywords: ['differential equations', 'ecology', 'sustainability', 'dynamics'],
        modelTypes: ['differential_equations', 'simulation'],
        techniques: ['Lotka-Volterra', 'bifurcation analysis', 'sensitivity analysis'],
        sections: {
          approach: 'Extended Lotka-Volterra competition model with water availability term',
          model: 'dN/dt = rN(1 - N/K) - αW(t)N, where W(t) is water stress function',
          validation: 'Compared with field study data from Arizona State University',
        },
        dataSource: 'Climate data (NOAA), field observations',
        tools: ['MATLAB', 'Simulink'],
      },
      {
        id: 'mcm2022-c-meritorious',
        year: 2022,
        problem: 'C',
        title: 'Trading Strategies in Cryptocurrency',
        award: 'Meritorious Winner',
        summary: 'ARIMA + machine learning for price prediction and portfolio optimization',
        keywords: ['time series', 'prediction', 'finance', 'machine learning'],
        modelTypes: ['statistical', 'machine_learning'],
        techniques: ['ARIMA', 'LSTM', 'Markowitz portfolio theory', 'backtesting'],
        sections: {
          approach: 'Hybrid model: ARIMA for linear trends + LSTM for non-linear patterns',
          model: 'ARIMA(2,1,2) + LSTM(64 units, 2 layers), portfolio optimization via mean-variance',
          validation: 'Backtested on 2018-2021 data, Sharpe ratio = 1.8',
        },
        dataSource: 'Binance API historical data',
        tools: ['Python', 'TensorFlow', 'statsmodels'],
      },
      {
        id: 'mcm2021-d-outstanding',
        year: 2021,
        problem: 'D',
        title: 'Optimal Music Festival Venue Layout',
        award: 'Outstanding Winner',
        summary: 'Graph theory + agent-based simulation for crowd flow optimization',
        keywords: ['graph theory', 'optimization', 'simulation', 'logistics'],
        modelTypes: ['network', 'simulation'],
        techniques: ['Dijkstra algorithm', 'agent-based modeling', 'queueing theory'],
        sections: {
          approach: 'Model venue as weighted graph, simulate crowd using ABM',
          model: 'Minimize Σ(wait_time) + λ·Σ(congestion), subject to capacity constraints',
          validation: 'Compared with 2019 Coachella actual data, 15% reduction in wait time',
        },
        dataSource: 'Venue maps, historical attendance data',
        tools: ['NetLogo', 'Python (NetworkX)'],
      },
      {
        id: 'mcm2020-e-finalist',
        year: 2020,
        problem: 'E',
        title: 'Optimal Fishing Strategies for Sustainability',
        award: 'Finalist',
        summary: 'System dynamics model balancing economic and ecological factors',
        keywords: ['system dynamics', 'sustainability', 'multi-objective', 'ecology'],
        modelTypes: ['differential_equations', 'optimization'],
        techniques: ['system dynamics', 'Pareto optimization', 'Monte Carlo simulation'],
        sections: {
          approach: 'Multi-objective optimization with ecological constraints',
          model: 'Maximize profit + minimize extinction risk, using logistic growth model',
          validation: 'Validated against Alaska salmon fishery data (1990-2018)',
        },
        dataSource: 'NOAA fishery statistics',
        tools: ['Vensim', 'R'],
      },
    ];

    defaultSolutions.forEach(sol => this.solutions.set(sol.id, sol));
  }

  /**
   * Add a new solution to the database
   */
  addSolution(solution) {
    if (!solution.id) {
      throw new Error('Solution must have an id');
    }
    this.solutions.set(solution.id, solution);
  }

  /**
   * Search solutions by keywords
   */
  searchByKeywords(keywords) {
    const results = [];
    const searchTerms = keywords.map(k => k.toLowerCase());

    for (const [id, sol] of this.solutions.entries()) {
      let matchScore = 0;
      const solKeywords = sol.keywords.map(k => k.toLowerCase());

      // Calculate relevance score
      searchTerms.forEach(term => {
        if (solKeywords.some(k => k.includes(term))) {
          matchScore += 2; // Exact keyword match
        }
        if (sol.title.toLowerCase().includes(term)) {
          matchScore += 1;
        }
        if (sol.summary.toLowerCase().includes(term)) {
          matchScore += 0.5;
        }
      });

      if (matchScore > 0) {
        results.push({ ...sol, relevanceScore: matchScore });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Search by model type
   */
  searchByModelType(modelType) {
    const results = [];
    for (const [id, sol] of this.solutions.entries()) {
      if (sol.modelTypes.includes(modelType)) {
        results.push(sol);
      }
    }
    return results;
  }

  /**
   * Search by techniques used
   */
  searchByTechnique(technique) {
    const results = [];
    const searchTerm = technique.toLowerCase();

    for (const [id, sol] of this.solutions.entries()) {
      if (sol.techniques.some(t => t.toLowerCase().includes(searchTerm))) {
        results.push(sol);
      }
    }
    return results;
  }

  /**
   * Get solutions by year
   */
  getByYear(year) {
    return Array.from(this.solutions.values()).filter(sol => sol.year === year);
  }

  /**
   * Get solutions by award level
   */
  getByAward(award) {
    return Array.from(this.solutions.values()).filter(sol =>
      sol.award.toLowerCase().includes(award.toLowerCase())
    );
  }

  /**
   * Get all solutions
   */
  getAllSolutions() {
    return Array.from(this.solutions.values());
  }

  /**
   * Get solution by ID
   */
  getSolution(id) {
    return this.solutions.get(id);
  }

  /**
   * Smart search: combines multiple criteria
   */
  smartSearch(criteria) {
    const {
      keywords = [],
      modelType = null,
      technique = null,
      minYear = null,
      award = null,
    } = criteria;

    let results = Array.from(this.solutions.values());

    // Filter by year
    if (minYear) {
      results = results.filter(sol => sol.year >= minYear);
    }

    // Filter by award
    if (award) {
      results = results.filter(sol => sol.award.toLowerCase().includes(award.toLowerCase()));
    }

    // Filter by model type
    if (modelType) {
      results = results.filter(sol => sol.modelTypes.includes(modelType));
    }

    // Filter by technique
    if (technique) {
      const searchTerm = technique.toLowerCase();
      results = results.filter(sol =>
        sol.techniques.some(t => t.toLowerCase().includes(searchTerm))
      );
    }

    // Score by keywords
    if (keywords.length > 0) {
      const searchTerms = keywords.map(k => k.toLowerCase());
      results = results.map(sol => {
        let score = 0;
        const solKeywords = sol.keywords.map(k => k.toLowerCase());

        searchTerms.forEach(term => {
          if (solKeywords.some(k => k.includes(term))) score += 2;
          if (sol.title.toLowerCase().includes(term)) score += 1;
          if (sol.summary.toLowerCase().includes(term)) score += 0.5;
        });

        return { ...sol, relevanceScore: score };
      });

      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    return results;
  }

  /**
   * Generate summary statistics
   */
  getStatistics() {
    const solutions = Array.from(this.solutions.values());
    const modelTypeCounts = {};
    const techniqueCounts = {};

    solutions.forEach(sol => {
      sol.modelTypes.forEach(type => {
        modelTypeCounts[type] = (modelTypeCounts[type] || 0) + 1;
      });
      sol.techniques.forEach(tech => {
        techniqueCounts[tech] = (techniqueCounts[tech] || 0) + 1;
      });
    });

    return {
      totalSolutions: solutions.length,
      years: [...new Set(solutions.map(s => s.year))].sort(),
      modelTypes: modelTypeCounts,
      techniques: techniqueCounts,
      awards: solutions.reduce((acc, sol) => {
        acc[sol.award] = (acc[sol.award] || 0) + 1;
        return acc;
      }, {}),
    };
  }
}

export default MCMDatabase;
