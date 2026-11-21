// LUCIX Timeline View v3 — glassmorphism card layout + simulation reactivity
const TimelineView = (() => {

  let unsubscribe = null;

  function render(container) {
    const events = window.LUCIX.state.events;
    const verified = events.filter(e => e.integrity_status === 'VERIFIED').length;
    const simStatus = window.SimulationEngine?.getStatus() || 'IDLE';
    const currSimIdx = window.SimulationEngine?.getCurrentIndex() ?? -1;

    container.innerHTML = `
      <div class="view-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <div class="view-title"><span class="view-icon">◷</span> Timeline</div>
          <div class="view-subtitle">Chronological incident events — click any card to open in Evidence</div>
        </div>
        ${simStatus === 'RUNNING' || simStatus === 'PAUSED' ? `
          <div style="display:flex;align-items:center;gap:8px;background:rgba(196,30,58,.12);border:1px solid rgba(196,30,58,.3);padding:5px 12px;border-radius:var(--radius-full);">
            <div class="sim-toast-pulse" style="background:#C41E3A"></div>
            <span style="font-size:11px;font-weight:700;color:#C41E3A">SIMULATION ACTIVE: ${currSimIdx + 1}/11</span>
            <button class="sim-link-btn" onclick="LUCIX.navigate('simulation')">Control Studio →</button>
          </div>
        ` : `
          <button class="sim-btn" onclick="LUCIX.navigate('simulation')" style="color:#C41E3A;border-color:rgba(196,30,58,.3);">
            🎬 Launch Real-Time Simulation
          </button>
        `}
      </div>
      <div class="chain-status-bar">
        <span class="chain-icon">⛓</span>
        <span class="chs-label">Evidence Chain</span>
        <span class="chs-count">${verified}/${events.length} verified</span>
        <span class="chs-note">SHA-256 cryptographic hash chain • verified at load</span>
      </div>
      <div class="tl-wrap" id="tl-wrap"></div>
    `;

    renderCards(events, document.getElementById('tl-wrap'));

    // Subscribe to live simulation events
    if (unsubscribe) unsubscribe();
    if (window.SimulationEngine) {
      unsubscribe = SimulationEngine.subscribe((type, data) => {
        if (window.LUCIX?.state?.currentView !== 'timeline') return;
        renderCards(events, document.getElementById('tl-wrap'));
      });
    }
  }

  function renderCards(events, wrap) {
    if (!wrap) return;
    const simStatus = window.SimulationEngine?.getStatus() || 'IDLE';
    const currSimIdx = window.SimulationEngine?.getCurrentIndex() ?? -1;
    const isSimActive = simStatus === 'RUNNING' || simStatus === 'PAUSED';

    wrap.innerHTML = events.map((ev, idx) => {
      const accent    = accentColor(ev.type);
      const typeLabel = ev.type.replace(/_/g, ' ');
      const intBadge  = EvidenceIntegrity.integrityBadgeHtml(ev.integrity_status || 'UNVERIFIED');
      const trustBadge= EvidenceIntegrity.trustBadgeHtml(ev.source_trust || 'UNVERIFIED');
      const geoLink   = ev.source_ip && window.LUCIX_DATA.IP_GEO_DATA[ev.source_ip]
        ? (() => { const a = GeoProvider.analyzeIP(ev.source_ip,ev.id); return a ? `${a.displayCity}, ${a.displayCountry}` : null; })()
        : null;

      const isFiredInSim = !isSimActive || idx <= currSimIdx;
      const isCurrentSim = isSimActive && idx === currSimIdx;

      return `
        <div class="tl-card${ev.geo_anomaly ? ' tl-anomaly' : ''} ${isCurrentSim ? 'newly-fired' : ''}"
             style="${!isFiredInSim ? 'opacity:0.35;filter:grayscale(0.5);' : ''}"
             onclick="LUCIX.navigate('evidence',{eventId:'${ev.id}'})">
          <div class="tl-card-accent" style="background:${accent}"></div>
          <div class="tl-card-body">
            <div class="tl-top">
              <span class="tl-eid">${ev.id}</span>
              <span class="tl-type evt-${ev.type}">${typeLabel}</span>
              ${ev.geo_anomaly ? '<span class="tl-anomaly-pill">⚠ GEO ANOMALY</span>' : ''}
              ${isCurrentSim ? '<span class="sim-infra-tag tag-active" style="animation:sim-pulse 1s infinite">LIVE EVENT</span>' : ''}
              <span class="tl-time">${fmtTs(ev.timestamp)}</span>
            </div>
            <div class="tl-desc">${ev.description}</div>
            <div class="tl-meta">
              ${ev.source_ip ? `
                <span class="tl-ip-chip"
                      onclick="event.stopPropagation();LUCIX.navigate('geoint',{ip:'${ev.source_ip}',eventId:'${ev.id}'})"
                >${ev.source_ip} ${ipTypeBadge(ev.source_ip)}</span>
              ` : ''}
              ${ev.dest_host || ev.dest_ip ? `
                <span class="tl-arrow">→</span>
                <span class="tl-host-chip">${ev.dest_host||ev.dest_ip}${ev.dest_port?':'+ev.dest_port:''}</span>
              ` : ''}
              ${ev.host ? `<span class="tl-host-chip">on ${ev.host}</span>` : ''}
            </div>
            <div class="tl-badges">
              ${intBadge} ${trustBadge}
              <span class="tl-collector">Collector: ${ev.collector_id}</span>
              ${geoLink ? `
                <span class="tl-geo-chip"
                  onclick="event.stopPropagation();LUCIX.navigate('geoint',{ip:'${ev.source_ip}',eventId:'${ev.id}'})"
                >📍 ${geoLink}</span>
              ` : ''}
            </div>
            <div class="tl-tags">${(ev.tags||[]).map(t=>`<span class="tl-tag">${t}</span>`).join('')}</div>
          </div>
        </div>`;
    }).join('');
  }

  function ipTypeBadge(ip) {
    const d = window.LUCIX_DATA.IP_GEO_DATA[ip];
    return d ? NetworkClassifier.getBadgeHtml(d.providers[0]?.network_type) : '';
  }
  function accentColor(type) {
    const m = {
      NETWORK_SCAN:'#C5A55A',CONNECTION_ESTABLISHED:'#1A3A6B',
      PROCESS_CREATED:'#C5A55A',DNS_QUERY:'#C5A55A',FILE_ACCESS:'#C41E3A'
    };
    return m[type] || '#4A5568';
  }
  function fmtTs(ts) {
    if (!ts) return '—';
    return new Date(ts).toISOString().replace('T',' ').replace(/\.\d+Z$/,' UTC');
  }

  return { render };
})();
window.TimelineView = TimelineView;
