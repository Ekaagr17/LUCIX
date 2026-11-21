// LUCIX Evidence Integrity Module
// Implements cryptographic hash chaining for tamper detection.
// Uses the Web Crypto API (SHA-256) — built into all modern browsers.

const EvidenceIntegrity = (() => {

  // ---------------------------------------------------------------------------
  // SHA-256 via Web Crypto API
  // ---------------------------------------------------------------------------

  async function sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Deterministic serialization of an event for hashing
  // We strip the integrity fields themselves to avoid circular dependency
  function serializeForHash(event) {
    const { event_hash, previous_event_hash, chain_index, integrity_status, ...core } = event;
    return JSON.stringify(core, Object.keys(core).sort());
  }

  // ---------------------------------------------------------------------------
  // Build the integrity chain
  // ---------------------------------------------------------------------------

  async function buildIntegrityChain(events) {
    // Sort by timestamp to ensure deterministic chain order
    const sorted = [...events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < sorted.length; i++) {
      const event = sorted[i];
      const rawHash = await sha256(serializeForHash(event));

      // Chain: hash = SHA256(previous_hash + raw_event_hash)
      const chainedHash = await sha256(previousHash + rawHash);

      event.raw_event_hash = rawHash;
      event.event_hash = chainedHash;
      event.previous_event_hash = previousHash;
      event.chain_index = i;
      event.ingestion_timestamp = event.ingestion_timestamp || new Date().toISOString();

      previousHash = chainedHash;
    }

    return sorted;
  }

  // ---------------------------------------------------------------------------
  // Verify the chain (detect tampering)
  // ---------------------------------------------------------------------------

  async function verifyChain(events) {
    const sorted = [...events].sort((a, b) => a.chain_index - b.chain_index);
    const results = [];
    let expectedPrev = '0000000000000000000000000000000000000000000000000000000000000000';

    for (const event of sorted) {
      const recomputedRaw = await sha256(serializeForHash(event));
      const recomputedChained = await sha256(expectedPrev + recomputedRaw);

      const rawMatch = recomputedRaw === event.raw_event_hash;
      const chainMatch = recomputedChained === event.event_hash;
      const prevMatch = event.previous_event_hash === expectedPrev;

      let status;
      if (rawMatch && chainMatch && prevMatch) {
        status = 'VERIFIED';
      } else if (rawMatch && !prevMatch) {
        status = 'CHAIN_BROKEN'; // Data unchanged but chain is broken (reorder/insert attack)
      } else {
        status = 'TAMPER_SUSPECTED';
      }

      event.integrity_status = status;
      results.push({ id: event.id, status, rawMatch, chainMatch, prevMatch });
      expectedPrev = event.event_hash;
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Source Trust Assessment
  // ---------------------------------------------------------------------------

  function assessSourceTrust(event) {
    // If explicitly set in demo data, respect it
    if (event.source_trust) return event.source_trust;

    // Heuristic assignment based on collector and signature
    if (event.has_signature && event.signature_cert) return 'TRUSTED';
    if (event.has_signature) return 'PARTIALLY_VERIFIED';
    return 'UNVERIFIED';
  }

  // ---------------------------------------------------------------------------
  // Display helpers
  // ---------------------------------------------------------------------------

  function trustBadgeHtml(trust) {
    const map = {
      'TRUSTED': { cls: 'badge-verified', icon: '✓', label: 'TRUSTED' },
      'PARTIALLY_VERIFIED': { cls: 'badge-partial', icon: '~', label: 'PARTIAL' },
      'UNVERIFIED': { cls: 'badge-unverified', icon: '?', label: 'UNVERIFIED' },
      'TAMPER_SUSPECTED': { cls: 'badge-tamper', icon: '!', label: 'TAMPER SUSPECTED' }
    };
    const m = map[trust] || map['UNVERIFIED'];
    return `<span class="integrity-badge ${m.cls}">${m.icon} ${m.label}</span>`;
  }

  function integrityBadgeHtml(status) {
    const map = {
      'VERIFIED': { cls: 'badge-verified', icon: '✓', label: 'VERIFIED' },
      'CHAIN_BROKEN': { cls: 'badge-tamper', icon: '⚠', label: 'CHAIN BROKEN' },
      'TAMPER_SUSPECTED': { cls: 'badge-tamper', icon: '✗', label: 'TAMPER SUSPECTED' }
    };
    const m = map[status] || { cls: 'badge-unverified', icon: '?', label: 'UNKNOWN' };
    return `<span class="integrity-badge ${m.cls}">${m.icon} ${m.label}</span>`;
  }

  // Format a hash for display (show first 16 + last 8 chars)
  function formatHash(hash) {
    if (!hash || hash.length < 24) return hash || '—';
    return `<span class="hash-display" title="${hash}">${hash.substring(0, 16)}…${hash.substring(hash.length - 8)}</span>`;
  }

  return { buildIntegrityChain, verifyChain, assessSourceTrust, trustBadgeHtml, integrityBadgeHtml, formatHash, sha256 };

})();

window.EvidenceIntegrity = EvidenceIntegrity;
