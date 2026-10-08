/**
 * SmartAttend - Interactive RFID Hardware Scanner Simulator
 * Enables realistic physical card tap demonstrations for evaluation and presentations.
 */

export function renderRfidSimulatorModal(students, readers, defaultStudentId = '23CS01042') {
  return `
    <div class="modal-backdrop" id="rfid-sim-modal-backdrop">
      <div class="modal-content" style="max-width: 540px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: var(--radius-md); background: linear-gradient(135deg, #4f46e5, #2563eb); display: flex; align-items: center; justify-content: center; color: white;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            </div>
            <div>
              <h3 style="font-size: 16px; font-weight: 700; color: var(--text-primary);">RFID Hardware Simulator</h3>
              <div style="font-size: 11.5px; color: var(--text-muted);">Simulates physical NFC/RFID tap events into AWS API Gateway</div>
            </div>
          </div>
          <button id="btn-close-sim-modal" style="background: none; border: none; font-size: 20px; color: var(--text-muted); cursor: pointer; padding: 4px;">&times;</button>
        </div>

        <div class="modal-body">
          <!-- Student Selection -->
          <div class="form-group">
            <label class="form-label">Select Student Card to Tap</label>
            <select id="sim-student-select" class="form-control">
              ${students.map(s => `
                <option value="${s.rfid_card_id}" ${s.student_id === defaultStudentId ? 'selected' : ''}>
                  ${s.name} (${s.student_id}) — Tag: ${s.rfid_card_id}
                </option>
              `).join('')}
              <option value="UNREGISTERED_CARD_999">⚠️ Unregistered Card ID (Test Error State)</option>
            </select>
          </div>

          <!-- Reader Selection -->
          <div class="form-group">
            <label class="form-label">Select RFID Classroom Reader</label>
            <select id="sim-reader-select" class="form-control">
              ${readers.map(r => `
                <option value="${r.reader_id}">${r.reader_id} — ${r.room} (${r.location})</option>
              `).join('')}
            </select>
          </div>

          <!-- Scenario Quick Presets -->
          <div class="form-group">
            <label class="form-label">Attendance Time Scenario</label>
            <select id="sim-scenario-select" class="form-control">
              <option value="ON_TIME">1. ON TIME (10:57 AM — Within 5m grace period)</option>
              <option value="LATE">2. LATE (11:09 AM — Inside 6–15m late window)</option>
              <option value="VERY_LATE">3. VERY LATE (11:22 AM — Inside 16–30m very late window)</option>
              <option value="CUTOFF">4. AFTER CUTOFF (11:48 AM — Past 45m, Not Counted)</option>
              <option value="CONSECUTIVE_LAB">5. MULTI-PERIOD LAB (12:58 PM — Consecutive 3-Hour Lab)</option>
              <option value="CUSTOM">6. Custom Punch Time (Specify HH:MM below)</option>
            </select>
          </div>

          <!-- Custom Time Input (Hidden unless Custom selected) -->
          <div class="form-group" id="sim-custom-time-group" style="display: none;">
            <label class="form-label">Custom Scan Time (24-Hour HH:MM)</label>
            <input type="text" id="sim-custom-time-input" class="form-control" placeholder="e.g. 10:58" value="10:58">
          </div>

          <!-- Live Result Status Preview Box -->
          <div id="sim-result-box" style="margin-top: 18px; padding: 16px; border-radius: var(--radius-md); background: var(--bg-subtle); border: 1px dashed var(--border-color); text-align: center;">
            <div style="font-size: 12px; color: var(--text-muted);">
              Ready for simulation. Click <strong>"TAP RFID CARD"</strong> to broadcast scan event.
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button id="btn-cancel-sim" class="btn btn-secondary btn-sm">Close</button>
          <button id="btn-trigger-rfid-tap" class="btn btn-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            TAP RFID CARD NOW
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Synthesizes an audible RFID scan confirmation chime using Web Audio API
 */
export function playRfidChime(status = 'success') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (status === 'success' || status === 'ON TIME') {
      // High pleasant double-beep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (status === 'LATE' || status === 'warning') {
      // Single mid beep
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } else {
      // Low buzz for rejection / error
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(180, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.32);
    }
  } catch (err) {
    // Audio synthesis fallback (non-critical)
  }
}
