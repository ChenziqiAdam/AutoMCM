import fs from 'fs/promises';
import path from 'path';

/**
 * Artifact Store - Tracks generated files and their metadata
 */
class ArtifactStore {
  constructor(workspacePath, eventEmitter = null) {
    this.workspacePath = workspacePath;
    this.artifactsPath = path.join(workspacePath, 'artifacts');
    this.indexPath = path.join(this.artifactsPath, 'index.json');
    this.artifacts = [];
    this.eventEmitter = eventEmitter; // For emitting events to frontend
  }

  /**
   * Initialize artifact store
   */
  async initialize() {
    await fs.mkdir(this.artifactsPath, { recursive: true });

    // Load existing index if it exists
    try {
      const indexData = await fs.readFile(this.indexPath, 'utf8');
      this.artifacts = JSON.parse(indexData);
    } catch {
      // Create new index
      this.artifacts = [];
      await this._saveIndex();
    }
  }

  /**
   * Save artifact content to disk and register it
   */
  async saveArtifact(artifact) {
    const {
      name,
      type,
      content,
      description = '',
      generatedBy = 'unknown',
      metadata = {}
    } = artifact;

    // Save content to artifacts directory
    const artifactPath = path.join(this.artifactsPath, name);
    await fs.writeFile(artifactPath, content, 'utf8');

    // Register the artifact
    const result = await this.register({
      name,
      type,
      path: artifactPath,
      description,
      generatedBy,
      metadata
    });

    // Emit event for frontend notification
    if (this.eventEmitter) {
      this.eventEmitter.emit('artifact-created', { type, name, metadata: result.metadata });
    }

    return result;
  }

  /**
   * Register a new artifact
   */
  async register(artifact) {
    const {
      name,
      type,
      path: artifactPath,
      description = '',
      generatedBy = 'unknown',
      metadata = {}
    } = artifact;

    const entry = {
      id: this._generateId(),
      name,
      type, // 'code', 'figure', 'latex', 'data', 'document'
      path: artifactPath,
      description,
      generatedBy,
      metadata,
      timestamp: new Date().toISOString(),
      version: 1
    };

    // Check if artifact already exists
    const existingIndex = this.artifacts.findIndex(a => a.path === artifactPath);

    if (existingIndex >= 0) {
      // Update existing artifact
      entry.version = this.artifacts[existingIndex].version + 1;
      entry.id = this.artifacts[existingIndex].id;
      this.artifacts[existingIndex] = entry;
    } else {
      // Add new artifact
      this.artifacts.push(entry);
    }

    await this._saveIndex();
    return entry;
  }

  /**
   * Get artifact by ID
   */
  getById(id) {
    return this.artifacts.find(a => a.id === id);
  }

  /**
   * Get artifacts by type
   */
  getByType(type) {
    return this.artifacts.filter(a => a.type === type);
  }

  /**
   * Get all figures
   */
  getFigures() {
    return this.getByType('figure');
  }

  /**
   * Get all code files
   */
  getCode() {
    return this.getByType('code');
  }

  /**
   * Get all artifacts
   */
  getAll() {
    return this.artifacts;
  }

  /**
   * List all artifacts (alias for getAll)
   */
  async listArtifacts() {
    return this.getAll();
  }

  /**
   * Read artifact content by name
   */
  async readArtifact(name) {
    const artifactPath = path.join(this.artifactsPath, name);
    try {
      return await fs.readFile(artifactPath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read artifact ${name}: ${error.message}`);
    }
  }

  /**
   * Search artifacts
   */
  search(query) {
    const lowerQuery = query.toLowerCase();
    return this.artifacts.filter(a =>
      a.name.toLowerCase().includes(lowerQuery) ||
      a.description.toLowerCase().includes(lowerQuery) ||
      a.type.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Delete artifact
   */
  async delete(id) {
    const index = this.artifacts.findIndex(a => a.id === id);
    if (index >= 0) {
      this.artifacts.splice(index, 1);
      await this._saveIndex();
      return true;
    }
    return false;
  }

  /**
   * Get summary statistics
   */
  getStats() {
    const stats = {
      total: this.artifacts.length,
      byType: {}
    };

    for (const artifact of this.artifacts) {
      stats.byType[artifact.type] = (stats.byType[artifact.type] || 0) + 1;
    }

    return stats;
  }

  /**
   * Save index to disk
   */
  async _saveIndex() {
    await fs.writeFile(
      this.indexPath,
      JSON.stringify(this.artifacts, null, 2),
      'utf8'
    );
  }

  /**
   * Generate unique ID
   */
  _generateId() {
    return `artifact_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

export default ArtifactStore;
