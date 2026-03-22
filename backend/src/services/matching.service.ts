import { IUser } from '../models/User';

const zodiacElements: Record<string, string> = {
    'Aries': 'Fire', 'Leo': 'Fire', 'Sagittarius': 'Fire',
    'Taurus': 'Earth', 'Virgo': 'Earth', 'Capricorn': 'Earth',
    'Gemini': 'Air', 'Libra': 'Air', 'Aquarius': 'Air',
    'Cancer': 'Water', 'Scorpio': 'Water', 'Pisces': 'Water'
};

const areSignsCompatible = (sign1?: string, sign2?: string): boolean => {
    if (!sign1 || !sign2) return false;
    const el1 = zodiacElements[sign1];
    const el2 = zodiacElements[sign2];
    
    if (el1 === el2) return true;
    
    if ((el1 === 'Fire' && el2 === 'Air') || (el1 === 'Air' && el2 === 'Fire')) return true;
    if ((el1 === 'Earth' && el2 === 'Water') || (el1 === 'Water' && el2 === 'Earth')) return true;
    
    return false;
};

export const calculateMatchScore = (userA: IUser, userB: IUser): number => {
    // 1. Gender Compatibility (Strict Requirement)
    const genderA = userA.profile.gender;
    const genderB = userB.profile.gender;
    
    const aPrefersB = genderB && userA.matchingPreferences.genderPreference.includes(genderB as any);
    const bPrefersA = genderA && userB.matchingPreferences.genderPreference.includes(genderA as any);
    
    if (!aPrefersB || !bPrefersA) {
        return 0; // Incompatible
    }

    let score = 1; // Base score for compatible genders

    // 2. Shared Interests
    const interestsA = new Set(userA.interests.map(i => i.value));
    const interestsB = new Set(userB.interests.map(i => i.value));
    
    let sharedInterests = 0;
    interestsA.forEach(interest => {
        if (interestsB.has(interest)) sharedInterests++;
    });
    
    score += (sharedInterests * 2);

    // 3. Zodiac Compatibility (Optional Boost)
    if (userA.matchingPreferences.useStarSignMatching && userB.matchingPreferences.useStarSignMatching) {
        if (areSignsCompatible(userA.profile.starSign, userB.profile.starSign)) {
            score += 5;
        }
    }

    return score;
};

export const findBestMatch = (waitingQueue: { socketId: string; user: IUser }[], newUser: IUser): { matchIndex: number, score: number } => {
    let bestMatchIndex = -1;
    let highestScore = 0;

    for (let i = 0; i < waitingQueue.length; i++) {
        const waitingUser = waitingQueue[i].user;
        const currentScore = calculateMatchScore(newUser, waitingUser);
        
        if (currentScore > highestScore) {
            highestScore = currentScore;
            bestMatchIndex = i;
        }
    }

    return { matchIndex: bestMatchIndex, score: highestScore };
};
