import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

export class AiService {
    private openai: OpenAI | null = null;

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        
        if (apiKey && apiKey !== 'your_openai_api_key_here') {
            this.openai = new OpenAI({ apiKey });
        } else {
            console.warn('WARNING: OPENAI_API_KEY is not set. AI responses will be mocked.');
        }
    }

    async generateResponse(
        systemPrompt: string,
        messages: { role: 'user' | 'assistant' | 'system'; content: string }[]
    ): Promise<string> {
        // If OpenAI is not configured, return mock responses
        if (!this.openai) {
            return this.getMockResponse(messages);
        }

        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages.map(m => ({
                        role: m.role as 'user' | 'assistant' | 'system',
                        content: m.content
                    }))
                ],
                max_tokens: 150,
                temperature: 0.8,
            });

            return completion.choices[0]?.message?.content || "I'm not sure what to say. Could you try again?";
        } catch (error) {
            console.error('OpenAI API error:', error);
            throw new Error('Failed to generate AI response');
        }
    }

    private getMockResponse(messages: { role: string; content: string }[]): string {
        const userMessages = messages.filter(m => m.role === 'user');
        const messageCount = userMessages.length;

        // Mock responses based on conversation stage
        const mockResponses = [
            "Hey! Nice to meet you! How's your day going so far?",
            "That's awesome! I love hearing about that. What got you interested in it?",
            "Oh cool! I can totally relate to that. I've been really into similar things lately.",
            "That's really interesting! Tell me more about that. I'm curious to know your thoughts.",
            "I totally get what you mean! It's great connecting with someone who thinks similarly.",
            "This has been such a fun chat! You're really easy to talk to. Thanks for practicing with me! 🎉"
        ];

        const index = Math.min(messageCount, mockResponses.length - 1);
        return mockResponses[index];
    }
}
