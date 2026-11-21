// LUCIX Attack Graph v3 — glowing SVG nodes
const AttackGraphView = (() => {

  const LAYOUT = {
    ip_185:{x:80,y:100}, ip_45:{x:80,y:220},
    ws01:{x:310,y:160},  ps1:{x:510,y:160},
    ip_198:{x:510,y:280},ws02:{x:80,y:370},
    sv02:{x:310,y:340},  file1:{x:510,y:420},
    db01:{x:310,y:490}
  };

  const NODE_STYLE = {
    SOURCE_IP:     {fill:'#1a0828',stroke:'#C41E3A',text:'#C41E3A',glow:'rgba(196,30,58,.6)',icon:'◉'},
    C2_IP:         {fill:'#280808',stroke:'#C41E3A',text:'#C41E3A',glow:'rgba(196,30,58,.7)',icon:'◎'},
    INTERNAL_HOST: {fill:'#081828',stroke:'#1A3A6B',text:'#1A3A6B',glow:'rgba(26,58,107,.5)',icon:'□'},
    PROCESS:       {fill:'#201008',stroke:'#C5A55A',text:'#C5A55A',glow:'rgba(197,165,90,.5)',icon:'⚙'},
    ARTIFACT:      {fill:'#081810',stroke:'#C5A55A',text:'#C5A55A',glow:'rgba(197,165,90,.5)',icon:'📄'}
  };

  const EDGE_COLOR = {
    recon:'#C5A55A',initial_access:'#C41E3A',execution:'#C5A55A',
    c2:'#C41E3A',lateral_movement:'#1A3A6B',data_access:'#C5A55A',exfil:'#C41E3A'
  };

  let unsubscribe = null;

  function render(container) {
    const simStatus = window.SimulationEngine?.getStatus() || 'IDLE';
    const currSimIdx = window.SimulationEngine?.getCurrentIndex() ?? -1;

    container.innerHTML = `
      <div class="view-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <div class="view-title"><span class="view-icon">◈</span> Attack Graph</div>
          <div class="view-subtitle">Infrastructure and activity flow — click any node for details</div>
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
      <div class="ag-wrap">
        <div class="ag-svg-area">
          <svg id="ag-svg" width="660" height="560" viewBox="0 0 660 560" style="overflow:visible">
            <defs>
              ${Object.entries(EDGE_COLOR).map(([t,c])=>`
                <marker id="arr-${t}" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                  <polygon points="0 0, 7 2.5, 0 5" fill="${c}" opacity=".8"/>
                </marker>
                <filter id="glow-${t}" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              `).join('')}
              ${Object.entries(NODE_STYLE).map(([t,s])=>`
                <filter id="node-glow-${t}" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="4" result="blur" in="SourceGraphic"/>
                  <feColorMatrix in="blur" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.7 0" result="glow"/>
                  <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              `).join('')}
            </defs>
            <g id="ag-edges"></g>
            <g id="ag-nodes"></g>
          </svg>
        </div>
        <div class="ag-panel" id="ag-panel">
          <div class="ag-ph"><div class="ag-ph-icon">◈</div><div class="ag-ph-text">Click a node for details</div></div>
        </div>
      </div>
      <div class="ag-legend">${renderLegend()}</div>
    `;
    drawGraph();

    if (unsubscribe) unsubscribe();
    if (window.SimulationEngine) {
      unsubscribe = SimulationEngine.subscribe((type, data) => {
        if (window.LUCIX?.state?.currentView !== 'attack_graph') return;
        if (type === 'event' && data?.event) {
          highlightSimulationEdge(data.event.id);
        }
      });
    }
  }

  function highlightSimulationEdge(eventId) {
    document.querySelectorAll('.ag-edge-group').forEach(el => {
      const isCurrent = el.dataset.event === eventId;
      const line = el.querySelector('line');
      if (line) {
        if (isCurrent) {
          line.setAttribute('stroke-width', '3.5');
          line.setAttribute('stroke-opacity', '1');
          line.style.filter = 'drop-shadow(0 0 8px currentColor)';
        } else {
          line.setAttribute('stroke-width', '1.5');
          line.setAttribute('stroke-opacity', '.55');
          line.style.filter = 'none';
        }
      }
    });
  }

  function drawGraph() {
    const svg    = document.getElementById('ag-svg');
    const eGroup = document.getElementById('ag-edges');
    const nGroup = document.getElementById('ag-nodes');
    const graph  = window.LUCIX_DATA.ATTACK_GRAPH;

    // Edges
    graph.edges.forEach(e => {
      const f = LAYOUT[e.from]; const t = LAYOUT[e.to];
      if (!f||!t) return;
      const color = EDGE_COLOR[e.type]||'#4A5568';
      const dx=t.x-f.x; const dy=t.y-f.y; const len=Math.sqrt(dx*dx+dy*dy);
      const R=44;
      const sx=f.x+(dx/len)*R; const sy=f.y+(dy/len)*R;
      const ex=t.x-(dx/len)*R; const ey=t.y-(dy/len)*R;
      const mx=(sx+ex)/2; const my=(sy+ey)/2;

      const g = document.createElementNS('http://www.w3.org/2000/svg','g');
      g.classList.add('ag-edge-group');
      g.dataset.event = e.event;
      g.style.cursor='pointer';
      g.innerHTML = `
        <line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}"
          stroke="${color}" stroke-width="1.5" stroke-opacity=".55"
          marker-end="url(#arr-${e.type})"/>
        <rect x="${mx-28}" y="${my-9}" width="56" height="15" rx="4" fill="#0A1628" fill-opacity=".9"/>
        <text x="${mx}" y="${my}" text-anchor="middle" dominant-baseline="middle"
          fill="${color}" font-size="8.5" font-family="'JetBrains Mono',monospace" font-weight="700">${e.label}</text>
        <text x="${mx}" y="${my+11}" text-anchor="middle"
          fill="#4A5568" font-size="8" font-family="'JetBrains Mono',monospace">${e.event}</text>
      `;
      g.addEventListener('click',()=>LUCIX.navigate('evidence',{eventId:e.event}));
      eGroup.appendChild(g);
    });

    // Nodes
    graph.nodes.forEach(node => {
      const pos = LAYOUT[node.id]; if (!pos) return;
      const s   = NODE_STYLE[node.type] || NODE_STYLE.INTERNAL_HOST;
      const hasGeo = node.ip && window.LUCIX_DATA.IP_GEO_DATA[node.ip];
      const label  = node.label.length>15 ? node.label.slice(0,14)+'…' : node.label;

      const g = document.createElementNS('http://www.w3.org/2000/svg','g');
      g.classList.add('ag-node');
      g.dataset.id = node.id;
      g.innerHTML = `
        <rect x="${pos.x-46}" y="${pos.y-26}" width="92" height="52" rx="10"
          fill="${s.fill}" stroke="${s.stroke}" stroke-width="1.5"
          class="ag-node-bg" data-node="${node.id}"
          style="filter:drop-shadow(0 0 6px ${s.glow})"/>
        <text x="${pos.x}" y="${pos.y-7}" text-anchor="middle" dominant-baseline="middle"
          fill="${s.text}" font-size="10" font-family="'JetBrains Mono',monospace" font-weight="700"
        >${s.icon} ${label}</text>
        <text x="${pos.x}" y="${pos.y+10}" text-anchor="middle"
          fill="#4A5568" font-size="8" font-family="'JetBrains Mono',monospace">${node.sub||''}</text>
        ${hasGeo ? `<text x="${pos.x}" y="${pos.y+22}" text-anchor="middle" fill="#C5A55A" font-size="8">📍 geo</text>` : ''}
      `;
      g.style.cursor='pointer';
      g.addEventListener('click',()=>showDetail(node));
      nGroup.appendChild(g);
    });
  }

  function showDetail(node) {
    // Deselect all, select current
    document.querySelectorAll('.ag-node-bg').forEach(r=>r.classList.remove('selected'));
    document.querySelectorAll(`.ag-node-bg[data-node="${node.id}"]`).forEach(r=>r.classList.add('selected'));

    const panel  = document.getElementById('ag-panel');
    const edges  = window.LUCIX_DATA.ATTACK_GRAPH.edges.filter(e=>e.from===node.id||e.to===node.id);
    const geoA   = node.ip ? GeoProvider.analyzeIP(node.ip) : null;
    const spoof  = node.ip ? SpoofingDetector.analyzeIP(node.ip) : null;

    panel.innerHTML = `
      <div class="ag-p-hdr">
        <span class="ag-p-type">${node.type.replace(/_/g,' ')}</span>
        <button class="ag-p-close" onclick="document.getElementById('ag-panel').innerHTML='<div class=\\"ag-ph\\"><div class=\\"ag-ph-icon\\">◈</div><div class=\\"ag-ph-text\\">Click a node for details</div></div>'">✕</button>
      </div>
      <div class="ag-p-title">${node.label}</div>
      ${node.sub ? `<div class="ag-p-sub">${node.sub}</div>` : '<div style="margin-bottom:14px"></div>'}

      <div class="ag-p-section">
        <div class="ag-p-section-title">Connected Events</div>
        ${edges.map(e=>`
          <div class="ag-edge-item" onclick="LUCIX.navigate('evidence',{eventId:'${e.event}'})">
            <span class="ag-edge-eid">${e.event}</span>
            <span class="ag-edge-label">${e.label}</span>
            <span class="ag-edge-dir">${e.from===node.id?'→ out':'← in'}</span>
          </div>`).join('')}
      </div>

      ${geoA ? `
        <div class="ag-p-section">
          <div class="ag-p-section-title">Geographic Attribution</div>
          <div class="ag-p-row">
            <span class="ag-p-label">Est. location</span>
            <span class="ag-p-val">${geoA.displayCity}, ${geoA.displayCountry}</span>
          </div>
          <div class="ag-p-row">
            <span class="ag-p-label">Network type</span>
            <span class="ag-p-val">${NetworkClassifier.getBadgeHtml(geoA.classification.type)}</span>
          </div>
          <div class="ag-p-row">
            <span class="ag-p-label">Confidence</span>
            <span class="ag-p-val">${GeoProvider.confidenceBadgeHtml(geoA.evidenceScore.level)}</span>
          </div>
          <div class="ag-p-row">
            <span class="ag-p-label">Physical origin</span>
            <span class="ag-p-val ag-p-unknown">${geoA.physicalOrigin.status}</span>
          </div>
          ${spoof?.has_anomalies ? `<div class="ag-anom-flag">⚠ Geographic anomaly detected</div>` : ''}
          <button class="ag-geo-btn" onclick="LUCIX.navigate('geoint',{ip:'${node.ip}'})">Open in Geographic Attribution →</button>
        </div>
      ` : ''}
    `;
  }

  function renderLegend() {
    const nodeTypes = [
      {label:'Source IP',type:'SOURCE_IP'},{label:'C2 IP',type:'C2_IP'},
      {label:'Internal Host',type:'INTERNAL_HOST'},{label:'Process',type:'PROCESS'},{label:'Artifact',type:'ARTIFACT'}
    ];
    const edgeTypes = [
      {label:'Recon',type:'recon'},{label:'Initial Access',type:'initial_access'},
      {label:'C2/Exfil',type:'c2'},{label:'Lateral',type:'lateral_movement'},{label:'Data Access',type:'data_access'}
    ];
    return `
      <div class="ag-legend-group">
        ${nodeTypes.map(n=>`<div class="ag-legend-item"><div class="ag-legend-dot" style="border-color:${NODE_STYLE[n.type].stroke}"></div>${n.label}</div>`).join('')}
      </div>
      <div class="ag-legend-group">
        ${edgeTypes.map(e=>`<div class="ag-legend-item"><div class="ag-legend-line" style="background:${EDGE_COLOR[e.type]}"></div>${e.label}</div>`).join('')}
      </div>`;
  }

  return { render };
})();
window.AttackGraphView = AttackGraphView;
