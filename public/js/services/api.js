/**
 * SmartAttend - Client API Service
 * Encapsulates all backend HTTP and Real-Time SSE communication.
 * Ready for drop-in replacement with Amazon API Gateway & AWS Cognito tokens.
 */

const API_BASE = '/api';

class ApiService {
  /**
   * Helper for standard JSON requests
   */
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // AWS Cognito Bearer token support (when deployed to AWS)
    const token = localStorage.getItem('smartattend_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });
      
      // Handle CSV downloads or raw streams
      if (options.isRaw) {
        return response;
      }

      const data = await response.json();
      if (!response.ok) {
        const error = new Error(data.message || data.error || `HTTP error ${response.status}`);
        error.data = data;
        error.status = response.status;
        throw error;
      }
      return data;
    } catch (err) {
      console.error(`API Request failed for ${endpoint}:`, err);
      throw err;
    }
  }

  // 1. RFID Scan Ingestion (Simulates AWS API Gateway -> Lambda)
  async scanRfid({ rfid_card_id, reader_id, timestamp, custom_time }) {
    return this.request('/rfid/scan', {
      method: 'POST',
      body: JSON.stringify({ rfid_card_id, reader_id, timestamp, custom_time })
    });
  }

  // 2. Student Dashboard Aggregates
  async getStudentData(studentId) {
    return this.request(`/attendance/student/${studentId}`);
  }

  // 3. Attendance Records & History
  async getAttendanceRecords(filters = {}) {
    const query = new URLSearchParams();
    if (filters.student_id) query.append('student_id', filters.student_id);
    if (filters.subject_id) query.append('subject_id', filters.subject_id);
    if (filters.status && filters.status !== 'ALL') query.append('status', filters.status);
    if (filters.date) query.append('date', filters.date);
    if (filters.search) query.append('search', filters.search);

    return this.request(`/attendance/records?${query.toString()}`);
  }

  // 4. Timetable
  async getTodayTimetable(day = 'Thursday') {
    return this.request(`/timetable/today?day=${encodeURIComponent(day)}`);
  }

  async getAllTimetable() {
    return this.request('/timetable');
  }

  async saveTimetable(entry) {
    return this.request('/timetable', {
      method: 'POST',
      body: JSON.stringify(entry)
    });
  }

  async deleteTimetable(id) {
    return this.request(`/timetable/${id}`, {
      method: 'DELETE'
    });
  }

  // 5. Rules
  async getRules() {
    return this.request('/rules');
  }

  async updateRules(newRules) {
    return this.request('/rules', {
      method: 'PUT',
      body: JSON.stringify(newRules)
    });
  }

  // 6. Students
  async getStudents() {
    return this.request('/students');
  }

  async saveStudent(student) {
    return this.request('/students', {
      method: 'POST',
      body: JSON.stringify(student)
    });
  }

  async deleteStudent(studentId) {
    return this.request(`/students/${studentId}`, {
      method: 'DELETE'
    });
  }

  // 7. Subjects
  async getSubjects() {
    return this.request('/subjects');
  }

  async saveSubject(subject) {
    return this.request('/subjects', {
      method: 'POST',
      body: JSON.stringify(subject)
    });
  }

  // 8. Readers
  async getReaders() {
    return this.request('/readers');
  }

  async saveReader(reader) {
    return this.request('/readers', {
      method: 'POST',
      body: JSON.stringify(reader)
    });
  }

  // 9. Leave & OD Management
  async getLeaves(studentId = null) {
    const q = studentId ? `?student_id=${studentId}` : '';
    return this.request(`/leaves${q}`);
  }

  async createLeave(data) {
    return this.request('/leaves', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateLeaveStatus(leaveId, status, adminRemarks = '') {
    return this.request(`/leaves/${leaveId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, admin_remarks: adminRemarks })
    });
  }

  // 10. "Can I Bunk?" Dynamic Impact Calculator
  async calculateBunkImpact(data) {
    return this.request('/bunk/calculate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // 11. Parent Alert Simulator (Amazon SNS)
  async sendParentAlert(data) {
    return this.request('/alerts/parent-sns', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // 12. Notifications
  async getNotifications(studentId) {
    const query = studentId ? `?student_id=${studentId}` : '';
    return this.request(`/notifications${query}`);
  }

  async markNotificationRead(id) {
    return this.request('/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ id })
    });
  }

  async markAllNotificationsRead(studentId) {
    return this.request('/notifications/read-all', {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId })
    });
  }

  // 10. CSV Export URL
  getExportCsvUrl(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return `/api/reports/export?${query}`;
  }

  // 11. AWS Architecture Config
  async getAwsConfig() {
    return this.request('/aws/config');
  }

  // 12. Real-Time Server-Sent Events (SSE) Listener
  connectLiveStream(onEvent, onError) {
    if (!window.EventSource) {
      console.warn('EventSource not supported in this browser.');
      return null;
    }

    const eventSource = new EventSource('/api/attendance/live');

    eventSource.addEventListener('RFID_SCAN', event => {
      try {
        const payload = JSON.parse(event.data);
        if (onEvent) onEvent('RFID_SCAN', payload);
      } catch (err) {
        console.error('Error parsing SSE payload:', err);
      }
    });

    eventSource.addEventListener('RULES_UPDATED', event => {
      try {
        const payload = JSON.parse(event.data);
        if (onEvent) onEvent('RULES_UPDATED', payload);
      } catch (err) {
        console.error('Error parsing SSE payload:', err);
      }
    });

    eventSource.onerror = err => {
      if (onError) onError(err);
    };

    return eventSource;
  }
}

export const api = new ApiService();
