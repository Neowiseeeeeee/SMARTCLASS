import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
    return Promise.reject(err)
  }
)

export default api

// Auth
export const authApi = {
  login: (data: { identifier: string; password: string; role: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
}

// Announcements
export const announcementsApi = {
  getPublic: () => api.get('/announcements/public'),
  getAll: () => api.get('/announcements'),
  getCategories: () => api.get('/announcements/categories'),
  create: (data: any) => api.post('/announcements', data),
  update: (id: string, data: any) => api.put(`/announcements/${id}`, data),
  delete: (id: string) => api.delete(`/announcements/${id}`),
  createCategory: (data: any) => api.post('/announcements/categories', data),
  uploadMedia: (id: string, file: File) => {
    const fd = new FormData()
    fd.append('media', file)
    return api.post(`/announcements/${id}/upload`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  removeMedia: (id: string) => api.delete(`/announcements/${id}/media`),
}

// Students
export const studentsApi = {
  getAll: (params?: any) => api.get('/students', { params }),
  getOne: (id: string) => api.get(`/students/${id}`),
  create: (data: any) => api.post('/students', data),
  update: (id: string, data: any) => api.put(`/students/${id}`, data),
  archive: (id: string) => api.patch(`/students/${id}/archive`),
  resetPassword: (id: string) => api.post(`/students/${id}/reset-password`),
  reassignSection: (id: string, data: { sectionId: string; academicYearId: string; gradeLevelId: string }) =>
    api.patch(`/students/${id}/section`, data),
  removeFromSection: (id: string) => api.delete(`/students/${id}/section`),
  importStudents: (data: { rows: any[]; dryRun: boolean; academicYearId?: string; gradeLevelId?: string; sectionId?: string }) =>
    api.post('/students/import', data),
  getAttendance: (id: string) => api.get(`/students/${id}/attendance`),
  getScores: (id: string) => api.get(`/students/${id}/scores`),
}

// Teachers
export const teachersApi = {
  getAll: (params?: any) => api.get('/teachers', { params }),
  getOne: (id: string) => api.get(`/teachers/${id}`),
  create: (data: any) => api.post('/teachers', data),
  update: (id: string, data: any) => api.put(`/teachers/${id}`, data),
  archive: (id: string) => api.patch(`/teachers/${id}/archive`),
  resetPassword: (id: string) => api.post(`/teachers/${id}/reset-password`),
  addAssignment: (id: string, data: any) => api.post(`/teachers/${id}/assignments`, data),
}

// Attendance
export const attendanceApi = {
  createSession: (data: any) => api.post('/attendance/sessions', data),
  getSessions: () => api.get('/attendance/sessions'),
  getSession: (id: string) => api.get(`/attendance/sessions/${id}`),
  updateRecord: (id: string, data: any) => api.patch(`/attendance/records/${id}`, data),
  generateCode: (sessionId: string, data: any) =>
    api.post(`/attendance/sessions/${sessionId}/generate-code`, data),
  closeSession: (id: string) => api.patch(`/attendance/sessions/${id}/close`),
  getPublicSession: (code: string) => api.get(`/attendance/public/${code}`),
  submitAttendance: (data: any) => api.post('/attendance/public/submit', data),
  getAdminSessions: () => api.get('/attendance/admin/sessions'),
}

// Academic
export const academicApi = {
  createActivity: (data: any) => api.post('/academic/activities', data),
  getActivities: () => api.get('/academic/activities'),
  recordScores: (activityId: string, scores: any) =>
    api.post(`/academic/activities/${activityId}/scores`, scores),
  submitScore: (data: any) => api.post('/academic/scores', data),
  getAdminActivities: () => api.get('/academic/admin/activities'),
}

// Structure
export const structureApi = {
  getAcademicYears: () => api.get('/structure/academic-years'),
  createAcademicYear: (data: any) => api.post('/structure/academic-years', data),
  getGradeLevels: () => api.get('/structure/grade-levels'),
  createGradeLevel: (data: any) => api.post('/structure/grade-levels', data),
  createStrand: (data: any) => api.post('/structure/strands', data),
  getSections: () => api.get('/structure/sections'),
  createSection: (data: any) => api.post('/structure/sections', data),
  getSubjects: () => api.get('/structure/subjects'),
  createSubject: (data: any) => api.post('/structure/subjects', data),
  getSchedules: (params?: any) => api.get('/structure/schedules', { params }),
  createSchedule: (data: any) => api.post('/structure/schedules', data),
}

// Settings
export const settingsApi = {
  getPublic: () => api.get('/settings/public'),
  getAll: () => api.get('/settings'),
  update: (data: any) => api.put('/settings', data),
  getDashboardStats: () => api.get('/settings/dashboard-stats'),
}
