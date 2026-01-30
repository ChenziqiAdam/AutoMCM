/**
 * Base LLM Provider interface
 */
class LLMProvider {
  constructor(config) {
    this.config = config;
  }

  async sendMessage(messages, systemPrompt, options = {}) {
    throw new Error('sendMessage must be implemented by provider');
  }

  formatMessages(messages) {
    return messages;
  }

  async request(endpoint, body, headers = {}) {
    const url = `${this.config.baseUrl}${endpoint}`;

    console.log(`\n🌐 API Request:`);
    console.log(`   URL: ${url}`);
    console.log(`   Method: POST`);
    console.log(`   Headers:`, Object.keys(headers));
    console.log(`   Body preview: ${JSON.stringify(body).substring(0, 200)}...`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(body)
    });

    console.log(`   Response status: ${response.status} ${response.statusText}`);
    const contentType = response.headers.get('content-type');
    console.log(`   Response content-type: ${contentType}`);

    if (!response.ok) {
      let errorMessage = `${response.status} ${response.statusText}`;

      try {
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = JSON.stringify(errorData);
        } else {
          const errorText = await response.text();
          errorMessage = errorText.substring(0, 500); // Limit error message length
        }
      } catch (parseError) {
        // If we can't parse the error, use the status text
      }

      console.error(`❌ API Error: ${errorMessage}`);
      throw new Error(`API request failed: ${errorMessage}`);
    }

    // Ensure response is JSON
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error(`\n❌ API Error Details:`);
      console.error(`   URL: ${url}`);
      console.error(`   Content-Type: ${contentType}`);
      console.error(`   Response preview: ${text.substring(0, 500)}`);
      throw new Error(`Expected JSON response but got ${contentType}. Check console for details.`);
    }

    console.log(`   ✅ Response received successfully\n`);
    return await response.json();
  }
}

/**
 * Claude (Anthropic) Provider
 */
class ClaudeProvider extends LLMProvider {
  constructor(config) {
    super(config);
    this.config.baseUrl = config.baseUrl || 'https://api.anthropic.com';
  }

  async sendMessage(messages, systemPrompt, options = {}) {
    console.log(`\n🤖 Claude Provider - Sending message`);
    console.log(`   Model: ${this.config.model}`);
    console.log(`   Messages count: ${messages.length}`);

    const response = await this.request('/v1/messages', {
      model: this.config.model,
      system: systemPrompt,
      messages: this.formatMessages(messages)
    }, {
      'x-api-key': this.config.apiKey,
      'anthropic-version': '2023-06-01'
    });

    console.log(`   ✅ Response received - ${response.usage.output_tokens} tokens`);

    return {
      message: response.content[0].text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      },
      stopReason: response.stop_reason
    };
  }

  formatMessages(messages) {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }
}

/**
 * OpenAI/GPT Provider
 */
class OpenAIProvider extends LLMProvider {
  constructor(config) {
    super(config);
    this.config.baseUrl = config.baseUrl || 'https://api.openai.com';
  }

  async sendMessage(messages, systemPrompt, options = {}) {
    console.log(`\n🤖 OpenAI Provider - Sending message`);
    console.log(`   Model: ${this.config.model}`);
    console.log(`   Messages count: ${messages.length}`);

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...this.formatMessages(messages)
    ];

    const response = await this.request('/v1/chat/completions', {
      model: this.config.model,
      messages: formattedMessages
    }, {
      'Authorization': `Bearer ${this.config.apiKey}`
    });

    console.log(`   ✅ Response received - ${response.usage.completion_tokens} tokens`);

    return {
      message: response.choices[0].message.content,
      usage: {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens
      },
      stopReason: response.choices[0].finish_reason
    };
  }

  formatMessages(messages) {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }
}

/**
 * Google Gemini Provider
 */
class GeminiProvider extends LLMProvider {
  constructor(config) {
    super(config);
    this.config.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com';
  }

  async sendMessage(messages, systemPrompt, options = {}) {
    console.log(`\n🤖 Gemini Provider - Sending message`);
    console.log(`   Model: ${this.config.model}`);
    console.log(`   Messages count: ${messages.length}`);

    // Prepend system prompt to first user message
    const messagesWithSystem = [...messages];
    if (messagesWithSystem.length > 0 && systemPrompt) {
      messagesWithSystem[0] = {
        ...messagesWithSystem[0],
        content: `${systemPrompt}\n\n${messagesWithSystem[0].content}`
      };
    }

    const contents = this.formatMessages(messagesWithSystem);

    const response = await this.request(
      `/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
      {
        contents,
      },
      {}
    );

    console.log(`   ✅ Response received - ${response.usageMetadata?.candidatesTokenCount || 0} tokens`);

    return {
      message: response.candidates[0].content.parts[0].text,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount || 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount || 0
      },
      stopReason: 'stop'
    };
  }

  formatMessages(messages) {
    return messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
  }
}

/**
 * Provider Factory
 */
class ProviderFactory {
  static createProvider(providerConfig) {
    const { provider, apiKey, baseUrl, model, maxTokens, temperature } = providerConfig;

    const config = {
      apiKey,
      baseUrl,
      model,
      maxTokens: maxTokens || 8192,
      temperature: temperature || 0.7
    };

    switch (provider.toLowerCase()) {
      case 'anthropic':
      case 'claude':
        return new ClaudeProvider(config);

      case 'openai':
      case 'gpt':
        return new OpenAIProvider(config);

      case 'google':
      case 'gemini':
        return new GeminiProvider(config);

      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  static getSupportedProviders() {
    return ['anthropic', 'claude', 'openai', 'gpt', 'google', 'gemini'];
  }
}

export { ProviderFactory, ClaudeProvider, OpenAIProvider, GeminiProvider };
