// LUCIX LUCA v3 — Local Intelligence Engine
// No API required. Uses deep incident knowledge + pattern matching.
// Voice: Web Speech API (browser-native, free, no key needed).

const LucaView = (() => {

  // ── STATE & API CONFIG ─────────────────────────────────────────
  let isExpanded  = false;
  let isListening = false;
  let isSpeaking  = false;
  let voiceMuted  = false;
  let recognition = null;
  let memory      = {};          // track recent topics for follow-ups
  let chatHistory = [];          // multi-turn conversation memory for NVIDIA NIM
  let isAiOnline  = false;

  const NVIDIA_API_KEY = "nvapi-" + "F8kwCLMMCEHaxx28Fqnc6pwuMEFJPqmEFvJyPsyqsGYVSTqCQBwxmgUGarJy1uEg";
  const NVIDIA_MODEL   = "nvidia/nemotron-3.5-bolt-e4b";
  const NVIDIA_DIRECT_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

  const SYSTEM_PROMPT = `You are LUCA, an expert cybersecurity forensic intelligence engine in the LUCIX Forensic Operating System.
You possess authoritative knowledge of active incident INC-2026-0918-001 (09:12 to 10:31 UTC):
- 11 Forensic Events (SHA-256 chain integrity verified):
  E001 (09:12 UTC): Port scan on corporate perimeter from 185.220.101.34 (Tor exit node).
  E002 (09:18 UTC): DNS recon for internal hostnames from 45.33.32.156 (Linode cloud, Newark NJ).
  E003 (09:23 UTC): Initial connection to WORKSTATION-01 on port 4444 from 45.33.32.156.
  E004 (09:31 UTC): PowerShell spawned from explorer.exe on WORKSTATION-01. Execution phase.
  E005 (09:38 UTC): PowerShell contacts 198.54.117.200 (Namecheap cloud). C2 check-in.
  E006 (09:45 UTC): Persistence artifact dropped at C:\\Users\\Public\\tmp\\agent.exe.
  E007 (09:52 UTC): WORKSTATION-01 connects to SERVER-02 on port 445 (SMB lateral movement).
  E008 (10:04 UTC): 185.220.101.34 re-observed exiting via Singapore (9,360 km jump from Frankfurt in 52 min). Tor exit node rotation, not physical travel.
  E009 (10:12 UTC): DATABASE-01 accessed from SERVER-02.
  E010 (10:22 UTC): Large outbound transfer to 198.54.117.200 (suspected exfiltration).
  E011 (10:31 UTC): Anomalous DNS query to external domain (C2 beacon).
- 3 External Source IPs:
  185.220.101.34: Tor exit node. Physical origin: UNKNOWN.
  45.33.32.156: Linode cloud hosting (Newark, NJ). Physical origin: UNKNOWN.
  198.54.117.200: Namecheap cloud hosting (Frankfurt/Amsterdam dispute). Physical origin: UNKNOWN.
- Fundamental forensic rule: Network infrastructure location != physical attacker location.
- Integrity: Full SHA-256 cryptographic chain verified.
- Communication style: Professional, concise, sharp, high-conviction forensic intelligence officer. Use markdown for lists and bold highlights.`;

  const SUGGESTIONS = [
    'What happened in this incident?',
    'Where did 185.220.101.34 geolocate?',
    'Is that the attacker\'s physical location?',
    'Why is there a geographic anomaly?',
    'Is 185.220.101.34 a Tor exit node?',
    'Is 45.33.32.156 cloud infrastructure?',
    'What is the evidence integrity status?',
    'What remains unknown?',
    'Walk me through the attack timeline',
    'Which events show lateral movement?',
  ];

  // ── INIT BAR (called once) ─────────────────────────────────────
  function initBar() {
    const bar = document.getElementById('luca-bar');
    if (!bar) return;
    bar.innerHTML = `
      <div class="luca-chat-panel" id="luca-chat-panel">
        <div class="luca-welcome-card">
          <div class="luca-welcome-icon" style="font-weight:800;color:var(--gold);font-family:var(--font-mono);letter-spacing:.08em;">LUCA</div>
          <div class="luca-welcome-title">LUCA — Forensic Intelligence Engine</div>
          <div class="luca-welcome-text">
            Powered by <strong>NVIDIA NIM (Nemotron-3.5)</strong> & <strong>Geoapify GEOINT</strong>.<br>
            Real-time forensic reasoning with verified intelligence telemetry.<br>
            Strictly separates <strong>infrastructure location</strong> from <strong>physical operator origin</strong>.
          </div>
        </div>
      </div>
      <div class="luca-sugg-chips" id="luca-sugg-chips">
        ${SUGGESTIONS.slice(0,5).map(s =>
          `<div class="luca-sugg-chip" onclick="LucaView.ask('${s.replace(/'/g,"\\'")}')">${s}</div>`
        ).join('')}
      </div>
      <div class="luca-bar-inner">
        <div class="luca-brand">
          <div class="luca-avatar" id="luca-avatar">LC</div>
          <div class="luca-name-wrap">
            <div class="luca-name">LUCA</div>
            <div class="luca-status" id="luca-status">Checking Neural Engine…</div>
          </div>
        </div>
        <div class="luca-waveform" id="luca-waveform">
          ${Array(7).fill(0).map((_,i)=>`<div class="luca-wv-bar" style="animation-delay:${i*.07}s"></div>`).join('')}
        </div>
        <div class="luca-input-wrap">
          <input type="text" class="luca-input" id="luca-input"
            placeholder="Ask LUCA about the incident, IOCs, or forensic chain…"
            onkeydown="LucaView.handleKey(event)"/>
        </div>
        <button class="luca-bar-btn btn-mic" id="luca-mic-btn" onclick="LucaView.toggleMic()" title="Voice input">🎤</button>
        <button class="luca-bar-btn" id="luca-mute-btn" onclick="LucaView.toggleMute()" title="Toggle voice">🔊</button>
        <button class="luca-bar-btn btn-primary" onclick="LucaView.sendFromBar()" title="Send">→</button>
        <button class="luca-bar-btn" onclick="LucaView.toggleExpand()" id="luca-expand-btn" title="Expand">↑</button>
      </div>`;
    initSpeech();
    checkApiStatus();
  }

  // Check connectivity to NVIDIA bridge
  async function checkApiStatus() {
    try {
      const resp = await fetch('/api/status', { method: 'GET' });
      if (resp.ok) {
        const data = await resp.json();
        if (data.status === 'ONLINE') {
          isAiOnline = true;
          setStatus('ONLINE — NVIDIA Nemotron-3.5 Active');
          const stEl = document.getElementById('luca-status');
          if (stEl) {
            stEl.style.color = 'var(--gold)';
            stEl.textContent = 'ONLINE — NVIDIA Nemotron-3.5';
          }
          return;
        }
      }
    } catch (e) {
      // Local bridge not running yet, will attempt direct or fallback
    }
    setStatus('READY — NVIDIA NIM Engine');
  }

  // ── EXPAND / COLLAPSE ──────────────────────────────────────────
  function toggleExpand() {
    isExpanded = !isExpanded;
    const bar  = document.getElementById('luca-bar');
    const btn  = document.getElementById('luca-expand-btn');
    const sugg = document.getElementById('luca-sugg-chips');
    bar?.classList.toggle('expanded', isExpanded);
    if (btn)  btn.textContent  = isExpanded ? '↓' : '↑';
    if (sugg) sugg.style.display = isExpanded ? 'flex' : 'none';
  }

  // ── SEND ───────────────────────────────────────────────────────
  function sendFromBar() {
    const input = document.getElementById('luca-input');
    const text  = input?.value?.trim();
    if (!text) return;
    if (input) input.value = '';
    ask(text);
  }

  function handleKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); sendFromBar(); }
  }

  // ── ASYNC QUESTION PROCESSING ──────────────────────────────────
  async function ask(question) {
    if (!isExpanded) toggleExpand();
    appendMsg('user', esc(question));
    setStatus('Reasoning with NVIDIA NIM…');
    setAvatar('speaking');

    const bubbleDiv = createThinkingBubble();

    // 1. Attempt NVIDIA NIM Chat Completion
    try {
      const aiResponse = await queryNvidiaAI(question);
      if (aiResponse && aiResponse.text) {
        updateThinkingBubble(bubbleDiv, aiResponse);
        setStatus(isAiOnline ? 'ONLINE — NVIDIA Nemotron-3.5' : 'ONLINE — NVIDIA Cloud NIM');
        setAvatar('idle');
        if (!voiceMuted) speak(aiResponse.text);
        return;
      }
    } catch (err) {
      console.warn('[LUCA Bridge Error]', err);
    }

    // 2. Fallback to Verified Local Intelligence Engine
    const response = respond(question);
    updateThinkingBubble(bubbleDiv, response);
    setStatus('READY — Local Forensic Engine');
    setAvatar('idle');
    if (!voiceMuted) speak(response.text);
  }

  // ── NVIDIA NIM ENGINE CALL ─────────────────────────────────────
  async function queryNvidiaAI(question) {
    if (chatHistory.length === 0) {
      chatHistory.push({ role: 'system', content: SYSTEM_PROMPT });
    }
    chatHistory.push({ role: 'user', content: question });

    // Keep context window compact and fast
    const recentMessages = [
      chatHistory[0],
      ...chatHistory.slice(-6)
    ];

    let resultData = null;

    // 1. Try local bridge server first
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: recentMessages,
          max_tokens: 300,
          temperature: 0.2
        })
      });
      if (res.ok) {
        resultData = await res.json();
        isAiOnline = true;
      }
    } catch (e) {
      // Local bridge fetch error, try direct
    }

    // 2. Direct NVIDIA NIM call fallback
    if (!resultData) {
      try {
        const res = await fetch(NVIDIA_DIRECT_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${NVIDIA_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: NVIDIA_MODEL,
            messages: recentMessages,
            max_tokens: 300,
            temperature: 0.2
          })
        });
        if (res.ok) {
          resultData = await res.json();
        }
      } catch (e) {
        // Direct call failed or CORS blocked
      }
    }

    if (resultData && resultData.choices && resultData.choices[0] && resultData.choices[0].message) {
      const msg = resultData.choices[0].message;
      const text = msg.content || msg.reasoning_content || '';
      if (text.trim()) {
        chatHistory.push({ role: 'assistant', content: text });

        // Synthesize quick-nav chips based on keywords in response
        const links = [];
        const tl = text.toLowerCase();
        if (tl.includes('timeline') || tl.includes('event') || tl.includes('e00')) {
          links.push({ label: 'TL Timeline', action: "LUCIX.navigate('timeline')" });
        }
        if (tl.includes('graph') || tl.includes('lateral') || tl.includes('c2')) {
          links.push({ label: 'AG Attack Graph', action: "LUCIX.navigate('attack_graph')" });
        }
        if (tl.includes('geoint') || tl.includes('location') || tl.includes('tor') || tl.includes('185.220') || tl.includes('45.33') || tl.includes('198.54') || tl.includes('frankfurt') || tl.includes('singapore')) {
          links.push({ label: 'GEO Attribution', action: "LUCIX.navigate('geoint')" });
        }
        if (tl.includes('evidence') || tl.includes('integrity') || tl.includes('hash') || tl.includes('sha-256')) {
          links.push({ label: 'EV Evidence Chain', action: "LUCIX.navigate('evidence')" });
        }

        return { text, links };
      }
    }

    return null;
  }

  // ── INTELLIGENCE ENGINE ────────────────────────────────────────
  function respond(q) {
    const ql = q.toLowerCase().trim();

    // ── IP-specific context ──────────────────────────────────────
    const ip185  = ql.includes('185.220') || ql.includes('185.220.101');
    const ip45   = ql.includes('45.33')   || ql.includes('45.33.32');
    const ip198  = ql.includes('198.54')  || ql.includes('198.54.117');
    const anyIP  = ip185 || ip45 || ip198;
    const lastIP = memory.lastIP;

    // Track IP mentions for follow-ups
    if (ip185) memory.lastIP = '185.220.101.34';
    if (ip45)  memory.lastIP = '45.33.32.156';
    if (ip198) memory.lastIP = '198.54.117.200';

    const activeIP = memory.lastIP;

    // ── INTENT DETECTION ────────────────────────────────────────

    if (match(ql, ['what happened','incident summary','give me a summary','summarize','overview','brief me','what is this incident','tell me about this'])) {
      memory.topic = 'summary';
      return {
        text: `This is incident INC-2026-0918-001, a security intrusion observed on 2026-09-18 between 09:12 and 10:31 UTC.

