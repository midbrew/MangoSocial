import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function ProfileSetupPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        gender: '',
        interests: [] as string[]
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Save profile
        console.log('Saving profile:', formData);
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md space-y-8"
            >
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <User className="w-8 h-8 text-purple-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Create Profile</h1>
                    <p className="text-gray-500">Tell us a bit about yourself</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        label="Display Name"
                        placeholder="How should we call you?"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Gender</label>
                        <div className="grid grid-cols-3 gap-3">
                            {['Male', 'Female', 'Non-binary'].map((g) => (
                                <button
                                    key={g}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, gender: g })}
                                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${formData.gender === g
                                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                        }`}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Button type="submit" className="w-full" size="lg">
                        Complete Setup <Sparkles className="ml-2 w-4 h-4" />
                    </Button>
                </form>
            </motion.div>
        </div>
    );
}
