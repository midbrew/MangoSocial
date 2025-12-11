import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Sparkles, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth, api } from '../../context/AuthContext';

const STAR_SIGNS = [
    { name: 'Aries', emoji: '♈', dates: 'Mar 21 - Apr 19' },
    { name: 'Taurus', emoji: '♉', dates: 'Apr 20 - May 20' },
    { name: 'Gemini', emoji: '♊', dates: 'May 21 - Jun 20' },
    { name: 'Cancer', emoji: '♋', dates: 'Jun 21 - Jul 22' },
    { name: 'Leo', emoji: '♌', dates: 'Jul 23 - Aug 22' },
    { name: 'Virgo', emoji: '♍', dates: 'Aug 23 - Sep 22' },
    { name: 'Libra', emoji: '♎', dates: 'Sep 23 - Oct 22' },
    { name: 'Scorpio', emoji: '♏', dates: 'Oct 23 - Nov 21' },
    { name: 'Sagittarius', emoji: '♐', dates: 'Nov 22 - Dec 21' },
    { name: 'Capricorn', emoji: '♑', dates: 'Dec 22 - Jan 19' },
    { name: 'Aquarius', emoji: '♒', dates: 'Jan 20 - Feb 18' },
    { name: 'Pisces', emoji: '♓', dates: 'Feb 19 - Mar 20' },
];

const GENDERS = ['Male', 'Female', 'Non-binary'];

interface Interest {
    id: string;
    name: string;
    emoji: string;
}

interface InterestsByCategory {
    [category: string]: Interest[];
}

