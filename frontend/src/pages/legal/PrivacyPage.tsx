import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white">
            <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-100 z-10">
                <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-900">Privacy Policy</h1>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-6 py-8 prose prose-gray prose-sm">
                <p className="text-sm text-gray-500">Last updated: March 21, 2026</p>

                <h2>1. Information We Collect</h2>
                <p>We collect the following types of information when you use Mango:</p>

                <h3>Account Information</h3>
                <ul>
                    <li>Phone number (required for verification)</li>
                    <li>Profile details you provide: name, gender, birthdate, bio, star sign</li>
                    <li>Interests and matching preferences</li>
                </ul>

                <h3>Conversation Data</h3>
                <p>
                    <strong>All voice conversations on Mango are logged, including both AI practice sessions
                    and conversations with other users.</strong> This data includes:
                </p>
                <ul>
                    <li>Transcripts of voice conversations (text content)</li>
                    <li>Conversation metadata (duration, timestamps, participants)</li>
                    <li>Session completion status and outcomes</li>
                </ul>

                <h3>Usage Data</h3>
                <ul>
                    <li>Session activity (practice sessions completed, call history)</li>
                    <li>App usage patterns and feature interactions</li>
                    <li>Device information and browser type</li>
                </ul>

                <h2>2. How We Use Your Information</h2>
                <p>Your information is used to:</p>
                <ul>
                    <li>Provide and maintain the Service</li>
                    <li>Match you with compatible conversation partners</li>
                    <li>Power AI practice sessions and improve AI responses</li>
                    <li>Monitor and enforce community guidelines and user safety</li>
                    <li>Investigate reports of abuse, harassment, or misconduct</li>
                    <li>Improve and personalize your experience</li>
                    <li>Send important service notifications</li>
                </ul>

                <h2>3. Third-Party Services</h2>
                <p>
                    We use the following third-party services to operate Mango. Each processes data in
                    accordance with their own privacy policies:
                </p>
                <ul>
                    <li><strong>OpenAI</strong> — AI-generated conversation responses during practice sessions</li>
                    <li><strong>ElevenLabs</strong> — Text-to-speech voice synthesis for AI responses</li>
                    <li><strong>mNotify</strong> — SMS delivery for phone number verification</li>
                </ul>
                <p>
                    Conversation text may be sent to OpenAI and ElevenLabs to generate responses and audio.
                    These services may process data according to their respective privacy policies.
                </p>

                <h2>4. Data Retention</h2>
                <ul>
                    <li><strong>Account data</strong> is retained for as long as your account is active</li>
                    <li><strong>Conversation logs</strong> are retained for up to 90 days for safety and moderation purposes</li>
                    <li><strong>Reported conversations</strong> may be retained longer as required for investigation</li>
                    <li>Upon account deletion, personal data is removed within 30 days, except as required by law</li>
                </ul>

                <h2>5. Data Security</h2>
                <p>
                    We implement appropriate technical and organizational measures to protect your personal data
                    against unauthorized access, alteration, disclosure, or destruction. However, no method of
                    transmission over the Internet or electronic storage is 100% secure.
                </p>

                <h2>6. Your Rights</h2>
                <p>You have the right to:</p>
                <ul>
                    <li>Access the personal data we hold about you</li>
                    <li>Request correction of inaccurate data</li>
                    <li>Request deletion of your account and associated data</li>
                    <li>Withdraw consent for data processing where applicable</li>
                </ul>

                <h2>7. Children's Privacy</h2>
                <p>
                    Mango is not intended for users under the age of 18. We do not knowingly collect personal
                    information from children. If we become aware that we have collected data from a child
                    under 18, we will take steps to delete it promptly.
                </p>

                <h2>8. Changes to This Policy</h2>
                <p>
                    We may update this Privacy Policy from time to time. We will notify you of any material
                    changes via the app or other means. Your continued use of the Service after changes are
                    posted constitutes your acceptance of the revised policy.
                </p>

                <h2>9. Contact</h2>
                <p>
                    If you have questions about this Privacy Policy or your data, please contact us through
                    the app's support features.
                </p>
            </main>
        </div>
    );
}
