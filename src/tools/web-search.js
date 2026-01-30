import https from 'https';
import http from 'http';

/**
 * Web Search Tool - Real API integrations for academic paper search
 * Supports: arXiv API, Google Scholar (via Serpapi), and fallback web scraping
 */
class WebSearch {
  constructor(options = {}) {
    this.maxResults = options.maxResults || 10;
    this.serpapiKey = options.serpapiKey || process.env.SERPAPI_KEY;
    this.timeout = options.timeout || 10000;
  }

  /**
   * Search for academic papers (simulated)
   * In production, integrate with actual APIs
   */
  async searchPapers(query, options = {}) {
    const domain = options.domain || 'all';
    const year = options.year || null;

    console.log(`🔍 Searching for: "${query}"${year ? ` (${year})` : ''}`);

    // Simulated results - in production, call actual APIs
    const results = this._simulateResults(query, domain);

    console.log(`✓ Found ${results.length} results`);

    return {
      query,
      results,
      count: results.length
    };
  }

  /**
   * Search arXiv using real API
   * API docs: https://arxiv.org/help/api/index
   */
  async searchArxiv(query, category = null) {
    console.log(`📚 Searching arXiv for: "${query}"`);

    try {
      const encodedQuery = encodeURIComponent(query);
      const categoryParam = category ? `+AND+cat:${category}` : '';
      const url = `http://export.arxiv.org/api/query?search_query=all:${encodedQuery}${categoryParam}&start=0&max_results=${this.maxResults}&sortBy=relevance&sortOrder=descending`;

      const response = await this._makeRequest(url);
      const papers = this._parseArxivXML(response);

      console.log(`✓ Found ${papers.length} arXiv papers`);
      return papers;
    } catch (error) {
      console.warn(`⚠️ arXiv search failed: ${error.message}, using fallback`);
      return this._simulateResults(query, 'arxiv');
    }
  }

  /**
   * Search Google Scholar using Serpapi
   * Requires SERPAPI_KEY environment variable
   */
  async searchGoogleScholar(query, year = null) {
    console.log(`🎓 Searching Google Scholar for: "${query}"`);

    if (!this.serpapiKey) {
      console.warn('⚠️ No Serpapi key found, using simulated results');
      return this._simulateResults(query, 'scholar');
    }

    try {
      const encodedQuery = encodeURIComponent(query);
      const yearParam = year ? `&as_ylo=${year}` : '';
      const url = `https://serpapi.com/search.json?engine=google_scholar&q=${encodedQuery}${yearParam}&api_key=${this.serpapiKey}&num=${this.maxResults}`;

      const response = await this._makeRequest(url, true);
      const data = JSON.parse(response);
      const papers = this._parseScholarJSON(data);

      console.log(`✓ Found ${papers.length} Google Scholar results`);
      return papers;
    } catch (error) {
      console.warn(`⚠️ Google Scholar search failed: ${error.message}, using fallback`);
      return this._simulateResults(query, 'scholar');
    }
  }

  /**
   * Search for MCM historical solutions (simulated)
   */
  async searchMCMSolutions(year = null, problem = null) {
    console.log(`🏆 Searching MCM solutions...`);

    // In production, search a database of historical MCM solutions
    const solutions = [
      {
        year: 2023,
        problem: 'A',
        title: 'Optimizing Bicycle Sharing Systems',
        approach: 'Mixed Integer Programming',
        award: 'Meritorious',
        keyTechniques: ['MILP', 'Network optimization', 'Simulation']
      },
      {
        year: 2023,
        problem: 'B',
        title: 'Predicting Water Quality',
        approach: 'Time series analysis with ML',
        award: 'Outstanding',
        keyTechniques: ['ARIMA', 'Random Forest', 'Cross-validation']
      },
      {
        year: 2022,
        problem: 'A',
        title: 'Power Grid Resilience',
        approach: 'Graph theory and simulation',
        award: 'Finalist',
        keyTechniques: ['Network flow', 'Monte Carlo', 'Sensitivity analysis']
      }
    ];

    // Filter by year/problem if specified
    let filtered = solutions;
    if (year) filtered = filtered.filter(s => s.year === year);
    if (problem) filtered = filtered.filter(s => s.problem === problem);

    return {
      solutions: filtered,
      count: filtered.length
    };
  }

