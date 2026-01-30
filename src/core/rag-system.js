import { pipeline } from '@xenova/transformers';

/**
 * RAG (Retrieval-Augmented Generation) System
 * Neural embeddings-based retrieval for MCM solutions
 * Uses Transformers.js for semantic search
 */

class RAGSystem {
  constructor(mcmDatabase) {
    this.database = mcmDatabase;
    this.vectorCache = new Map(); // Cache for document embeddings
    this.embedder = null;
    this.useNeuralEmbeddings = true;
    this.initialized = false;
  }

  /**
   * Initialize the embedding model
   */
  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🔧 Initializing RAG system with neural embeddings...');

      // Use lightweight sentence transformer model
      this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

      console.log('✓ Neural embeddings model loaded');
      this.initialized = true;
      this.useNeuralEmbeddings = true;
    } catch (error) {
      console.warn(`⚠️ Failed to load neural embeddings: ${error.message}`);
      console.log('  Falling back to TF-IDF method');
      this.useNeuralEmbeddings = false;
      this.initialized = true;
    }
  }

  /**
   * Simple text vectorization (TF-IDF approximation)
   * Returns a sparse vector representation
   */
  vectorize(text) {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3); // Filter short words

    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Normalize by document length
    const docLength = words.length;
    Object.keys(wordFreq).forEach(word => {
      wordFreq[word] = wordFreq[word] / docLength;
    });

    return wordFreq;
  }

  /**
   * Calculate cosine similarity between two sparse vectors (TF-IDF)
   */
  cosineSimilarity(vec1, vec2) {
    const allKeys = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    allKeys.forEach(key => {
      const v1 = vec1[key] || 0;
      const v2 = vec2[key] || 0;
      dotProduct += v1 * v2;
      mag1 += v1 * v1;
      mag2 += v2 * v2;
    });

    if (mag1 === 0 || mag2 === 0) return 0;
    return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
  }

  /**
   * Calculate cosine similarity between two dense arrays (neural embeddings)
   */
  cosineSimilarityArray(arr1, arr2) {
    if (!arr1 || !arr2 || arr1.length !== arr2.length) return 0;

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < arr1.length; i++) {
      dotProduct += arr1[i] * arr2[i];
      mag1 += arr1[i] * arr1[i];
      mag2 += arr2[i] * arr2[i];
    }

    if (mag1 === 0 || mag2 === 0) return 0;
    return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
  }

  /**
   * Index all solutions in the database
   */
  async indexSolutions() {
    await this.initialize();

    const solutions = this.database.getAllSolutions();

    for (const sol of solutions) {
      // Create searchable text from solution
      const searchText = [
        sol.title,
        sol.summary,
        ...sol.keywords,
        ...sol.techniques,
        sol.sections.approach,
        sol.sections.model,
      ].join(' ');

      let vector;
      if (this.useNeuralEmbeddings) {
        vector = await this.getEmbedding(searchText);
      } else {
        vector = this.vectorize(searchText);
      }

      this.vectorCache.set(sol.id, {
        vector,
        solution: sol,
      });
    }

    console.log(`✓ Indexed ${solutions.length} solutions with ${this.useNeuralEmbeddings ? 'neural' : 'TF-IDF'} embeddings`);
  }

  /**
   * Get neural embedding for text
   */
  async getEmbedding(text) {
    if (!this.embedder) return null;

    try {
      const output = await this.embedder(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    } catch (error) {
      console.warn(`Embedding failed: ${error.message}, using TF-IDF`);
      return this.vectorize(text);
    }
  }

  /**
   * Retrieve most relevant solutions for a query
   */
  async retrieve(queryText, topK = 5) {
    if (this.vectorCache.size === 0) {
      await this.indexSolutions();
    }

    let queryVector;
    if (this.useNeuralEmbeddings) {
      queryVector = await this.getEmbedding(queryText);
    } else {
      queryVector = this.vectorize(queryText);
    }

    const results = [];

    for (const [id, cached] of this.vectorCache.entries()) {
      const similarity = this.useNeuralEmbeddings
        ? this.cosineSimilarityArray(queryVector, cached.vector)
        : this.cosineSimilarity(queryVector, cached.vector);

      if (similarity > 0) {
        results.push({
          ...cached.solution,
          similarityScore: similarity,
        });
      }
    }

    // Sort by similarity and return top K
    return results
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, topK);
  }

  /**
   * Get relevant context for a specific modeling task
   */
  async getContextForTask(taskDescription, modelType = null) {
    let query = taskDescription;

    // Enhance query with model type if provided
    if (modelType) {
      query += ` ${modelType}`;
    }

    const relevantSolutions = await this.retrieve(query, 3);

    return {
      solutions: relevantSolutions,
      context: this.formatContext(relevantSolutions),
    };
  }

  /**
   * Format solutions into readable context string
   */
  formatContext(solutions) {
    if (solutions.length === 0) {
      return 'No similar solutions found.';
    }

    let context = '# Relevant Historical Solutions\n\n';

    solutions.forEach((sol, idx) => {
      context += `## ${idx + 1}. ${sol.title} (${sol.year}, ${sol.award})\n`;
      context += `**Similarity Score**: ${(sol.similarityScore * 100).toFixed(1)}%\n\n`;
      context += `**Summary**: ${sol.summary}\n\n`;
      context += `**Approach**: ${sol.sections.approach}\n\n`;
      context += `**Model**: ${sol.sections.model}\n\n`;
      context += `**Techniques Used**: ${sol.techniques.join(', ')}\n\n`;
      context += `**Tools**: ${sol.tools.join(', ')}\n\n`;
      context += '---\n\n';
    });

    return context;
  }

  /**
   * Hybrid search: combine keyword and semantic search
   */
  async hybridSearch(query, keywords = [], topK = 5) {
    // Get semantic search results
    const semanticResults = await this.retrieve(query, topK * 2);

    // Get keyword search results
    const keywordResults = this.database.searchByKeywords(keywords);

    // Merge and re-rank
    const merged = new Map();

    semanticResults.forEach(sol => {
      merged.set(sol.id, {
        ...sol,
        score: sol.similarityScore * 0.6, // 60% weight for semantic
      });
    });

    keywordResults.forEach(sol => {
      const existing = merged.get(sol.id);
      if (existing) {
        existing.score += (sol.relevanceScore / 10) * 0.4; // 40% weight for keywords
      } else {
        merged.set(sol.id, {
          ...sol,
          score: (sol.relevanceScore / 10) * 0.4,
        });
      }
    });

    // Sort by combined score
    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Get similar solutions by example
   */
  async findSimilarByExample(exampleSolutionId, topK = 5) {
    const example = this.database.getSolution(exampleSolutionId);
    if (!example) {
      throw new Error('Example solution not found');
    }

    const exampleText = [
      example.title,
      example.summary,
      ...example.keywords,
      ...example.techniques,
    ].join(' ');

    const results = await this.retrieve(exampleText, topK + 1);
    return results.slice(1); // Exclude the example itself
  }

  /**
   * Get augmented prompt with relevant context
   */
  async augmentPrompt(userPrompt, context = null) {
    if (!context) {
      const relevantSolutions = await this.retrieve(userPrompt, 2);
      context = this.formatContext(relevantSolutions);
    }

    return `${context}\n\n# Current Task\n${userPrompt}`;
  }
}

export default RAGSystem;