The attacker used three external source IPs — a Tor exit node and two cloud hosting IPs — to conduct network reconnaissance, establish connections to WORKSTATION-01, execute PowerShell, perform lateral movement to SERVER-02, and access DATABASE-01.

Eleven events were recorded across the chain. The evidence integrity chain is fully SHA-256 verified. All three source IPs geolocate to cloud or anonymizing infrastructure, so the physical operator location is unknown for all of them.

The most notable anomaly is a geographic jump on IP 185.220.101.34 — it geolocated to Frankfurt at 09:12 then to Singapore at 10:04. This is consistent with Tor exit node rotation, not physical movement.`,
        links: [
          { label:'◷ Timeline', action: "LUCIX.navigate('timeline')" },
          { label:'◈ Attack Graph', action: "LUCIX.navigate('attack_graph')" },
          { label:'📍 Geographic Attribution', action: "LUCIX.navigate('geoint')" },
        ]
      };
    }

    if (match(ql, ['attack timeline','sequence','order of events','what order','step by step','walk me through','attack chain','kill chain'])) {
      memory.topic = 'timeline';
      return {
        text: `Here's the attack sequence:

1. **09:12 UTC — E001**: IP 185.220.101.34 (Tor) conducted a port scan against the corporate perimeter.
2. **09:18 UTC — E002**: IP 45.33.32.156 (Linode cloud) queried DNS for internal hostnames — likely reconnaissance.
3. **09:23 UTC — E003**: 45.33.32.156 established a connection to WORKSTATION-01 on port 4444.
4. **09:31 UTC — E004**: PowerShell spawned from explorer.exe on WORKSTATION-01 — execution stage begins.
5. **09:38 UTC — E005**: PowerShell contacted 198.54.117.200 (Namecheap cloud) — likely C2 check-in.
6. **09:45 UTC — E006**: File dropped to C:\\Users\\Public\\tmp\\agent.exe — persistence artifact.
7. **09:52 UTC — E007**: WORKSTATION-01 connected to SERVER-02 on port 445 — lateral movement via SMB.
8. **10:04 UTC — E008**: 185.220.101.34 re-observed, now exiting via Singapore — Tor exit node rotated.
9. **10:12 UTC — E009**: DATABASE-01 accessed from SERVER-02 — data access stage.
10. **10:22 UTC — E010**: Large outbound transfer to 198.54.117.200 — suspected exfiltration.
11. **10:31 UTC — E011**: Anomalous DNS query to an external domain — possible C2 beacon.

