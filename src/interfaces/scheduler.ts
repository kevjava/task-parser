/**
 * TaskScheduler interface - shared contract for task scheduling
 *
 * This interface allows different scheduling backends (TTScheduler, ChurnScheduler)
 * to be used interchangeably by client applications.
 */

export interface ScheduledTask {
  id: number;
  title: string;
  project?: string;
  tags: string[];
  estimateMinutes?: number;
  priority?: number;
  scheduledDateTime?: Date;
  deadline?: Date;
  windowStart?: string; // HH:MM
  windowEnd?: string; // HH:MM
}

export interface DailyPlan {
  tasks: ScheduledTask[];
  totalMinutes: number;
  remainingMinutes: number;
}

export interface CompletionData {
  taskId: number;
  completedAt: Date;
  actualMinutes: number;
  scheduledMinutes?: number;
}

export interface TaskScheduler {
  /** Get prioritized tasks for a given date */
  getDailyPlan(date: Date, options?: { limit?: number }): DailyPlan | Promise<DailyPlan>;

  /** Get a specific task by ID */
  getTask(id: number): ScheduledTask | null | Promise<ScheduledTask | null>;

  /** Mark task complete with time tracking data */
  completeTask(completion: CompletionData): void | Promise<void>;

  /** Add a new scheduled task */
  addTask(task: Omit<ScheduledTask, 'id'>): ScheduledTask | Promise<ScheduledTask>;

  /** Remove a scheduled task */
  removeTask(id: number): void | Promise<void>;

  /** Check if scheduler is available/configured */
  isAvailable(): boolean;
}
