// LUCIX Demo Data — Synthetic Incident Scenario
// All IPs, events, and geolocation results are FABRICATED for demonstration purposes.
// No real network traffic or personal data is represented.

const DEMO_EVENTS = [
  {
    id: 'E001',
    timestamp: '2026-09-18T09:12:03Z',
    type: 'NETWORK_SCAN',
    source_ip: '185.220.101.34',
    dest_ip: '10.0.1.10',
    dest_host: 'WORKSTATION-01',
    dest_port: null,
    protocol: 'TCP',
    description: 'Port scan detected from external IP — 1,247 ports probed in 38 seconds.',
    raw_telemetry: 'Sep 18 09:12:03 fw01 %FW-6-SESS_AUDIT_TRAIL: Stop tcp src outside:185.220.101.34/54321 dst inside:10.0.1.10/1-65535 [port_scan_detected]',
    collector_id: 'FIREWALL-01',
    source_trust: 'TRUSTED',
    has_signature: true,
    signature_cert: 'CN=FIREWALL-01,O=CorpSec,C=US',
    tags: ['scan', 'recon', 'tor']
  },
  {
    id: 'E002',
    timestamp: '2026-09-18T09:27:14Z',
    type: 'CONNECTION_ESTABLISHED',
    source_ip: '45.33.32.156',
    dest_ip: '10.0.1.10',
    dest_host: 'WORKSTATION-01',
    dest_port: 22,
    protocol: 'TCP/SSH',
    description: 'SSH connection initiated from external cloud IP to WORKSTATION-01.',
    raw_telemetry: 'Sep 18 09:27:14 fw01 %FW-6-SESS_AUDIT_TRAIL: tcp src outside:45.33.32.156/49812 dst inside:10.0.1.10/22 bytes_in=1240 bytes_out=890',
    collector_id: 'FIREWALL-01',
    source_trust: 'TRUSTED',
    has_signature: true,
    signature_cert: 'CN=FIREWALL-01,O=CorpSec,C=US',
    tags: ['ssh', 'initial_access']
  },
  {
    id: 'E003',
    timestamp: '2026-09-18T09:28:05Z',
    type: 'PROCESS_CREATED',
    source_ip: null,
    dest_ip: null,
    dest_host: null,
    dest_port: null,
    protocol: null,
    host: 'WORKSTATION-01',
    process: 'powershell.exe',
    parent_process: 'sshd.exe',
    command_line: 'powershell.exe -NoP -NonI -W Hidden -Enc JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0...',
    description: 'PowerShell spawned by sshd with Base64-encoded command — indicative of post-exploitation activity.',
    raw_telemetry: '{"EventID":4688,"Computer":"WORKSTATION-01","ProcessName":"powershell.exe","ParentProcessName":"sshd.exe","CommandLine":"powershell.exe -NoP -NonI -W Hidden -Enc JABjAGwA..."}',
    collector_id: 'EDR-AGENT-WS01',
    source_trust: 'TRUSTED',
    has_signature: true,
    signature_cert: 'CN=EDR-AGENT,O=CorpSec,C=US',
    tags: ['execution', 'powershell', 'encoded_command', 'post_exploitation']
  },
  {
    id: 'E004',
    timestamp: '2026-09-18T09:31:22Z',
    type: 'DNS_QUERY',
    source_ip: '10.0.1.10',
    dest_ip: null,
    dest_host: 'malicious-c2.darknet-relay.net',
    dest_port: 53,
    protocol: 'UDP/DNS',
    host: 'WORKSTATION-01',
    description: 'DNS resolution request for known C2 domain from WORKSTATION-01.',
    raw_telemetry: '{"timestamp":"2026-09-18T09:31:22Z","client":"10.0.1.10","query":"malicious-c2.darknet-relay.net","type":"A","response":"198.54.117.200","ttl":60}',
    collector_id: 'DNS-MONITOR-01',
    source_trust: 'PARTIALLY_VERIFIED',
    has_signature: false,
    tags: ['c2', 'dns', 'exfil']
  },
  {
    id: 'E005',
    timestamp: '2026-09-18T09:35:47Z',
    type: 'CONNECTION_ESTABLISHED',
    source_ip: '10.0.1.10',
    dest_ip: '198.54.117.200',
    dest_host: 'WORKSTATION-01',
    dest_port: 443,
    protocol: 'TCP/HTTPS',
    host: 'WORKSTATION-01',
    description: 'Encrypted outbound connection from WORKSTATION-01 to C2 infrastructure over HTTPS.',
    raw_telemetry: 'Sep 18 09:35:47 fw01 %FW-6-SESS_AUDIT_TRAIL: tcp src inside:10.0.1.10/52241 dst outside:198.54.117.200/443 bytes_in=42810 bytes_out=98240',
    collector_id: 'FIREWALL-01',
    source_trust: 'TRUSTED',
    has_signature: true,
    signature_cert: 'CN=FIREWALL-01,O=CorpSec,C=US',
    tags: ['c2', 'https', 'exfil']
  },
  {
    id: 'E006',
    timestamp: '2026-09-18T09:47:31Z',
    type: 'CONNECTION_ESTABLISHED',
    source_ip: '198.54.117.200',
    dest_ip: '10.0.1.20',
    dest_host: 'SERVER-02',
    dest_port: 445,
    protocol: 'TCP/SMB',
    description: 'SMB connection from C2 infrastructure IP to SERVER-02 — possible lateral movement or data staging.',
    raw_telemetry: 'Sep 18 09:47:31 fw01 %FW-6-SESS_AUDIT_TRAIL: tcp src outside:198.54.117.200/60142 dst inside:10.0.1.20/445 bytes_in=8920 bytes_out=204800',
    collector_id: 'FIREWALL-01',
    source_trust: 'TRUSTED',
    has_signature: true,
    signature_cert: 'CN=FIREWALL-01,O=CorpSec,C=US',
    tags: ['lateral_movement', 'smb']
  },
  {
    id: 'E007',
    timestamp: '2026-09-18T09:52:09Z',
    type: 'FILE_ACCESS',
    source_ip: null,
    dest_ip: null,
    host: 'SERVER-02',
    process: 'svchost.exe',
    file_path: '\\\\SERVER-02\\FILESHARE\\HR\\Salary_2026.xlsx',
    access_type: 'READ',
    description: 'Sensitive file accessed on SERVER-02 under suspicious process context.',
    raw_telemetry: '{"EventID":4663,"Computer":"SERVER-02","ObjectName":"\\\\SERVER-02\\FILESHARE\\HR\\Salary_2026.xlsx","ProcessName":"svchost.exe","AccessMask":"0x1"}',
    collector_id: 'EDR-AGENT-SV02',
    source_trust: 'TRUSTED',
    has_signature: true,
    signature_cert: 'CN=EDR-AGENT,O=CorpSec,C=US',
    tags: ['data_access', 'sensitive_file', 'exfil_candidate']
  },
  {
    id: 'E008',
    timestamp: '2026-09-18T10:04:17Z',
    type: 'NETWORK_SCAN',
    source_ip: '185.220.101.34',
    dest_ip: '10.0.1.0/24',
    dest_host: 'WORKSTATION-01',
    dest_port: null,
    protocol: 'TCP',
    description: 'Same Tor exit IP re-observed — geolocating to different city (exit node change). Geographic anomaly flagged.',
    raw_telemetry: 'Sep 18 10:04:17 fw01 %FW-6-SESS_AUDIT_TRAIL: Stop tcp src outside:185.220.101.34/39021 dst inside:10.0.1.0/1-1024 [port_scan_detected]',
    collector_id: 'FIREWALL-01',
    source_trust: 'TRUSTED',
    has_signature: true,
    signature_cert: 'CN=FIREWALL-01,O=CorpSec,C=US',
    geo_anomaly: true,
    tags: ['scan', 'tor', 'geo_anomaly']
  },
  {
    id: 'E009',
    timestamp: '2026-09-18T10:15:44Z',
    type: 'CONNECTION_ESTABLISHED',
    source_ip: '10.0.1.11',
    dest_ip: '10.0.1.20',
    dest_host: 'SERVER-02',
    source_host: 'WORKSTATION-02',
    dest_port: 445,
    protocol: 'TCP/SMB',
    description: 'Internal host WORKSTATION-02 connecting to SERVER-02 via SMB — potential lateral movement.',
    raw_telemetry: 'Sep 18 10:15:44 fw01 %FW-6-SESS_AUDIT_TRAIL: tcp src inside:10.0.1.11/49231 dst inside:10.0.1.20/445 bytes_in=2048 bytes_out=102400',
    collector_id: 'FIREWALL-01',
    source_trust: 'TRUSTED',
    has_signature: true,
    signature_cert: 'CN=FIREWALL-01,O=CorpSec,C=US',
    tags: ['lateral_movement', 'smb', 'internal']
  },
  {
    id: 'E010',
    timestamp: '2026-09-18T10:22:58Z',
    type: 'CONNECTION_ESTABLISHED',
    source_ip: '10.0.1.20',
    dest_ip: '10.0.1.30',
    dest_host: 'DATABASE-01',
    source_host: 'SERVER-02',
    dest_port: 1433,
    protocol: 'TCP/MSSQL',
    description: 'SERVER-02 initiating database connection to DATABASE-01 — anomalous timing relative to incident.',
    raw_telemetry: 'Sep 18 10:22:58 fw01 %FW-6-SESS_AUDIT_TRAIL: tcp src inside:10.0.1.20/52312 dst inside:10.0.1.30/1433 bytes_in=1024 bytes_out=512000',
    collector_id: 'FIREWALL-01',
    source_trust: 'TRUSTED',
    has_signature: true,
    signature_cert: 'CN=FIREWALL-01,O=CorpSec,C=US',
    tags: ['lateral_movement', 'database', 'internal']
  },
  {
    id: 'E011',
    timestamp: '2026-09-18T10:31:00Z',
    type: 'CONNECTION_ESTABLISHED',
    source_ip: '10.0.1.10',
    dest_ip: '198.54.117.200',
    dest_host: null,
    dest_port: 443,
    protocol: 'TCP/HTTPS',
    host: 'WORKSTATION-01',
    description: 'Second C2 beacon from WORKSTATION-01. Bytes transferred suggest data exfiltration.',
    raw_telemetry: 'Sep 18 10:31:00 fw01 %FW-6-SESS_AUDIT_TRAIL: tcp src inside:10.0.1.10/53102 dst outside:198.54.117.200/443 bytes_in=1024 bytes_out=2048000',
    collector_id: 'FIREWALL-01',
    source_trust: 'TRUSTED',
    has_signature: true,
    signature_cert: 'CN=FIREWALL-01,O=CorpSec,C=US',
    tags: ['c2', 'exfil', 'beaconing']
  }
];

