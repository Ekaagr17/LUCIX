// LUCIX Geo Provider Abstraction & Consensus Engine
// Simulates querying multiple geolocation providers and calculating agreement.

const GeoProvider = (() => {

  // ---------------------------------------------------------------------------
  // Haversine distance between two lat/lng points (km)
  // ---------------------------------------------------------------------------
  function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ---------------------------------------------------------------------------
  // Query simulated providers for an IP
  // Returns the provider results from demo data
  // ---------------------------------------------------------------------------
  function queryProviders(ip, eventId) {
    const ipData = window.LUCIX_DATA.IP_GEO_DATA[ip];
    if (!ipData) return [];

    // For E008, 185.220.101.34 re-observed at a different exit node
    if (eventId === 'E008' && ip === '185.220.101.34' && ipData.providers_e008) {
      return ipData.providers_e008;
    }
    return ipData.providers;
  }

  // ---------------------------------------------------------------------------
  // Normalize provider results to common schema
  // ---------------------------------------------------------------------------
  function normalize(providerResult) {
    return {
      provider:      providerResult.provider,
      provider_desc: providerResult.provider_desc,
      lat:           providerResult.lat,
      lng:           providerResult.lng,
      country:       providerResult.country,
      country_code:  providerResult.country_code,
      region:        providerResult.region,
      city:          providerResult.city,
      asn:           providerResult.asn,
      org:           providerResult.org,
      network_type:  providerResult.network_type,
      timezone:      providerResult.timezone,
      accuracy_km:   providerResult.accuracy_km,
      timestamp:     providerResult.timestamp
    };
  }

  // ---------------------------------------------------------------------------
  // Consensus calculation
  // Groups providers by city and country agreement
  // ---------------------------------------------------------------------------
  function calculateConsensus(providerResults) {
    if (!providerResults || providerResults.length === 0) {
      return { level: 'UNKNOWN', count: 0, total: 0, agreed_city: null, agreed_country: null, centroid: null };
    }

    const total = providerResults.length;

    // Count city agreements
    const cityCounts = {};
    const countryCounts = {};
    for (const r of providerResults) {
      const cityKey = `${r.city}, ${r.country}`;
      cityCounts[cityKey] = (cityCounts[cityKey] || 0) + 1;
      countryCounts[r.country] = (countryCounts[r.country] || 0) + 1;
    }

    // Find majority city
    let bestCity = null, bestCityCount = 0;
    for (const [city, count] of Object.entries(cityCounts)) {
      if (count > bestCityCount) { bestCityCount = count; bestCity = city; }
    }

    // Find majority country
    let bestCountry = null, bestCountryCount = 0;
    for (const [country, count] of Object.entries(countryCounts)) {
      if (count > bestCountryCount) { bestCountryCount = count; bestCountry = country; }
    }

    // Calculate geographic spread
    const lats = providerResults.map(r => r.lat);
    const lngs = providerResults.map(r => r.lng);
    const centroid = {
      lat: lats.reduce((a, b) => a + b, 0) / lats.length,
      lng: lngs.reduce((a, b) => a + b, 0) / lngs.length
    };

    // Max spread from centroid
    const maxSpreadKm = Math.max(...providerResults.map(r =>
      haversineKm(centroid.lat, centroid.lng, r.lat, r.lng)
    ));

    // Consensus level
    let level;
    if (bestCityCount === total) {
      level = 'HIGH';       // All providers agree on city
    } else if (bestCityCount >= Math.ceil(total / 2) + (total % 2 === 0 ? 1 : 0)) {
      level = 'MEDIUM';     // Majority agree
    } else if (bestCountryCount === total) {
      level = 'LOW';        // Only country-level agreement
    } else {
      level = 'NONE';       // No agreement
    }

    // Split city key back
    const [agreedCityName, agreedCountryName] = bestCity ? bestCity.split(', ') : [null, null];

    // Agreements per provider
    const providerAgreements = providerResults.map(r => ({
      provider: r.provider,
      city: `${r.city}, ${r.country}`,
      agrees_with_majority: `${r.city}, ${r.country}` === bestCity
    }));

    return {
      level,
      count: bestCityCount,
      total,
      agreed_city: agreedCityName,
      agreed_country: agreedCountryName,
      best_city_key: bestCity,
      country_consensus_count: bestCountryCount,
      centroid,
      max_spread_km: Math.round(maxSpreadKm),
      provider_agreements: providerAgreements,
      disagreements: providerResults.filter(r => `${r.city}, ${r.country}` !== bestCity)
    };
  }

  // ---------------------------------------------------------------------------
  // Evidence score — combines consensus, network type, ASN consistency
  // ---------------------------------------------------------------------------
  function computeEvidenceScore(consensus, classification, ipData) {
    const scores = [];
    const factors = [];

    // 1. Provider consensus
    const consensusScores = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'NONE': 0, 'UNKNOWN': 0 };
    scores.push(consensusScores[consensus.level] || 0);
    factors.push({ name: 'Provider consensus', value: consensus.level, weight: 3 });

    // 2. Network type (Tor/VPN structurally prevent physical attribution)
    const networkScore = { 'RESIDENTIAL': 2, 'CLOUD_HOSTING': 1, 'CDN': 1, 'VPN': 0, 'TOR_EXIT': 0, 'PROXY': 0, 'UNKNOWN': 0 };
    scores.push(networkScore[classification.type] ?? 0);
    factors.push({ name: 'Network type', value: classification.label, weight: 2 });

    // 3. ASN consistency across providers
    const allProviders = ipData.providers;
    const asns = [...new Set(allProviders.map(p => p.asn))];
    const asnConsistent = asns.length === 1;
    scores.push(asnConsistent ? 2 : 0);
    factors.push({ name: 'ASN consistency', value: asnConsistent ? `Consistent (${asns[0]})` : `Inconsistent: ${asns.join(', ')}`, weight: 2 });

    // 4. Reverse DNS consistency
    const hasDns = !!ipData.reverse_dns;
    scores.push(hasDns ? 1 : 0);
    factors.push({ name: 'Reverse DNS', value: ipData.reverse_dns || 'No PTR record', weight: 1 });

    // 5. Historical consistency (no geo anomalies)
    const hasAnomalies = ipData.geo_anomalies && ipData.geo_anomalies.length > 0;
    scores.push(hasAnomalies ? -1 : 1);
    factors.push({ name: 'Geographic stability', value: hasAnomalies ? `${ipData.geo_anomalies.length} anomaly detected` : 'Stable', weight: 1 });

    const total = scores.reduce((a, b) => a + b, 0);
    const maxPossible = 3 + 2 + 2 + 1 + 1;  // 9

    let level;
    if (total >= 7) level = 'HIGH';
    else if (total >= 4) level = 'MEDIUM';
    else if (total >= 1) level = 'LOW';
    else level = 'UNKNOWN';

    // Hard caps for anonymization infrastructure
    if (['TOR_EXIT', 'VPN', 'PROXY'].includes(classification.type)) level = 'LOW';

    return { level, score: total, max: maxPossible, factors };
  }

  // ---------------------------------------------------------------------------
  // Full geolocation analysis for an IP
  // ---------------------------------------------------------------------------
  function analyzeIP(ip, eventId) {
    const ipData = window.LUCIX_DATA.IP_GEO_DATA[ip];
    if (!ipData) return null;

    const providers = queryProviders(ip, eventId).map(normalize);
    const consensus = calculateConsensus(providers);
    const classification = NetworkClassifier.classify(ipData);
    const evidenceScore = computeEvidenceScore(consensus, classification, ipData);

    // Apply network-type cap to overall confidence
    const cappedLevel = NetworkClassifier.capConfidenceForNetworkType(evidenceScore.level, classification.type);

    // Get best location estimate (centroid or majority)
    const bestLocation = consensus.centroid || (providers[0] ? { lat: providers[0].lat, lng: providers[0].lng } : null);
    const displayCity = consensus.agreed_city || (providers[0] ? providers[0].city : 'Unknown');
    const displayCountry = consensus.agreed_country || (providers[0] ? providers[0].country : 'Unknown');

    // Physical origin statement
    const physicalOrigin = getPhysicalOriginStatement(classification.type);

    return {
      ip,
      providers,
      consensus,
      classification,
      evidenceScore: { ...evidenceScore, level: cappedLevel },
      bestLocation,
      displayCity,
      displayCountry,
      physicalOrigin,
      history: ipData.history,
      geo_anomalies: ipData.geo_anomalies,
      reverse_dns: ipData.reverse_dns,
      supportingEvents: getSupportingEvents(ip)
    };
  }

  function getPhysicalOriginStatement(networkType) {
    const statements = {
      'TOR_EXIT': { status: 'UNKNOWN', reason: 'Traffic observed at a Tor exit node. The Tor network anonymizes the origin. Physical operator location cannot be determined from this evidence.' },
      'VPN': { status: 'UNKNOWN', reason: 'This is a VPN endpoint. The physical user connecting through this VPN is located elsewhere. Origin is unknown.' },
      'PROXY': { status: 'UNKNOWN', reason: 'Proxy infrastructure masks the originating connection. Physical origin is unknown.' },
      'CLOUD_HOSTING': { status: 'UNKNOWN', reason: 'Cloud hosting infrastructure. An operator may control this server from any location in the world. The data center location does not identify the operator.' },
      'CDN': { status: 'UNKNOWN', reason: 'CDN edge node. Does not identify origin of traffic.' },
      'RESIDENTIAL': { status: 'ESTIMATED', reason: 'Residential ISP range. May approximate geographic service area. Exact address unknown and not established.' },
      'CORPORATE_NAT': { status: 'UNKNOWN', reason: 'Corporate NAT — shared IP for multiple users. Individual cannot be identified.' },
      'UNKNOWN': { status: 'UNKNOWN', reason: 'Network type could not be determined. Physical origin is unknown.' }
    };
    return statements[networkType] || statements['UNKNOWN'];
  }

  function getSupportingEvents(ip) {
    const events = window.LUCIX_DATA.DEMO_EVENTS;
    return events
      .filter(e => e.source_ip === ip || e.dest_ip === ip)
      .map(e => e.id);
  }

  function confidenceBadgeHtml(level) {
    const map = {
      'HIGH':    'conf-high',
      'MEDIUM':  'conf-medium',
      'LOW':     'conf-low',
      'UNKNOWN': 'conf-unknown',
      'NONE':    'conf-unknown'
    };
    return `<span class="conf-badge ${map[level] || 'conf-unknown'}">${level}</span>`;
  }

  return { analyzeIP, queryProviders, calculateConsensus, computeEvidenceScore, confidenceBadgeHtml, haversineKm };

})();

window.GeoProvider = GeoProvider;
