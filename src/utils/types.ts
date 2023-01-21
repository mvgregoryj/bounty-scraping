// export interface Users {
//     "user": string;
//     "points": number;
// }

// export interface CurrentLeaderboard {
//     title: string;
//     repository: string;
//     id: number;
//     users: Users[];    
// }

export interface Questions {
    question: string;
    answer: string;
}

export interface Label {
    challengeId: number;
    user: string;
    points: number;
    status: string;
    followup: boolean;
}

export interface ChallengeSubmission {
    title: string;
    repository: string;
    id: number;
    body: string;
    challengeId: number;
    user: string;
    points: number;
    status: string;
    followup: boolean;
    questions: Questions[];
}