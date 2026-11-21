// LUCIX GEOINT View v3 — glowing Leaflet markers + glassmorphism detail panel
const GeoIntView = (() => {

  let map = null; let markers = {}; let selectedIP = null;

  const MARKER = {
    TOR_EXIT:      {color:'#1A3A6B',symbol:'◉'},
    VPN:           {color:'#C5A55A',symbol:'◎'},
    CLOUD_HOSTING: {color:'#C41E3A',symbol:'▲'},
    CDN:           {color:'#0ea5e9',symbol:'◆'},
    PROXY:         {color:'#d97706',symbol:'⬡'},
    RESIDENTIAL:   {color:'#1A3A6B',symbol:'●'},
    INTERNAL:      {color:'#1A3A6B',symbol:'□'},
    UNKNOWN:       {color:'#4A5568',symbol:'?'}
  };

  let unsubscribe = null;

  function render(container, params) {
    selectedIP = params?.ip || null;
    const simStatus = window.SimulationEngine?.getStatus() || 'IDLE';
    const currSimIdx = window.SimulationEngine?.getCurrentIndex() ?? -1;

    container.innerHTML = `
      <div class="view-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <div class="view-title"><span class="view-icon">📍</span> Geographic Investigation</div>
          <div class="view-subtitle">Infrastructure geolocation estimate — not physical attacker tracking</div>
        </div>
        ${simStatus === 'RUNNING' || simStatus === 'PAUSED' ? `
          <div style="display:flex;align-items:center;gap:8px;background:rgba(196,30,58,.12);border:1px solid rgba(196,30,58,.3);padding:5px 12px;border-radius:var(--radius-full);">
            <div class="sim-toast-pulse" style="background:#C41E3A"></div>
            <span style="font-size:11px;font-weight:700;color:#C41E3A">SIMULATION: ${currSimIdx + 1}/11</span>
            <button class="sim-link-btn" onclick="LUCIX.navigate('simulation')">Control Studio →</button>
          </div>
        ` : `
          <button class="sim-btn" onclick="LUCIX.navigate('simulation')" style="color:#C41E3A;border-color:rgba(196,30,58,.3);">
            🎬 Launch Real-Time Simulation
          </button>
        `}
      </div>
      <div class="geoint-disc">
        <span>ℹ</span>
        <span>Source IP geolocation estimate. This represents <strong>network/infrastructure attribution</strong>,
        not necessarily the attacker's physical location.</span>
      </div>
      <div class="geoint-layout">
        <div class="geo-ip-list" id="geo-ip-list"></div>
        <div class="geoint-map-area">
          <div id="lucix-map" style="flex:1;height:100%;min-height:340px"></div>
          <div class="map-legend" id="map-legend">${renderLegend()}</div>
        </div>
        <div class="geo-detail-panel" id="geo-detail">
          <div class="geo-ph"><div class="geo-ph-icon">📍</div><div class="geo-ph-text">Select an IP to view attribution details</div></div>
        </div>
      </div>`;

    initMap();
    buildIPList();
    if (selectedIP) setTimeout(() => selectIP(selectedIP, params?.eventId), 350);

    // Live simulation tracker
    if (unsubscribe) unsubscribe();
    if (window.SimulationEngine) {
      unsubscribe = SimulationEngine.subscribe((type, data) => {
        if (window.LUCIX?.state?.currentView !== 'geoint') return;
        if (type === 'event' && data?.event?.source_ip) {
          selectIP(data.event.source_ip, data.event.id);
        }
      });
    }
  }

  function initMap() {
    if (map) { map.remove(); map = null; }
    markers = {};

    map = L.map('lucix-map', { center:[25,15], zoom:2, zoomControl:true });

    const GEOAPIFY_KEY = 'e71fb39e9dab4fd9b66b7f0d784f4903';

    // Premium Geoapify Dark Matter Tiles
    const geoapifyLayer = L.tileLayer(`https://maps.geoapify.com/v1/tile/dark-matter/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_KEY}`, {
      attribution:'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
      maxZoom:20
    });

    const fallbackLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution:'© OpenStreetMap contributors, CARTO',
      subdomains:'abcd', maxZoom:19
    });

    geoapifyLayer.on('tileerror', function() {
      if (!map.hasLayer(fallbackLayer)) fallbackLayer.addTo(map);
    });

    geoapifyLayer.addTo(map);

    const INTERNAL = [40.7128, -74.0060];

    // Place external IP markers
    for (const [ip, ipData] of Object.entries(window.LUCIX_DATA.IP_GEO_DATA)) {
      const analysis = GeoProvider.analyzeIP(ip);
      const loc = analysis.bestLocation;
      if (!loc) continue;

      const m = MARKER[analysis.classification.type] || MARKER.UNKNOWN;
      const icon = makeIcon(m.color, m.symbol, false);
      const mk = L.marker([loc.lat, loc.lng], {icon}).addTo(map);
      mk.bindTooltip(`<b>${ip}</b><br>${analysis.displayCity}, ${analysis.displayCountry}<br><i>${analysis.classification.label}</i>`, {className:'lucix-tip'});
      mk.on('click', () => selectIP(ip));
      markers[ip] = { marker:mk, analysis };

      // Dashed line to internal network
      L.polyline([[loc.lat,loc.lng], INTERNAL],
        {color:m.color, weight:1.2, opacity:.3, dashArray:'5 7'}).addTo(map);

      // Tor geo-jump line
      if (ip==='185.220.101.34' && ipData.providers_e008) {
        const p2 = ipData.providers_e008[0];
        const jumpIcon = makeJumpIcon();
        L.marker([p2.lat, p2.lng], {icon:jumpIcon}).addTo(map)
          .bindTooltip(`<b>⚠ GEO ANOMALY</b><br>${ip}<br>E008: ${p2.city}, ${p2.country}`, {className:'lucix-tip'});
        L.polyline([[loc.lat,loc.lng],[p2.lat,p2.lng]],
          {color:'#1A3A6B', weight:1.5, opacity:.7, dashArray:'6 4'}).addTo(map);
      }
    }

    // Internal network marker
    const intIcon = L.divIcon({
      className:'',
      html:`<div style="width:40px;height:40px;background:#0A1628;border:2px solid #1A3A6B;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#1A3A6B;text-align:center;line-height:1.2;box-shadow:0 0 12px rgba(26,58,107,.4)">Corp<br>Net</div>`,
      iconSize:[40,40], iconAnchor:[20,20]
    });
    L.marker(INTERNAL, {icon:intIcon}).addTo(map)
      .bindTooltip('<b>Corporate Network</b><br>10.0.1.0/24<br>(Symbolic)', {className:'lucix-tip'});
  }

  function makeIcon(color, symbol, selected) {
    const sz = selected ? 42 : 36;
    const bw = selected ? 3 : 2;
    const glow = selected ? `0 0 16px ${color}` : `0 0 8px ${color}70`;
    return L.divIcon({
      className:'',
      html:`<div style="width:${sz}px;height:${sz}px;background:#0A1628;border:${bw}px solid ${color};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:${glow};transition:all .2s;cursor:pointer">${symbol}</div>`,
      iconSize:[sz,sz], iconAnchor:[sz/2,sz/2]
    });
  }

  function makeJumpIcon() {
    return L.divIcon({
      className:'',
      html:`<div style="width:30px;height:30px;background:#0A1628;border:2px dashed #1A3A6B;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow:0 0 8px rgba(26,58,107,.4)">⚠</div>`,
      iconSize:[30,30], iconAnchor:[15,15]
    });
  }

  function selectIP(ip, eventId) {
    selectedIP = ip;

    // Update marker styles
    for (const [mip, mdata] of Object.entries(markers)) {
      const m = MARKER[mdata.analysis.classification.type] || MARKER.UNKNOWN;
      mdata.marker.setIcon(makeIcon(m.color, m.symbol, mip===ip));
    }

    // Update IP list highlight
    document.querySelectorAll('.geo-ip-item').forEach(el=>el.classList.toggle('geo-selected', el.dataset.ip===ip));

    // Pan map
    const mdata = markers[ip];
    if (mdata) map.flyTo([mdata.analysis.bestLocation.lat, mdata.analysis.bestLocation.lng], 5, {duration:1.2});

    renderDetailPanel(ip, eventId);
  }

  function renderDetailPanel(ip, eventId) {
    const panel = document.getElementById('geo-detail');
    if (!panel) return;
    const analysis = GeoProvider.analyzeIP(ip, eventId);
    if (!analysis) return;
    const spoof   = SpoofingDetector.analyzeIP(ip);
    const ipData  = window.LUCIX_DATA.IP_GEO_DATA[ip];

    panel.innerHTML = `
      <div class="geo-detail-box">
        <div style="margin-bottom:12px">
          <div class="geo-d-ip">${ip}</div>
          <div class="geo-d-rdns">${analysis.reverse_dns||'No PTR record'}</div>
        </div>

        <div class="geo-attr-label">LOCATION ATTRIBUTION</div>
        <div class="geo-location-card">
          <div class="geo-city">${analysis.displayCity}</div>
          <div class="geo-country">${analysis.displayCountry}</div>
          <div class="geo-coords">${analysis.bestLocation.lat.toFixed(4)}, ${analysis.bestLocation.lng.toFixed(4)}</div>
        </div>

        <div class="geo-field-group">
          <div class="geo-field-label">Network</div>
          ${NetworkClassifier.getBadgeHtml(analysis.classification.type)}
          <div class="geo-net-disc">${analysis.classification.disclaimer.map(d=>`<p>${d}</p>`).join('')}</div>
        </div>

        <div class="geo-mini-grid">
          ${miniCell('ASN', analysis.providers[0]?.asn||'—')}
          ${miniCell('Organization', analysis.providers[0]?.org||'—')}
          ${miniCell('Timezone', analysis.providers[0]?.timezone||'—')}
          ${miniCell('Accuracy', `±${analysis.providers[0]?.accuracy_km||'?'} km`)}
        </div>

        <div class="geo-field-group">
          <div class="geo-field-label">Provider Consensus</div>
          <div class="geo-providers-row">
            ${analysis.providers.map(p=>{
              const agrees = analysis.consensus.provider_agreements?.find(a=>a.provider===p.provider)?.agrees_with_majority;
              return `<div class="geo-prov-card ${agrees?'agree':'disagree'}">
                <div class="geo-prov-name">${p.provider}</div>
                <div class="geo-prov-city">${p.city}</div>
                <div class="geo-prov-org">${p.org}</div>
                <div class="geo-prov-acc">±${p.accuracy_km}km</div>
              </div>`;
            }).join('')}
          </div>
          <div class="geo-cons-row">
            <span class="geo-cons-label">Consensus:</span>
            <span class="geo-cons-count">${analysis.consensus.count}/${analysis.consensus.total}</span>
            ${GeoProvider.confidenceBadgeHtml(analysis.consensus.level)}
            ${analysis.consensus.max_spread_km>100?`<span style="font-size:10px;color:#C5A55A">Spread: ${analysis.consensus.max_spread_km}km</span>`:''}
          </div>
        </div>

        <div class="geo-field-group">
          <div class="geo-field-label">Geolocation Evidence Score</div>
          <div class="geo-score-bar-wrap">
            <div class="geo-score-bar-fill geo-score-${analysis.evidenceScore.level}" style="width:${Math.max(5,(analysis.evidenceScore.score/analysis.evidenceScore.max)*100)}%"></div>
          </div>
          <div class="geo-score-val">${analysis.evidenceScore.score}/${analysis.evidenceScore.max} — ${analysis.evidenceScore.level}</div>
          <div class="geo-score-factors">
            ${analysis.evidenceScore.factors.map(f=>`<div class="geo-factor"><span class="geo-factor-name">${f.name}</span><span class="geo-factor-val">${f.value}</span></div>`).join('')}
          </div>
        </div>

        <div class="geo-field-group">
          <div class="geo-field-label">Attribution Confidence</div>
          ${GeoProvider.confidenceBadgeHtml(analysis.evidenceScore.level)}
        </div>

        <div class="geo-field-group">
          <div class="geo-field-label">Physical Operator Location</div>
          <div class="geo-unknown-badge">${analysis.physicalOrigin.status}</div>
          <div class="geo-unknown-reason">${analysis.physicalOrigin.reason}</div>
        </div>

        ${spoof?.has_anomalies ? `
          <div class="geo-field-group">
            <div class="geo-field-label">Anomaly Detection</div>
            ${spoof.anomalies.map(a=>`
              <div class="anomaly-card">
                <div class="anomaly-hdr"><span class="anomaly-icon">⚠</span><span class="anomaly-title">GEO JUMP</span><span class="sev-${a.severity||'MEDIUM'}">${a.severity||'MEDIUM'}</span></div>
                <div class="anomaly-row"><span class="anomaly-label">From</span><span class="anomaly-val">${a.from_city||'—'}</span></div>
                <div class="anomaly-row"><span class="anomaly-label">To</span><span class="anomaly-val">${a.to_city||'—'}</span></div>
                <div class="anomaly-row"><span class="anomaly-label">Distance</span><span class="anomaly-val">${a.distance_km||'—'} km</span></div>
                <div class="anomaly-disc"><strong>LUCIX does not automatically conclude spoofing.</strong></div>
                ${(a.possible_explanations||[]).length?`<div class="anomaly-expls"><div class="anomaly-expls-title">Possible explanations:</div><ul>${[a.explanation,...(a.possible_explanations||[])].filter(Boolean).map(x=>`<li>${x}</li>`).join('')}</ul></div>`:''}
              </div>`).join('')}
          </div>` : ''}

        ${ipData.history?.length ? `
          <div class="geo-field-group">
            <div class="geo-field-label">Observation History</div>
            <div class="geo-history">
              ${ipData.history.map((h,i)=>{
                const prev = ipData.history[i-1];
                const changed = prev && (prev.city!==h.city||prev.country!==h.country);
                return `<div class="geo-history-item${changed?' changed':''}">
                  <span class="geo-hist-time">${new Date(h.timestamp).toISOString().substring(11,16)} UTC</span>
                  <span class="geo-hist-city">${h.city}, ${h.country}</span>
                  <span class="geo-hist-eid" onclick="LUCIX.navigate('evidence',{eventId:'${h.event_id}'})">${h.event_id}</span>
                  ${changed?'<span class="geo-hist-flag">↩ changed</span>':''}
                </div>`;
              }).join('')}
            </div>
          </div>` : ''}

        <div class="geo-field-group">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <div class="geo-field-label">Live Geoapify Intelligence</div>
            <button class="sim-btn" style="padding:2px 8px;font-size:9px;color:var(--gold);border-color:rgba(197,165,90,.3);" onclick="GeoIntView.fetchLiveGeoapify('${ip}')">
              Query Geoapify API ⚡
            </button>
          </div>
          <div id="geo-live-telemetry-${ip.replace(/\./g,'_')}" style="font-size:10px;color:var(--text-3);padding:8px 10px;background:var(--bg-card);border:1px solid var(--glass-border);border-radius:var(--radius-sm);line-height:1.4;">
            Geoapify Engine v1 active. Click to query live autonomous system, carrier, and real-time coordinate telemetry.
          </div>
        </div>

        <div class="geo-field-group">
          <div class="geo-field-label">Supporting Events</div>
          <div class="geo-events">
            ${analysis.supportingEvents.map(eid=>`<span class="geo-eid-chip" onclick="LUCIX.navigate('evidence',{eventId:'${eid}'})">${eid}</span>`).join('')}
          </div>
        </div>

        <div class="geo-nav-btns">
          <button class="geo-nav-btn" onclick="LUCIX.navigate('evidence',{eventId:'${analysis.supportingEvents[0]}'})">EV Evidence →</button>
          <button class="geo-nav-btn" onclick="LucaView.ask('Where did ${ip} geolocate and what does it tell us?')">Ask LUCA →</button>
        </div>
      </div>`;
  }

  async function fetchLiveGeoapify(ip) {
    const box = document.getElementById(`geo-live-telemetry-${ip.replace(/\./g,'_')}`);
    if (box) box.innerHTML = '<span style="color:var(--gold);">Contacting Geoapify API gateway…</span>';

    let data = null;
    try {
      const res = await fetch(`/api/ipinfo?ip=${encodeURIComponent(ip)}`);
      if (res.ok) data = await res.json();
    } catch(e) {}

    if (!data) {
      try {
        const res = await fetch(`https://api.geoapify.com/v1/ipinfo?ip=${encodeURIComponent(ip)}&apiKey=e71fb39e9dab4fd9b66b7f0d784f4903`);
        if (res.ok) data = await res.json();
      } catch(e) {}
    }

    if (!box) return;

    if (data && (data.city || data.country)) {
      const city = data.city?.name || 'Unknown City';
      const country = data.country?.name || 'Unknown Country';
      const lat = data.location?.latitude || 'N/A';
      const lng = data.location?.longitude || 'N/A';
      const continent = data.continent?.name || 'N/A';
      const post = data.postal?.code || 'N/A';

      box.innerHTML = `
        <div style="color:var(--gold);font-weight:700;margin-bottom:4px;display:flex;align-items:center;gap:4px;">
          <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--gold);"></span>
          LIVE GEOAPIFY TELEMETRY VERIFIED
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;color:var(--text-2);font-family:var(--font-mono);font-size:9.5px;">
          <div>Location: <span style="color:var(--text-1);">${city}, ${country}</span></div>
          <div>Continent: <span style="color:var(--text-1);">${continent}</span></div>
          <div>Coordinates: <span style="color:var(--text-1);">${lat}, ${lng}</span></div>
          <div>Postal: <span style="color:var(--text-1);">${post}</span></div>
        </div>
        <div style="margin-top:5px;font-size:8.5px;color:var(--text-3);">Direct response from Geoapify IPinfo API.</div>
      `;

      if (data.location && map) {
        map.setView([data.location.latitude, data.location.longitude], 4);
      }
    } else {
      box.innerHTML = '<span style="color:var(--red);">Live query failed or offline. Baseline dataset retained.</span>';
    }
  }

  async function lookupCustomIP() {
    const inp = document.getElementById('geo-custom-ip');
    const ip = inp?.value?.trim();
    if (!ip) return;

    inp.value = '';
    const panel = document.getElementById('geo-detail-panel');
    if (panel) panel.innerHTML = '<div style="padding:20px;color:var(--gold);text-align:center;">Querying Geoapify API for ' + ip + '…</div>';

    let data = null;
    try {
      const res = await fetch(`/api/ipinfo?ip=${encodeURIComponent(ip)}`);
      if (res.ok) data = await res.json();
    } catch(e) {}

    if (!data) {
      try {
        const res = await fetch(`https://api.geoapify.com/v1/ipinfo?ip=${encodeURIComponent(ip)}&apiKey=e71fb39e9dab4fd9b66b7f0d784f4903`);
        if (res.ok) data = await res.json();
      } catch(e) {}
    }

    if (data && (data.city || data.country)) {
      const city = data.city?.name || 'Unknown City';
      const country = data.country?.name || 'Unknown Country';
      const lat = data.location?.latitude || 0;
      const lng = data.location?.longitude || 0;

      // Add marker on map
      if (map && lat && lng) {
        const customIcon = makeIcon('#C41E3A', '▲', true);
        const mk = L.marker([lat, lng], {icon: customIcon}).addTo(map);
        mk.bindTooltip(`<b>LIVE IP: ${ip}</b><br>${city}, ${country}`, {className:'lucix-tip'}).openTooltip();
        map.setView([lat, lng], 5);
      }

      if (panel) {
        panel.innerHTML = `
          <div class="geo-detail-box">
            <div class="geo-d-ip">${ip}</div>
            <div class="geo-d-rdns">LIVE QUERY VIA GEOAPIFY API</div>
            <div class="geo-location-card" style="margin-top:10px;">
              <div class="geo-city">${city}</div>
              <div class="geo-country">${country} (${data.country?.iso_code || ''})</div>
              <div class="geo-coords">Lat: ${lat} | Lng: ${lng}</div>
            </div>
            <div class="geo-field-group">
              <div class="geo-field-label">Continent & State</div>
              <div style="font-size:11px;color:var(--text-1);font-family:var(--font-mono);">${data.continent?.name || 'N/A'} — ${data.state?.name || 'N/A'}</div>
            </div>
            <div class="geo-nav-btns" style="margin-top:14px;">
              <button class="geo-nav-btn" onclick="LucaView.ask('Analyze IP ${ip} geolocated in ${city}, ${country}')">Analyze with LUCA →</button>
            </div>
          </div>`;
      }
    } else {
      if (panel) panel.innerHTML = '<div style="padding:20px;color:var(--red);text-align:center;">Failed to resolve IP with Geoapify.</div>';
    }
  }

  function buildIPList() {
    const list = document.getElementById('geo-ip-list');
    if (!list) return;
    const ipData = window.LUCIX_DATA.IP_GEO_DATA;
    list.innerHTML = `
      <div style="padding:10px 12px 8px;border-bottom:1px solid var(--glass-border);">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--text-3);margin-bottom:6px;letter-spacing:.05em;">Live Geoapify Lookup</div>
        <div style="display:flex;gap:4px;">
          <input type="text" id="geo-custom-ip" placeholder="Lookup any IP…" style="flex:1;background:var(--bg-input);border:1px solid var(--glass-border);border-radius:var(--radius-sm);color:var(--text-1);font-size:10px;padding:5px 6px;font-family:var(--font-mono);outline:none;"/>
          <button onclick="GeoIntView.lookupCustomIP()" style="background:var(--blue);border:none;border-radius:var(--radius-sm);color:var(--gold);font-size:10px;font-weight:700;padding:5px 8px;cursor:pointer;">GO</button>
        </div>
      </div>
      <div class="geo-ip-list-title">Incident Source IPs</div>
      ${Object.entries(ipData).map(([ip])=>{
        const a = GeoProvider.analyzeIP(ip);
        const s = MARKER[a.classification.type]||MARKER.UNKNOWN;
        const sp= SpoofingDetector.analyzeIP(ip);
        return `
          <div class="geo-ip-item${selectedIP===ip?' geo-selected':''}" data-ip="${ip}" onclick="GeoIntView.selectIPPublic('${ip}')">
            <div class="geo-ip-dot" style="background:${s.color}"></div>
            <div>
              <div class="geo-ip-addr">${ip}</div>
              <div class="geo-ip-loc">${a.displayCity}, ${a.displayCountry}</div>
              <div class="geo-ip-badges">
                ${NetworkClassifier.getBadgeHtml(a.classification.type)}
                ${GeoProvider.confidenceBadgeHtml(a.evidenceScore.level)}
                ${sp?.has_anomalies?'<span class="geo-anom-mini">⚠ ANOMALY</span>':''}
              </div>
            </div>
          </div>`;
      }).join('')}`;
  }

  function selectIPPublic(ip) { selectIP(ip, null); }

  function miniCell(label, val) {
    return `<div class="geo-mini-cell"><div class="geo-field-label">${label}</div><div class="geo-mini-val">${val}</div></div>`;
  }

  function renderLegend() {
    return ['TOR_EXIT','CLOUD_HOSTING','VPN','RESIDENTIAL'].map(type=>{
      const m = MARKER[type];
      const labels = {TOR_EXIT:'Tor Exit',CLOUD_HOSTING:'Cloud',VPN:'VPN',RESIDENTIAL:'Residential'};
      return `<div class="map-legend-item"><div class="map-legend-dot" style="border-color:${m.color}"></div><span>${labels[type]}</span></div>`;
    }).join('') + `<div class="map-legend-item"><div style="width:18px;border-top:1px dashed #1A3A6B;height:0"></div><span>Geo jump</span></div>`;
  }

  return { render, selectIPPublic, fetchLiveGeoapify, lookupCustomIP };
})();
window.GeoIntView = GeoIntView;
