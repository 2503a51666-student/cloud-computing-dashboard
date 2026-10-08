/**
 * SmartAttend - Attendance Evaluation & Mathematical Calculation Engine
 * Designed to run in Node.js backend and exportable as an AWS Lambda Handler.
 */

/**
 * Parses "HH:MM" or ISO string into minutes from start of day
 * @param {string} timeStr - "09:30" or "2026-09-17T09:30:00"
 * @returns {number} minutes from midnight
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  if (timeStr.includes('T')) {
    const parts = timeStr.split('T')[1].split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * Formats minutes from midnight into "HH:MM AM/PM"
 * @param {number} totalMinutes
 * @returns {string}
 */
function minutesToTimeStr(totalMinutes) {
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  const paddedMinutes = String(minutes).padStart(2, '0');
  return `${hours12}:${paddedMinutes} ${period}`;
}

/**
 * Calculates attendance status based on scan time relative to class schedule
 * @param {string|number} scanTime - "09:04" or minutes
 * @param {string|number} startTime - "09:00" or minutes
 * @param {object} rules - configurable thresholds
 * @returns {object} { status, diffMinutes, remarks }
 */
function evaluateSingleClassStatus(scanTime, startTime, rules = {}) {
  const scanMins = typeof scanTime === 'number' ? scanTime : timeToMinutes(scanTime);
  const startMins = typeof startTime === 'number' ? startTime : timeToMinutes(startTime);
  const diffMinutes = scanMins - startMins;

  const grace = rules.grace_period_minutes ?? 5;
  const late = rules.late_threshold_minutes ?? 15;
  const veryLate = rules.very_late_threshold_minutes ?? 30;
  const cutoff = rules.cutoff_minutes ?? 45;

  if (diffMinutes <= grace) {
    return {
      status: 'ON TIME',
      diffMinutes,
      remarks: diffMinutes <= 0
        ? `Tapped ${Math.abs(diffMinutes)} min before class start`
        : `Tapped ${diffMinutes} min into class (within ${grace}m grace period)`
    };
  } else if (diffMinutes <= late) {
    return {
      status: 'LATE',
      diffMinutes,
      remarks: `Tapped ${diffMinutes} min late (${grace + 1}–${late}m late window)`
    };
  } else if (diffMinutes <= veryLate) {
    return {
      status: 'VERY LATE',
      diffMinutes,
      remarks: `Tapped ${diffMinutes} min late (${late + 1}–${veryLate}m very late window)`
    };
  } else if (diffMinutes <= cutoff) {
    return {
      status: 'NOT COUNTED',
      diffMinutes,
      remarks: `Tapped ${diffMinutes} min after start (exceeded ${veryLate}m threshold)`
    };
  } else {
    return {
      status: 'NOT COUNTED',
      diffMinutes,
      remarks: `Tapped past class cutoff threshold of ${cutoff} minutes`
    };
  }
}

/**
 * Evaluates consecutive class periods for multi-period sessions (e.g. 3-hour labs)
 * @param {string} scanTime - e.g. "09:20"
 * @param {object} timetableEntry - timetable record with periods and optional period_breakdown
 * @param {object} rules - configured rules
 * @returns {object} { overallStatus, periodsCredited, totalPeriods, periodBreakdown }
 */
