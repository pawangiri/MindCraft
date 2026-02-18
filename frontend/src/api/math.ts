import api from "./client";
import type {
  MathProblem,
  MathEvaluation,
  MathPracticeSession,
  MathPracticeSessionDetail,
  MathProblemAttempt,
} from "./client";

export async function generateProblem(
  grade: number,
  topic: string
): Promise<MathProblem> {
  const { data } = await api.post("/math/generate/", { grade, topic });
  return data;
}

export async function evaluateAnswer(
  problem: string,
  imageBase64: string,
  grade: number
): Promise<MathEvaluation> {
  const { data } = await api.post("/math/evaluate/", {
    problem,
    image_base64: imageBase64,
    grade,
  });
  return data;
}

export async function getSessions(): Promise<MathPracticeSession[]> {
  const { data } = await api.get("/math/sessions/");
  return data.results ?? data;
}

export async function createSession(topic: string): Promise<MathPracticeSessionDetail> {
  const { data } = await api.post("/math/sessions/", { topic });
  return data;
}

export async function getSession(id: number): Promise<MathPracticeSessionDetail> {
  const { data } = await api.get(`/math/sessions/${id}/`);
  return data;
}

export async function createAttempt(
  sessionId: number,
  attempt: { problem_text: string; difficulty: string; hint: string }
): Promise<MathProblemAttempt> {
  const { data } = await api.post(`/math/sessions/${sessionId}/attempts/`, attempt);
  return data;
}

export async function updateAttempt(
  sessionId: number,
  attemptId: number,
  updates: Partial<{ canvas_image: File; is_correct: boolean; correct_answer: string; feedback: string }>
): Promise<MathProblemAttempt> {
  if (updates.canvas_image) {
    const formData = new FormData();
    formData.append("canvas_image", updates.canvas_image);
    if (updates.is_correct !== undefined) formData.append("is_correct", String(updates.is_correct));
    if (updates.correct_answer) formData.append("correct_answer", updates.correct_answer);
    if (updates.feedback) formData.append("feedback", updates.feedback);
    const { data } = await api.patch(
      `/math/sessions/${sessionId}/attempts/${attemptId}/`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data;
  }
  const { data } = await api.patch(`/math/sessions/${sessionId}/attempts/${attemptId}/`, updates);
  return data;
}
