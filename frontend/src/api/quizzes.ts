import api, { type Quiz, type QuizAttempt, type QuizSubmitResult } from "./client";

export async function getQuizzes(): Promise<Quiz[]> {
  const { data } = await api.get("/quizzes/");
  return data.results || data;
}

export async function getQuiz(id: number | string): Promise<Quiz> {
  const { data } = await api.get(`/quizzes/${id}/`);
  return data;
}

export async function startQuiz(id: number | string): Promise<QuizAttempt> {
  const { data } = await api.post(`/quizzes/${id}/start/`);
  return data;
}

export interface AnswerPayload {
  question_id: number;
  choice_id?: number | null;
  text_answer?: string;
}

export async function submitQuiz(
  id: number | string,
  answers: AnswerPayload[],
): Promise<QuizSubmitResult> {
  const { data } = await api.post(`/quizzes/${id}/submit/`, { answers });
  return data;
}

export async function generateQuiz(
  lessonId: number,
  numQuestions: number = 5,
): Promise<{ quiz_id: number; title: string; questions: number }> {
  const { data } = await api.post("/quizzes/generate/", {
    lesson_id: lessonId,
    num_questions: numQuestions,
  });
  return data;
}

export async function getHint(
  quizId: number | string,
  questionId: number,
  attemptNumber: number,
): Promise<string> {
  const { data } = await api.post(`/quizzes/${quizId}/hint/`, {
    question_id: questionId,
    attempt_number: attemptNumber,
  });
  return data.hint;
}
