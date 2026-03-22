import OpenAI from 'openai';
import { ElevenLabsClient } from 'elevenlabs';
import dotenv from 'dotenv';

dotenv.config();

export class AiService {
    private openai: OpenAI | null = null;
    private elevenlabs: ElevenLabsClient | null = null;

    constructor() {
        // Delay client initialization to avoid ES modules hoisting issues 
        // where this runs before dotenv.config() finishes.
    }

    private getOpenAI(): OpenAI | null {
        if (!this.openai && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
            this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        }
        return this.openai;
    }

    private getElevenLabs(): ElevenLabsClient | null {
        if (!this.elevenlabs && process.env.ELEVENLABS_API_KEY) {
            this.elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
        }
        return this.elevenlabs;
    }

    async generateResponse(
        systemPrompt: string,
        messages: { role: 'user' | 'assistant' | 'system'; content: string }[]
    ): Promise<string> {
        const openaiClient = this.getOpenAI();
        // If OpenAI is not configured, return mock responses
        if (!openaiClient) {
            return this.getMockResponse(messages);
        }

        try {
            const completion = await openaiClient.chat.completions.create({
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

    async generateAudio(text: string, voiceId = 'UgBBYS2sOqTuMpoF3BR0'): Promise<string | null> {
        const client = this.getElevenLabs();
        if (!client) {
            console.warn('WARNING: getElevenLabs() returned null, missing api key?');
            return null;
        }

        try {
            // JBFqnCBsd6RMkjVDRZzb = "George" – warm conversational male voice
            const audioStream = await client.textToSpeech.convert(voiceId, {
                model_id: 'eleven_v3',
                text,
                output_format: 'mp3_44100_128',
            });

            // Convert stream to Buffer then base64
            const chunks: Buffer[] = [];
            for await (const chunk of audioStream) {
                chunks.push(Buffer.from(chunk));
            }
            const buffer = Buffer.concat(chunks);
            return buffer.toString('base64');
        } catch (error) {
            console.error('ElevenLabs API error:', error);
            return null; // Fallback to browser TTS
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