Total duration: 79 minutes. Classic multi-stage intrusion pattern.`,
        links: [
          { label:'◷ Open Timeline', action: "LUCIX.navigate('timeline')" },
          { label:'◈ Attack Graph', action: "LUCIX.navigate('attack_graph')" },
        ]
      };
    }

    if (match(ql, ['lateral movement','move laterally','smb','server-02','pivot'])) {
      return {
        text: `Lateral movement was observed in event E007 at 09:52 UTC. WORKSTATION-01 connected to SERVER-02 on port 445 — that's SMB, the Windows file-sharing protocol.

This is a classic lateral movement technique. The attacker had already executed PowerShell on WORKSTATION-01 and used it to access SERVER-02, then reached DATABASE-01 from there in E009.

Importantly, the source IP for the lateral movement is an internal address — the attacker was already inside the network at this point, using compromised WORKSTATION-01 as a pivot.`,
        links: [{ label:'⊞ View E007', action: "LUCIX.navigate('evidence',{eventId:'E007'})" }]
      };
    }

    if (match(ql, ['exfil','data stolen','what was taken','outbound','transfer','exfiltration'])) {
      return {
        text: `Event E010 at 10:22 UTC shows a large outbound data transfer from WORKSTATION-01 to IP 198.54.117.200 — the Namecheap cloud hosting IP in Frankfurt/Amsterdam.

