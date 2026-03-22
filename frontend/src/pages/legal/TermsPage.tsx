import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
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
                    <h1 className="text-lg font-bold text-gray-900">Terms of Service</h1>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-6 py-8 prose prose-gray prose-sm">
                <p className="text-sm text-gray-500">Last updated: March 21, 2026</p>

                <h2>1. Acceptance of Terms</h2>
                <p>
                    By accessing or using the Mango voice social platform ("Service"), you agree to be bound by
                    these Terms of Service. If you do not agree to these terms, please do not use the Service.
                    By creating an account, you confirm that you are at least 18 years old.
                </p>

                <h2>2. Description of Service</h2>
                <p>
                    Mango is a voice-first social discovery platform that connects users through time-limited
                    voice conversations. The Service includes AI-powered practice sessions, real-time voice
                    matching with other users, and social networking features.
                </p>

                <h2>3. Conversation Recording & Logging</h2>
                <p>
                    <strong>By using this Service, you acknowledge and consent that all conversations —
                    including AI practice sessions and calls with other users — are logged and recorded.</strong>
                </p>
                <p>Conversation logs are used for:</p>
                <ul>
                    <li>Ensuring user safety and preventing harassment or abuse</li>
                    <li>Content moderation and enforcement of community guidelines</li>
                    <li>Improving AI practice quality and responses</li>
                    <li>Investigating reports of misconduct</li>
                    <li>Service improvement and analysis</li>
                </ul>
                <p>
                    Conversation transcripts and audio data are stored securely and retained in accordance
                    with our Privacy Policy. You may not record or redistribute conversations without the
                    consent of all participants.
                </p>

                <h2>4. User Conduct</h2>
                <p>You agree not to:</p>
                <ul>
                    <li>Use the Service for any illegal or unauthorized purpose</li>
                    <li>Harass, threaten, bully, or intimidate other users</li>
                    <li>Share explicit, violent, or hateful content during voice conversations</li>
                    <li>Attempt to solicit personal information from other users</li>
                    <li>Use the Service to promote commercial products or services</li>
                    <li>Impersonate another person or misrepresent your identity</li>
                    <li>Interfere with or disrupt the Service or its infrastructure</li>
                    <li>Create multiple accounts or circumvent suspensions or bans</li>
                </ul>

                <h2>5. Account Termination</h2>
                <p>
                    We reserve the right to suspend or terminate your account at any time, without prior notice,
                    for conduct that we determine violates these Terms, is harmful to other users, or is
                    otherwise objectionable. This includes, but is not limited to, repeated reports from
                    other users, low reputation scores, or automated detection of prohibited content.
                </p>

                <h2>6. AI Practice Sessions</h2>
                <p>
                    AI practice sessions are powered by third-party AI services. While we strive to provide
                    helpful and safe interactions, AI responses are generated automatically and may not always
                    be accurate or appropriate. AI practice sessions are time-limited and subject to the same
                    conduct rules as human conversations.
                </p>

                <h2>7. Premium Features</h2>
                <p>
                    Certain features of the Service may require a premium subscription. Premium subscriptions
                    are billed according to the terms presented at the time of purchase. We reserve the right
                    to modify premium pricing and features with reasonable notice.
                </p>

                <h2>8. Intellectual Property</h2>
                <p>
                    The Service and its original content, features, and functionality are owned by MangoSocial
                    and are protected by international copyright, trademark, and other intellectual property laws.
                    You retain ownership of content you create, but grant us a license to use it as necessary
                    to operate the Service.
                </p>

                <h2>9. Disclaimer of Warranties</h2>
                <p>
                    The Service is provided "as is" and "as available" without warranties of any kind, either
                    express or implied. We do not guarantee that the Service will be uninterrupted, secure,
                    or error-free.
                </p>

                <h2>10. Limitation of Liability</h2>
                <p>
                    To the fullest extent permitted by law, MangoSocial shall not be liable for any indirect,
                    incidental, special, consequential, or punitive damages resulting from your use of or
                    inability to use the Service.
                </p>

                <h2>11. Changes to Terms</h2>
                <p>
                    We reserve the right to modify these Terms at any time. We will notify users of material
                    changes via the app or by other means. Your continued use of the Service after such
                    modifications constitutes acceptance of the updated Terms.
                </p>

                <h2>12. Contact</h2>
                <p>
                    If you have questions about these Terms, please contact us through the app's support features.
                </p>
            </main>
        </div>
    );
}
