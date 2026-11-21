 LUCIX — Next-Generation Cyber Forensic Investigation Operating System

LUCIX is a forensic investigation operating system and attribution environment. Built with pure client-side architecture and powered by NVIDIA NIM and Geoapify GEOINT telemetry, LUCIX turns forensic analysis from speculative guesswork into mathematical certainty.

---

 Key Features & Architecture

### 1.  Luxury Forensic Timeline (`TL`)
- Reconstructs security intrusions step-by-step with sub-millisecond precision.
- Visual indicators for reconnaissance, credential access, execution, lateral movement, data access, and exfiltration.
- Dynamic anomaly highlighting and multi-hop correlation across hosts and endpoints.

### 2.  Interactive Attack Graph (`AG`)
- Interactive vector graph visualizing compromised perimeters, internal workstations, pivot servers, and databases.
- Node styles distinctly identify source IPs, command-and-control (C2) infrastructure, internal hosts, processes, and persistence artifacts.
- Real-time telemetry connection lines with animated stage indicators.

### 3. Cryptographic Evidence Chain of Custody (`EV`)
- Full **SHA-256 integrity hash chaining** for every event artifact.
- Automated tamper-evident verification: any single altered byte invalidates the downstream custody chain.
- Collector trust tagging (EDR agents, perimeter firewalls, network taps).

### 4.  Multi-Source GEOINT & Consensus Attribution (`GEO`)
- High-resolution dark-matter cartographic visualization powered by **Geoapify Maps API**.
- Multi-provider consensus engine (calculating geographic spread, provider agreement, and ASN consistency).
- **Fundamental Attribution Rule**: Strict visual and logical separation between *infrastructure location* (Tor exit nodes, cloud hosting data centers) and *physical operator origin*.
- Live on-demand Geoapify IP lookup tool to analyze any external IP address worldwide.

### 5.  Real-Time Attack Simulation Studio (`SIM`)
- Operations room control center with real-time attack replay.
- Playback controls with variable velocity (20x, 60x, 120x compression).
- Live threat assessment gauge, kill chain stage tracker, and active infrastructure status.
- Synchronized Web Audio tactical indicators and global notifications.

### 6. LUCA — Forensic Intelligence Engine (`LC`)
- Neural cyber forensic intelligence agent powered by **NVIDIA NIM** (`nvidia/nemotron-3.5-bolt-e4b`).
- Instant analysis of IOCs, network anomalies, lateral movement techniques, and exfiltration patterns.
- Automated generation of interactive navigation chips linking directly to relevant forensic evidence.
- Full offline fallback engine ensuring continuous operation even in disconnected or air-gapped environments.

---

## Design System

- **Primary Colors**: Stark Red (`#C41E3A`), Metallic Gold (`#C5A55A`), Dark Navy Blue (`#0A1628`).
- **Typography**: `Inter` for crisp UI readability paired with `JetBrains Mono` for telemetry and hashes.
- **Glassmorphism**: Subtle frosted translucent panels, clean geometric separators, zero clutter.
- **Accessibility & Polish**: No pill-shaped buttons, crisp structured badges, no hover animations.

---

##  Quick Start

### Option 1: One-Click Launcher (Windows)
Double-click `run.bat` to launch the local bridge server and open LUCIX in your default browser.

```cmd
run.bat
```

### Option 2: Python Command Line
Run the zero-dependency bridge server with Python 3:

```bash
cd lucix
python server.py
```
Then navigate to: **`http://localhost:8080/`**

### Option 3: Standalone Browser
Open `index.html` directly in any modern browser (Chrome, Edge, Firefox, Safari).

---

##  Contributors

- **Ekaagr Kukreja**
- **Shreya Sharma**

---

##  License
MIT License. Created for advanced cybersecurity forensic analysis and digital incident response investigations.