// ---------------------------------------------------------------------------
// IP GEOLOCATION DATABASE (Synthetic — 3 simulated providers per IP)
// ---------------------------------------------------------------------------

const IP_GEO_DATA = {
  '185.220.101.34': {
    ip: '185.220.101.34',
    reverse_dns: 'tor-exit-34.tor-relay.example',
    providers: [
      {
        provider: 'ProviderA',
        provider_desc: 'MaxMind-style DB',
        lat: 50.1109,
        lng: 8.6821,
        country: 'Germany',
        country_code: 'DE',
        region: 'Hesse',
        city: 'Frankfurt am Main',
        asn: 'AS196844',
        org: 'POVERTY-FREE-INTERNET Relay Association',
        network_type: 'TOR_EXIT',
        timezone: 'Europe/Berlin',
        accuracy_km: 100,
        timestamp: '2026-09-18T09:12:00Z'
      },
      {
        provider: 'ProviderB',
        provider_desc: 'IPinfo-style DB',
        lat: 50.1155,
        lng: 8.6842,
        country: 'Germany',
        country_code: 'DE',
        region: 'Hesse',
        city: 'Frankfurt am Main',
        asn: 'AS196844',
        org: 'POVERTY-FREE-INTERNET e.V.',
        network_type: 'TOR_EXIT',
        timezone: 'Europe/Berlin',
        accuracy_km: 50,
        timestamp: '2026-09-18T09:12:00Z'
      },
      {
        provider: 'ProviderC',
        provider_desc: 'ip-api-style DB',
        lat: 50.1100,
        lng: 8.6800,
        country: 'Germany',
        country_code: 'DE',
        region: 'Hesse',
        city: 'Frankfurt am Main',
        asn: 'AS196844',
        org: 'Tor Project Exit Node',
        network_type: 'TOR_EXIT',
        timezone: 'Europe/Berlin',
        accuracy_km: 200,
        timestamp: '2026-09-18T09:12:00Z'
      }
    ],
    // Second observation at E008 — Tor exit node rotated
    providers_e008: [
      {
        provider: 'ProviderA',
        provider_desc: 'MaxMind-style DB',
        lat: 1.3521,
        lng: 103.8198,
        country: 'Singapore',
        country_code: 'SG',
        region: 'Central Singapore',
        city: 'Singapore',
        asn: 'AS196844',
        org: 'POVERTY-FREE-INTERNET Relay Association',
        network_type: 'TOR_EXIT',
        timezone: 'Asia/Singapore',
        accuracy_km: 200,
        timestamp: '2026-09-18T10:04:00Z'
      },
      {
        provider: 'ProviderB',
        provider_desc: 'IPinfo-style DB',
        lat: 1.3000,
        lng: 103.8000,
        country: 'Singapore',
        country_code: 'SG',
        region: 'Central Singapore',
        city: 'Singapore',
        asn: 'AS196844',
        org: 'Tor Exit Relay',
        network_type: 'TOR_EXIT',
        timezone: 'Asia/Singapore',
        accuracy_km: 300,
        timestamp: '2026-09-18T10:04:00Z'
      },
      {
        provider: 'ProviderC',
        provider_desc: 'ip-api-style DB',
        lat: 1.3644,
        lng: 103.8574,
        country: 'Singapore',
        country_code: 'SG',
        region: 'Central Singapore',
        city: 'Singapore',
        asn: 'AS196844',
        org: 'Tor Project Exit Node',
        network_type: 'TOR_EXIT',
        timezone: 'Asia/Singapore',
        accuracy_km: 150,
        timestamp: '2026-09-18T10:04:00Z'
      }
    ],
    history: [
      { timestamp: '2026-09-18T09:12:03Z', city: 'Frankfurt am Main', country: 'Germany', lat: 50.1109, lng: 8.6821, event_id: 'E001' },
      { timestamp: '2026-09-18T10:04:17Z', city: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198, event_id: 'E008' }
    ],
    geo_anomalies: [
      {
        type: 'GEO_JUMP',
        from_city: 'Frankfurt am Main',
        to_city: 'Singapore',
        distance_km: 9360,
        time_delta_min: 52,
        from_event: 'E001',
        to_event: 'E008',
        explanation: 'Tor exit node rotation. The same onion-routed connection may use different exit nodes. The IP belongs to the Tor network; the originating user location remains unknown.'
      }
    ]
  },

  '45.33.32.156': {
    ip: '45.33.32.156',
    reverse_dns: 'li1072-156.members.linode.com',
    providers: [
      {
        provider: 'ProviderA',
        provider_desc: 'MaxMind-style DB',
        lat: 40.7282,
        lng: -74.0776,
        country: 'United States',
        country_code: 'US',
        region: 'New Jersey',
        city: 'Newark',
        asn: 'AS63949',
        org: 'Linode LLC',
        network_type: 'CLOUD_HOSTING',
        timezone: 'America/New_York',
        accuracy_km: 25,
        timestamp: '2026-09-18T09:27:00Z'
      },
      {
        provider: 'ProviderB',
        provider_desc: 'IPinfo-style DB',
        lat: 40.7357,
        lng: -74.1724,
        country: 'United States',
        country_code: 'US',
        region: 'New Jersey',
        city: 'Newark',
        asn: 'AS63949',
        org: 'Linode, LLC',
        network_type: 'CLOUD_HOSTING',
        timezone: 'America/New_York',
        accuracy_km: 20,
        timestamp: '2026-09-18T09:27:00Z'
      },
      {
        provider: 'ProviderC',
        provider_desc: 'ip-api-style DB',
        lat: 40.7282,
        lng: -74.0776,
        country: 'United States',
        country_code: 'US',
        region: 'New Jersey',
        city: 'Newark',
        asn: 'AS63949',
        org: 'Linode',
        network_type: 'CLOUD_HOSTING',
        timezone: 'America/New_York',
        accuracy_km: 50,
        timestamp: '2026-09-18T09:27:00Z'
      }
    ],
    history: [
      { timestamp: '2026-09-18T09:27:14Z', city: 'Newark', country: 'United States', lat: 40.7282, lng: -74.0776, event_id: 'E002' }
    ],
    geo_anomalies: []
  },

  '198.54.117.200': {
    ip: '198.54.117.200',
    reverse_dns: 'server200.namecheap-hosting.net',
    providers: [
      {
        provider: 'ProviderA',
        provider_desc: 'MaxMind-style DB',
        lat: 50.1109,
        lng: 8.6821,
        country: 'Germany',
        country_code: 'DE',
        region: 'Hesse',
        city: 'Frankfurt am Main',
        asn: 'AS22611',
        org: 'Namecheap Inc',
        network_type: 'CLOUD_HOSTING',
        timezone: 'Europe/Berlin',
        accuracy_km: 50,
        timestamp: '2026-09-18T09:35:00Z'
      },
      {
        provider: 'ProviderB',
        provider_desc: 'IPinfo-style DB',
        lat: 52.3740,
        lng: 4.8897,
        country: 'Netherlands',
        country_code: 'NL',
        region: 'North Holland',
        city: 'Amsterdam',
        asn: 'AS22611',
        org: 'Namecheap, Inc.',
        network_type: 'CLOUD_HOSTING',
        timezone: 'Europe/Amsterdam',
        accuracy_km: 100,
        timestamp: '2026-09-18T09:35:00Z'
      },
      {
        provider: 'ProviderC',
        provider_desc: 'ip-api-style DB',
        lat: 50.1200,
        lng: 8.6900,
        country: 'Germany',
        country_code: 'DE',
        region: 'Hesse',
        city: 'Frankfurt am Main',
        asn: 'AS22611',
        org: 'Namecheap Hosting',
        network_type: 'CLOUD_HOSTING',
        timezone: 'Europe/Berlin',
        accuracy_km: 75,
        timestamp: '2026-09-18T09:35:00Z'
      }
    ],
    history: [
      { timestamp: '2026-09-18T09:35:47Z', city: 'Frankfurt am Main', country: 'Germany', lat: 50.1109, lng: 8.6821, event_id: 'E005' },
      { timestamp: '2026-09-18T09:47:31Z', city: 'Frankfurt am Main', country: 'Germany', lat: 50.1109, lng: 8.6821, event_id: 'E006' },
      { timestamp: '2026-09-18T10:31:00Z', city: 'Frankfurt am Main', country: 'Germany', lat: 50.1109, lng: 8.6821, event_id: 'E011' }
    ],
    geo_anomalies: []
  }
};

