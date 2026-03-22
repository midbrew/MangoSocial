import { ElevenLabsClient } from 'elevenlabs';

const client = new ElevenLabsClient({ apiKey: 'sk_eb806985d4ef15aac02b8d2c7b1f1c19841311fc72145f88' });

async function test() {
    try {
        const audioStream = await client.textToSpeech.convert('TxGEqnHWrfWFTfGW9XjX', {
            model_id: 'eleven_v3',
            text: 'Hello world',
            output_format: 'mp3_44100_128',
        });
        console.log('Success, received stream');
    } catch (e: any) {
        console.error('eleven_v3 failed:', e.message || e);
    }

    try {
        const audioStream = await client.textToSpeech.convert('TxGEqnHWrfWFTfGW9XjX', {
            model_id: 'eleven_turbo_v2_5',
            text: 'Hello world',
            output_format: 'mp3_44100_128',
        });
        console.log('Success with eleven_turbo_v2_5');
    } catch (e: any) {
        console.error('twenty turbo failed:', e.message || e);
    }
}

test();
