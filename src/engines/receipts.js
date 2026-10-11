// Locally reproducible receipt payload + a SHA-256 byte-integrity checksum.
// This checksum authenticates neither historical claims nor the experiment author.
export const RECEIPT_SCHEMA = 'phiskrit.experiment.receipt.v1';
const ENGINE_BOUNDARIES = Object.freeze({
  grammar: 'Modern demonstration of three Sanskrit vowel-combination cases; not the complete Astadhyayi.',
  prosody: 'Modern L/G indexing and synthesized rhythm; not a reconstruction of historical performance.',
  astronomy: 'Reproducible arithmetic and simplified rotational visualization; not an astronomical ephemeris.'
});

export function createReceiptPayload({ engine, inputs, outputs, trace = [], createdAt } = {}) {
  if (!Object.hasOwn(ENGINE_BOUNDARIES, engine)) {
    throw new RangeError('Unknown PhiSkrit engine.');
  }
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs) ||
      !outputs || typeof outputs !== 'object' || Array.isArray(outputs) ||
      !Array.isArray(trace)) {
    throw new TypeError('Receipt requires object inputs/outputs and an array trace.');
  }
  if (typeof createdAt !== 'string' || Number.isNaN(Date.parse(createdAt))) {
    throw new TypeError('createdAt must be an ISO date string.');
  }
  // Serialize to JSON data only, never saving React state objects or functions.
  const clone = value => {
    const json = JSON.stringify(value);
    if (json === undefined) throw new TypeError('Unserializable receipt data.');
    return JSON.parse(json);
  };
  return {
    schema: RECEIPT_SCHEMA,
    generator: 'PhiSkrit v0.2.0',
    createdAt,
    engine,
    provenance: {
      computation: 'SIMULATED',
      historicalInterpretation: 'INFERRED',
      scope: ENGINE_BOUNDARIES[engine]
    },
    inputs: clone(inputs),
    outputs: clone(outputs),
    trace: clone(trace)
  };
}

async function sha256(payload) {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto unavailable. Open PhiSkrit over HTTPS.');
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), v => v.toString(16).padStart(2, '0')).join('');
}

export async function createExperimentReceipt({ createdAt = new Date().toISOString(), ...args } = {}) {
  const payload = createReceiptPayload({ ...args, createdAt });
  return { ...payload, integrity: { algorithm: 'SHA-256', encoding: 'UTF-8 JSON.stringify(payload)', digest: await sha256(payload) } };
}

export async function verifyExperimentReceipt(receipt) {
  if (!receipt || receipt.schema !== RECEIPT_SCHEMA ||
      receipt.integrity?.algorithm !== 'SHA-256' ||
      !/^[a-f0-9]{64}$/.test(receipt.integrity?.digest ?? '')) return false;
  try {
    const { integrity: _unused, ...payload } = receipt;
    if (!Object.hasOwn(ENGINE_BOUNDARIES, payload.engine) ||
        payload.provenance?.scope !== ENGINE_BOUNDARIES[payload.engine]) return false;
    return (await sha256(payload)) === receipt.integrity.digest;
  } catch {
    return false;
  }
}
