// LUCIX Network Classification Module
// Classifies IP addresses into network infrastructure types.
// Used to set attribution confidence and display appropriate disclaimers.

const NetworkClassifier = (() => {

  // Known ASN → classification mapping (synthetic examples)
  const ASN_CLASSIFICATIONS = {
    'AS196844': { type: 'TOR_EXIT', label: 'Tor Relay', confidence: 'HIGH', provider: 'Tor Project' },
    'AS63949':  { type: 'CLOUD_HOSTING', label: 'Linode / Akamai Cloud', confidence: 'HIGH', provider: 'Linode LLC' },
    'AS22611':  { type: 'CLOUD_HOSTING', label: 'Namecheap Hosting', confidence: 'HIGH', provider: 'Namecheap Inc' },
    'AS16509':  { type: 'CLOUD_HOSTING', label: 'Amazon Web Services', confidence: 'HIGH', provider: 'Amazon.com Inc' },
    'AS15169':  { type: 'CLOUD_HOSTING', label: 'Google Cloud', confidence: 'HIGH', provider: 'Google LLC' },
    'AS8075':   { type: 'CLOUD_HOSTING', label: 'Microsoft Azure', confidence: 'HIGH', provider: 'Microsoft Corp' },
    'AS13335':  { type: 'CDN', label: 'Cloudflare CDN', confidence: 'HIGH', provider: 'Cloudflare Inc' },
    'AS20940':  { type: 'CDN', label: 'Akamai CDN', confidence: 'HIGH', provider: 'Akamai Technologies' },
    'AS9009':   { type: 'VPN', label: 'M247 VPN Hosting', confidence: 'MEDIUM', provider: 'M247 Europe SRL' },
    'AS60068':  { type: 'PROXY', label: 'Datacamp Proxy', confidence: 'MEDIUM', provider: 'Datacamp Limited' }
  };

  // Organization name keyword indicators
  const ORG_KEYWORDS = {
    TOR_EXIT:      ['tor', 'tor exit', 'tor relay', 'poverty-free-internet', 'anonymizing relay'],
    VPN:           ['vpn', 'virtual private', 'nordvpn', 'expressvpn', 'mullvad', 'protonvpn', 'privatevpn', 'cyberghost'],
    CLOUD_HOSTING: ['linode', 'digitalocean', 'vultr', 'hetzner', 'ovh', 'scaleway', 'namecheap', 'hostinger', 'amazon', 'google cloud', 'azure', 'aws'],
    CDN:           ['cloudflare', 'akamai', 'fastly', 'amazon cloudfront', 'cdn'],
    PROXY:         ['proxy', 'datacamp', 'maxihost', 'packethub'],
    RESIDENTIAL:   ['comcast', 'at&t', 'verizon', 'deutsche telekom', 'bt group', 'virgin media']
  };

  // Reverse DNS pattern indicators
  const RDNS_PATTERNS = {
    TOR_EXIT:      [/tor[-.]?exit/, /\.torproject\.org$/, /tor-relay/, /exit[-.]?node/i],
    VPN:           [/vpn/, /nordvpn/, /expressvpn/, /mullvad/i],
    CLOUD_HOSTING: [/linode\.com/, /digitalocean/, /compute\.amazonaws/, /\.googleusercontent\./,
                    /namecheap-hosting/, /hetzner\./, /members\.linode/],
    CDN:           [/cloudflare/, /akamai/, /fastly\.net/]
  };

  function classifyByASN(asn) {
    return ASN_CLASSIFICATIONS[asn] || null;
  }

  function classifyByOrg(org) {
    if (!org) return null;
    const lower = org.toLowerCase();
    for (const [type, keywords] of Object.entries(ORG_KEYWORDS)) {
      if (keywords.some(kw => lower.includes(kw))) {
        return { type, confidence: 'MEDIUM' };
      }
    }
    return null;
  }

  function classifyByRDNS(rdns) {
    if (!rdns) return null;
    for (const [type, patterns] of Object.entries(RDNS_PATTERNS)) {
      if (patterns.some(p => p.test(rdns))) {
        return { type, confidence: 'MEDIUM' };
      }
    }
    return null;
  }

  // Main classification function
  // Returns the best available classification with confidence
  function classify(ipData) {
    const primaryProvider = ipData.providers[0];
    const asn = primaryProvider.asn;
    const org = primaryProvider.org;
    const rdns = ipData.reverse_dns;
    const providerType = primaryProvider.network_type;

    // Priority: ASN > Provider-declared type > Org keyword > RDNS
    const asnResult = classifyByASN(asn);
    const orgResult = classifyByOrg(org);
    const rdnsResult = classifyByRDNS(rdns);

    let type = providerType || 'UNKNOWN';
    let confidence = 'LOW';
    let sources = [];

    if (asnResult) {
      type = asnResult.type;
      confidence = asnResult.confidence;
      sources.push(`ASN ${asn} → ${asnResult.label}`);
    }

    // Check org agreement
    if (orgResult && orgResult.type === type) {
      confidence = confidence === 'HIGH' ? 'HIGH' : 'MEDIUM';
      sources.push(`Organization name: "${org}"`);
    } else if (orgResult) {
      sources.push(`Organization name suggests: ${orgResult.type}`);
    }

    // Check RDNS agreement
    if (rdnsResult && rdnsResult.type === type) {
      sources.push(`Reverse DNS: ${rdns}`);
    } else if (rdnsResult) {
      sources.push(`RDNS pattern: ${rdns}`);
    }

    if (sources.length === 0 && providerType) {
      sources.push(`Provider-declared network type: ${providerType}`);
      confidence = 'LOW';
    }

    return {
      type,
      confidence,
      sources,
      asn,
      org,
      rdns,
      label: getTypeLabel(type),
      disclaimer: getDisclaimer(type)
    };
  }

  function getTypeLabel(type) {
    const labels = {
      'TOR_EXIT':      'Tor Exit Node',
      'VPN':           'VPN Endpoint',
      'CLOUD_HOSTING': 'Cloud Hosting',
      'CDN':           'CDN Infrastructure',
      'PROXY':         'Proxy / Relay',
      'RESIDENTIAL':   'Residential ISP',
      'CORPORATE_NAT': 'Corporate NAT',
      'CARRIER_NAT':   'Carrier-Grade NAT',
      'UNKNOWN':       'Unknown'
    };
    return labels[type] || type;
  }

  function getDisclaimer(type) {
    const disclaimers = {
      'TOR_EXIT': [
        'This IP address is an observed Tor exit node.',
        'The actual originating user routes traffic through the Tor anonymization network.',
        'This location identifies the exit infrastructure only.',
        'The physical location of the operator cannot be determined from this evidence.'
      ],
      'VPN': [
        'This IP address is a VPN endpoint.',
        'The map location indicates the VPN server, not the connecting user.',
        'The origin location of the user is unknown.',
        'VPN services are commonly used for both legitimate privacy and malicious evasion.'
      ],
      'CLOUD_HOSTING': [
        'This IP address belongs to cloud hosting infrastructure.',
        'The geographic location refers to a data center, not a physical person.',
        'An attacker may control this server from any location in the world.',
        'The physical location of the operator cannot be established from this evidence alone.'
      ],
      'CDN': [
        'This IP belongs to a Content Delivery Network.',
        'CDN edge nodes may be located far from the origin server.',
        'This location does not reliably identify the origin of malicious traffic.'
      ],
      'PROXY': [
        'This IP is a known proxy or relay service.',
        'The actual origin of traffic using this proxy is unknown.',
        'The physical location of the operator cannot be established from this evidence.'
      ],
      'RESIDENTIAL': [
        'This IP appears to belong to a residential ISP.',
        'The geolocation approximates the ISP service area, not an exact address.',
        'This may represent a compromised end-user device acting as a hop.'
      ],
      'CORPORATE_NAT': [
        'This IP belongs to a corporate NAT address.',
        'Many users may share this external IP address.',
        'The internal user cannot be identified from this IP alone.'
      ],
      'UNKNOWN': [
        'Network type could not be determined.',
        'Attribution confidence is limited.'
      ]
    };
    return disclaimers[type] || disclaimers['UNKNOWN'];
  }

  // Confidence cap — some network types fundamentally limit attribution
  function capConfidenceForNetworkType(confidence, networkType) {
    // Tor, VPN, Proxy — physical location is structurally unknowable
    if (['TOR_EXIT', 'VPN', 'PROXY'].includes(networkType)) return 'LOW';
    // Cloud/CDN — location refers to data center, not person
    if (['CLOUD_HOSTING', 'CDN'].includes(networkType)) return confidence === 'HIGH' ? 'MEDIUM' : confidence;
    return confidence;
  }

  function getBadgeHtml(type) {
    const cls = {
      'TOR_EXIT':      'type-tor',
      'VPN':           'type-vpn',
      'CLOUD_HOSTING': 'type-cloud',
      'CDN':           'type-cdn',
      'PROXY':         'type-proxy',
      'RESIDENTIAL':   'type-residential',
      'UNKNOWN':       'type-unknown'
    }[type] || 'type-unknown';
    return `<span class="net-type-badge ${cls}">${getTypeLabel(type)}</span>`;
  }

  return { classify, getTypeLabel, getDisclaimer, capConfidenceForNetworkType, getBadgeHtml };

})();

window.NetworkClassifier = NetworkClassifier;
