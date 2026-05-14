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
