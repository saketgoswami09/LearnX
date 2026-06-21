export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category_id: string;
  thumbnail: string;
  color: string;
  tags: string[];
  created_at: number;
  updated_at: number;
  // computed
  totalLessons?: number;
  completedLessons?: number;
  totalDuration?: number;
  progress?: number;
  categoryName?: string;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  created_at: number;
  // computed
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  module_id: string;
  course_id: string;
  title: string;
  type: 'video' | 'pdf' | 'note' | 'link';
  file_path: string;
  duration: number;
  order_index: number;
  created_at: number;
  // computed
  completed?: boolean;
  position?: number;
}

export interface Progress {
  id: string;
  lesson_id: string;
  user_id: string;
  position: number;
  completed: number;
  last_watched: number;
  watch_time: number;
}

export interface Note {
  id: string;
  lesson_id: string | null;
  course_id: string | null;
  content: string;
  timestamp_ref: number | null;
  tags: string[];
  created_at: number;
  updated_at: number;
}

export interface Bookmark {
  id: string;
  lesson_id: string;
  timestamp: number;
  label: string;
  created_at: number;
}

export interface ActivityLog {
  id: string;
  date: string;
  lesson_id: string;
  duration: number;
  type: 'watch' | 'read' | 'note';
}

export interface DashboardStats {
  totalCourses: number;
  totalLessons: number;
  completedLessons: number;
  totalHoursLearned: number;
  streak: number;
  todayMinutes: number;
  recentActivity: RecentItem[];
  continueWatching: ContinueItem[];
}

export interface RecentItem {
  lesson_id: string;
  lesson_title: string;
  course_id: string;
  course_title: string;
  last_watched: number;
  position: number;
  duration: number;
}

export interface ContinueItem {
  lesson_id: string;
  lesson_title: string;
  course_id: string;
  course_title: string;
  position: number;
  duration: number;
  progress_pct: number;
}

export interface SearchResult {
  type: 'course' | 'lesson' | 'note';
  id: string;
  title: string;
  subtitle: string;
  course_id?: string;
  lesson_id?: string;
}
