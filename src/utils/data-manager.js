import fs from 'fs';
import path from 'path';

/**
 * Data Manager - Handles user uploaded data files
 */
class DataManager {
  constructor(workspacePath) {
    this.workspacePath = workspacePath;
    this.dataDir = path.join(workspacePath, 'data');

    // Create data directory if not exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Upload a data file to workspace
   */
  async uploadFile(sourcePath, filename = null) {
    try {
      const basename = filename || path.basename(sourcePath);
      const destPath = path.join(this.dataDir, basename);

      // Copy file to data directory
      fs.copyFileSync(sourcePath, destPath);

      // Register in metadata
      await this._registerFile(basename, {
        originalPath: sourcePath,
        uploadedAt: new Date().toISOString(),
        size: fs.statSync(destPath).size
      });

      return {
        filename: basename,
        path: destPath,
        success: true
      };
    } catch (error) {
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * List all uploaded data files
   */
  listFiles() {
    try {
      const files = fs.readdirSync(this.dataDir)
        .filter(f => f !== '.metadata.json');

      return files.map(filename => {
        const filePath = path.join(this.dataDir, filename);
        const stats = fs.statSync(filePath);
        const metadata = this._getFileMetadata(filename);

        return {
          filename,
          path: filePath,
          size: stats.size,
          uploadedAt: metadata?.uploadedAt || stats.mtime.toISOString(),
          type: path.extname(filename).slice(1)
        };
      });
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  /**
   * Get file content
   */
  readFile(filename) {
    const filePath = path.join(this.dataDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filename}`);
    }
    return fs.readFileSync(filePath);
  }

  /**
   * Delete uploaded file
   */
  deleteFile(filename) {
    const filePath = path.join(this.dataDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this._unregisterFile(filename);
      return true;
    }
    return false;
  }

  /**
   * Get data directory summary for agent
   */
  getSummary() {
    const files = this.listFiles();
    return {
      dataDir: this.dataDir,
      fileCount: files.length,
      files: files.map(f => ({
        name: f.filename,
        type: f.type,
        size: `${(f.size / 1024).toFixed(2)} KB`
      }))
    };
  }

  /**
   * Register file metadata
   */
  async _registerFile(filename, metadata) {
    const metaPath = path.join(this.dataDir, '.metadata.json');
    let allMeta = {};

    if (fs.existsSync(metaPath)) {
      allMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    }

    allMeta[filename] = metadata;
    fs.writeFileSync(metaPath, JSON.stringify(allMeta, null, 2));
  }

  /**
   * Get file metadata
   */
  _getFileMetadata(filename) {
    const metaPath = path.join(this.dataDir, '.metadata.json');
    if (!fs.existsSync(metaPath)) return null;

    const allMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    return allMeta[filename] || null;
  }

  /**
   * Unregister file metadata
   */
  _unregisterFile(filename) {
    const metaPath = path.join(this.dataDir, '.metadata.json');
    if (!fs.existsSync(metaPath)) return;

    const allMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    delete allMeta[filename];
    fs.writeFileSync(metaPath, JSON.stringify(allMeta, null, 2));
  }
}

export default DataManager;
