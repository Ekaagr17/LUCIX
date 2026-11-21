// LUCIX Real-Time Attack Simulation View v3
// Cinematic Cyber Operations Room & Tactical Playback Dashboard

const SimulationView = (() => {

  let unsubscribe = null;

  function render(container) {
    const status = SimulationEngine.getStatus();
    const currentIndex = SimulationEngine.getCurrentIndex();
    const allEvents = SimulationEngine.getAllEvents();
    const stage = SimulationEngine.getCurrentStage();
    const isVoice = SimulationEngine.isVoiceEnabled();
    const isSfx = SimulationEngine.isSfxEnabled();
    const intervalMs = SimulationEngine.getIntervalMs();

    container.innerHTML = `
      <div class="view-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div>
          <div class="view-title">
            <span class="view-icon">🎬</span> Attack Simulation Engine
            <span class="sim-status-badge sim-badge-${status.toLowerCase()}" id="sim-status-badge">${status}</span>
          </div>
          <div class="view-subtitle">Real-time dynamic incident playback with live geographic, network & telemetry triggers</div>
        </div>

        <div class="sim-header-actions">
          <button class="sim-btn sim-btn-voice ${isVoice ? 'active' : ''}" id="sim-voice-btn" onclick="SimulationView.toggleVoice()">
            ${isVoice ? '🎤 Voice Briefing: ON' : '🔇 Voice Briefing: OFF'}
          </button>
          <button class="sim-btn sim-btn-sfx ${isSfx ? 'active' : ''}" id="sim-sfx-btn" onclick="SimulationView.toggleSfx()">
            ${isSfx ? '🔊 SFX: ON' : '🔈 SFX: OFF'}
          </button>
        </div>
      </div>

      <!-- Simulation Master Playback Bar -->
      <div class="sim-playback-card glass-card">
        <div class="sim-controls-row">
          <div class="sim-main-btns">
            <button class="sim-ctrl-btn sim-btn-play ${status==='RUNNING'?'active':''}" id="sim-play-btn" onclick="SimulationView.togglePlay()">
              ${status==='RUNNING' ? '⏸ Pause' : '▶ Play Simulation'}
            </button>
            <button class="sim-ctrl-btn sim-btn-step" onclick="SimulationEngine.step()" title="Step 1 event forward">
              ⏭ Step
            </button>
            <button class="sim-ctrl-btn sim-btn-reset" onclick="SimulationEngine.reset()" title="Reset simulation to start">
              ⏹ Reset
            </button>
          </div>

          <div class="sim-speed-selector">
            <span class="sim-speed-label">Playback Speed:</span>
            <div class="sim-speed-pills">
              <button class="sim-speed-pill ${intervalMs===7000?'active':''}" onclick="SimulationView.setSpeed(7000)">Slow (20x)</button>
              <button class="sim-speed-pill ${intervalMs===3500?'active':''}" onclick="SimulationView.setSpeed(3500)">Normal (60x)</button>
              <button class="sim-speed-pill ${intervalMs===1500?'active':''}" onclick="SimulationView.setSpeed(1500)">Fast (120x)</button>
            </div>
          </div>

          <div class="sim-live-clock" id="sim-live-clock">
            ${currentIndex >= 0 ? new Date(allEvents[currentIndex].timestamp).toISOString().replace('T',' ').replace(/\.\d+Z$/,' UTC') : '09:12:00 UTC (T-0)'}
          </div>
        </div>

        <!-- Scrubber Line with event markers -->
        <div class="sim-scrubber-wrap">
          <div class="sim-scrubber-track">
            <div class="sim-scrubber-progress" id="sim-scrubber-progress" style="width:${Math.max(0, (currentIndex + 1) / allEvents.length * 100)}%"></div>
          </div>
          <div class="sim-scrubber-dots" id="sim-scrubber-dots">
            ${allEvents.map((e, idx) => {
              const fired = idx <= currentIndex;
              const isCurr = idx === currentIndex;
              return `
                <div class="sim-scrub-dot ${fired?'fired':''} ${isCurr?'current':''} ${e.geo_anomaly?'anomaly':''}"
                     title="${e.id} — ${e.type} (${new Date(e.timestamp).toISOString().substring(11,16)} UTC)">
                  <span class="sim-dot-label">${e.id}</span>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Tactical Dashboard 3-Column Layout -->
      <div class="sim-dashboard-grid">

        <!-- Column 1: Threat Meter & Discovered Infrastructure -->
        <div class="sim-col sim-col-left">
          <div class="sim-card glass-card">
            <div class="sim-card-title">Threat Assessment</div>
            <div class="sim-threat-container">
              <div class="sim-threat-header">
                <span class="sim-threat-stage" id="sim-threat-stage" style="color:${stage.color}">${stage.stage}</span>
                <span class="sim-threat-percent" id="sim-threat-percent">${stage.threat}%</span>
              </div>
              <div class="sim-threat-bar-wrap">
                <div class="sim-threat-bar-fill" id="sim-threat-bar-fill" style="width:${stage.threat}%;background:${stage.color};box-shadow:0 0 12px ${stage.color}80"></div>
              </div>
              <div class="sim-threat-level-badge" id="sim-threat-level-badge" style="background:${stage.color}20;color:${stage.color};border:1px solid ${stage.color}50">
                THREAT LEVEL: ${stage.level}
              </div>
            </div>
          </div>

          <div class="sim-card glass-card" style="margin-top:14px;">
            <div class="sim-card-title">Discovered Adversary Infrastructure</div>
            <div class="sim-infra-list" id="sim-infra-list">
              ${renderInfraList()}
            </div>
          </div>

          <div class="sim-card glass-card" style="margin-top:14px;">
            <div class="sim-card-title">Kill Chain Progression</div>
            <div class="sim-killchain-list" id="sim-killchain-list">
              ${renderKillChain()}
            </div>
          </div>
        </div>

        <!-- Column 2: Live Incident Telemetry Feed -->
        <div class="sim-col sim-col-center">
          <div class="sim-feed-card glass-card">
            <div class="sim-feed-header">
              <span class="sim-card-title" style="margin:0;">Live Telemetry Stream</span>
              <span class="sim-feed-counter" id="sim-feed-counter">${currentIndex + 1} / ${allEvents.length} Events Fired</span>
            </div>
            <div class="sim-events-stream" id="sim-events-stream">
              ${renderEventsStream()}
            </div>
          </div>
        </div>

        <!-- Column 3: Tactical Briefing & Geo Map Preview -->
        <div class="sim-col sim-col-right">
          <div class="sim-card glass-card">
            <div class="sim-card-title">LUCA Tactical Voice Briefing</div>
            <div class="sim-briefing-box" id="sim-briefing-box">
              <div class="sim-briefing-avatar">🧠</div>
              <div class="sim-briefing-content">
                <div class="sim-briefing-author">LUCA Intelligence Briefing</div>
                <div class="sim-briefing-text" id="sim-briefing-text">
                  ${currentIndex >= 0
                    ? (SimulationEngine.TACTICAL_COMMENTARY[allEvents[currentIndex].id] || allEvents[currentIndex].description)
                    : "Simulation on standby. Press <strong>Play</strong> to initiate the real-time attack reconstruction."}
                </div>
              </div>
            </div>
          </div>

          <div class="sim-card glass-card" style="margin-top:14px;flex:1;display:flex;flex-direction:column;">
            <div class="sim-card-title" style="display:flex;justify-content:space-between;align-items:center;">
              <span>Live Geographic Radar</span>
              <button class="sim-link-btn" onclick="LUCIX.navigate('geoint')">Open Full Map →</button>
            </div>
            <div class="sim-mini-map-area" id="sim-mini-map-area">
              <div id="sim-mini-map" style="width:100%;height:220px;border-radius:10px;overflow:hidden;border:1px solid var(--glass-border);"></div>
            </div>
            <div class="sim-geo-log" id="sim-geo-log" style="margin-top:10px;font-size:11px;color:var(--text-2);">
              ${renderGeoLog()}
            </div>
          </div>
        </div>

      </div>
    `;

    initMiniMap();

    // Subscribe to engine changes
    if (unsubscribe) unsubscribe();
    unsubscribe = SimulationEngine.subscribe((type, data) => {
      updateUI(type, data);
    });
  }

  let miniMap = null;
  let miniMarkers = {};

  function initMiniMap() {
    const el = document.getElementById('sim-mini-map');
    if (!el || typeof L === 'undefined') return;

    if (miniMap) {
      miniMap.remove();
      miniMap = null;
    }
    miniMarkers = {};

    try {
      miniMap = L.map('sim-mini-map', {
        center: [35, 10],
        zoom: 1,
        zoomControl: false,
        attributionControl: false
      });

      const GEOAPIFY_KEY = 'e71fb39e9dab4fd9b66b7f0d784f4903';
      const geoLayer = L.tileLayer(`https://maps.geoapify.com/v1/tile/dark-matter/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_KEY}`, {
        maxZoom: 20
      });
      const cartoFallback = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd', maxZoom: 19
      });
      geoLayer.on('tileerror', () => {
        if (!miniMap.hasLayer(cartoFallback)) cartoFallback.addTo(miniMap);
      });
      geoLayer.addTo(miniMap);

      // Render markers for already discovered IPs
      updateMiniMapMarkers();
    } catch (e) {
      console.warn('[SimMiniMap err]', e);
    }
  }

  function updateMiniMapMarkers() {
    if (!miniMap) return;
    const discovered = SimulationEngine.getDiscoveredIPs();
    const currIndex = SimulationEngine.getCurrentIndex();
    const all = SimulationEngine.getAllEvents();
    const lastEvent = currIndex >= 0 ? all[currIndex] : null;

    discovered.forEach(ip => {
      const data = window.LUCIX_DATA?.IP_GEO_DATA?.[ip];
      if (!data) return;
      const analysis = GeoProvider.analyzeIP(ip);
      const loc = analysis?.bestLocation;
      if (!loc) return;

      if (!miniMarkers[ip]) {
        const isTor = analysis.classification.type === 'TOR_EXIT';
        const col = isTor ? '#1A3A6B' : (analysis.classification.type === 'CLOUD_HOSTING' ? '#C41E3A' : '#C5A55A');
        const icon = L.divIcon({
          className: '',
          html: `<div class="sim-mini-marker" style="background:${col};box-shadow:0 0 10px ${col}"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });
        const m = L.marker([loc.lat, loc.lng], { icon }).addTo(miniMap);
        m.bindTooltip(`${ip} (${analysis.displayCity})`, { className: 'lucix-tip' });
        miniMarkers[ip] = m;
      }
    });

    // Check if E008 reached (Tor geo-jump)
    if (currIndex >= 7 && !miniMarkers['tor_jump']) {
      const torData = window.LUCIX_DATA?.IP_GEO_DATA?.['185.220.101.34'];
      if (torData?.providers_e008) {
        const p2 = torData.providers_e008[0];
        const jumpIcon = L.divIcon({
          className: '',
          html: `<div class="sim-mini-marker" style="background:#C5A55A;box-shadow:0 0 12px #C5A55A;border:1px dashed #fff;"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        const jm = L.marker([p2.lat, p2.lng], { icon: jumpIcon }).addTo(miniMap);
        jm.bindTooltip(`⚠ Tor Rotated: ${p2.city}`, { className: 'lucix-tip' });
        miniMarkers['tor_jump'] = jm;

        // Line between Frankfurt & Singapore
        const p1 = torData.providers[0];
        L.polyline([[p1.lat, p1.lng], [p2.lat, p2.lng]], {
          color: '#1A3A6B',
          weight: 2,
          opacity: 0.8,
          dashArray: '4 4'
        }).addTo(miniMap);
      }
    }

    // Pan to last active IP
    if (lastEvent?.source_ip) {
      const a = GeoProvider.analyzeIP(lastEvent.source_ip);
      if (a?.bestLocation) {
        miniMap.panTo([a.bestLocation.lat, a.bestLocation.lng], { animate: true, duration: 0.8 });
      }
    }
  }

  function renderInfraList() {
    const discovered = SimulationEngine.getDiscoveredIPs();
    const currIdx = SimulationEngine.getCurrentIndex();
    const ips = Object.keys(window.LUCIX_DATA?.IP_GEO_DATA || {});

    return ips.map(ip => {
      const isDiscovered = discovered.includes(ip);
      const analysis = GeoProvider.analyzeIP(ip);
      const isTor = analysis.classification.type === 'TOR_EXIT';
      const isJump = isTor && currIdx >= 7;

      let statusBadge = '<span class="sim-infra-tag tag-hidden">UNOBSERVED</span>';
      if (isDiscovered) {
        if (ip === '185.220.101.34') {
          statusBadge = isJump
            ? '<span class="sim-infra-tag tag-anomaly">ROTATED → SINGAPORE</span>'
            : '<span class="sim-infra-tag tag-active">RECON ACTIVE</span>';
        } else if (ip === '45.33.32.156') {
          statusBadge = '<span class="sim-infra-tag tag-active">INITIAL ACCESS</span>';
        } else if (ip === '198.54.117.200') {
          statusBadge = currIdx >= 9
            ? '<span class="sim-infra-tag tag-critical">EXFIL SINK</span>'
            : '<span class="sim-infra-tag tag-active">C2 BEACON</span>';
        }
      }

      return `
        <div class="sim-infra-item ${isDiscovered ? 'active' : 'inactive'}" onclick="${isDiscovered ? `LUCIX.navigate('geoint',{ip:'${ip}'})` : ''}">
          <div class="sim-infra-dot" style="background:${isDiscovered ? (isTor ? '#1A3A6B' : '#C41E3A') : '#2D3748'}"></div>
          <div class="sim-infra-details">
            <div class="sim-infra-ip">${ip}</div>
            <div class="sim-infra-loc">${isDiscovered ? `${analysis.displayCity}, ${analysis.displayCountry}` : 'Waiting for network evidence…'}</div>
          </div>
          ${statusBadge}
        </div>
      `;
    }).join('');
  }

  function renderKillChain() {
    const currIdx = SimulationEngine.getCurrentIndex();
    const stages = [
      { id: 'recon', name: 'Reconnaissance', minEv: 0 },
      { id: 'initial', name: 'Initial Access', minEv: 2 },
      { id: 'exec', name: 'Execution', minEv: 3 },
      { id: 'c2', name: 'Command & Control', minEv: 4 },
      { id: 'persist', name: 'Persistence', minEv: 5 },
      { id: 'lateral', name: 'Lateral Movement', minEv: 6 },
      { id: 'exfil', name: 'Exfiltration', minEv: 9 }
    ];

    return stages.map(s => {
      const active = currIdx >= s.minEv;
      const isCurrent = currIdx === s.minEv || (s.id === 'exfil' && currIdx >= 9);
      return `
        <div class="sim-kc-step ${active ? 'active' : ''} ${isCurrent ? 'pulse' : ''}">
          <div class="sim-kc-marker">${active ? '✓' : '○'}</div>
          <div class="sim-kc-name">${s.name}</div>
        </div>
      `;
    }).join('');
  }

  function renderEventsStream() {
    const fired = SimulationEngine.getFiredEvents();
    if (fired.length === 0) {
      return `
        <div class="sim-stream-empty">
          <div class="sim-stream-empty-icon">⚡</div>
          <div>Simulation Ready</div>
          <div style="font-size:12px;color:var(--text-3);margin-top:4px;">Click <strong>Play Simulation</strong> above to stream attack telemetry in real time.</div>
        </div>
      `;
    }

    // Newest first or chronologically ordered: let's reverse so newest is on top
    return fired.slice().reverse().map((ev, i) => {
      const isNewest = i === 0;
      const stage = SimulationEngine.STAGES[ev.id];
      return `
        <div class="sim-event-card ${isNewest ? 'newly-fired' : ''} ${ev.geo_anomaly ? 'anomaly-card' : ''}"
             onclick="LUCIX.navigate('evidence',{eventId:'${ev.id}'})">
          <div class="sim-ev-hdr">
            <span class="sim-ev-id">${ev.id}</span>
            <span class="sim-ev-type" style="color:${stage?.color || '#1A3A6B'}">${stage?.stage || ev.type}</span>
            ${ev.geo_anomaly ? '<span class="sim-ev-anomaly">⚠ GEO JUMP</span>' : ''}
            <span class="sim-ev-time">${new Date(ev.timestamp).toISOString().substring(11, 19)} UTC</span>
          </div>
          <div class="sim-ev-desc">${ev.description}</div>
          <div class="sim-ev-footer">
            ${ev.source_ip ? `<span class="sim-ev-chip" onclick="event.stopPropagation();LUCIX.navigate('geoint',{ip:'${ev.source_ip}'})">📍 ${ev.source_ip}</span>` : ''}
            ${ev.dest_host ? `<span class="sim-ev-chip">Target: ${ev.dest_host}</span>` : ''}
            <span class="sim-ev-chain-badge">⛓ ${ev.integrity_status || 'VERIFIED'}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderGeoLog() {
    const currIdx = SimulationEngine.getCurrentIndex();
    if (currIdx < 0) return 'No active geographic signals.';
    if (currIdx < 7) {
      return 'Active source IPs tracked in <strong>Frankfurt, Germany</strong> and <strong>Newark, NJ</strong>.';
    }
    return '<strong>⚠ High-priority alert:</strong> Tor exit rotation detected to Singapore at 10:04 UTC (Event E008).';
  }

  function updateUI(type, data) {
    const container = document.getElementById('main-content');
    // Only re-render in place if user is currently on sim_view
    if (window.LUCIX?.state?.currentView !== 'simulation') return;

    // Update Play button
    const playBtn = document.getElementById('sim-play-btn');
    const status = SimulationEngine.getStatus();
    if (playBtn) {
      playBtn.innerHTML = status === 'RUNNING' ? '⏸ Pause' : (status === 'COMPLETED' ? '↺ Replay' : '▶ Play Simulation');
      playBtn.classList.toggle('active', status === 'RUNNING');
    }

    // Update Status badge
    const statusBadge = document.getElementById('sim-status-badge');
    if (statusBadge) {
      statusBadge.className = `sim-status-badge sim-badge-${status.toLowerCase()}`;
      statusBadge.textContent = status;
    }

    const currIdx = SimulationEngine.getCurrentIndex();
    const all = SimulationEngine.getAllEvents();
    const stage = SimulationEngine.getCurrentStage();

    // Clock
    const clock = document.getElementById('sim-live-clock');
    if (clock) {
      clock.textContent = currIdx >= 0 ? new Date(all[currIdx].timestamp).toISOString().replace('T',' ').replace(/\.\d+Z$/,' UTC') : '09:12:00 UTC (T-0)';
    }

    // Scrubber progress
    const prog = document.getElementById('sim-scrubber-progress');
    if (prog) {
      prog.style.width = `${Math.max(0, (currIdx + 1) / all.length * 100)}%`;
    }

    // Scrubber dots
    const dotsContainer = document.getElementById('sim-scrubber-dots');
    if (dotsContainer) {
      dotsContainer.querySelectorAll('.sim-scrub-dot').forEach((d, idx) => {
        d.classList.toggle('fired', idx <= currIdx);
        d.classList.toggle('current', idx === currIdx);
      });
    }

    // Threat gauge
    const stageEl = document.getElementById('sim-threat-stage');
    if (stageEl) { stageEl.textContent = stage.stage; stageEl.style.color = stage.color; }

    const percentEl = document.getElementById('sim-threat-percent');
    if (percentEl) { percentEl.textContent = `${stage.threat}%`; }

    const barFill = document.getElementById('sim-threat-bar-fill');
    if (barFill) {
      barFill.style.width = `${stage.threat}%`;
      barFill.style.background = stage.color;
      barFill.style.boxShadow = `0 0 12px ${stage.color}80`;
    }

    const badge = document.getElementById('sim-threat-level-badge');
    if (badge) {
      badge.textContent = `THREAT LEVEL: ${stage.level}`;
      badge.style.background = `${stage.color}20`;
      badge.style.color = stage.color;
      badge.style.border = `1px solid ${stage.color}50`;
    }

    // Discovered infrastructure
    const infraList = document.getElementById('sim-infra-list');
    if (infraList) infraList.innerHTML = renderInfraList();

    // Kill chain
    const kcList = document.getElementById('sim-killchain-list');
    if (kcList) kcList.innerHTML = renderKillChain();

    // Stream
    const stream = document.getElementById('sim-events-stream');
    if (stream) stream.innerHTML = renderEventsStream();

    const counter = document.getElementById('sim-feed-counter');
    if (counter) counter.textContent = `${currIdx + 1} / ${all.length} Events Fired`;

    // LUCA Tactical Briefing text
    const briefingText = document.getElementById('sim-briefing-text');
    if (briefingText) {
      briefingText.innerHTML = currIdx >= 0
        ? (SimulationEngine.TACTICAL_COMMENTARY[all[currIdx].id] || all[currIdx].description)
        : "Simulation on standby. Press <strong>Play</strong> to initiate the real-time attack reconstruction.";
    }

    // Geo Log
    const geoLog = document.getElementById('sim-geo-log');
    if (geoLog) geoLog.innerHTML = renderGeoLog();

    // Mini Map markers
    updateMiniMapMarkers();
  }

  function togglePlay() {
    const status = SimulationEngine.getStatus();
    if (status === 'RUNNING') {
      SimulationEngine.pause();
    } else {
      SimulationEngine.play();
    }
  }

  function setSpeed(ms) {
    SimulationEngine.setSpeed(ms);
    document.querySelectorAll('.sim-speed-pill').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.includes(ms === 7000 ? '20x' : (ms === 3500 ? '60x' : '120x')));
    });
  }

  function toggleVoice() {
    const on = SimulationEngine.toggleVoice();
    const btn = document.getElementById('sim-voice-btn');
    if (btn) {
      btn.textContent = on ? '🎤 Voice Briefing: ON' : '🔇 Voice Briefing: OFF';
      btn.classList.toggle('active', on);
    }
  }

  function toggleSfx() {
    const on = SimulationEngine.toggleSfx();
    const btn = document.getElementById('sim-sfx-btn');
    if (btn) {
      btn.textContent = on ? '🔊 SFX: ON' : '🔈 SFX: OFF';
      btn.classList.toggle('active', on);
    }
  }

  return {
    render,
    togglePlay,
    setSpeed,
    toggleVoice,
    toggleSfx
  };
})();

window.SimulationView = SimulationView;
