import api from "./client";
import type { MathProblem, MathEvaluation } from "./client";

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
