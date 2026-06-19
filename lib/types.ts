export interface NorthStar {
  id: string;
  goal: string;
  why: string;
  createdAt: string;
  targetDate?: string;
  lockedInMilestoneId?: string;
}

export interface Goal {
  id: string;
  northStarId: string;
  title: string;
  order: number;
}

export interface Task {
  id: string;
  milestoneId: string;
  title: string;
  completed: boolean;
  order: number;
}

export interface SubGoal {
  id: string;
  milestoneId: string;
  title: string;
  why?: string;
  tasks: Task[];
}

export interface Milestone {
  id: string;
  northStarId: string;
  goalId?: string;
  title: string;
  description: string;
  notes?: string;
  order: number;
  completed: boolean;
  tasks: Task[];
  targetDate?: string;
  subGoals?: SubGoal[];
}

export interface Supporter {
  id: string;
  northStarId: string;
  name: string;
  phone: string;
  relationship: string;
}

// "Seven Seven Seven" reflection exercise — account-wide, not tied to a North Star.
export interface SevenSevenSeven {
  people: string[];     // up to 7 — the people who take up the most space in your mind
  places: string[];     // up to 7 — where your life unfolds
  behaviors: string[];  // up to 7 — what you consistently do
  releaseItem: string;  // enlightened exchange — what to soften/let go
  nourishItem: string;  // enlightened exchange — what nourishing thing to bring in
  updatedAt: string;
}
