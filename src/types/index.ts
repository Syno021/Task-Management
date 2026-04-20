export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Overdue';

export interface Milestone {
  id: string;
  title: string;
  targetDate?: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  text: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  createdDate: string;
  dueDate: string;
  status: TaskStatus;
  milestones: Milestone[];
  comments: Comment[];
}
