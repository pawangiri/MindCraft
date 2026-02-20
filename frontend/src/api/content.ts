import api, { type Subject, type Topic } from './client';

export const getSubjects = () => api.get('/subjects/').then(r => r.data.results ?? r.data) as Promise<Subject[]>;
export const createSubject = (data: Partial<Subject>) => api.post('/subjects/', data).then(r => r.data) as Promise<Subject>;
export const updateSubject = (id: number, data: Partial<Subject>) => api.patch(`/subjects/${id}/`, data).then(r => r.data) as Promise<Subject>;
export const deleteSubject = (id: number) => api.delete(`/subjects/${id}/`);

export interface TopicSuggestion {
  name: string;
  description: string;
  grade_level_min: number;
  grade_level_max: number;
}

export const suggestTopics = (subjectId: number) =>
  api.post(`/subjects/${subjectId}/suggest-topics/`).then(r => r.data.topics) as Promise<TopicSuggestion[]>;

export const getTopics = (subjectId?: number) => api.get('/topics/', { params: subjectId ? { subject: subjectId } : {} }).then(r => r.data.results ?? r.data) as Promise<Topic[]>;
export const createTopic = (data: Record<string, unknown>) => api.post('/topics/', data).then(r => r.data) as Promise<Topic>;
export const updateTopic = (id: number, data: Record<string, unknown>) => api.patch(`/topics/${id}/`, data).then(r => r.data) as Promise<Topic>;
export const deleteTopic = (id: number) => api.delete(`/topics/${id}/`);
