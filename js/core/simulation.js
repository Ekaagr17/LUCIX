// LUCIX Real-Time Attack Simulation Engine (SimEngine)
// Manages real-time tactical playback, event cadence, audio alerts, and multi-view dispatch.

const SimulationEngine = (() => {

  const TACTICAL_COMMENTARY = {
    E001: "Tactical alert: Port reconnaissance detected from Frankfurt Tor exit node. Perimeter scanning initiated.",
    E002: "DNS enumeration observed from Linode cloud infrastructure. Target discovery underway.",
    E003: "Critical alert: Inbound connection established on port 4444 to Workstation-01. Initial breach confirmed.",
    E004: "Host execution: PowerShell process spawned abnormally from explorer.exe.",
    E005: "Outbound command and control channel established to Namecheap cloud infrastructure.",
    E006: "Persistence stage: Malicious agent executable written to disk on Workstation-01.",
    E007: "Lateral movement alert: SMB connection opened to Server-02. Pivot underway.",
    E008: "Geographic anomaly: Tor exit node rotated over 9,000 kilometers from Frankfurt to Singapore.",
    E009: "Database compromise: Unauthorized queries executed against Database-01.",
    E010: "Exfiltration in progress: High-volume outbound transfer to external cloud IP.",
    E011: "External DNS beacon observed. Full intrusion sequence completed."
  };

  const STAGES = {
    E001: { stage: "RECONNAISSANCE", threat: 25, level: "ELEVATED", color: "#C5A55A" },
    E002: { stage: "TARGET DISCOVERY", threat: 35, level: "ELEVATED", color: "#C5A55A" },
    E003: { stage: "INITIAL ACCESS", threat: 55, level: "HIGH", color: "#1A3A6B" },
    E004: { stage: "EXECUTION", threat: 68, level: "HIGH", color: "#C5A55A" },
    E005: { stage: "C2 CHANNEL", threat: 78, level: "CRITICAL", color: "#C41E3A" },
    E006: { stage: "PERSISTENCE", threat: 84, level: "CRITICAL", color: "#C41E3A" },
    E007: { stage: "LATERAL MOVEMENT", threat: 90, level: "CRITICAL", color: "#1A3A6B" },
    E008: { stage: "GEO ANOMALY (TOR)", threat: 93, level: "CRITICAL", color: "#C5A55A" },
    E009: { stage: "DATA COMPROMISE", threat: 96, level: "CRITICAL", color: "#C5A55A" },
    E010: { stage: "DATA EXFILTRATION", threat: 100, level: "CRITICAL", color: "#C41E3A" },
    E011: { stage: "POST-EXFIL BEACON", threat: 100, level: "CRITICAL", color: "#C41E3A" }
  };

  let status = 'IDLE'; // 'IDLE', 'RUNNING', 'PAUSED', 'COMPLETED'
  let currentIndex = -1; // -1 means none triggered yet
  let intervalMs = 3500; // default speed (Normal = 3.5s per event)
  let timerId = null;
  let voiceEnabled = true;
  let sfxEnabled = true;
  let listeners = [];
  let audioCtx = null;

  // Web Audio synth alert chime
  function playAlertBeep(frequency = 880, type = 'sine', duration = 0.15) {
    if (!sfxEnabled) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (_) {}
  }

  function getAllEvents() {
    return window.LUCIX_DATA?.DEMO_EVENTS || [];
  }

  function getFiredEvents() {
    const all = getAllEvents();
    if (currentIndex < 0) return [];
    return all.slice(0, currentIndex + 1);
  }

  function getDiscoveredIPs() {
    const fired = getFiredEvents();
    const ips = new Set();
    fired.forEach(e => {
      if (e.source_ip) ips.add(e.source_ip);
    });
    return Array.from(ips);
  }

  function getCurrentStage() {
    if (currentIndex < 0) return { stage: "IDLE / STANDBY", threat: 0, level: "NORMAL", color: "#8899AA" };
    const all = getAllEvents();
    const ev = all[currentIndex];
    return STAGES[ev?.id] || { stage: "ACTIVE INTRUSION", threat: 50, level: "ELEVATED", color: "#C5A55A" };
  }

  function notify(changeType, data) {
    listeners.forEach(fn => {
      try { fn(changeType, data); } catch (err) { console.error('[SimEngine Listener Err]', err); }
    });
  }

  function triggerNextEvent() {
    const all = getAllEvents();
    if (currentIndex + 1 >= all.length) {
      status = 'COMPLETED';
      clearInterval(timerId);
      timerId = null;
      notify('completed', { events: getFiredEvents() });
      notify('state', { status });
      return;
    }

    currentIndex++;
    const currentEvent = all[currentIndex];
    const commentary = TACTICAL_COMMENTARY[currentEvent.id] || currentEvent.description;
    const stageInfo = STAGES[currentEvent.id];

    // Sound effect
    playAlertBeep(currentEvent.geo_anomaly ? 1200 : 750, 'triangle', 0.2);

    // Show floating global toast notification
    showToastNotification(currentEvent, stageInfo);

    // Voice briefing via LUCA
    if (voiceEnabled && window.LucaView?.speak) {
      window.LucaView.speak(commentary);
    }

    notify('event', {
      event: currentEvent,
      index: currentIndex,
      total: all.length,
      commentary,
      stageInfo,
      firedEvents: getFiredEvents(),
      discoveredIPs: getDiscoveredIPs()
    });

    if (currentIndex + 1 >= all.length) {
      status = 'COMPLETED';
      clearInterval(timerId);
      timerId = null;
      notify('completed', { events: getFiredEvents() });
      notify('state', { status });
    }
  }

  function play() {
    if (status === 'RUNNING') return;
    if (currentIndex >= getAllEvents().length - 1) {
      // Reached the end, restart from beginning
      reset();
    }
    status = 'RUNNING';
    notify('state', { status });

    // Fire immediately if starting from cold, then set interval
    triggerNextEvent();

    if (status === 'RUNNING') {
      clearInterval(timerId);
      timerId = setInterval(() => {
        triggerNextEvent();
      }, intervalMs);
    }
  }

  function pause() {
    if (status !== 'RUNNING') return;
    status = 'PAUSED';
    clearInterval(timerId);
    timerId = null;
    notify('state', { status });
  }

  function step() {
    if (status === 'RUNNING') pause();
    triggerNextEvent();
  }

  function reset() {
    clearInterval(timerId);
    timerId = null;
    status = 'IDLE';
    currentIndex = -1;
    notify('reset', {});
    notify('state', { status });
  }

  function setSpeed(ms) {
    intervalMs = Number(ms) || 3500;
    if (status === 'RUNNING') {
      clearInterval(timerId);
      timerId = setInterval(() => {
        triggerNextEvent();
      }, intervalMs);
    }
    notify('speed', { intervalMs });
  }

  function toggleVoice(val) {
    voiceEnabled = (val !== undefined) ? !!val : !voiceEnabled;
    notify('voice', { voiceEnabled });
    return voiceEnabled;
  }

  function toggleSfx(val) {
    sfxEnabled = (val !== undefined) ? !!val : !sfxEnabled;
    notify('sfx', { sfxEnabled });
    return sfxEnabled;
  }

  function subscribe(fn) {
    listeners.push(fn);
    return () => { listeners = listeners.filter(l => l !== fn); };
  }

  // ── FLOATING TOAST NOTIFICATION ─────────────────────────────────
  function showToastNotification(ev, stageInfo) {
    const container = document.getElementById('lucix-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `sim-toast ${ev.geo_anomaly ? 'toast-anomaly' : ''}`;
    toast.innerHTML = `
      <div class="sim-toast-header">
        <div class="sim-toast-pulse" style="background:${stageInfo?.color || '#1A3A6B'}"></div>
        <span class="sim-toast-eid">${ev.id}</span>
        <span class="sim-toast-stage" style="color:${stageInfo?.color || '#8899AA'}">${stageInfo?.stage || ev.type}</span>
        <span class="sim-toast-time">${new Date(ev.timestamp).toISOString().substring(11, 16)} UTC</span>
        <button class="sim-toast-close" onclick="this.parentElement.parentElement.remove()">✕</button>
      </div>
      <div class="sim-toast-desc">${ev.description}</div>
      <div class="sim-toast-footer">
        ${ev.source_ip ? `<span class="sim-toast-chip">IP: ${ev.source_ip}</span>` : ''}
        ${ev.geo_anomaly ? `<span class="sim-toast-anomaly">⚠ GEO JUMP</span>` : ''}
        <button class="sim-toast-btn" onclick="LUCIX.navigate('evidence',{eventId:'${ev.id}'})">Investigate →</button>
      </div>
    `;

    container.appendChild(toast);

    // Auto-remove after 6 seconds
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 5500);
  }

  return {
    play,
    pause,
    step,
    reset,
    setSpeed,
    toggleVoice,
    toggleSfx,
    subscribe,
    getAllEvents,
    getFiredEvents,
    getDiscoveredIPs,
    getCurrentStage,
    getStatus: () => status,
    getCurrentIndex: () => currentIndex,
    getIntervalMs: () => intervalMs,
    isVoiceEnabled: () => voiceEnabled,
    isSfxEnabled: () => sfxEnabled,
    TACTICAL_COMMENTARY,
    STAGES
  };
})();

window.SimulationEngine = SimulationEngine;
