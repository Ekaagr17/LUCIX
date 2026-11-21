// LUCIX Evidence View v3
const EvidenceView = (() => {

  let selectedId = null;

  function render(container, params) {
    selectedId = params?.eventId || null;
    const events = window.LUCIX.state.events;

    container.innerHTML = `
      <div class="view-header">
        <div class="view-title"><span class="view-icon">⊞</span> Evidence</div>
        <div class="view-subtitle">Raw telemetry, integrity chain, and geographic attribution</div>
      </div>
      <div class="ev-layout">
        <div class="ev-list-panel">
          <div class="ev-filter-area">
            <input class="ev-search" id="ev-search" placeholder="Filter events…" oninput="EvidenceView.filter(this.value)"/>
            <div class="ev-filters">
              <button class="ev-filter-btn active" onclick="EvidenceView.setFilter('all',this)">All</button>
              <button class="ev-filter-btn" onclick="EvidenceView.setFilter('VERIFIED',this)">Verified</button>
              <button class="ev-filter-btn" onclick="EvidenceView.setFilter('TAMPER_SUSPECTED',this)">Tampered</button>
            </div>
          </div>
          <div id="ev-list"></div>
        </div>
        <div class="ev-detail-panel" id="ev-detail">
          <div class="ev-ph"><div class="ev-ph-icon">⊞</div><div>Select an event</div></div>
        </div>
      </div>`;

    renderList(events);
    if (selectedId) openById(selectedId);
  }

  function renderList(events) {
    const list = document.getElementById('ev-list');
    if (!list) return;
    list.innerHTML = events.map(e => {
      const sel = e.id === selectedId;
      return `
        <div class="ev-item${sel?' selected':''}" onclick="EvidenceView.openById('${e.id}')">
          <div class="ev-item-top">
            <span class="ev-item-id">${e.id}</span>
            ${EvidenceIntegrity.integrityBadgeHtml(e.integrity_status||'UNVERIFIED')}
            ${e.geo_anomaly?'<span style="color:#C5A55A;font-size:11px">⚠</span>':''}
          </div>
          <div class="ev-item-type">${e.type.replace(/_/g,' ')}</div>
          <div class="ev-item-time">${fmt(e.timestamp)}</div>
          ${e.source_ip?`<div class="ev-item-ip">${e.source_ip}</div>`:''}
        </div>`;
    }).join('');
  }

  function openById(id) {
    selectedId = id;
    document.querySelectorAll('.ev-item').forEach(el=>{
      el.classList.toggle('selected', el.querySelector('.ev-item-id')?.textContent===id);
    });
    const ev = window.LUCIX.state.events.find(e=>e.id===id);
    if (ev) renderDetail(ev);
  }

  function renderDetail(ev) {
    const panel = document.getElementById('ev-detail');
    if (!panel) return;

    const geoA  = ev.source_ip && window.LUCIX_DATA.IP_GEO_DATA[ev.source_ip] ? GeoProvider.analyzeIP(ev.source_ip,ev.id) : null;
    const spoof = ev.source_ip ? SpoofingDetector.analyzeIP(ev.source_ip) : null;

    panel.innerHTML = `
      <div class="ev-detail-hdr">
        <span class="ev-d-id">${ev.id}</span>
        <span class="ev-d-type">${ev.type.replace(/_/g,' ')}</span>
        <span class="ev-d-time">${fmt(ev.timestamp)}</span>
      </div>
      <div class="ev-desc">${ev.description}</div>

      <div class="ev-section">
        <div class="ev-section-title">Event Metadata</div>
        <div class="ev-grid">
          ${cell('Collector',ev.collector_id)}
          ${cell('Source IP',ev.source_ip||'—')}
          ${cell('Destination',ev.dest_host||ev.dest_ip||'—')}
          ${ev.dest_port?cell('Port',ev.dest_port):''}
          ${ev.protocol?cell('Protocol',ev.protocol):''}
          ${ev.host?cell('Host',ev.host):''}
          ${ev.process?cell('Process',ev.process):''}
          ${ev.parent_process?cell('Parent',ev.parent_process):''}
          ${ev.file_path?cell('File',`<code>${ev.file_path}</code>`):''}
        </div>
      </div>

      <div class="ev-section">
        <div class="ev-section-title">Evidence Integrity</div>
        <div class="ev-grid">
          ${cell('Integrity Status',EvidenceIntegrity.integrityBadgeHtml(ev.integrity_status||'UNVERIFIED'))}
          ${cell('Source Trust',EvidenceIntegrity.trustBadgeHtml(ev.source_trust||'UNVERIFIED'))}
          ${cell('Has Signature',ev.has_signature?'✓ Yes':'✗ No')}
          ${ev.signature_cert?cell('Certificate',`<span class="ev-cert">${ev.signature_cert}</span>`):''}
          ${cell('Chain Index',`#${ev.chain_index??'—'}`)}
          ${cell('Event Hash',EvidenceIntegrity.formatHash(ev.event_hash))}
          ${cell('Prev Hash',EvidenceIntegrity.formatHash(ev.previous_event_hash))}
          ${cell('Raw Hash',EvidenceIntegrity.formatHash(ev.raw_event_hash))}
        </div>
        <div class="ev-chain-visual">${chainViz(ev)}</div>
      </div>

      ${geoA ? renderGeo(ev, geoA, spoof) : ''}

      <div class="ev-section">
        <div class="ev-section-title">Raw Telemetry</div>
        <div class="ev-raw"><pre>${esc(ev.raw_telemetry||'— no telemetry —')}</pre></div>
      </div>

      ${ev.command_line?`
        <div class="ev-section">
          <div class="ev-section-title">Command Line</div>
          <div class="ev-raw"><pre class="ev-cmdline">${esc(ev.command_line)}</pre></div>
        </div>`:''}

      <div class="ev-section">
        <div class="ev-section-title">Tags</div>
        <div class="ev-tags">${(ev.tags||[]).map(t=>`<span class="ev-tag">${t}</span>`).join('')||'—'}</div>
      </div>

      <div class="ev-nav-btns">
        ${ev.source_ip&&window.LUCIX_DATA.IP_GEO_DATA[ev.source_ip]
          ?`<button class="ev-nav-btn" onclick="LUCIX.navigate('geoint',{ip:'${ev.source_ip}',eventId:'${ev.id}'})">📍 Geographic Attribution →</button>`:''}
        <button class="ev-nav-btn" onclick="LUCIX.navigate('timeline',{})">◷ View in Timeline →</button>
        <button class="ev-nav-btn" onclick="LucaView.ask('Tell me about event ${ev.id}')">🧠 Ask LUCA →</button>
      </div>`;
  }

  function renderGeo(ev, geoA, spoof) {
    return `
      <div class="ev-section ev-geo-section">
        <div class="ev-section-title">Geographic Attribution ${spoof?.has_anomalies?'<span class="ev-anom-flag">⚠ ANOMALY</span>':''}</div>
        <div class="ev-geo-disc">
          Source IP geolocation estimate — this location represents <strong>network/infrastructure attribution</strong>,
          not necessarily the attacker's physical location.
        </div>
        <div class="ev-grid">
          ${cell('Source IP',ev.source_ip)}
          ${cell('Est. Location',`${geoA.displayCity}, ${geoA.displayCountry}`)}
          ${cell('Network Type',NetworkClassifier.getBadgeHtml(geoA.classification.type))}
          ${cell('ASN',geoA.providers[0]?.asn||'—')}
          ${cell('Organization',geoA.providers[0]?.org||'—')}
          ${cell('Consensus',`${geoA.consensus.count}/${geoA.consensus.total} — ${geoA.consensus.level}`)}
          ${cell('Confidence',GeoProvider.confidenceBadgeHtml(geoA.evidenceScore.level))}
          ${cell('Physical Origin',`<span class="ev-unknown">${geoA.physicalOrigin.status}</span>`)}
        </div>
        <div class="ev-geo-phys-note">${geoA.physicalOrigin.reason}</div>
        ${spoof?.has_anomalies ? anomalyCard(spoof.anomalies[0]) : ''}
        <div style="margin-top:10px">
          <button class="ev-nav-btn" onclick="LUCIX.navigate('geoint',{ip:'${ev.source_ip}',eventId:'${ev.id}'})">📍 Open in Geographic Attribution →</button>
        </div>
      </div>`;
  }

  function anomalyCard(a) {
    return `
      <div class="anomaly-card">
        <div class="anomaly-hdr">
          <span class="anomaly-icon">⚠</span>
          <span class="anomaly-title">GEOGRAPHIC ANOMALY</span>
          <span class="sev-${a.severity||'MEDIUM'}">${a.severity||'MEDIUM'}</span>
        </div>
        <div class="anomaly-row"><span class="anomaly-label">From</span><span class="anomaly-val">${a.from_city||'—'}</span></div>
        <div class="anomaly-row"><span class="anomaly-label">To</span><span class="anomaly-val">${a.to_city||'—'}</span></div>
        <div class="anomaly-row"><span class="anomaly-label">Distance</span><span class="anomaly-val">${a.distance_km?a.distance_km+' km':'—'}</span></div>
        <div class="anomaly-row"><span class="anomaly-label">Time</span><span class="anomaly-val">${a.time_delta_min?a.time_delta_min+' min':'—'}</span></div>
        <div class="anomaly-disc"><strong>LUCIX does not automatically conclude spoofing.</strong></div>
        ${a.possible_explanations||a.explanation?`
          <div class="anomaly-expls">
            <div class="anomaly-expls-title">Possible explanations:</div>
            <ul>${([a.explanation,...(a.possible_explanations||[])]).filter(Boolean).map(x=>`<li>${x}</li>`).join('')}</ul>
          </div>`:''}
      </div>`;
  }

  function chainViz(ev) {
    const events = window.LUCIX.state.events;
    const idx = ev.chain_index;
    const visible = events.filter(e => e.chain_index >= Math.max(0,idx-1) && e.chain_index <= Math.min(events.length-1,idx+1));
    return visible.map((e,i)=>`
      <div class="ev-chain-block${e.id===ev.id?' current':''}">
        <div class="ev-cb-id">${e.id}</div>
        <div class="ev-cb-hash">${EvidenceIntegrity.formatHash(e.event_hash)}</div>
        <div class="ev-cb-status">${e.integrity_status||'—'}</div>
      </div>${i<visible.length-1?'<div class="ev-chain-arr">→</div>':''}
    `).join('');
  }

  function cell(label, value) {
    return `<div class="ev-grid-cell"><div class="ev-cell-label">${label}</div><div class="ev-cell-val">${value}</div></div>`;
  }
  function fmt(ts) { return ts ? new Date(ts).toISOString().replace('T',' ').replace(/\.\d+Z$/,' UTC') : '—'; }
  function esc(s)  { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function filter(q) {
    const lower = q.toLowerCase();
    const filtered = window.LUCIX.state.events.filter(e =>
      e.id.toLowerCase().includes(lower) || e.description.toLowerCase().includes(lower) ||
      (e.source_ip||'').includes(lower) || e.type.toLowerCase().includes(lower) ||
      (e.tags||[]).some(t=>t.includes(lower))
    );
    renderList(filtered);
  }

  function setFilter(val, el) {
    document.querySelectorAll('.ev-filter-btn').forEach(b=>b.classList.remove('active'));
    el.classList.add('active');
    const events = window.LUCIX.state.events;
    renderList(val==='all' ? events : events.filter(e=>e.integrity_status===val));
  }

  return { render, openById, filter, setFilter };
})();
window.EvidenceView = EvidenceView;
