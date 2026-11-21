// LUCIX Spoofing & Anomaly Detection Module
// Detects geographic inconsistencies in observed source IPs.

const SpoofingDetector = (() => {

  const GEO_JUMP_THRESHOLD_KM = 1000;    // Flag if > 1000km between observations
  const GEO_JUMP_THRESHOLD_MIN = 60;     // Within 60 minutes

  // ---------------------------------------------------------------------------
  // Detect geographic jumps in observation history
  // ---------------------------------------------------------------------------
  function detectGeoJumps(ipData) {
    const history = ipData.history;
    if (!history || history.length < 2) return [];

    const anomalies = [];

    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];

      const dist = GeoProvider.haversineKm(prev.lat, prev.lng, curr.lat, curr.lng);
      const prevTime = new Date(prev.timestamp);
      const currTime = new Date(curr.timestamp);
      const deltaMin = (currTime - prevTime) / 60000;

      if (dist > GEO_JUMP_THRESHOLD_KM && deltaMin <= GEO_JUMP_THRESHOLD_MIN) {
        anomalies.push({
          type: 'GEO_JUMP',
          severity: dist > 5000 ? 'HIGH' : 'MEDIUM',
          from_event: prev.event_id,
          to_event: curr.event_id,
          from_city: `${prev.city}, ${prev.country}`,
          to_city: `${curr.city}, ${curr.country}`,
          from_lat: prev.lat,
          from_lng: prev.lng,
          to_lat: curr.lat,
          to_lng: curr.lng,
          distance_km: Math.round(dist),
          time_delta_min: Math.round(deltaMin),
          timestamp: curr.timestamp,
          possible_explanations: getExplanations(ipData, dist, deltaMin),
          // NOTE: Do NOT automatically conclude spoofing
          auto_conclusion: null
        });
      }
    }

    return anomalies;
  }

  function getExplanations(ipData, distKm, deltaMin) {
    const explanations = [];
    const classification = NetworkClassifier.classify(ipData);

    if (classification.type === 'TOR_EXIT') {
      explanations.push('Tor exit node rotation — the same Tor circuit may use different exit nodes in different countries.');
    }
    if (classification.type === 'VPN') {
      explanations.push('VPN server rotation — the client may have switched VPN endpoints.');
    }
    if (['CLOUD_HOSTING', 'CDN'].includes(classification.type)) {
      explanations.push('Cloud/CDN infrastructure with geographically distributed nodes.');
    }
    if (distKm > 5000 && deltaMin < 10) {
      explanations.push('Distance physically impossible for human travel — suggests infrastructure hop, relay, or distinct actors sharing IP range.');
    }
    explanations.push('Geolocation database discrepancy between observation timestamps.');
    explanations.push('NAT or shared IP address serving multiple geographic regions.');
    explanations.push('Telemetry inconsistency or data collection error.');

    return explanations;
  }

  // ---------------------------------------------------------------------------
  // ASN/Organization consistency check
  // ---------------------------------------------------------------------------
  function checkASNConsistency(ipData) {
    const providers = ipData.providers;
    const asns = [...new Set(providers.map(p => p.asn))];
    const orgs = [...new Set(providers.map(p => p.org))];

    const asnConsistent = asns.length === 1;
    // Org names vary in formatting across providers — normalize
    const orgConsistent = orgs.length <= 2; // Allow minor naming variation

    let assessment;
    let consistent = true;

    if (asnConsistent && orgConsistent) {
      assessment = 'Infrastructure attribution is internally consistent. ASN and organization align across providers.';
    } else if (asnConsistent && !orgConsistent) {
      assessment = 'ASN is consistent but organization name varies across providers — likely formatting differences.';
    } else {
      assessment = 'ASN inconsistency detected across providers. This warrants additional investigation.';
      consistent = false;
    }

    return {
      consistent,
      asns,
      orgs,
      assessment,
      rdns_consistent: !!ipData.reverse_dns
    };
  }

  // ---------------------------------------------------------------------------
  // Full anomaly report for an IP
  // ---------------------------------------------------------------------------
  function analyzeIP(ip) {
    const ipData = window.LUCIX_DATA.IP_GEO_DATA[ip];
    if (!ipData) return null;

    const geoJumps = detectGeoJumps(ipData);
    // Prefer stored anomalies from demo data if they exist
    const storedAnomalies = ipData.geo_anomalies || [];
    const allAnomalies = storedAnomalies.length > 0 ? storedAnomalies : geoJumps;

    const asnConsistency = checkASNConsistency(ipData);

    return {
      ip,
      has_anomalies: allAnomalies.length > 0,
      anomalies: allAnomalies,
      asn_consistency: asnConsistency,
      overall_integrity: allAnomalies.length === 0 && asnConsistency.consistent ? 'CONSISTENT' : 'ANOMALIES_DETECTED'
    };
  }

  // ---------------------------------------------------------------------------
  // Render anomaly warning HTML
  // ---------------------------------------------------------------------------
  function renderAnomalyWarning(anomaly) {
    return `
      <div class="anomaly-warning">
        <div class="anomaly-header">
          <span class="anomaly-icon">⚠</span>
          <span class="anomaly-title">GEOGRAPHIC ANOMALY — ${anomaly.type.replace(/_/g, ' ')}</span>
          <span class="severity-badge sev-${anomaly.severity || 'MEDIUM'}">${anomaly.severity || 'MEDIUM'}</span>
        </div>
        <div class="anomaly-body">
          <div class="anomaly-row">
            <span class="anomaly-label">From:</span>
            <span class="anomaly-value">${anomaly.from_city || anomaly.from_event}</span>
          </div>
          <div class="anomaly-row">
            <span class="anomaly-label">To:</span>
            <span class="anomaly-value">${anomaly.to_city || anomaly.to_event}</span>
          </div>
          <div class="anomaly-row">
            <span class="anomaly-label">Distance:</span>
            <span class="anomaly-value">${anomaly.distance_km ? anomaly.distance_km + ' km' : '—'}</span>
          </div>
          <div class="anomaly-row">
            <span class="anomaly-label">Time delta:</span>
            <span class="anomaly-value">${anomaly.time_delta_min ? anomaly.time_delta_min + ' min' : '—'}</span>
          </div>
        </div>
        <div class="anomaly-disclaimer">
          <strong>LUCIX does not automatically conclude spoofing.</strong>
        </div>
        <div class="anomaly-explanations">
          <div class="anomaly-expl-title">Possible explanations:</div>
          <ul>
            ${(anomaly.possible_explanations || anomaly.explanation ? [(anomaly.explanation || '')].concat(anomaly.possible_explanations || []) : []).filter(Boolean).map(e => `<li>${e}</li>`).join('')}
          </ul>
        </div>
      </div>`;
  }

  return { analyzeIP, detectGeoJumps, checkASNConsistency, renderAnomalyWarning };

})();

window.SpoofingDetector = SpoofingDetector;
