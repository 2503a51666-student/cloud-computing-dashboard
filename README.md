# SmartAttend — RFID-Based Smart Attendance & Class Management System

[![AWS Cloud Ready](https://img.shields.io/badge/AWS-Cloud%20Ready-232f3e?logo=amazon-aws)](AWS_ARCHITECTURE.md)
[![Node.js](https://img.shields.io/badge/Runtime-Node.js%20v24-339933?logo=node.js)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**SmartAttend** is a responsive, production-style student attendance and class management platform integrated with physical/simulated RFID card scanners, designed for an **AWS Cloud Computing** academic project.

---

## 🌟 Key Capabilities & Features

### 1. 🎓 Student Dashboard
- **Comprehensive Attendance Overview**: Real-time percentage, total classes conducted, attended, missed, and remaining.
- **Intelligent Attendance Target Calculator**:
  - Dynamically calculates consecutive classes needed:
    $$N = \max\left(0, \left\lceil \frac{P \cdot T - 100 \cdot A}{100 - P} \right\rceil\right)$$
  - Dynamically calculates safe-to-miss classes:
    $$M = \max\left(0, \left\lfloor \frac{100 \cdot A - P \cdot T}{P} \right\rfloor\right)$$
  - Interactive target slider (70%–85%) with instant recalculation.
- **Next Class Section**: Countdown timer, subject, faculty, room, building, and attendance policy.
- **Class Reminder System**: 30m, 15m, and 5m in-app notifications designed for Amazon SNS / EventBridge.
- **Attendance History**: Searchable, filterable audit log with pagination and detailed swipe modal.
- **Subject-Wise Analysis**: Course-by-course breakdown with safe margins and progress meters.
- **Attendance Planner / Simulator**: Interactive What-If simulator projecting future attendance trajectory.
- **Student Profile**: Masked RFID identifier, credential cards, and notification preference settings.

### 2. 👨‍💼 Admin & Faculty Portal
- **Attendance Rules Engine**: Configurable grace periods, late thresholds, very-late windows, cutoff times, and multiple-consecutive-period crediting rules.
- **Student Directory**: Add, edit, deactivate, and manage students and RFID card associations.
- **Curriculum & Subjects**: Manage course codes, faculty, credits, and attendance requirements.
- **Timetable Scheduler**: Map subjects to rooms, time blocks, and assigned RFID scanners.
- **RFID Fleet Telemetry**: Status, IP, hardware model, and heartbeat monitoring of campus readers.
- **Instant CSV Export**: One-click download of daily, subject, and term attendance reports.

### 3. 🏫 Classroom Live Podium Monitor
- Fullscreen-ready high-visibility podium display for lab and lecture hall computers.
- Live stream of student card taps with evaluation badges (`ON TIME`, `LATE`, `VERY LATE`, `NOT COUNTED`).
- Live turn-out metrics and attendance turnout percentage.

### 4. 🖲️ Interactive Demo RFID Scanner Simulator
- Built-in hardware simulator supporting all test scenarios:
  - On Time (Within grace period)
  - Late (Within 6–15 min window)
  - Very Late (Within 16–30 min window)
  - After Cutoff (Past 45 mins)
  - Multi-Period Consecutive Lab (Credits multiple 1-hr blocks)
  - Duplicate Scan Prevention (Tapping twice within 5 mins)
  - Unregistered / Stolen Card (Rejection error state)
  - Custom Time Input
- Audio chime synthesized in real-time via Web Audio API.

---

## ☁️ AWS Cloud Architecture

The codebase is partitioned into clean abstraction layers ready to deploy to AWS:
- **Amazon API Gateway**: REST routes for ingestion and WebSockets for real-time live events.
- **AWS Lambda**: Pure serverless execution (`services/attendanceEngine.js`).
- **Amazon DynamoDB**: Single-table design (`SmartAttendCore`) documented in [`AWS_ARCHITECTURE.md`](AWS_ARCHITECTURE.md).
- **Amazon EventBridge & SNS**: Scheduled reminder crons and alert topics.
- **Amazon CloudWatch**: Telemetry and latency audit trails.

---

## 🚀 Quick Start Instructions

### 1. Launch the Server
Double-click `start.bat` (or run in PowerShell / Command Prompt):

```powershell
node server.js
```
*(If using the Antigravity local environment: `agy-node.cmd server.js`)*

### 2. Open in Browser
Visit:
```
http://localhost:3000
```

### 3. Quick Demonstration Guide
1. **Student Dashboard**: Explore Subrahmanyam's dashboard (78.4% attendance). Adjust the Target slider from 75% to 80% and watch the required consecutive classes recalculate dynamically!
2. **Simulate a Tap**: Click the top-right **"Simulate RFID"** button. Choose "ON TIME" or "LATE" and tap. Watch the audio chime play, toast notification appear, and dashboard percentage update immediately!
3. **Switch Roles**: Use the Persona dropdown in the top header to toggle between:
   - **Subrahmanyam (23CS01042)**: Primary student
   - **Yashwanth (23CS01045)**: High attendance (86.3%)
   - **Dheeraj (23CS01048)**: Warning attendance (70.6%)
   - **Dr. Ramesh Sharma**: Admin & Faculty portal
4. **Classroom Live Monitor**: Click "Live RFID Monitor" in the sidebar to view the podium display with live incoming tap stream.
5. **Admin Controls**: Navigate to Admin Panel, update grace periods or add a student, and download the full CSV attendance report.