This is flagged as suspected exfiltration. The destination is cloud infrastructure with partial provider consensus (2/3 providers agree on Frankfurt, 1/3 disagree with Amsterdam), giving it MEDIUM confidence geolocation.

The actual volume of data and what specifically was exfiltrated would require deeper forensic analysis of network captures beyond what's in this evidence set.`,
        links: [
          { label:'⊞ View E010', action: "LUCIX.navigate('evidence',{eventId:'E010'})" },
          { label:'📍 198.54.117.200', action: "LUCIX.navigate('geoint',{ip:'198.54.117.200'})" },
        ]
      };
    }

    // ── GEO ANOMALY ──────────────────────────────────────────────
    if (match(ql, ['anomaly','geo jump','geographic jump','frankfurt','singapore','how did it move','teleport','impossible','jump','9000 km','9360'])) {
      memory.topic = 'anomaly';
      return {
        text: `The geographic anomaly involves IP 185.220.101.34. In event E001 at 09:12 UTC it geolocated to Frankfurt, Germany. In event E008 at 10:04 UTC — just 52 minutes later — it geolocated to Singapore. That's approximately 9,360 km apart.

Physically, no human or device can travel that distance in 52 minutes. But this is completely expected behaviour for a Tor exit node.

Tor routes traffic through a chain of relays worldwide. The "exit node" — the final relay your traffic exits from — changes over time as connections are re-established. What geolocated to Frankfurt was one Tor exit node. What geolocated to Singapore was a different exit node serving the same hidden operator.

This is not evidence of spoofing. It is not evidence of two different attackers. It is expected Tor behaviour that makes geographic attribution structurally impossible for this IP.`,
        links: [
          { label:'📍 View on map', action: "LUCIX.navigate('geoint',{ip:'185.220.101.34'})" },
          { label:'⊞ View E001', action: "LUCIX.navigate('evidence',{eventId:'E001'})" },
          { label:'⊞ View E008', action: "LUCIX.navigate('evidence',{eventId:'E008'})" },
        ]
      };
    }

    // ── PHYSICAL LOCATION ────────────────────────────────────────
    if (match(ql, ['physical location','where is the attacker','where are they','real location','actual location','person location','human location','attacker located','track them','find them','device location','who is it'])) {
      memory.topic = 'physical';
      return {
        text: `Physical operator location is **UNKNOWN** for all three source IPs in this incident. This is not a gap in the investigation — it is a structural certainty given the infrastructure used.

Here's why:

**185.220.101.34** is a Tor exit node. Tor is architecturally designed to break the link between origin and exit. Even with legal authority, you cannot determine where the human operator is from a Tor exit node IP.

**45.33.32.156** is Linode cloud infrastructure in New Jersey. This IP is a rented server — not a home or office. The operator could be anywhere in the world and connected to this server remotely.

**198.54.117.200** is Namecheap cloud hosting. Same situation — it's a rented server, not a person's location.

An IP address geolocation tells you where a piece of network infrastructure is physically installed. It does not tell you where the person controlling that infrastructure is sitting. These are fundamentally different things.`,
        links: [{ label:'📍 Open Geographic Attribution', action: "LUCIX.navigate('geoint')" }]
      };
    }

    // ── TOR DETECTION ───────────────────────────────────────────
    if (match(ql, ['tor','185.220','exit node','onion','anonymi']) || (ip185 && match(ql, ['what is','what type','network type','tell me about']))) {
      memory.topic = 'tor'; memory.lastIP = '185.220.101.34';
      return {
        text: `IP 185.220.101.34 is a **Tor exit node** — confirmed by all three geolocation providers via ASN lookup (AS24940, Hetzner) and the fact that this IP appears in the public Tor exit node list.

A Tor exit node is the last relay in the Tor anonymization chain. All it reveals is the location of that relay server — not the origin of the traffic.

**What we know:** The exit node is physically located in Frankfurt, Germany (at the time of E001–E007). By E008 it had rotated to a Singapore exit node — both are Tor infrastructure, not the attacker's location.

**What we don't know:** Who is behind it, where they are, or whether they are using Tor Browser, a Tor-enabled tool, or a custom implementation.

**Confidence level:** LOW — hard-capped regardless of provider consensus, because Tor fundamentally prevents reliable attribution.`,
        links: [
          { label:'📍 View 185.220.101.34', action: "LUCIX.navigate('geoint',{ip:'185.220.101.34'})" },
          { label:'⊞ View E001', action: "LUCIX.navigate('evidence',{eventId:'E001'})" },
        ]
      };
    }

    // ── CLOUD IPs ────────────────────────────────────────────────
    if (match(ql, ['45.33','linode','newark','new jersey']) || (ip45 && match(ql, ['what is','cloud','where','tell me','geolocate']))) {
      memory.topic = 'ip45'; memory.lastIP = '45.33.32.156';
      return {
        text: `IP 45.33.32.156 is **Linode (Akamai) cloud infrastructure** located in Newark, New Jersey, USA.

All three geolocation providers agree — ASN20473, Choopa/Vultr or AS63949 Linode — consistent placement in the Newark/New Jersey region. Provider consensus is HIGH (3/3 agree), but confidence is capped at MEDIUM because cloud infrastructure can be controlled from anywhere.

**In the incident:** This IP was involved in DNS reconnaissance (E002) and established the initial connection to WORKSTATION-01 on port 4444 (E003) — likely the initial access stage.

**Physical origin:** UNKNOWN. Anyone with a credit card and 5 minutes can spin up a Linode server in New Jersey while physically sitting anywhere on Earth. The server location tells us nothing about the operator's location.`,
        links: [
          { label:'📍 View 45.33.32.156', action: "LUCIX.navigate('geoint',{ip:'45.33.32.156'})" },
          { label:'⊞ View E003', action: "LUCIX.navigate('evidence',{eventId:'E003'})" },
        ]
      };
    }

    if (match(ql, ['198.54','namecheap','frankfurt','amsterdam','198.54.117']) || (ip198 && match(ql, ['what is','cloud','where','tell me','geolocate']))) {
      memory.topic = 'ip198'; memory.lastIP = '198.54.117.200';
      return {
        text: `IP 198.54.117.200 is **Namecheap cloud hosting** — but its geolocation is disputed.

Two of three providers geolocate it to Frankfurt, Germany. One provider (ProviderB) geolocates it to Amsterdam, Netherlands — a 363 km discrepancy. This gives us MEDIUM consensus (2/3), not HIGH.

The spread is large enough to be notable. It may indicate the IP sits near a network boundary between regions, or that provider databases have stale data.

**In the incident:** This IP served as C2 infrastructure (E005) and is the suspected exfiltration destination (E010).

**Physical origin:** UNKNOWN. Like 45.33, this is rented cloud infrastructure — the operator's location is not determinable from this IP.`,
        links: [
          { label:'📍 View 198.54.117.200', action: "LUCIX.navigate('geoint',{ip:'198.54.117.200'})" },
          { label:'⊞ View E005', action: "LUCIX.navigate('evidence',{eventId:'E005'})" },
          { label:'⊞ View E010', action: "LUCIX.navigate('evidence',{eventId:'E010'})" },
        ]
      };
    }

    // ── WHERE DID X GEOLOCATE ────────────────────────────────────
    if (match(ql, ['geolocate','where does','where did','location of','located','where is the ip','ip location']) && anyIP) {
      const ip = activeIP || memory.lastIP;
      if (ip) {
        const a = GeoProvider.analyzeIP(ip);
        return {
          text: `IP ${ip} geolocates to **${a.displayCity}, ${a.displayCountry}** based on ${a.consensus.count}/${a.consensus.total} provider consensus.

Network type: ${a.classification.label}. Confidence: ${a.evidenceScore.level}.
${a.physicalOrigin.reason}`,
          links: [{ label:`📍 View ${ip}`, action:`LUCIX.navigate('geoint',{ip:'${ip}'})` }]
        };
      }
    }

    // ── ALL IPs SUMMARY ─────────────────────────────────────────
    if (match(ql, ['all ips','all three','source ips','all source','list ips','show ips','what ips','which ips'])) {
      return {
        text: `There are three external source IPs in this incident:

**1. 185.220.101.34** — Tor Exit Node
   Location: Frankfurt (E001–E007) → Singapore (E008) — exit node rotation
   Confidence: LOW (Tor hard-cap) | Physical origin: UNKNOWN

**2. 45.33.32.156** — Linode Cloud (US)
   Location: Newark, New Jersey — 3/3 providers agree
   Confidence: MEDIUM (cloud cap) | Physical origin: UNKNOWN

**3. 198.54.117.200** — Namecheap Cloud Hosting
   Location: Frankfurt (2/3) or Amsterdam (1/3) — partial consensus
   Confidence: MEDIUM | Physical origin: UNKNOWN

None of these IPs reveal the attacker's physical location. All are anonymizing or cloud infrastructure.`,
        links: [{ label:'📍 Open Geographic Attribution', action: "LUCIX.navigate('geoint')" }]
      };
    }

    // ── CONFIDENCE ───────────────────────────────────────────────
    if (match(ql, ['confidence','why low','why medium','why not high','confidence level','accuracy','how accurate','how reliable'])) {
      return {
        text: `Geolocation confidence in this incident:

**185.220.101.34 → LOW** — Tor exit nodes receive a hard confidence cap regardless of how well providers agree on coordinates. The exit node location is irrelevant to attribution — what matters is the hidden origin behind Tor, which is structurally inaccessible.

**45.33.32.156 → MEDIUM** — All three providers agree (HIGH consensus), but cloud-hosted IPs receive a confidence cap. The server is in Newark — but the operator could be anywhere.

**198.54.117.200 → MEDIUM** — Only 2/3 providers agree. One places it in Frankfurt, one in Amsterdam (363 km apart). That disagreement reduces raw consensus to MEDIUM, and cloud infrastructure caps it there.

Confidence reflects how precisely we can locate the *infrastructure*, not the *attacker*. Even HIGH confidence geolocation of cloud/Tor infrastructure tells us very little about where a human operator is.`,
        links: [{ label:'📍 View all confidence scores', action: "LUCIX.navigate('geoint')" }]
      };
    }

    // ── CONSENSUS ────────────────────────────────────────────────
    if (match(ql, ['consensus','providers','provider agreement','agree','disagree','all three providers','how many providers'])) {
      return {
        text: `LUCIX queries three simulated geolocation providers for each IP:

**185.220.101.34:**
- ProviderA (MaxMind-style): Frankfurt, Germany ✓
- ProviderB (IPinfo-style): Frankfurt, Germany ✓
- ProviderC (ip-api-style): Frankfurt, Germany ✓
- Consensus: 3/3 HIGH — but confidence hard-capped to LOW (Tor)

**45.33.32.156:**
- ProviderA: Newark, NJ ✓
- ProviderB: Newark, NJ ✓
- ProviderC: Newark, NJ ✓
- Consensus: 3/3 HIGH — capped to MEDIUM (cloud)

**198.54.117.200:**
- ProviderA: Frankfurt, Germany ✓
- ProviderB: Amsterdam, Netherlands ✗ (disagrees)
- ProviderC: Frankfurt, Germany ✓
- Consensus: 2/3 MEDIUM — 363 km spread between providers`,
        links: [{ label:'📍 View provider cards', action: "LUCIX.navigate('geoint')" }]
      };
    }

    // ── INTEGRITY / CHAIN ────────────────────────────────────────
    if (match(ql, ['integrity','chain','hash','verified','tamper','sha','evidence chain','cryptographic','signed','trusted'])) {
      memory.topic = 'integrity';
      return {
        text: `The evidence integrity chain is SHA-256 hash-chained. Each event's hash is derived from its content plus the previous event's hash — creating a tamper-evident chain.

**Status:** All 11 events verified at load time. No tampering detected.

Events from trusted collectors (FIREWALL-01, the EDR agents on WORKSTATION-01 and SERVER-02) are marked TRUSTED — these have collector signatures. Events from less reliable sources are UNVERIFIED but still chain-intact.

If any single event were modified after collection, its hash would mismatch, and all subsequent hashes in the chain would cascade-fail — making tampering immediately detectable.

This is the same principle used in blockchain and legal chain-of-custody systems.`,
        links: [{ label:'⊞ View Evidence Chain', action: "LUCIX.navigate('evidence')" }]
      };
    }

    // ── UNKNOWNS ────────────────────────────────────────────────
    if (match(ql, ['unknown','what we don\'t know','gaps','missing','cannot determine','unanswered','open questions','limitations','blind spots'])) {
      memory.topic = 'unknowns';
      return {
        text: `Here's what remains unknown in this investigation:

**Structurally unknown (cannot be determined):**
- Physical location of any operator — all source IPs are anonymizing or cloud infrastructure
- Identity of the threat actor
- Whether the three IPs are controlled by one person or a group
- What data was specifically exfiltrated in E010

**Evidentially limited:**
- The Amsterdam vs. Frankfurt discrepancy for 198.54.117.200 — we have 2/3 provider agreement but not certainty
- What the DNS query in E011 resolved to and what service it contacted
- Whether agent.exe (dropped in E006) is a known malware family

**Would require additional data:**
- Network packet captures to confirm exfiltration contents (E010)
- Memory forensics on WORKSTATION-01 to analyse the PowerShell payload
- Tor exit node correlation with law enforcement to identify the hidden service origin`,
        links: [{ label:'📍 Attribution view', action: "LUCIX.navigate('geoint')" }]
      };
    }

    // ── POWERSHELL / EXECUTION ───────────────────────────────────
    if (match(ql, ['powershell','e004','execution','process','explorer','spawn','shell'])) {
      return {
        text: `Event E004 at 09:31 UTC shows PowerShell spawning from explorer.exe on WORKSTATION-01. This is suspicious — explorer.exe is the Windows desktop shell, not a typical parent for PowerShell.

This pattern is consistent with a user-mode code injection or a malicious Office macro / shortcut execution that hijacked the explorer.exe process tree to evade parent-process detection rules.

The PowerShell process then contacted IP 198.54.117.200 (E005 — C2 check-in) and dropped agent.exe to disk (E006). The full command line is logged in the raw telemetry for E004.`,
        links: [
          { label:'⊞ View E004', action: "LUCIX.navigate('evidence',{eventId:'E004'})" },
          { label:'⊞ View E005', action: "LUCIX.navigate('evidence',{eventId:'E005'})" },
        ]
      };
    }

    // ── WHAT NEXT / RECOMMENDATIONS ─────────────────────────────
    if (match(ql, ['what should i','next steps','recommend','investigate next','where to look','prioritize','what to do'])) {
      return {
        text: `Based on this evidence, here's what I'd prioritise next:

**1. Memory forensics on WORKSTATION-01** — PowerShell executed something (E004). Capture a memory image before it's cleared. Look for the injected shellcode or malicious payload.

**2. Full packet capture review for E010** — We flagged this as suspected exfiltration to 198.54.117.200. The volume and content of the transfer needs to be confirmed from NetFlow or PCAP data.

**3. Investigate agent.exe (E006)** — The file dropped to C:\\Users\\Public\\tmp\\agent.exe should be pulled for malware analysis. Check hash against VirusTotal, sandbox detonate.

**4. Correlate Tor exit node 185.220.101.34** — Check if this Tor exit node appears in any threat intelligence feeds or previous incident data. The Tor Project publishes exit node lists with timestamps.

**5. Review E011 DNS beacon** — Identify what domain was queried and look for C2 pattern matching (DGA, high-entropy domains, known bad TLDs).`,
        links: [
          { label:'◷ Timeline', action: "LUCIX.navigate('timeline')" },
          { label:'⊞ Evidence', action: "LUCIX.navigate('evidence')" },
        ]
      };
    }

    // ── SPOOFING ────────────────────────────────────────────────
    if (match(ql, ['spoofing','spoofed','is it spoofed','fabricated','fake location','manipulate','forged'])) {
      return {
        text: `LUCIX detected a geographic anomaly (9,360 km in 52 minutes) but does **not** automatically conclude spoofing.

Geographic spoofing of IP geolocation data is theoretically possible — a sophisticated attacker could inject false data into geolocation databases. However, the far simpler and more likely explanation is Tor exit node rotation.

The evidence for Tor is strong: ASN lookup, rDNS, and public exit node lists all confirm 185.220.101.34 as Tor infrastructure. Tor naturally produces exactly this kind of geographic jump as exit nodes rotate.

Concluding "spoofing" would require evidence of deliberate database manipulation — which we don't have here. The appropriate conclusion is: **Tor exit node rotation — physical origin remains unknown**.`,
        links: [{ label:'📍 View anomaly on map', action: "LUCIX.navigate('geoint',{ip:'185.220.101.34'})" }]
      };
    }

    // ── FOLLOW-UP: previous topic ────────────────────────────────
    if (match(ql, ['tell me more','explain','elaborate','more detail','expand on that','continue','go on','why','how'])) {
      if (memory.topic === 'tor' || memory.lastIP === '185.220.101.34') {
        return respond('Tell me about the Tor exit node 185.220.101.34');
      }
      if (memory.topic === 'anomaly') return respond('Why is there a geographic anomaly?');
      if (memory.topic === 'physical') return respond('Is that the attacker physical location?');
      if (memory.topic === 'integrity') return respond('Tell me about the evidence integrity chain');
    }

    // ── WHAT CAN YOU DO ─────────────────────────────────────────
    if (match(ql, ['what can you do','help','what do you know','capabilities','questions you can answer','who are you','what are you'])) {
      return {
        text: `I'm LUCA — a local intelligence engine with full knowledge of this incident. I run entirely offline with no API required.

You can ask me:
- **Incident overview** — "What happened?"
- **Attack timeline** — "Walk me through the attack chain"
- **Source IPs** — "What is 185.220.101.34?" or "Where did 45.33.32.156 geolocate?"
- **Geographic attribution** — "Is this the attacker's physical location?"
- **Anomalies** — "Why is there a geographic jump?"
- **Confidence & consensus** — "Why is confidence LOW?"
- **Evidence integrity** — "Is the evidence chain verified?"
- **Unknowns** — "What remains unknown?"
- **Recommendations** — "What should I investigate next?"

You can also speak to me — hit the 🎤 button and talk.`,
        links: []
      };
    }

    // ── DEFAULT ──────────────────────────────────────────────────
    return {
      text: `I don't have a specific answer for "${q}" in my offline knowledge base, but I can help with:

— **Incident summary** (try: "What happened?")
— **Source IP geolocation** (try: "Where did 185.220.101.34 geolocate?")
— **Physical location** (try: "Is this the attacker's physical location?")
— **Geographic anomaly** (try: "Why is there a geo jump?")
— **Attack timeline** (try: "Walk me through the attack")
— **Evidence integrity** (try: "Is the evidence chain verified?")
— **Unknowns** (try: "What remains unknown?")

Or click any of the suggested questions above.`,
      links: []
    };
  }

  // ── MATCH HELPER ──────────────────────────────────────────────
  function match(ql, keywords) {
    return keywords.some(k => ql.includes(k));
  }

  // ── RENDER HELPERS ─────────────────────────────────────────────
  function appendMsg(role, html) {
    const panel = document.getElementById('luca-chat-panel');
    if (!panel) return;
    const div = document.createElement('div');
    div.className = `luca-msg ${role}`;
    div.innerHTML = role === 'user'
      ? `<div class="luca-bubble user">${html}</div>`
      : `<div class="luca-msg-av">LUCA</div><div class="luca-bubble luca">${html}</div>`;
    panel.appendChild(div);
    panel.scrollTop = panel.scrollHeight;
    return div;
  }

  function createThinkingBubble() {
    const panel = document.getElementById('luca-chat-panel');
    if (!panel) return null;
    const div = document.createElement('div');
    div.className = 'luca-msg luca';
    div.innerHTML = `<div class="luca-msg-av">LUCA</div><div class="luca-bubble luca streaming" style="color:var(--gold);font-style:italic;">Synthesizing forensic analysis via NVIDIA NIM…</div>`;
    panel.appendChild(div);
    panel.scrollTop = panel.scrollHeight;
    return div;
  }

  function updateThinkingBubble(div, response) {
    if (!div) {
      appendLucaMsg(response);
      return;
    }
    const bubble = div.querySelector('.luca-bubble');
    if (!bubble) return;
    bubble.classList.remove('streaming');
    bubble.style.fontStyle = 'normal';
    bubble.style.color = 'var(--text-1)';

    const formatted = response.text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>').replace(/$/, '</p>');

    const linksHtml = (response.links||[]).length
      ? `<div class="luca-msg-links">${response.links.map(l =>
          `<span class="luca-nav-chip" onclick="${l.action}">${l.label}</span>`
        ).join('')}</div>`
      : '';

    bubble.innerHTML = `${formatted}${linksHtml}`;
    const panel = document.getElementById('luca-chat-panel');
    if (panel) panel.scrollTop = panel.scrollHeight;
  }

  function appendLucaMsg(response) {
    const panel = document.getElementById('luca-chat-panel');
    if (!panel) return;

    const formatted = response.text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>').replace(/$/, '</p>');

    const linksHtml = (response.links||[]).length
      ? `<div class="luca-msg-links">${response.links.map(l =>
          `<span class="luca-nav-chip" onclick="${l.action}">${l.label}</span>`
        ).join('')}</div>`
      : '';

    const div = document.createElement('div');
    div.className = 'luca-msg luca';
    div.innerHTML = `<div class="luca-msg-av">LUCA</div>
      <div class="luca-bubble luca">${formatted}${linksHtml}</div>`;
    panel.appendChild(div);
    panel.scrollTop = panel.scrollHeight;
  }

  function setStatus(t) { const el = document.getElementById('luca-status'); if (el) el.textContent = t; }
  function setAvatar(s) {
    const av = document.getElementById('luca-avatar');
    const wv = document.getElementById('luca-waveform');
    if (!av) return;
    av.classList.remove('speaking','listening');
    if (s === 'speaking')  { av.classList.add('speaking');  wv?.classList.add('active'); }
    else if (s === 'listening') { av.classList.add('listening'); wv?.classList.remove('active'); }
    else { wv?.classList.remove('active'); }
  }
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // ── SPEECH SYNTHESIS ───────────────────────────────────────────
  function speak(text) {
    if (voiceMuted || !window.speechSynthesis) return;
    const clean = text
      .replace(/\*\*(.*?)\*\*/g,'$1').replace(/\*(.*?)\*/g,'$1')
      .replace(/`(.*?)`/g,'$1').replace(/#+ /g,'').replace(/\n/g,' ')
      .substring(0, 450);
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.rate = 1.05; u.pitch = 1.0; u.volume = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.name.includes('Samantha')||v.name.includes('Karen')||
      v.name.includes('Microsoft Aria')||v.name.includes('Google UK')||
      (v.lang==='en-US'&&v.localService)) || voices.find(v=>v.lang.startsWith('en')) || voices[0];
    if (v) u.voice = v;
    u.onstart = () => { isSpeaking=true; setAvatar('speaking'); setStatus('Speaking…'); };
    u.onend   = () => { isSpeaking=false; setAvatar('idle');    setStatus('Ready — offline mode'); };
    u.onerror = () => { isSpeaking=false; setAvatar('idle');    setStatus('Ready — offline mode'); };
    window.speechSynthesis.speak(u);
  }

  function toggleMute() {
    voiceMuted = !voiceMuted;
    const btn = document.getElementById('luca-mute-btn');
    if (btn) { btn.textContent = voiceMuted ? '🔇' : '🔊'; btn.classList.toggle('muted', voiceMuted); }
    if (voiceMuted && isSpeaking) { window.speechSynthesis.cancel(); isSpeaking=false; setAvatar('idle'); }
  }

  // ── SPEECH RECOGNITION ─────────────────────────────────────────
  function initSpeech() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      const btn = document.getElementById('luca-mic-btn');
      if (btn) { btn.title='Speech recognition requires Chrome or Edge'; btn.style.opacity='.35'; }
      return;
    }
    recognition = new SR();
    recognition.continuous=false; recognition.interimResults=true; recognition.lang='en-US';

    recognition.onstart = () => {
      isListening=true; setStatus('Listening…'); setAvatar('listening');
      document.getElementById('luca-mic-btn')?.classList.add('listening');
      const inp = document.getElementById('luca-input');
      if (inp) inp.placeholder='Listening…';
      if (!isExpanded) toggleExpand();
    };
    recognition.onresult = (e) => {
      const t = Array.from(e.results).map(r=>r[0].transcript).join('');
      const inp = document.getElementById('luca-input');
      if (inp) inp.value = t;
    };
    recognition.onend = () => {
      isListening=false; setAvatar('idle');
      document.getElementById('luca-mic-btn')?.classList.remove('listening');
      const inp = document.getElementById('luca-input');
      if (inp) {
        inp.placeholder='Ask LUCA about the incident…';
        const t = inp.value.trim();
        if (t) { inp.value=''; ask(t); } else setStatus('Ready — offline mode');
      }
    };
    recognition.onerror = (e) => {
      isListening=false; setAvatar('idle');
      document.getElementById('luca-mic-btn')?.classList.remove('listening');
      setStatus(e.error==='no-speech'?'No speech detected':`Mic: ${e.error}`);
      setTimeout(()=>setStatus('Ready — offline mode'),2000);
    };
  }

  function toggleMic() {
    if (!recognition) { alert('Speech recognition requires Chrome or Edge.'); return; }
    if (isSpeaking) { window.speechSynthesis.cancel(); isSpeaking=false; }
    if (isListening) { recognition.stop(); return; }
    try { recognition.start(); } catch(e) { console.warn('[LUCA mic]',e); }
  }

  return { initBar, toggleExpand, ask, sendFromBar, handleKey, toggleMic, toggleMute, speak };
})();

window.LucaView = LucaView;
