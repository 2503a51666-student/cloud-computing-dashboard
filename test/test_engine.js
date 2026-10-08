/**
 * Unit and Formula Verification Suite for SmartAttend
 */
const assert = require('assert');
const {
  calculateAttendanceMetrics,
  simulateAttendance,
  evaluateSingleClassStatus,
  evaluateConsecutivePeriods,
  processRfidScan
} = require('../services/attendanceEngine');

console.log('=== RUNNING SMARTATTEND ENGINE TESTS ===\n');

// 1. Test Attendance Target Formulas
console.log('Test 1: Attendance Target Calculator Formulas');

// Case A: Attended 40 out of 50 -> 80%. Target 75%.
// Safe to miss M: floor((100*40 - 75*50) / 75) = floor((4000 - 3750) / 75) = floor(250 / 75) = 3 classes.
// If missed 3: 40 / 53 = 75.47% >= 75%. If missed 4: 40 / 54 = 74.07% < 75%. Exact!
const resA = calculateAttendanceMetrics(40, 50, 75);
assert.strictEqual(resA.currentPercentage, 80);
assert.strictEqual(resA.safeToMissClasses, 3);
assert.strictEqual(resA.classesNeededToReachTarget, 0);
assert.strictEqual(resA.status, 'SAFE');
console.log('✓ Case A (80% with 75% target): safe to miss = 3 classes');

// Case B: Attended 34 out of 50 -> 68%. Target 75%.
// Needed N: ceil((75*50 - 100*34) / (100 - 75)) = ceil((3750 - 3400) / 25) = ceil(350 / 25) = 14 classes.
// If attend 14: (34 + 14) / (50 + 14) = 48 / 64 = 75.0%. Exactly reaches target!
const resB = calculateAttendanceMetrics(34, 50, 75);
assert.strictEqual(resB.currentPercentage, 68);
assert.strictEqual(resB.classesNeededToReachTarget, 14);
assert.strictEqual(resB.safeToMissClasses, 0);
assert.strictEqual(resB.status, 'CRITICAL');
console.log('✓ Case B (68% with 75% target): consecutive needed = 14 classes');

// Case C: Attended 37 out of 50 -> 74%. Target 75%.
// In warning zone (between 74% and 79%)
const resC = calculateAttendanceMetrics(37, 50, 75);
assert.strictEqual(resC.status, 'WARNING');
assert.strictEqual(resC.classesNeededToReachTarget, 2); // ceil((3750 - 3700)/25) = ceil(50/25) = 2. (39/52 = 75.0%)
console.log('✓ Case C (74% with 75% target): warning zone detected, consecutive needed = 2');

// 2. Test Attendance Simulation (Planner)
console.log('\nTest 2: Attendance Planner Simulation');
const simAttend5 = simulateAttendance(34, 50, 5, 0, 75);
// (34 + 5) / (50 + 5) = 39 / 55 = 70.91%
assert.strictEqual(simAttend5.currentPercentage, 70.91);
console.log('✓ Simulation: Attending next 5 classes raises 68% -> 70.91%');

// 3. Test Evaluation Engine Thresholds
console.log('\nTest 3: Threshold Evaluation Logic');
const rules = {
  grace_period_minutes: 5,
  late_threshold_minutes: 15,
  very_late_threshold_minutes: 30,
  cutoff_minutes: 45
};

// Start at 09:00
assert.strictEqual(evaluateSingleClassStatus('08:58', '09:00', rules).status, 'ON TIME');
assert.strictEqual(evaluateSingleClassStatus('09:05', '09:00', rules).status, 'ON TIME');
assert.strictEqual(evaluateSingleClassStatus('09:06', '09:00', rules).status, 'LATE');
assert.strictEqual(evaluateSingleClassStatus('09:15', '09:00', rules).status, 'LATE');
assert.strictEqual(evaluateSingleClassStatus('09:16', '09:00', rules).status, 'VERY LATE');
assert.strictEqual(evaluateSingleClassStatus('09:30', '09:00', rules).status, 'VERY LATE');
assert.strictEqual(evaluateSingleClassStatus('09:31', '09:00', rules).status, 'NOT COUNTED');
console.log('✓ All single-class threshold transitions verified');

