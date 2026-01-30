import pdf from 'pdf-parse';
import fs from 'fs';
import path from 'path';

/**
 * PDF Parser - Extracts text content from problem PDFs
 */
class PDFParser {
  /**
   * Parse PDF file and extract text
   */
  async parsePDF(pdfPath) {
    try {
      const dataBuffer = fs.readFileSync(pdfPath);
      const data = await pdf(dataBuffer);

      return {
        text: data.text,
        numPages: data.numpages,
        info: data.info,
        metadata: data.metadata
      };
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  /**
   * Extract problem statement from MCM problem PDF
   */
  async extractProblemStatement(pdfPath) {
    const parsed = await this.parsePDF(pdfPath);

    // Clean up text
    let text = parsed.text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      problemStatement: text,
      metadata: {
        pages: parsed.numPages,
        extractedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Save extracted problem to workspace
   */
  async saveProblemToWorkspace(workspacePath, problemData) {
    const problemFile = path.join(workspacePath, 'problem.md');

    // Format as markdown document
    const markdown = this._formatAsMarkdown(problemData);
    fs.writeFileSync(problemFile, markdown, 'utf-8');

    const metadataFile = path.join(workspacePath, 'problem-metadata.json');
    fs.writeFileSync(metadataFile, JSON.stringify(problemData.metadata, null, 2));

    return { problemFile, metadataFile };
  }

  /**
   * Format extracted text as markdown
   */
  _formatAsMarkdown(problemData) {
    const { problemStatement, metadata } = problemData;

    return `# MCM Problem Statement

**Extracted:** ${new Date(metadata.extractedAt).toLocaleString()}
**Pages:** ${metadata.pages}

---

${problemStatement}
`;
  }
}

export default PDFParser;
