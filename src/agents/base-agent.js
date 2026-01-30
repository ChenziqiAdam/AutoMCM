import { ProviderFactory } from '../core/llm-providers.js';
import config from '../core/config.js';

/**
 * Base Agent class for all AutoMCM agents
 */
class BaseAgent {
  constructor(mode = 'general') {
    this.mode = mode;
    this.provider = this._initializeProvider();
    this.conversationHistory = [];
  }

  /**
   * Initialize LLM provider with task-specific override if available
   */
  _initializeProvider() {
    const primaryConfig = {
      provider: config.get('llm.provider'),
      apiKey: config.get('llm.api_key'),
      baseUrl: config.get('llm.base_url'),
      model: config.get('llm.model'),
      maxTokens: config.get('llm.max_tokens'),
      temperature: config.get('llm.temperature')
    };

    // Check for task-specific override
    const taskOverride = config.get(`llm.task_overrides.${this.mode}`);
    if (taskOverride && taskOverride.provider) {
      // Use task-specific configuration
      const overrideConfig = {
        provider: taskOverride.provider || primaryConfig.provider,
        apiKey: taskOverride.api_key || primaryConfig.apiKey,
        baseUrl: taskOverride.base_url || primaryConfig.baseUrl,
        model: taskOverride.model || primaryConfig.model,
        maxTokens: primaryConfig.maxTokens,
        temperature: primaryConfig.temperature
      };
      console.log(`🔧 Using ${overrideConfig.provider} for ${this.mode} mode`);
      return ProviderFactory.createProvider(overrideConfig);
    }

    // Use primary configuration
    return ProviderFactory.createProvider(primaryConfig);
  }

  /**
   * Get system prompt based on agent mode
   */
  getSystemPrompt() {
    const basePrompt = `You are an AI agent working in AutoMCM, a specialized workspace for Mathematical Contest in Modeling (MCM/ICM).

WORKSPACE STRUCTURE:
- problem.md: Contains the ACTUAL MCM problem statement (extracted from PDF)
- AUTOMCM.md: Project constitution with standards and templates
  - Variable registry with symbols, definitions, units, and constraints
  - Modeling assumptions
  - Code standards
  - LaTeX configuration
  - Deliverables checklist

CRITICAL RULES:
1. The problem statement in user messages is the REAL problem (from problem.md)
2. AUTOMCM.md provides standards/templates, NOT the problem statement
3. All variables must be registered in the Variable Registry
4. All code must follow the defined code standards
5. All equations must be dimensionally consistent
6. Document all assumptions`;

    const modePrompts = {
      researcher: `\n\nRESEARCHER MODE ACTIVE:
Your focus is on finding relevant academic papers, datasets, and historical MCM solutions.
- Search Google Scholar, arXiv, and MCM archives
- Output markdown summaries with proper citations
- Identify applicable mathematical techniques
- Find relevant datasets and data sources`,

      modeler: `\n\nMODELER-CODER MODE ACTIVE:
Your focus is on developing mathematical models and implementing them in code.
- First propose formulation in LaTeX
- Then implement in Python with dimensional checks
- Run tests and generate visualizations immediately
- Ensure variable names match LaTeX symbols from registry
- Validate dimensional consistency using SymPy`,

      writer: `\n\nWRITER MODE ACTIVE:
Your focus is on writing the competition paper in LaTeX.
- Use AUTOMCM.md Variable Registry for all symbols
- Every equation must reference registered variables
- Follow the specified LaTeX template
- Compile iteratively and fix errors
- Ensure all figures are referenced correctly`,

      general: ''
    };

    return basePrompt + (modePrompts[this.mode] || modePrompts.general);
  }

  /**
   * Send a message and get response
   */
  async sendMessage(userMessage, options = {}) {
    console.log(`\n📤 [${this.mode.toUpperCase()}] Sending message to LLM`);
    console.log(`   Message length: ${userMessage.length} chars`);
    console.log(`   Message preview: ${userMessage.substring(0, 150)}...`);

    this.conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    console.log(`   Conversation history: ${this.conversationHistory.length} messages`);

    try {
      const response = await this.provider.sendMessage(
        this.conversationHistory,
        this.getSystemPrompt(),
        {
          maxTokens: options.max_tokens || config.get('llm.max_tokens'),
          temperature: options.temperature || config.get('llm.temperature')
        }
      );

      console.log(`📥 [${this.mode.toUpperCase()}] Response received`);
      console.log(`   Tokens - Input: ${response.usage.inputTokens}, Output: ${response.usage.outputTokens}`);
      console.log(`   Response length: ${response.message.length} chars`);
      console.log(`   Response preview: ${response.message.substring(0, 150)}...\n`);

      this.conversationHistory.push({
        role: 'assistant',
        content: response.message
      });

      return {
        message: response.message,
        usage: response.usage,
        stopReason: response.stopReason
      };
    } catch (error) {
      console.error(`❌ [${this.mode.toUpperCase()}] Error sending message:`, error.message);
      throw error;
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return this.conversationHistory;
  }
}

export default BaseAgent;
