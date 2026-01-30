import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

/**
 * Configuration manager for AutoMCM
 */
class Config {
  constructor() {
    this.config = null;
    this.load();
  }

  /**
   * Load configuration from YAML file with environment variable substitution
   */
  load() {
    const configPath = path.join(__dirname, '../../config/default.yaml');
    const configContent = fs.readFileSync(configPath, 'utf8');

    // Parse YAML
    this.config = YAML.parse(configContent);

    // Substitute environment variables
    this._substituteEnvVars(this.config);
  }

  /**
   * Recursively substitute ${ENV_VAR} patterns with environment variables
   */
  _substituteEnvVars(obj) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        const match = obj[key].match(/\$\{(\w+)\}/);
        if (match) {
          const envVar = match[1];
          obj[key] = process.env[envVar] || obj[key];
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this._substituteEnvVars(obj[key]);
      }
    }
  }

  /**
   * Get configuration value by path (e.g., 'llm.model')
   */
  get(keyPath) {
    const keys = keyPath.split('.');
    let value = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Get all configuration
   */
  getAll() {
    return this.config;
  }
}

// Singleton instance
const config = new Config();

export default config;
