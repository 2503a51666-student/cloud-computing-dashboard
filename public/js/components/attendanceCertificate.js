/**
 * SmartAttend - Formal Printable PDF Attendance Certificate & Hall Ticket Clearance
 */

export function renderAttendanceCertificatePage(studentData) {
  const student = studentData.student;
  const metrics = studentData.metrics;
  const subjects = studentData.subjects || [];
  const rules = studentData.rules || {};
  const exam = studentData.examEligibility || {
    status: 'ELIGIBLE',
    label: 'Exam Eligible',
    hallTicketStatus: 'Approved & Cleared'
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return `
    <!-- Action Bar (Hidden when printing) -->
    <div class="no-print" style="margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
      <div>
        <h2 style="font-size: 22px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em;">
          Formal Attendance Certificate & Hall Ticket Clearance
        </h2>
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
          Official institutional document generated for semester examination eligibility and records.
        </p>
      </div>

      <div style="display: flex; gap: 10px;">
        <button id="btn-print-certificate" class="btn btn-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
          Print / Save as PDF
        </button>
      </div>
    </div>

    <!-- Printable Certificate Paper Container -->
    <div class="certificate-paper" style="background: white; border: 2px solid #cbd5e1; border-radius: var(--radius-lg); padding: 48px; max-width: 900px; margin: 0 auto; box-shadow: var(--shadow-lg); font-family: 'Inter', sans-serif; position: relative;">
      
      <!-- Institutional Header -->
      <div style="text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 20px; margin-bottom: 28px;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 8px;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; letter-spacing: -0.05em;">
            SA
          </div>
          <div>
            <h1 style="font-size: 22px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">
              INSTITUTE OF TECHNOLOGY & SCIENCE
            </h1>
            <div style="font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px;">
              DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING
            </div>
          </div>
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 6px;">
          Accredited by National Board of Accreditation (NBA) • Campus RFID Automated Attendance Tracking System
        </div>
      </div>

      <!-- Certificate Title Banner -->
      <div style="text-align: center; margin-bottom: 28px;">
        <span style="display: inline-block; background: #0f172a; color: white; font-size: 13px; font-weight: 800; padding: 6px 20px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.1em;">
          SEMESTER ATTENDANCE COMPLIANCE & EXAMINATION CLEARANCE
        </span>
        <div style="font-size: 12px; color: #64748b; margin-top: 6px;">
          Issue Date: <strong>${currentDate}</strong> • Academic Term: <strong>2026-2027 (Semester 2)</strong>
        </div>
      </div>

      <!-- Student Particulars Grid -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-md); padding: 18px 22px; margin-bottom: 24px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; font-size: 13px;">
        <div>
          <span style="color: #64748b; font-size: 11px; text-transform: uppercase;">Student Full Name:</span>
          <div style="font-weight: 800; color: #0f172a; font-size: 15px;">${student.name}</div>
        </div>
        <div>
          <span style="color: #64748b; font-size: 11px; text-transform: uppercase;">University Roll / Student ID:</span>
          <div style="font-weight: 800; color: #0f172a; font-size: 15px; font-feature-settings: 'tnum';">${student.student_id}</div>
        </div>
        <div>
          <span style="color: #64748b; font-size: 11px; text-transform: uppercase;">Program & Academic Year:</span>
          <div style="font-weight: 600; color: #1e293b;">B.Tech CSE — I Year (Section ${student.section})</div>
        </div>
        <div>
          <span style="color: #64748b; font-size: 11px; text-transform: uppercase;">Verified RFID Tag UID:</span>
          <div style="font-weight: 700; color: #2563eb; font-family: monospace;">${student.rfid_card_id} (Hardware Active)</div>
        </div>
      </div>

      <!-- Master Subject-Wise Matrix -->
      <div style="margin-bottom: 24px;">
        <div style="font-size: 12.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em;">
          Course-Wise Attendance Log & Verification Matrix
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; border: 1px solid #cbd5e1;">
          <thead>
            <tr style="background: #0f172a; color: white;">
              <th style="padding: 9px 12px; border: 1px solid #0f172a;">Course Code</th>
              <th style="padding: 9px 12px; border: 1px solid #0f172a;">Subject Name</th>
              <th style="padding: 9px 12px; border: 1px solid #0f172a;">Course Faculty</th>
              <th style="padding: 9px 12px; border: 1px solid #0f172a; text-align: center;">Conducted</th>
              <th style="padding: 9px 12px; border: 1px solid #0f172a; text-align: center;">Attended</th>
              <th style="padding: 9px 12px; border: 1px solid #0f172a; text-align: center;">Attendance %</th>
              <th style="padding: 9px 12px; border: 1px solid #0f172a; text-align: center;">Exam Status</th>
            </tr>
          </thead>
          <tbody>
            ${subjects.map(s => {
              const pct = s.metrics.currentPercentage;
              const isEligible = pct >= (s.attendance_requirement || 75);
              return `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 9px 12px; font-weight: 700; color: #2563eb; border: 1px solid #e2e8f0;">${s.subject_code}</td>
                  <td style="padding: 9px 12px; font-weight: 600; color: #0f172a; border: 1px solid #e2e8f0;">${s.subject_name}</td>
                  <td style="padding: 9px 12px; color: #475569; border: 1px solid #e2e8f0;">${s.faculty}</td>
                  <td style="padding: 9px 12px; text-align: center; border: 1px solid #e2e8f0; font-feature-settings: 'tnum';">${s.stats.conducted}</td>
                  <td style="padding: 9px 12px; text-align: center; border: 1px solid #e2e8f0; font-feature-settings: 'tnum'; font-weight: 600;">${s.stats.attended}</td>
                  <td style="padding: 9px 12px; text-align: center; border: 1px solid #e2e8f0; font-feature-settings: 'tnum'; font-weight: 800; color: ${isEligible ? '#059669' : '#dc2626'};">
                    ${s.metrics.formattedPercentage}
                  </td>
                  <td style="padding: 9px 12px; text-align: center; border: 1px solid #e2e8f0;">
                    <span style="font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 4px; ${isEligible ? 'background: #ecfdf5; color: #059669;' : 'background: #fef2f2; color: #dc2626;'}">
                      ${isEligible ? 'CLEARED' : 'CONDONATION'}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: 800;">
              <td colspan="3" style="padding: 10px 12px; border: 1px solid #cbd5e1; text-transform: uppercase;">
                Cumulative Semester Standing:
              </td>
              <td style="padding: 10px 12px; text-align: center; border: 1px solid #cbd5e1;">${metrics.totalClasses}</td>
              <td style="padding: 10px 12px; text-align: center; border: 1px solid #cbd5e1;">${metrics.classesAttended}</td>
              <td style="padding: 10px 12px; text-align: center; border: 1px solid #cbd5e1; font-size: 14px; color: #2563eb;">
                ${metrics.formattedPercentage}
              </td>
              <td style="padding: 10px 12px; text-align: center; border: 1px solid #cbd5e1;">
                ${metrics.isAboveTarget ? 'CLEARED ✓' : 'DEFICIT ⚠'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Official Clearance Seal & Verdict Strip -->
      <div style="border: 2px dashed ${exam.status === 'ELIGIBLE' ? '#059669' : '#d97706'}; background: ${exam.status === 'ELIGIBLE' ? '#f0fdf4' : '#fffbeb'}; border-radius: var(--radius-md); padding: 18px 24px; margin-bottom: 36px; display: flex; align-items: center; justify-content: space-between;">
        <div>
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: ${exam.color}; letter-spacing: 0.08em;">
            EXAMINATION CONTROLLER VERDICT:
          </div>
          <div style="font-size: 18px; font-weight: 900; color: ${exam.color}; margin-top: 2px;">
            ${exam.hallTicketStatus.toUpperCase()}
          </div>
          <div style="font-size: 12px; color: #475569; margin-top: 4px;">
            ${exam.description}
          </div>
        </div>

        <div style="text-align: center; padding: 10px 18px; border: 2px solid ${exam.color}; border-radius: 8px; color: ${exam.color}; font-weight: 900; font-size: 14px; letter-spacing: 0.1em; transform: rotate(-3deg);">
          OFFICIAL CLEARANCE<br>
          <span style="font-size: 10px; font-weight: 600;">SMARTATTEND VERIFIED</span>
        </div>
      </div>

      <!-- Signatures and QR Code Footer -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px; border-top: 1px solid #cbd5e1; font-size: 12px;">
        <div style="text-align: center;">
          <div style="font-family: 'Brush Script MT', cursive, sans-serif; font-size: 22px; color: #1e3a8a; margin-bottom: 4px;">
            Smruti Ranjan Sahoo
          </div>
          <div style="border-top: 1px solid #475569; width: 180px; padding-top: 4px; font-weight: 700; color: #0f172a;">
            Dr. Smruti Ranjan Sahoo
          </div>
          <div style="font-size: 10.5px; color: #64748b;">Class In-Charge / Coordinator</div>
        </div>

        <!-- Security Verification QR Badge -->
        <div style="text-align: center;">
          <div style="width: 60px; height: 60px; margin: 0 auto 4px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px; background: white;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2" style="width: 100%; height: 100%;"><rect width="5" height="5" x="3" y="3"/><rect width="5" height="5" x="16" y="3"/><rect width="5" height="5" x="3" y="16"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
          </div>
          <div style="font-size: 9px; color: #64748b; font-family: monospace;">DOC-ID: SA-2026-1042</div>
        </div>

        <div style="text-align: center;">
          <div style="font-family: 'Brush Script MT', cursive, sans-serif; font-size: 22px; color: #1e3a8a; margin-bottom: 4px;">
            Nakka Shekhar
          </div>
          <div style="border-top: 1px solid #475569; width: 180px; padding-top: 4px; font-weight: 700; color: #0f172a;">
            Dr. Nakka Shekhar
          </div>
          <div style="font-size: 10.5px; color: #64748b;">Professor & Academic Dean / HOD</div>
        </div>
      </div>

    </div>
  `;
}
