export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMConfig {
  apiBase: string;
  apiKey: string;
  model: string;
  temperature?: number;
}

export class LLM {
  private config: LLMConfig;
  private messages: LLMMessage[];

  constructor(systemPrompt: string, config: LLMConfig) {
    this.config = config;
    this.messages = [
      { role: "system", content: systemPrompt }
    ];
  }

  /**
   * Send a chat message and get response
   * Saves both user message and assistant response to internal history
   */
  async chat(userPrompt: string): Promise<string> {
    // Add user message to history
    this.messages.push({ role: "user", content: userPrompt });

    try {
      const response = await fetch(`${this.config.apiBase}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: this.messages,
          temperature: this.config.temperature ?? 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices?.[0]?.message?.content as string;

      if (!assistantMessage) {
        throw new Error("No response from LLM");
      }

      // Add assistant message to history
      this.messages.push({ role: "assistant", content: assistantMessage });

      return assistantMessage;
    } catch (error) {
      // Remove user message on error to keep history clean
      this.messages.pop();
      throw error;
    }
  }

  /**
   * Get all messages in the conversation history
   */
  getMessages(): LLMMessage[] {
    return [...this.messages];
  }

  /**
   * Clear conversation history (keeps system prompt)
   */
  clearHistory(): void {
    const systemPrompt = this.messages.find(m => m.role === "system");
    this.messages = systemPrompt ? [systemPrompt] : [];
  }

  /**
   * Add a custom message to history (for manual intervention)
   */
  addMessage(role: "user" | "assistant", content: string): void {
    this.messages.push({ role, content });
  }

  /**
   * Get message count (excluding system prompt)
   */
  getMessageCount(): number {
    return this.messages.filter(m => m.role !== "system").length;
  }
}
