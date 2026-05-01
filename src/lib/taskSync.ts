import { Task } from '../types';
import { supabase } from './supabaseClient';

const TASKS_TABLE = 'tasks';
const MILESTONES_TABLE = 'milestones';
const COMMENTS_TABLE = 'comments';

interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  created_date: string;
  due_date: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  updated_at: string;
}

interface MilestoneRow {
  id: string;
  task_id: string;
  title: string;
  target_date: string | null;
  completed: boolean;
  position: number;
}

interface CommentRow {
  id: string;
  task_id: string;
  text: string;
  created_at: string;
}

interface TaskWithRelationsRow extends TaskRow {
  milestones?: MilestoneRow[];
  comments?: CommentRow[];
}

function toDbStatus(status: Task['status']): TaskRow['status'] {
  if (status === 'Overdue') return 'Pending';
  return status;
}

function toTaskRow(task: Task, userId: string): TaskRow {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    created_date: task.createdDate,
    due_date: task.dueDate,
    status: toDbStatus(task.status),
    updated_at: new Date().toISOString(),
  };
}

function fromTaskRow(row: TaskWithRelationsRow): Task {
  const today = new Date().toISOString().split('T')[0];
  const derivedStatus: Task['status'] =
    row.status === 'Pending' && row.due_date < today ? 'Overdue' : row.status;

  return {
    id: row.id,
    title: row.title,
    createdDate: row.created_date,
    dueDate: row.due_date,
    status: derivedStatus,
    milestones: Array.isArray(row.milestones)
      ? row.milestones
          .sort((a, b) => a.position - b.position)
          .map((milestone) => ({
            id: milestone.id,
            title: milestone.title,
            targetDate: milestone.target_date ?? undefined,
            completed: milestone.completed,
          }))
      : [],
    comments: Array.isArray(row.comments)
      ? row.comments.map((comment) => ({
          id: comment.id,
          text: comment.text,
          createdAt: comment.created_at,
        }))
      : [],
  };
}

export async function upsertTaskForUser(task: Task, userId: string) {
  const { error: taskError } = await supabase
    .from(TASKS_TABLE)
    .upsert(toTaskRow(task, userId), { onConflict: 'id' });

  if (taskError) {
    throw taskError;
  }

  const { error: deleteMilestonesError } = await supabase
    .from(MILESTONES_TABLE)
    .delete()
    .eq('task_id', task.id);
  if (deleteMilestonesError) {
    throw deleteMilestonesError;
  }

  const { error: deleteCommentsError } = await supabase
    .from(COMMENTS_TABLE)
    .delete()
    .eq('task_id', task.id);
  if (deleteCommentsError) {
    throw deleteCommentsError;
  }

  if (task.milestones.length > 0) {
    const milestonePayload = task.milestones.map((milestone, index) => ({
      task_id: task.id,
      title: milestone.title,
      target_date: milestone.targetDate ?? null,
      completed: milestone.completed,
      position: index,
    }));
    const { error: milestoneInsertError } = await supabase
      .from(MILESTONES_TABLE)
      .insert(milestonePayload);
    if (milestoneInsertError) {
      throw milestoneInsertError;
    }
  }

  if (task.comments.length > 0) {
    const commentPayload = task.comments.map((comment) => ({
      task_id: task.id,
      text: comment.text,
      created_at: comment.createdAt,
    }));
    const { error: commentInsertError } = await supabase.from(COMMENTS_TABLE).insert(commentPayload);
    if (commentInsertError) {
      throw commentInsertError;
    }
  }
}

export async function fetchTasksForUser(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from(TASKS_TABLE)
    .select(
      'id,user_id,title,created_date,due_date,status,updated_at,milestones(id,task_id,title,target_date,completed,position),comments(id,task_id,text,created_at)'
    )
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => fromTaskRow(row as TaskWithRelationsRow));
}