export default function ProfileSetupPage() {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Form data
    const [formData, setFormData] = useState({
        name: user?.profile?.name || '',
        gender: user?.profile?.gender || '',
        starSign: user?.profile?.starSign || '',
        interests: [] as { type: 'predefined' | 'custom'; value: string; category?: string }[],
        genderPreference: [] as string[],
        useStarSignMatching: false,
    });

    // Available interests from API
    const [availableInterests, setAvailableInterests] = useState<InterestsByCategory>({});

    // Fetch interests on mount
    useEffect(() => {
        const fetchInterests = async () => {
            try {
                const response = await api.get('/user/interests');
                setAvailableInterests(response.data.interests);
            } catch (error) {
                console.error('Failed to fetch interests:', error);
            }
        };
        fetchInterests();
    }, []);

    const totalSteps = 4;

    const handleNext = () => {
        if (step < totalSteps) {
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const toggleInterest = (category: string, interest: Interest) => {
        const existing = formData.interests.find(
            i => i.value === interest.name && i.category === category
        );

        if (existing) {
            setFormData({
                ...formData,
                interests: formData.interests.filter(
                    i => !(i.value === interest.name && i.category === category)
                ),
            });
        } else {
            setFormData({
                ...formData,
                interests: [
                    ...formData.interests,
                    { type: 'predefined', value: interest.name, category },
                ],
            });
        }
    };

    const isInterestSelected = (category: string, name: string) => {
        return formData.interests.some(i => i.value === name && i.category === category);
    };

    const toggleGenderPreference = (gender: string) => {
        if (formData.genderPreference.includes(gender)) {
            setFormData({
                ...formData,
                genderPreference: formData.genderPreference.filter(g => g !== gender),
            });
        } else {
            setFormData({
                ...formData,
                genderPreference: [...formData.genderPreference, gender],
            });
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        setError('');

        try {
            await api.put('/user/profile', {
                name: formData.name,
                gender: formData.gender,
                starSign: formData.starSign || undefined,
                interests: formData.interests,
                matchingPreferences: {
                    genderPreference: formData.genderPreference,
                    useStarSignMatching: formData.useStarSignMatching,
                },
            });

            await refreshUser();
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to save profile');
        } finally {
            setIsLoading(false);
        }
    };

    const canProceed = () => {
        switch (step) {
            case 1:
                return formData.name.trim().length >= 2 && formData.gender;
            case 2:
                return formData.interests.length >= 3;
            case 3:
                return true; // Star sign is optional
            case 4:
                return formData.genderPreference.length > 0;
            default:
                return false;
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Progress Bar */}
            <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">Step {step} of {totalSteps}</span>
                    <span className="text-sm font-medium text-orange-500">
                        {Math.round((step / totalSteps) * 100)}%
                    </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-orange-400 to-orange-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(step / totalSteps) * 100}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6">
                <AnimatePresence mode="wait">
                    {/* Step 1: Name & Gender */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-full max-w-md space-y-8"
                        >
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <User className="w-8 h-8 text-purple-500" />
                                </div>
                                <h1 className="text-2xl font-bold text-gray-900">Let's get to know you</h1>
                                <p className="text-gray-500">What should we call you?</p>
                            </div>

                            <div className="space-y-6">
                                <Input
                                    label="Display Name"
                                    placeholder="Enter your name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    maxLength={20}
                                />

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">I am</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {GENDERS.map((g) => (
                                            <button
                                                key={g}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, gender: g })}
                                                className={`p-4 rounded-xl border-2 text-sm font-medium transition-all ${
                                                    formData.gender === g
                                                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                                                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                                }`}
                                            >
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 2: Interests */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-full max-w-lg space-y-6"
                        >
                            <div className="text-center space-y-2">
                                <h1 className="text-2xl font-bold text-gray-900">Pick your interests</h1>
                                <p className="text-gray-500">
                                    Select at least 3 ({formData.interests.length} selected)
                                </p>
                            </div>

                            <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2">
                                {Object.entries(availableInterests).map(([category, interests]) => (
                                    <div key={category}>
                                        <h3 className="text-sm font-semibold text-gray-500 mb-3">{category}</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {interests.map((interest) => (
                                                <button
                                                    key={interest.id}
                                                    type="button"
                                                    onClick={() => toggleInterest(category, interest)}
                                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                                        isInterestSelected(category, interest.name)
                                                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {interest.emoji} {interest.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Star Sign */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-full max-w-md space-y-6"
                        >
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">✨</span>
                                </div>
                                <h1 className="text-2xl font-bold text-gray-900">What's your sign?</h1>
                                <p className="text-gray-500">Optional - helps with compatibility matching</p>
                            </div>

                            <div className="grid grid-cols-3 gap-3 max-h-[45vh] overflow-y-auto">
                                {STAR_SIGNS.map((sign) => (
                                    <button
                                        key={sign.name}
                                        type="button"
                                        onClick={() => setFormData({ 
                                            ...formData, 
                                            starSign: formData.starSign === sign.name ? '' : sign.name 
                                        })}
                                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                                            formData.starSign === sign.name
                                                ? 'border-indigo-500 bg-indigo-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <span className="text-2xl block mb-1">{sign.emoji}</span>
                                        <span className={`text-sm font-medium ${
                                            formData.starSign === sign.name ? 'text-indigo-700' : 'text-gray-700'
                                        }`}>
                                            {sign.name}
                                        </span>
                                        <span className="text-xs text-gray-400 block">{sign.dates}</span>
                                    </button>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, starSign: '' })}
                                className="w-full text-sm text-gray-500 hover:text-gray-700"
                            >
                                Skip this step
                            </button>
                        </motion.div>
                    )}

                    {/* Step 4: Matching Preferences */}
                    {step === 4 && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-full max-w-md space-y-8"
                        >
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">💬</span>
                                </div>
                                <h1 className="text-2xl font-bold text-gray-900">Who do you want to meet?</h1>
                                <p className="text-gray-500">Select who you'd like to match with</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">I want to talk to</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {GENDERS.map((g) => (
                                            <button
                                                key={g}
                                                type="button"
                                                onClick={() => toggleGenderPreference(g)}
                                                className={`p-4 rounded-xl border-2 text-sm font-medium transition-all relative ${
                                                    formData.genderPreference.includes(g)
                                                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                                                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                                }`}
                                            >
                                                {formData.genderPreference.includes(g) && (
                                                    <Check className="w-4 h-4 absolute top-2 right-2 text-pink-500" />
                                                )}
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {formData.starSign && (
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-gray-700">Star sign matching</label>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ 
                                                ...formData, 
                                                useStarSignMatching: !formData.useStarSignMatching 
                                            })}
                                            className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                                                formData.useStarSignMatching
                                                    ? 'border-indigo-500 bg-indigo-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <div>
                                                <p className={`font-medium ${
                                                    formData.useStarSignMatching ? 'text-indigo-700' : 'text-gray-700'
                                                }`}>
                                                    Match by compatibility
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Prioritize compatible star signs
                                                </p>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                                formData.useStarSignMatching
                                                    ? 'border-indigo-500 bg-indigo-500'
                                                    : 'border-gray-300'
                                            }`}>
                                                {formData.useStarSignMatching && (
                                                    <Check className="w-4 h-4 text-white" />
                                                )}
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <p className="text-sm text-red-500 text-center">{error}</p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer Navigation */}
            <div className="p-6 border-t border-gray-100">
                <div className="flex gap-3 max-w-md mx-auto">
                    {step > 1 && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleBack}
                            className="flex-1"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                    )}
                    
                    {step < totalSteps ? (
                        <Button
                            type="button"
                            onClick={handleNext}
                            disabled={!canProceed()}
                            className={step === 1 ? 'w-full' : 'flex-1'}
                        >
                            Continue
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!canProceed() || isLoading}
                            isLoading={isLoading}
                            className="flex-1"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Complete Setup
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
