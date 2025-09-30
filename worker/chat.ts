import OpenAI from 'openai';
import type { Message, ToolCall } from './types';
import { getToolDefinitions, executeTool } from './tools';
import { ChatCompletionMessageFunctionToolCall } from 'openai/resources/index.mjs';
/**
 * ChatHandler - Handles all chat-related operations
 *
 * This class encapsulates the OpenAI integration and tool execution logic,
 * making it easy for AI developers to understand and extend the functionality.
 */
export class ChatHandler {
  private client: OpenAI;
  private model: string;
  constructor(aiGatewayUrl: string, apiKey: string, model: string) {
    this.client = new OpenAI({
      baseURL: aiGatewayUrl,
      apiKey: apiKey
    });
    console.log("BASE URL", aiGatewayUrl);
    this.model = model;
  }
  /**
   * Process a user message and generate AI response with optional tool usage
   */
  async processMessage(
    message: string,
    conversationHistory: Message[],
    onChunk?: (chunk: string) => void
  ): Promise<{
    content: string;
    toolCalls?: ToolCall[];
  }> {
    const messages = this.buildConversationMessages(message, conversationHistory);
    const toolDefinitions = await getToolDefinitions();
    if (onChunk) {
      // Use streaming with callback
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages,
        tools: toolDefinitions,
        tool_choice: 'auto',
        max_tokens: 4096,
        stream: true,
        // reasoning_effort: 'low'
      });
      return this.handleStreamResponse(stream, message, conversationHistory, onChunk);
    }
    // Non-streaming response
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
      tools: toolDefinitions,
      tool_choice: 'auto',
      max_tokens: 4096,
      stream: false
    });
    return this.handleNonStreamResponse(completion, message, conversationHistory);
  }
  private async handleStreamResponse(
    stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
    message: string,
    conversationHistory: Message[],
    onChunk: (chunk: string) => void
  ) {
    let fullContent = '';
    const accumulatedToolCalls: ChatCompletionMessageFunctionToolCall[] = [];
    try {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          fullContent += delta.content;
          onChunk(delta.content);
        }
        // Accumulate tool calls from streaming chunks
        if (delta?.tool_calls) {
          for (let i = 0; i < delta.tool_calls.length; i++) {
            const deltaToolCall = delta.tool_calls[i];
            if (!accumulatedToolCalls[i]) {
              accumulatedToolCalls[i] = {
                id: deltaToolCall.id || `tool_${Date.now()}_${i}`,
                type: 'function',
                function: {
                  name: deltaToolCall.function?.name || '',
                  arguments: deltaToolCall.function?.arguments || ''
                }
              };
            } else {
              // Append to existing tool call
              if (deltaToolCall.function?.name && !accumulatedToolCalls[i].function.name) {
                accumulatedToolCalls[i].function.name = deltaToolCall.function.name;
              }
              if (deltaToolCall.function?.arguments) {
                accumulatedToolCalls[i].function.arguments += deltaToolCall.function.arguments;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream processing error:', error);
      throw new Error('Stream processing failed');
    }
    if (accumulatedToolCalls.length > 0) {
      const executedTools = await this.executeToolCalls(accumulatedToolCalls);
      const finalResponse = await this.generateToolResponse(message, conversationHistory, accumulatedToolCalls, executedTools);
      return { content: finalResponse, toolCalls: executedTools };
    }
    return { content: fullContent };
  }
  private async handleNonStreamResponse(
    completion: OpenAI.Chat.Completions.ChatCompletion,
    message: string,
    conversationHistory: Message[]
  ) {
    const responseMessage = completion.choices[0]?.message;
    if (!responseMessage) {
      return { content: 'I apologize, but I encountered an issue processing your request.' };
    }
    if (!responseMessage.tool_calls) {
      return {
        content: responseMessage.content || 'I apologize, but I encountered an issue.'
      };
    }
    const toolCalls = await this.executeToolCalls(responseMessage.tool_calls as ChatCompletionMessageFunctionToolCall[]);
    const finalResponse = await this.generateToolResponse(
      message,
      conversationHistory,
      responseMessage.tool_calls,
      toolCalls
    );
    return { content: finalResponse, toolCalls };
  }
  /**
   * Execute all tool calls from OpenAI response
   */
  private async executeToolCalls(openAiToolCalls: ChatCompletionMessageFunctionToolCall[]): Promise<ToolCall[]> {
    return Promise.all(
      openAiToolCalls.map(async (tc) => {
        try {
          const args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
          const result = await executeTool(tc.function.name, args);
          return {
            id: tc.id,
            name: tc.function.name,
            arguments: args,
            result
          };
        } catch (error) {
          console.error(`Tool execution failed for ${tc.function.name}:`, error);
          return {
            id: tc.id,
            name: tc.function.name,
            arguments: {},
            result: { error: `Failed to execute ${tc.function.name}: ${error instanceof Error ? error.message : 'Unknown error'}` }
          };
        }
      })
    );
  }
  /**
   * Generate final response after tool execution
   */
  private async generateToolResponse(
    userMessage: string,
    history: Message[],
    openAiToolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[],
    toolResults: ToolCall[]
  ): Promise<string> {
    const followUpCompletion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant. Respond naturally to the tool results.' },
        ...history.slice(-3).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
        {
          role: 'assistant',
          content: null,
          tool_calls: openAiToolCalls
        },
        ...toolResults.map((result, index) => ({
          role: 'tool' as const,
          content: JSON.stringify(result.result),
          tool_call_id: openAiToolCalls[index]?.id || result.id
        }))
      ],
      max_tokens: 4096
    });
    return followUpCompletion.choices[0]?.message?.content || 'Tool results processed successfully.';
  }
  /**
   * Build conversation messages for OpenAI API
   */
  private buildConversationMessages(userMessage: string, history: Message[]) {
    const systemPrompt = `You are "AuraHire", a professional and courteous AI-powered interview agent. Your purpose is to conduct a structured initial screening interview for HR roles.
Your process is as follows:
1.  **Initial State**: If the conversation has just begun, you have already greeted the user and asked them to select a role. You are now waiting for their selection.
2.  **Role Selection**: The user's first message will indicate their chosen role, either "Office Staff" or "Beauty Host".
3.  **Initiate Interview**: Once the role is identified, acknowledge their selection and begin the structured 5-question interview for that specific role. Ask only ONE question at a time.
4.  **Conduct Interview**: After each user response, ask the next question in the sequence. Be encouraging and maintain a professional tone. Do not deviate from the script.
5.  **Conclusion**: After the 5th question is answered, provide a polite concluding message and end the interview.
**Interview Script for "Office Staff":**
- Question 1: "Great, let's begin. Can you describe your previous experience in an office environment and what your key responsibilities were?"
- Question 2: "How do you prioritize your tasks when you have multiple deadlines to meet?"
- Question 3: "Describe a time you had to handle a difficult situation with a colleague or client. How did you resolve it?"
- Question 4: "What software and tools are you proficient in for office administration?"
- Question 5: "What do you believe are the most important qualities for an office staff member to contribute to a positive and efficient workplace?"
- Concluding Message: "Thank you for sharing your experiences. That concludes our initial screening. We appreciate your time, and our HR team will be in touch with the next steps. Have a great day!"
**Interview Script for "Beauty Host":**
- Question 1: "Excellent, let's get started. What attracts you to the role of a Beauty Host, and what does an elevated brand experience mean to you?"
- Question 2: "Can you share an example of a time you went above and beyond to provide exceptional customer service?"
- Question 3: "How do you stay updated on the latest beauty trends and product knowledge?"
- Question 4: "Describe a situation where you had to assist a client who was unsure about what they wanted. How did you guide them?"
- Question 5: "In a fast-paced retail environment, how do you maintain a positive and welcoming atmosphere for every client?"
- Concluding Message: "Thank you for your thoughtful answers. That's all the questions I have for now. We appreciate you taking the time to speak with us. Our recruitment team will review your responses and be in contact regarding the next steps. Have a wonderful day!"
**Rules of Engagement:**
- Only ask one question at a time.
- Wait for the user's response before proceeding to the next question.
- Do not add any commentary or follow-up questions outside of the script.
- If the user's first message is not a role selection, gently guide them back: "To proceed, please first select a role from the dropdown menu."`;
    return [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      ...history.map(m => ({
        role: m.role,
        content: m.content
      })),
      { role: 'user' as const, content: userMessage }
    ];
  }
  /**
   * Update the model for this chat handler
   */
  updateModel(newModel: string): void {
    this.model = newModel;
  }
}