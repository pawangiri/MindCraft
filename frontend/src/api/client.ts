import axios from "axios";

const api = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

// Types
export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_staff: boolean;
  role: "admin" | "kid" | "user";
  kid_profile?: KidProfile;
}

export interface KidProfile {
  id: number;
  display_name: string;
  avatar: string;
  grade_level: number;
  date_of_birth: string | null;
  daily_chat_limit: number;
  age: number | null;
}

export interface Subject {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  order: number;
}

export interface Lesson {
  id: number;
  title: string;
  description: string;
  content?: string;
  topic_name: string;
  subject_name: string;
  subject_icon: string;
  subject_color: string;
  grade_level: number;
  difficulty: string;
  estimated_minutes: number;
  status: string;
  ai_generated: boolean;
  has_quiz?: boolean;
  quiz_id?: number | null;
  quiz_best_score?: { score: number; max_score: number; percentage: number } | null;
  created_at: string;
}

export interface ChatSession {
  id: number;
  title: string;
  context_type: string;
  context_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_message: string | null;
  message_count: number;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface JournalEntry {
  id: number;
  kid_name: string;
  lesson: number | null;
  lesson_title: string | null;
  title: string;
  content: string;
  ai_feedback: string;
  created_at: string;
  updated_at: string;
}

export interface Choice {
  id: number;
  choice_text: string;
  is_correct?: boolean;
  order: number;
}

export interface Question {
  id: number;
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "fill_blank" | "short_answer";
  order: number;
  points: number;
  choices: Choice[];
}

export interface Quiz {
  id: number;
  title: string;
  description: string;
  quiz_type: string;
  time_limit_minutes: number | null;
  lesson_id?: number | null;
  lesson_title?: string;
  question_count?: number;
  questions?: Question[];
  created_at: string;
}

export interface Topic {
  id: number;
  name: string;
  description?: string;
  subject: number;
  subject_name: string;
  grade_level_min: number;
  grade_level_max: number;
  order: number;
}

export interface QuizAttempt {
  id: number;
  quiz: number;
  quiz_title: string;
  score: number;
  max_score: number;
  started_at: string;
  completed_at: string | null;
}

export interface QuizSubmitResult {
  score: number;
  max_score: number;
  percentage: number;
  results: {
    question_id: number;
    is_correct: boolean;
    correct_choice_id: number | null;
    selected_choice_id: number | null;
    explanation: string;
  }[];
}

export interface ProgressOverview {
  lessons: { total: number; completed: number; in_progress: number };
  quizzes: { total_attempts: number; average_score: number };
  streak: { current_streak: number; longest_streak: number; last_activity_date: string | null };
  badges_earned: number;
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  badge_type: string;
  earned: boolean;
  earned_at: string | null;
}

export type PipelineStatus =
  | "topic_input"
  | "researching"
  | "research_complete"
  | "generating"
  | "generated"
  | "enriching"
  | "ready"
  | "published";

export interface ResearchFinding {
  id: number;
  session: number;
  summary: string;
  key_facts: string[];
  citations: { url: string; title: string; snippet: string }[];
  parent_notes: string;
  created_at: string;
  updated_at: string;
}

export interface MediaResource {
  id: number;
  session: number;
  lesson: number | null;
  url: string;
  title: string;
  description: string;
  media_type: "youtube" | "khan_academy" | "article" | "interactive" | "other";
  source: "auto" | "manual";
  thumbnail_url: string;
  order: number;
  is_included: boolean;
  created_at: string;
}

export interface ResearchSession {
  id: number;
  subject: number;
  subject_name: string;
  subject_icon: string;
  topic: number | null;
  topic_name: string;
  topic_query: string;
  grade_level: number;
  difficulty: string;
  status: PipelineStatus;
  lesson_id: number | null;
  finding: ResearchFinding | null;
  media_resources: MediaResource[];
  created_at: string;
  updated_at: string;
}

export type CurriculumStatus = "planning" | "outline_ready" | "generating" | "complete" | "published";

export interface CurriculumLessonOutline {
  title: string;
  description: string;
  learning_objectives: string[];
  estimated_minutes: number;
}

export interface CurriculumWeekOutline {
  week_number: number;
  title: string;
  description: string;
  lessons: CurriculumLessonOutline[];
}

export interface CurriculumOutline {
  title: string;
  description: string;
  subject_name: string;
  subject_icon: string;
  subject_color: string;
  weeks: CurriculumWeekOutline[];
}

export interface CurriculumLesson {
  id: number;
  curriculum: number;
  lesson: number;
  lesson_title: string;
  lesson_status: string;
  lesson_content: string;
  week_number: number;
  order: number;
  learning_objectives: string;
}

export interface MathProblem {
  problem_text: string;
  difficulty: string;
  hint: string;
}

export interface MathEvaluation {
  correct: boolean;
  correct_answer: string;
  feedback: string;
}

export interface CurriculumPlan {
  id: number;
  title: string;
  description: string;
  concept: string;
  grade_level: number;
  difficulty: string;
  duration_weeks: number;
  lessons_per_week: number;
  status: CurriculumStatus;
  outline: CurriculumOutline;
  subject: number | null;
  subject_name: string;
  subject_icon: string;
  subject_color: string;
  curriculum_lessons: CurriculumLesson[];
  total_lessons: number;
  generated_lessons: number;
  created_at: string;
  updated_at: string;
}

export interface MathPracticeSession {
  id: number;
  topic: string;
  chat_session_id: number | null;
  attempt_count: number;
  correct_count: number;
  created_at: string;
  updated_at: string;
}

export interface MathPracticeSessionDetail {
  id: number;
  topic: string;
  chat_session_id: number | null;
  attempts: MathProblemAttempt[];
  created_at: string;
  updated_at: string;
}

export interface MathProblemAttempt {
  id: number;
  problem_text: string;
  difficulty: string;
  hint: string;
  canvas_image_url: string | null;
  is_correct: boolean | null;
  correct_answer: string;
  feedback: string;
  order: number;
  created_at: string;
}
