import { ElevenLabsClient } from 'elevenlabs';
const client = new ElevenLabsClient({ apiKey: 'sk_eb806985d4ef15aac02b8d2c7b1f1c19841311fc72145f88' });

async function test() {
    for (const voiceId of ['TxGEqnHWrfWFTfGW9XjX', 'XrExE9yKIg1WjnnRuX1e', 'UgBBYS2sOqTuMpoF3BR0']) {
        try {
            await client.textToSpeech.convert(voiceId, {
                model_id: 'eleven_v3',
                text: 'Hello world',
                output_format: 'mp3_44100_128',
            });
            console.log(`Success for: ${voiceId}`);
        } catch (e: any) {
            console.error(`Failed for ${voiceId}:`, e.message || e.statusCode || e);
        }
    }
}
test();
