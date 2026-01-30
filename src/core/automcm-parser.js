import fs from 'fs/promises';

/**
 * AUTOMCM.md Parser - Reads and manipulates the project constitution
 */
class AutomcmParser {
  constructor(automcmPath) {
    this.automcmPath = automcmPath;
    this.content = null;
    this.sections = {};
  }

  /**
   * Load and parse AUTOMCM.md
   */
  async load() {
    this.content = await fs.readFile(this.automcmPath, 'utf8');
    this._parseSections();
    return this;
  }

  /**
   * Parse markdown into sections
   */
  _parseSections() {
    const lines = this.content.split('\n');
    let currentSection = null;
    let currentContent = [];

    for (const line of lines) {
      // Detect section headers (## Section Name)
      if (line.startsWith('## ')) {
        // Save previous section
        if (currentSection) {
          this.sections[currentSection] = currentContent.join('\n');
        }
        // Start new section
        currentSection = line.substring(3).trim();
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentSection) {
      this.sections[currentSection] = currentContent.join('\n');
    }
  }

  /**
   * Get a specific section
   */
  getSection(sectionName) {
    return this.sections[sectionName] || null;
  }

  /**
   * Parse Variable Registry table
   */
  getVariableRegistry() {
    const registrySection = this.getSection('Variable Registry');
    if (!registrySection) return [];

    const lines = registrySection.split('\n').filter(l => l.trim());
    const variables = [];

    // Skip table header and separator
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes('|')) continue;

      const parts = line.split('|').map(p => p.trim()).filter(p => p);
      if (parts.length >= 4 && parts[0]) {
        variables.push({
          symbol: parts[0],
          definition: parts[1],
          units: parts[2],
          constraints: parts[3],
          source: parts[4] || ''
        });
      }
    }

    return variables;
  }

  /**
   * Add variable to registry
   */
  async addVariable(variable) {
    const { symbol, definition, units, constraints, source = '' } = variable;

    // Read current registry
    const variables = this.getVariableRegistry();

    // Check if symbol already exists
    const existingIndex = variables.findIndex(v => v.symbol === symbol);
    if (existingIndex >= 0) {
      throw new Error(`Variable ${symbol} already exists in registry`);
    }

    // Find Variable Registry section
    const registrySection = this.getSection('Variable Registry');
    const lines = registrySection.split('\n');

    // Find the table and add new row
    let insertIndex = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].includes('|')) {
        insertIndex = i + 1;
        break;
      }
    }

    if (insertIndex >= 0) {
      const newRow = `| ${symbol} | ${definition} | ${units} | ${constraints} | ${source} |`;
      lines.splice(insertIndex, 0, newRow);

      // Update section
      this.sections['Variable Registry'] = lines.join('\n');

      // Rebuild content and save
      await this._rebuildAndSave();
    }
  }

  /**
   * Get modeling assumptions
   */
  getAssumptions() {
    const assumptionsSection = this.getSection('Modeling Assumptions');
    if (!assumptionsSection) return [];

    const lines = assumptionsSection.split('\n');
    const assumptions = [];

    for (const line of lines) {
      const match = line.match(/^(\d+)\.\s+(.+)/);
      if (match) {
        assumptions.push({
          number: parseInt(match[1]),
          text: match[2]
        });
      }
    }

    return assumptions;
  }

  /**
   * Add assumption
   */
  async addAssumption(assumptionText) {
    const assumptions = this.getAssumptions();
    const nextNumber = assumptions.length + 1;

    const assumptionsSection = this.getSection('Modeling Assumptions');
    const lines = assumptionsSection.split('\n');

    // Add new assumption
    lines.push(`${nextNumber}. ${assumptionText}`);

    this.sections['Modeling Assumptions'] = lines.join('\n');
    await this._rebuildAndSave();
  }

  /**
   * Update checklist item
   */
  async updateChecklistItem(itemText, checked) {
    const checklistSection = this.getSection('Deliverables Checklist');
    const lines = checklistSection.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(itemText)) {
        const checkbox = checked ? '[x]' : '[ ]';
        lines[i] = lines[i].replace(/\[(x| )\]/, checkbox);
        break;
      }
    }

    this.sections['Deliverables Checklist'] = lines.join('\n');
    await this._rebuildAndSave();
  }

  /**
   * Append to progress log
   */
  async logProgress(message) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const logEntry = `### [${timestamp}] - ${message}\n`;

    const progressSection = this.getSection('Progress Log');
    this.sections['Progress Log'] = progressSection + '\n' + logEntry;

    await this._rebuildAndSave();
  }

  /**
   * Rebuild full content from sections and save
   */
  async _rebuildAndSave() {
    const lines = ['# ' + this.content.split('\n')[0].substring(2)]; // Keep title

    for (const [sectionName, sectionContent] of Object.entries(this.sections)) {
      lines.push('');
      lines.push(`## ${sectionName}`);
      lines.push(sectionContent);
    }

    this.content = lines.join('\n');
    await fs.writeFile(this.automcmPath, this.content, 'utf8');
  }

  /**
   * Get all content
   */
  getContent() {
    return this.content;
  }
}

export default AutomcmParser;
