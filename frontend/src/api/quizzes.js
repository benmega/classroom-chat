import client from './client';

// Tests (quizzes): the backend's /api/quizzes endpoints. Every call resolves to the envelope's data.
const unwrap = (response) => response.data?.data ?? response.data;

// Student
export const listQuizzes = () => client.get('/api/quizzes').then(unwrap);
export const startAttempt = (slug) => client.post(`/api/quizzes/${encodeURIComponent(slug)}/attempts`).then(unwrap);
export const getAttempt = (attemptId) => client.get(`/api/quizzes/attempts/${attemptId}`).then(unwrap);
export const saveAttempt = (attemptId, progress) => client.patch(`/api/quizzes/attempts/${attemptId}`, progress).then(unwrap);
export const submitAttempt = (attemptId, progress = {}) =>
  client.post(`/api/quizzes/attempts/${attemptId}/submit`, progress).then(unwrap);

// Parents (their linked children) and admins
export const listStudentAttempts = (studentId) => client.get(`/api/quizzes/students/${studentId}/attempts`).then(unwrap);

// Admin
export const listAdminQuizzes = () => client.get('/api/quizzes/admin').then(unwrap);
export const updateQuizSettings = (slug, settings) =>
  client.patch(`/api/quizzes/admin/${encodeURIComponent(slug)}`, settings).then(unwrap);
export const listAdminResults = (params = {}) => client.get('/api/quizzes/admin/results', { params }).then(unwrap);
export const deleteAttempt = (attemptId) => client.delete(`/api/quizzes/admin/attempts/${attemptId}`).then(unwrap);
export const createQuiz = (quiz) => client.post('/api/quizzes/admin', quiz).then(unwrap);
// Replaces who the test is assigned to; both lists empty opens it to everyone.
export const setQuizAssignments = (slug, assignments) =>
  client.put(`/api/quizzes/admin/${encodeURIComponent(slug)}/assignments`, assignments).then(unwrap);
export const listAdminClassrooms = () => client.get('/api/admin/classrooms').then(unwrap);