// ---------------------------------------------------------------------------
// INTERNAL HOSTS
// ---------------------------------------------------------------------------

const INTERNAL_HOSTS = {
  '10.0.1.10': { hostname: 'WORKSTATION-01', role: 'user_workstation', department: 'Finance', os: 'Windows 11 Pro', last_user: 'j.smith' },
  '10.0.1.11': { hostname: 'WORKSTATION-02', role: 'user_workstation', department: 'Finance', os: 'Windows 11 Pro', last_user: 'a.jones' },
  '10.0.1.20': { hostname: 'SERVER-02', role: 'file_server', department: 'IT', os: 'Windows Server 2022' },
  '10.0.1.30': { hostname: 'DATABASE-01', role: 'database_server', department: 'IT', os: 'Windows Server 2022' }
};

// ---------------------------------------------------------------------------
// ATTACK GRAPH NODES & EDGES
// ---------------------------------------------------------------------------

const ATTACK_GRAPH = {
  nodes: [
    { id: 'ip_185', type: 'SOURCE_IP', label: '185.220.101.34', sub: 'TOR EXIT NODE', ip: '185.220.101.34' },
    { id: 'ip_45', type: 'SOURCE_IP', label: '45.33.32.156', sub: 'CLOUD (Linode)', ip: '45.33.32.156' },
    { id: 'ip_198', type: 'C2_IP', label: '198.54.117.200', sub: 'C2 / CLOUD', ip: '198.54.117.200' },
    { id: 'ws01', type: 'INTERNAL_HOST', label: 'WORKSTATION-01', sub: '10.0.1.10' },
    { id: 'ws02', type: 'INTERNAL_HOST', label: 'WORKSTATION-02', sub: '10.0.1.11' },
    { id: 'sv02', type: 'INTERNAL_HOST', label: 'SERVER-02', sub: '10.0.1.20' },
    { id: 'db01', type: 'INTERNAL_HOST', label: 'DATABASE-01', sub: '10.0.1.30' },
    { id: 'ps1', type: 'PROCESS', label: 'powershell.exe', sub: 'Encoded Command' },
    { id: 'file1', type: 'ARTIFACT', label: 'Salary_2026.xlsx', sub: 'Sensitive File' }
  ],
  edges: [
    { from: 'ip_185', to: 'ws01', label: 'PORT SCAN', event: 'E001', type: 'recon' },
    { from: 'ip_45', to: 'ws01', label: 'SSH ACCESS', event: 'E002', type: 'initial_access' },
    { from: 'ws01', to: 'ps1', label: 'SPAWNED', event: 'E003', type: 'execution' },
    { from: 'ws01', to: 'ip_198', label: 'C2 BEACON', event: 'E005', type: 'c2' },
    { from: 'ip_198', to: 'sv02', label: 'SMB ACCESS', event: 'E006', type: 'lateral_movement' },
    { from: 'sv02', to: 'file1', label: 'FILE READ', event: 'E007', type: 'data_access' },
    { from: 'ip_185', to: 'ws01', label: 'RE-SCAN', event: 'E008', type: 'recon' },
    { from: 'ws02', to: 'sv02', label: 'SMB ACCESS', event: 'E009', type: 'lateral_movement' },
    { from: 'sv02', to: 'db01', label: 'DB QUERY', event: 'E010', type: 'data_access' },
    { from: 'ws01', to: 'ip_198', label: 'EXFIL?', event: 'E011', type: 'exfil' }
  ]
};

// Export to global namespace
window.LUCIX_DATA = { DEMO_EVENTS, IP_GEO_DATA, INTERNAL_HOSTS, ATTACK_GRAPH };