function evaluateConsecutivePeriods(scanTime, timetableEntry, rules = {}) {
  const scanMins = timeToMinutes(scanTime);
  const totalPeriods = timetableEntry.periods || 1;
  const periodDurationMins = 60; // standard 60-min period

  const baseStartMins = timeToMinutes(timetableEntry.start_time);
  const breakdown = [];
  let periodsCredited = 0;

  for (let i = 0; i < totalPeriods; i++) {
    const periodStartMins = baseStartMins + (i * periodDurationMins);
    const periodEndMins = periodStartMins + periodDurationMins;
    const periodNum = i + 1;
    const periodTimeStr = `${minutesToTimeStr(periodStartMins)} – ${minutesToTimeStr(periodEndMins)}`;

    let periodStatus;
    let periodRemarks;
    let isCredited = false;

    if (scanMins <= periodStartMins + (rules.grace_period_minutes ?? 5)) {
      // Arrived before or during grace period of this slot
      periodStatus = 'ON TIME';
      periodRemarks = i === 0 ? 'Tapped on time' : 'Credited via consecutive session entry';
      isCredited = true;
    } else if (scanMins <= periodStartMins + (rules.late_threshold_minutes ?? 15)) {
      periodStatus = 'LATE';
      periodRemarks = 'Arrived during late threshold';
      isCredited = true;
    } else if (scanMins <= periodStartMins + (rules.very_late_threshold_minutes ?? 30)) {
      periodStatus = 'VERY LATE';
      periodRemarks = 'Arrived during very late window';
      isCredited = rules.allow_partial_credit ?? true;
    } else if (scanMins >= periodEndMins) {
      // Period has ended before scan
      periodStatus = 'NOT COUNTED';
      periodRemarks = 'Session period ended before RFID scan';
      isCredited = false;
    } else {
      // Between very late and period end
      periodStatus = 'NOT COUNTED';
      periodRemarks = 'Exceeded arrival cutoff for this period';
      isCredited = false;
    }

    if (isCredited) periodsCredited++;

    breakdown.push({
      period_number: periodNum,
      period_time: periodTimeStr,
      status: periodStatus,
      credited: isCredited,
      remarks: periodRemarks
    });
  }

  // Determine overall session status
  let overallStatus = 'ON TIME';
  if (periodsCredited === 0) {
    overallStatus = 'NOT COUNTED';
  } else if (breakdown[0].status === 'LATE') {
    overallStatus = 'LATE';
  } else if (breakdown[0].status === 'VERY LATE') {
    overallStatus = 'VERY LATE';
  } else if (breakdown[0].status === 'NOT COUNTED' && periodsCredited > 0) {
    overallStatus = 'PARTIALLY CREDITED';
  }

  return {
    overallStatus,
    periodsCredited,
    totalPeriods,
    breakdown
  };
}

/**
 * Complete RFID Scan Processing Pipeline
 * Evaluates scan event and returns one of the 10 defined system states:
 * 1. WAITING_FOR_SCAN
 * 2. CARD_DETECTED
 * 3. STUDENT_IDENTIFIED
 * 4. ATTENDANCE_PROCESSING
 * 5. ON TIME (Attendance marked)
 * 6. LATE
 * 7. VERY LATE
 * 8. INVALID_CARD
 * 9. NO_SCHEDULED_CLASS
 * 10. DUPLICATE_SCAN
 */