// 4. Test Consecutive Multi-Period Session
console.log('\nTest 4: Consecutive Multi-Period Lab Crediting');
const labSchedule = {
  subject_name: 'Computer Networks Lab',
  start_time: '13:00',
  end_time: '16:00',
  periods: 3,
  consecutive: true
};

// Tap at 12:55 -> all 3 credited
const conEarly = evaluateConsecutivePeriods('12:55', labSchedule, rules);
assert.strictEqual(conEarly.periodsCredited, 3);
assert.strictEqual(conEarly.breakdown[0].status, 'ON TIME');
assert.strictEqual(conEarly.breakdown[1].status, 'ON TIME');
assert.strictEqual(conEarly.breakdown[2].status, 'ON TIME');
console.log('✓ Consecutive early tap (12:55): All 3 periods credited');

// Tap at 14:05 -> Period 1 missed (13:00-14:00 passed), Period 2 On Time (grace), Period 3 On Time
const conMid = evaluateConsecutivePeriods('14:05', labSchedule, rules);
assert.strictEqual(conMid.periodsCredited, 2);
assert.strictEqual(conMid.breakdown[0].status, 'NOT COUNTED');
assert.strictEqual(conMid.breakdown[1].status, 'ON TIME');
assert.strictEqual(conMid.breakdown[2].status, 'ON TIME');
console.log('✓ Consecutive mid-session tap (14:05): Period 1 missed, Period 2 & 3 credited');

// 5. Test Full RFID Pipeline & Error States
console.log('\nTest 5: Full RFID Pipeline & State Validation');
const mockDb = {
  rules,
  students: [
    { student_id: '23CS01042', name: 'Subrahmanyam', rfid_card_id: 'RFID1042', department: 'CSE' }
  ],
  readers: [
    { reader_id: 'READER-LAB-02', room: 'CSE Lab 2' }
  ],
  timetable: [
    {
      timetable_id: 'TT-01',
      subject_id: 'CS301',
      subject_name: 'Computer Networks',
      faculty: 'Dr. B. N. Rao',
      start_time: '11:00',
      end_time: '12:00',
      room: 'CSE Lab 2',
      reader_id: 'READER-LAB-02',
      periods: 1
    }
  ],
  attendance_records: []
};

// Scan on time at 11:02
const scan1 = processRfidScan({
  rfid_card_id: 'RFID1042',
  reader_id: 'READER-LAB-02',
  custom_time: '11:02',
  db: mockDb
});
assert.strictEqual(scan1.success, true);
assert.strictEqual(scan1.status_label, 'ON TIME');
assert.strictEqual(scan1.student.name, 'Subrahmanyam');
console.log('✓ State 5 ON TIME verified for student Subrahmanyam');

// Duplicate Scan within 5 minutes
mockDb.attendance_records.push(scan1.record);
const scanDup = processRfidScan({
  rfid_card_id: 'RFID1042',
  reader_id: 'READER-LAB-02',
  custom_time: '11:04',
  db: mockDb
});
assert.strictEqual(scanDup.success, false);
assert.strictEqual(scanDup.state, 'DUPLICATE_SCAN');
console.log('✓ State 10 DUPLICATE_SCAN rejected within 5-min window');

// Invalid Card ID
const scanInvalid = processRfidScan({
  rfid_card_id: 'UNKNOWN_999',
  reader_id: 'READER-LAB-02',
  custom_time: '11:02',
  db: mockDb
});
assert.strictEqual(scanInvalid.success, false);
assert.strictEqual(scanInvalid.state, 'INVALID_CARD');
console.log('✓ State 8 INVALID_CARD handled safely');

console.log('\n🎉 ALL ENGINE TESTS PASSED SUCCESSFULLY!\n');
