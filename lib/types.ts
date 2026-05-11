export interface NorthStar {
  id: string;
  goal: string;
  why: string;
  createdAt: string;
  targetDate?: string;
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
  title: string;
  description: string;
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