function processRfidScan({
  rfid_card_id,
  reader_id,
  timestamp,
  custom_time,
  db
}) {
  const rules = db.rules || {};
  const scanTimeStr = custom_time || (timestamp ? timestamp.split('T')[1]?.substring(0, 5) : '10:57');
  const scanDate = timestamp ? timestamp.split('T')[0] : '2026-09-17';
  const scanMins = timeToMinutes(scanTimeStr);

  // 1. Identify Student
  const student = db.students.find(s => s.rfid_card_id === rfid_card_id || s.student_id === rfid_card_id);
  if (!student) {
    return {
      success: false,
      state: 'INVALID_CARD',
      state_code: 8,
      status_label: 'Invalid Card',
      message: `RFID Card ID "${rfid_card_id}" is not registered to any student.`,
      timestamp: timestamp || new Date().toISOString(),
      details: { rfid_card_id, reader_id }
    };
  }

  // 2. Identify Reader & Location
  const reader = db.readers.find(r => r.reader_id === reader_id) || {
    reader_id,
    room: 'CSE Lab 2',
    location: 'Ramanujan Block, 2nd Floor'
  };

  // 3. Find matching scheduled class
  // Check timetable entries for current day (or Thursday in demo)
  const todayClasses = db.timetable.filter(tt => !tt.day || tt.day.toLowerCase() === 'thursday');

  // Filter candidates where scan is within window: [start_time - 30, end_time + 15]
  let candidates = todayClasses.filter(tt => {
    const startMins = timeToMinutes(tt.start_time);
    const endMins = timeToMinutes(tt.end_time);
    return scanMins >= (startMins - 30) && scanMins <= (endMins + 15);
  });

  // Sort candidates:
  // 1st Priority: exact reader_id or room match
  // 2nd Priority: smallest distance between scanMins and start_time
  candidates.sort((a, b) => {
    const aRoomMatch = (a.reader_id === reader.reader_id || a.room === reader.room) ? 0 : 1;
    const bRoomMatch = (b.reader_id === reader.reader_id || b.room === reader.room) ? 0 : 1;
    if (aRoomMatch !== bRoomMatch) return aRoomMatch - bRoomMatch;

    const distA = Math.abs(scanMins - timeToMinutes(a.start_time));
    const distB = Math.abs(scanMins - timeToMinutes(b.start_time));
    return distA - distB;
  });

  let currentClass = candidates[0];
  if (!currentClass) {
    // If no exact window match, find next upcoming class today
    const upcoming = db.timetable.find(tt => timeToMinutes(tt.start_time) >= scanMins);
    if (!upcoming) {
      return {
        success: false,
        state: 'NO_SCHEDULED_CLASS',
        state_code: 9,
        status_label: 'No Scheduled Class',
        student: { id: student.student_id, name: student.name },
        reader: { id: reader.reader_id, room: reader.room },
        message: `No active or scheduled class found for Room ${reader.room} at ${scanTimeStr}.`,
        timestamp: timestamp || new Date().toISOString()
      };
    }
    currentClass = upcoming;
  }

  // 4. Duplicate scan prevention check
  const duplicateWindowSeconds = rules.duplicate_scan_window_seconds ?? 300;
  const recentExistingScan = (db.attendance_records || []).find(rec => {
    if (rec.student_id !== student.student_id) return false;
    if (rec.date !== scanDate) return false;
    if (rec.subject_id !== currentClass.subject_id) return false;
    if (!rec.rfid_punch_time) return false;

    const existingMins = timeToMinutes(rec.rfid_punch_time);
    const diffSecs = Math.abs(scanMins - existingMins) * 60;
    return diffSecs < duplicateWindowSeconds;
  });

  if (recentExistingScan) {
    return {
      success: false,
      state: 'DUPLICATE_SCAN',
      state_code: 10,
      status_label: 'Duplicate Scan',
      student: { id: student.student_id, name: student.name, department: student.department },
      subject: { id: currentClass.subject_id, name: currentClass.subject_name },
      existing_punch_time: recentExistingScan.rfid_punch_time,
      message: `Card already tapped at ${recentExistingScan.rfid_punch_time}. Duplicate scan within 5 minutes was ignored.`,
      timestamp: timestamp || new Date().toISOString()
    };
  }

  // 5. Evaluate attendance
  let evalResult;
  let classesCredited = 1;
  let periodBreakdown = null;

  if (currentClass.consecutive && currentClass.periods > 1) {
    const consecutiveEval = evaluateConsecutivePeriods(scanTimeStr, currentClass, rules);
    evalResult = {
      status: consecutiveEval.overallStatus,
      remarks: `Multi-period lab: ${consecutiveEval.periodsCredited} of ${consecutiveEval.totalPeriods} periods credited.`
    };
    classesCredited = consecutiveEval.periodsCredited;
    periodBreakdown = consecutiveEval.breakdown;
  } else {
    evalResult = evaluateSingleClassStatus(scanTimeStr, currentClass.start_time, rules);
    classesCredited = evalResult.status === 'NOT COUNTED' ? 0 : 1;
  }

  // Map to state codes
  let stateCode = 5;
  let state = 'ATTENDANCE_MARKED';
  if (evalResult.status === 'ON TIME') {
    stateCode = 5;
    state = 'ON TIME';
  } else if (evalResult.status === 'LATE') {
    stateCode = 6;
    state = 'LATE';
  } else if (evalResult.status === 'VERY LATE') {
    stateCode = 7;
    state = 'VERY LATE';
  } else if (evalResult.status === 'NOT COUNTED') {
    stateCode = 4;
    state = 'NOT COUNTED';
  }

  // Create new attendance record
  const newAttendanceRecord = {
    attendance_id: `ATT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    student_id: student.student_id,
    student_name: student.name,
    subject_id: currentClass.subject_id,
    subject_name: currentClass.subject_name,
    date: scanDate,
    scheduled_start: currentClass.start_time,
    scheduled_end: currentClass.end_time,
    rfid_punch_time: scanTimeStr + ':00',
    status: evalResult.status,
    classes_credited: classesCredited,
    periods_breakdown: periodBreakdown,
    reader_id: reader.reader_id,
    room: reader.room,
    remarks: evalResult.remarks
  };

  return {
    success: true,
    state,
    state_code: stateCode,
    status_label: evalResult.status,
    student: {
      id: student.student_id,
      name: student.name,
      department: student.department,
      year: student.year,
      section: student.section
    },
    subject: {
      id: currentClass.subject_id,
      name: currentClass.subject_name,
      faculty: currentClass.faculty,
      time: `${currentClass.start_time} – ${currentClass.end_time}`
    },
    reader: {
      id: reader.reader_id,
      room: reader.room,
      location: reader.location
    },
    scan_time: scanTimeStr,
    classes_credited: classesCredited,
    period_breakdown: periodBreakdown,
    remarks: evalResult.remarks,
    record: newAttendanceRecord,
    timestamp: timestamp || new Date().toISOString()
  };
}

/**
 * Attendance Target Calculator
 * Calculates current %, required consecutive attendance for target, and safe-to-miss classes.
 * 
 * Mathematical Equations:
 * Current Attendance: P_curr = (A / T) * 100
 * To reach target P:
 * (A + N) / (T + N) >= P / 100
 * 100(A + N) >= P(T + N)
 * 100A + 100N >= PT + PN
 * N(100 - P) >= PT - 100A
 * N >= (PT - 100A) / (100 - P)
 * 
 * To safely miss M classes while maintaining >= P:
 * A / (T + M) >= P / 100
 * 100A >= P(T + M) = PT + PM
 * PM <= 100A - PT
 * M <= (100A - PT) / P
 */
function calculateAttendanceMetrics(attended, totalConducted, targetPercentage = 75) {
  const A = Number(attended) || 0;
  const T = Number(totalConducted) || 0;
  const P = Number(targetPercentage) || 75;

  if (T === 0) {
    return {
      currentPercentage: 100,
      formattedPercentage: '100.0%',
      status: 'SAFE',
      classesAttended: A,
      totalClasses: T,
      classesMissed: 0,
      targetPercentage: P,
      classesNeededToReachTarget: 0,
      safeToMissClasses: 0,
      isAboveTarget: true
    };
  }

  const currentPercentage = (A / T) * 100;
  const formattedPercentage = currentPercentage.toFixed(1) + '%';
  const classesMissed = Math.max(0, T - A);

  let classesNeededToReachTarget = 0;
  let safeToMissClasses = 0;

  if (currentPercentage >= P) {
    // Already meeting target -> N = 0
    classesNeededToReachTarget = 0;
    // Calculate how many can be missed: M <= (100A - PT) / P
    const maxMiss = Math.floor((100 * A - P * T) / P);
    safeToMissClasses = Math.max(0, maxMiss);
  } else {
    // Below target -> M = 0
    safeToMissClasses = 0;
    // Calculate consecutive classes needed: N >= (PT - 100A) / (100 - P)
    if (P >= 100) {
      classesNeededToReachTarget = Infinity; // Mathematically impossible if already missed one
    } else {
      const needed = Math.ceil((P * T - 100 * A) / (100 - P));
      classesNeededToReachTarget = Math.max(0, needed);
    }
  }

  // Determine status
  // User specification example: 74% with 75% target is WARNING.
  let status = 'SAFE';
  if (currentPercentage >= P) {
    status = 'SAFE';
  } else if (currentPercentage >= (P - 5)) {
    status = 'WARNING';
  } else {
    status = 'CRITICAL';
  }

  return {
    currentPercentage: Number(currentPercentage.toFixed(2)),
    formattedPercentage,
    status,
    classesAttended: A,
    totalClasses: T,
    classesMissed,
    targetPercentage: P,
    classesNeededToReachTarget,
    safeToMissClasses,
    isAboveTarget: currentPercentage >= P
  };
}

/**
 * Simulates future attendance (Attendance Planner)
 * @param {number} currentAttended
 * @param {number} currentTotal
 * @param {number} upcomingAttendCount
 * @param {number} upcomingMissCount
 * @param {number} target
 */
function simulateAttendance(currentAttended, currentTotal, upcomingAttendCount, upcomingMissCount, target = 75) {
  const newAttended = currentAttended + upcomingAttendCount;
  const newTotal = currentTotal + upcomingAttendCount + upcomingMissCount;
  return calculateAttendanceMetrics(newAttended, newTotal, target);
}

/**
 * "Can I Bunk?" Impact Estimator
 * Calculates the exact effect of skipping N classes today or this week.
 */
function calculateBunkImpact(currentAttended, currentTotal, classesToBunk = 1, target = 75) {
  const A = Number(currentAttended) || 0;
  const T = Number(currentTotal) || 0;
  const K = Number(classesToBunk) || 0;
  const P = Number(target) || 75;

  const currentPct = T > 0 ? (A / T) * 100 : 100;
  const newTotal = T + K;
  const projectedPct = newTotal > 0 ? (A / newTotal) * 100 : 100;
  const delta = projectedPct - currentPct;
  const buffer = projectedPct - P;

  let verdict = 'SAFE';
  let badgeClass = 'badge-safe';
  let advice = '';

  if (projectedPct >= P) {
    verdict = 'SAFE';
    badgeClass = 'badge-safe';
    advice = `Safe to bunk! Your attendance will be ${projectedPct.toFixed(1)}%, staying ${buffer.toFixed(1)}% above the ${P}% requirement.`;
  } else if (projectedPct >= (P - 5)) {
    verdict = 'WARNING';
    badgeClass = 'badge-warning';
    advice = `Risky! Skipping will drop you to ${projectedPct.toFixed(1)}%, which is in the warning zone (below ${P}%). You will need to attend extra classes later.`;
  } else {
    verdict = 'CRITICAL';
    badgeClass = 'badge-critical';
    advice = `Do NOT bunk! Attendance drops to ${projectedPct.toFixed(1)}%, putting you at immediate risk of condonation or exam debarment.`;
  }

  return {
    classesToBunk: K,
    currentPercentage: Number(currentPct.toFixed(1)),
    projectedPercentage: Number(projectedPct.toFixed(1)),
    deltaPercentage: Number(delta.toFixed(1)),
    bufferPercentage: Number(buffer.toFixed(1)),
    targetPercentage: P,
    verdict,
    badgeClass,
    advice,
    canSafelyBunk: projectedPct >= P
  };
}

/**
 * Exam Eligibility Status Calculator
 */
function getExamEligibility(currentPercentage) {
  const pct = Number(currentPercentage) || 0;

  if (pct >= 75) {
    return {
      status: 'ELIGIBLE',
      label: 'Exam Eligible',
      badgeClass: 'badge-safe',
      color: '#059669',
      bgColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      icon: '🛡️',
      hallTicketStatus: 'Approved & Cleared',
      actionRequired: 'None. Maintain current attendance pace.',
      description: 'You meet the mandatory 75% threshold. Hall ticket is cleared for end-semester examinations.'
    };
  } else if (pct >= 65) {
    return {
      status: 'CONDONATION',
      label: 'Condonation Required',
      badgeClass: 'badge-warning',
      color: '#d97706',
      bgColor: '#fffbeb',
      borderColor: '#fde68a',
      icon: '⚠️',
      hallTicketStatus: 'Conditional / Pending Approval',
      actionRequired: 'Submit Medical Certificate / HOD Condonation Form.',
      description: 'Attendance is between 65% and 75%. You must submit official medical or OD proof to qualify for hall ticket issuance.'
    };
  } else {
    return {
      status: 'DEBARRED',
      label: 'Debarred (Shortage)',
      badgeClass: 'badge-critical',
      color: '#dc2626',
      bgColor: '#fef2f2',
      borderColor: '#fecaca',
      icon: '🚨',
      hallTicketStatus: 'Withheld / Not Cleared',
      actionRequired: 'Immediate Academic Counselor & Dean Meeting.',
      description: 'Severe attendance shortage below 65%. Under university regulations, hall tickets are withheld unless emergency condonation is granted.'
    };
  }
}

module.exports = {
  timeToMinutes,
  minutesToTimeStr,
  evaluateSingleClassStatus,
  evaluateConsecutivePeriods,
  processRfidScan,
  calculateAttendanceMetrics,
  simulateAttendance,
  calculateBunkImpact,
  getExamEligibility
};