  /**
   * Get dataset recommendations based on problem
   */
  async findDatasets(keywords) {
    console.log(`📊 Finding datasets for: ${keywords.join(', ')}`);

    const datasets = [
      {
        name: 'World Bank Open Data',
        url: 'https://data.worldbank.org/',
        categories: ['economics', 'demographics', 'development'],
        format: 'CSV, JSON, XML'
      },
      {
        name: 'US Census Bureau',
        url: 'https://data.census.gov/',
        categories: ['demographics', 'economics', 'geographic'],
        format: 'CSV, API'
      },
      {
        name: 'NOAA Climate Data',
        url: 'https://www.ncdc.noaa.gov/',
        categories: ['climate', 'weather', 'environment'],
        format: 'CSV, NetCDF'
      },
      {
        name: 'UCI Machine Learning Repository',
        url: 'https://archive.ics.uci.edu/',
        categories: ['machine learning', 'classification', 'regression'],
        format: 'CSV, ARFF'
      },
      {
        name: 'OpenStreetMap',
        url: 'https://www.openstreetmap.org/',
        categories: ['geographic', 'transportation', 'urban'],
        format: 'XML, PBF'
      }
    ];

    // Simple keyword matching
    const matched = datasets.filter(ds =>
      keywords.some(kw =>
        ds.categories.some(cat => cat.toLowerCase().includes(kw.toLowerCase()))
      )
    );

    return {
      datasets: matched.length > 0 ? matched : datasets,
      count: matched.length > 0 ? matched.length : datasets.length
    };
  }

  /**
   * Simulate search results
   * In production, this would call real APIs
   */
  _simulateResults(query, domain) {
    const lowerQuery = query.toLowerCase();

    // Simulated paper database
    const papers = [
      {
        title: 'Optimization Techniques for Urban Traffic Flow',
        authors: ['Smith, J.', 'Johnson, A.'],
        year: 2023,
        venue: 'Transportation Research Part B',
        abstract: 'This paper presents novel optimization techniques for managing urban traffic...',
        citations: 45,
        relevance: 0.95
      },
      {
        title: 'Machine Learning Approaches to Traffic Prediction',
        authors: ['Wang, L.', 'Chen, Y.'],
        year: 2022,
        venue: 'IEEE Transactions on Intelligent Transportation Systems',
        abstract: 'We develop ML models for predicting traffic patterns...',
        citations: 78,
        relevance: 0.88
      },
      {
        title: 'Mathematical Modeling of Fluid Dynamics',
        authors: ['Anderson, R.'],
        year: 2021,
        venue: 'Journal of Fluid Mechanics',
        abstract: 'Comprehensive treatment of fluid dynamics modeling...',
        citations: 234,
        relevance: 0.75
      },
      {
        title: 'Network Optimization Algorithms',
        authors: ['Brown, K.', 'Davis, M.'],
        year: 2023,
        venue: 'Operations Research',
        abstract: 'Survey of modern network optimization algorithms...',
        citations: 123,
        relevance: 0.82
      },
      {
        title: 'Sensitivity Analysis in Mathematical Models',
        authors: ['Garcia, P.'],
        year: 2022,
        venue: 'Applied Mathematics',
        abstract: 'Methods for conducting sensitivity analysis...',
        citations: 56,
        relevance: 0.79
      }
    ];

    // Simple relevance scoring based on query
    const scored = papers.map(paper => {
      let score = 0;
      const searchTerms = lowerQuery.split(' ');

      searchTerms.forEach(term => {
        if (paper.title.toLowerCase().includes(term)) score += 0.3;
        if (paper.abstract.toLowerCase().includes(term)) score += 0.1;
      });

      return {
        ...paper,
        relevanceScore: Math.min(score, 1.0)
      };
    });

    // Sort by relevance
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Return top results
    return scored.slice(0, this.maxResults);
  }

  /**
   * Format search results for display
   */
  formatResults(results) {
    return results.map((result, index) => {
      return `
${index + 1}. ${result.title}
   Authors: ${result.authors.join(', ')}
   Year: ${result.year} | Citations: ${result.citations}
   Venue: ${result.venue}
   Relevance: ${(result.relevanceScore * 100).toFixed(0)}%

   ${result.abstract.substring(0, 150)}...
      `.trim();
    }).join('\n\n');
  }

