import { ElevenLabsClient } from 'elevenlabs';
const client = new ElevenLabsClient({ apiKey: 'sk_eb806985d4ef15aac02b8d2c7b1f1c19841311fc72145f88' });

async function test() {
    try {
        await client.textToSpeech.convert('XrExE9yKIg1WjnnRuX1e', {
            model_id: 'eleven_v3',
            text: 'Hello world',
            output_format: 'mp3_44100_128',
        });
        console.log('Success ama');
    } catch (e: any) {
        console.error('Ama failed:', e.message || e);
    }
}
test();