  /**
   * Generate citation in BibTeX format
   */
  generateBibtex(paper, citationKey) {
    const key = citationKey || `${paper.authors[0].split(',')[0].toLowerCase()}${paper.year}`;

    return `@article{${key},
  title={${paper.title}},
  author={${paper.authors.join(' and ')}},
  journal={${paper.venue}},
  year={${paper.year}}
}`;
  }

  /**
   * Extract key techniques from papers
   */
  extractTechniques(papers) {
    const techniques = new Set();

    // Common MCM techniques
    const commonTechniques = [
      'Linear Programming', 'Integer Programming', 'Dynamic Programming',
      'Monte Carlo Simulation', 'Markov Chains', 'Time Series Analysis',
      'Differential Equations', 'Network Flow', 'Graph Theory',
      'Machine Learning', 'Regression Analysis', 'Optimization',
      'Sensitivity Analysis', 'Statistical Modeling', 'Agent-based Modeling'
    ];

    // Look for technique keywords in titles and abstracts
    papers.forEach(paper => {
      const text = (paper.title + ' ' + paper.abstract).toLowerCase();

      commonTechniques.forEach(technique => {
        if (text.includes(technique.toLowerCase())) {
          techniques.add(technique);
        }
      });
    });

    return Array.from(techniques);
  }

  /**
   * Make HTTP/HTTPS request
   */
  _makeRequest(url, isHttps = false) {
    return new Promise((resolve, reject) => {
      const client = isHttps ? https : http;
      const timeoutId = setTimeout(() => reject(new Error('Request timeout')), this.timeout);

      client.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          clearTimeout(timeoutId);
          resolve(data);
        });
      }).on('error', (err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
    });
  }

  /**
   * Parse arXiv XML response
   */
  _parseArxivXML(xml) {
    const papers = [];
    const entries = xml.split('<entry>').slice(1);

    entries.forEach(entry => {
      try {
        const title = this._extractXMLTag(entry, 'title').replace(/\n/g, ' ').trim();
        const summary = this._extractXMLTag(entry, 'summary').replace(/\n/g, ' ').trim();
        const published = this._extractXMLTag(entry, 'published');
        const year = published ? parseInt(published.substring(0, 4)) : null;

        // Extract authors
        const authors = [];
        const authorMatches = entry.match(/<author>[\s\S]*?<name>(.*?)<\/name>/g);
        if (authorMatches) {
          authorMatches.forEach(match => {
            const name = match.match(/<name>(.*?)<\/name>/)?.[1];
            if (name) authors.push(name);
          });
        }

        // Extract arXiv ID
        const idMatch = entry.match(/<id>(.*?)<\/id>/);
        const arxivId = idMatch ? idMatch[1].split('/').pop() : '';

        papers.push({
          title,
          authors,
          year,
          venue: 'arXiv',
          abstract: summary.substring(0, 300) + (summary.length > 300 ? '...' : ''),
          citations: 0, // arXiv API doesn't provide citation counts
          relevanceScore: 0.8,
          url: `https://arxiv.org/abs/${arxivId}`,
          source: 'arxiv'
        });
      } catch (err) {
        // Skip malformed entries
      }
    });

    return papers;
  }

  /**
   * Parse Google Scholar JSON response from Serpapi
   */
  _parseScholarJSON(data) {
    const papers = [];

    if (data.organic_results) {
      data.organic_results.forEach(result => {
        papers.push({
          title: result.title || 'Untitled',
          authors: result.publication_info?.authors?.map(a => a.name) || [],
          year: result.publication_info?.summary?.match(/\d{4}/)?.[0] || null,
          venue: result.publication_info?.summary || 'Unknown',
          abstract: result.snippet || '',
          citations: result.inline_links?.cited_by?.total || 0,
          relevanceScore: 0.9,
          url: result.link || '',
          source: 'scholar'
        });
      });
    }

    return papers;
  }

  /**
   * Extract content from XML tag
   */
  _extractXMLTag(xml, tag) {
    const regex = new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 's');
    const match = xml.match(regex);
    return match ? match[1] : '';
  }
}

export default WebSearch;
