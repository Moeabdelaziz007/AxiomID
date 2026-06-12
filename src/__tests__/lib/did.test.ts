import { createAxiomDid } from '@/lib/did';

describe('createAxiomDid', () => {
  // -------------------------------------------------------------------
  // Basic output shape
  // -------------------------------------------------------------------
  it('returns a string starting with "did:axiom:axiomid.app:"', () => {
    const result = createAxiomDid('pi:abc123');
    expect(result).toMatch(/^did:axiom:axiomid\.app:/);
  });

  // -------------------------------------------------------------------
  // pi: prefix handling
  // -------------------------------------------------------------------
  it('converts "pi:" prefix to "pi-"', () => {
    expect(createAxiomDid('pi:user123')).toBe('did:axiom:axiomid.app:pi-user123');
  });

  it('converts uppercase "pi:USER" correctly (lowercased, prefix swapped)', () => {
    expect(createAxiomDid('pi:USER')).toBe('did:axiom:axiomid.app:pi-user');
  });

  // -------------------------------------------------------------------
  // demo: prefix handling
  // -------------------------------------------------------------------
  it('converts "demo:" prefix to "demo-"', () => {
    expect(createAxiomDid('demo:wallet456')).toBe('did:axiom:axiomid.app:demo-wallet456');
  });

  // -------------------------------------------------------------------
  // Normalisation: lowercase
  // -------------------------------------------------------------------
  it('lowercases the entire subject', () => {
    expect(createAxiomDid('HELLO')).toBe('did:axiom:axiomid.app:hello');
  });

  // -------------------------------------------------------------------
  // Normalisation: trim whitespace
  // -------------------------------------------------------------------
  it('trims leading and trailing whitespace', () => {
    expect(createAxiomDid('  spaced  ')).toBe('did:axiom:axiomid.app:spaced');
  });

  it('trims and then lowercases', () => {
    expect(createAxiomDid('  ABC  ')).toBe('did:axiom:axiomid.app:abc');
  });

  // -------------------------------------------------------------------
  // Normalisation: special characters replaced with "-"
  // -------------------------------------------------------------------
  it('replaces spaces inside the subject with "-"', () => {
    expect(createAxiomDid('hello world')).toBe('did:axiom:axiomid.app:hello-world');
  });

  it('replaces consecutive special characters with a single "-"', () => {
    expect(createAxiomDid('a@@b')).toBe('did:axiom:axiomid.app:a-b');
  });

  it('preserves allowed characters: letters, digits, ".", "_", "-"', () => {
    expect(createAxiomDid('abc.def_ghi-123')).toBe('did:axiom:axiomid.app:abc.def_ghi-123');
  });

  it('strips leading "-" from segment', () => {
    expect(createAxiomDid('!leading')).toBe('did:axiom:axiomid.app:leading');
  });

  it('strips trailing "-" from segment', () => {
    expect(createAxiomDid('trailing!')).toBe('did:axiom:axiomid.app:trailing');
  });

  it('strips both leading and trailing "-"', () => {
    expect(createAxiomDid('!both!')).toBe('did:axiom:axiomid.app:both');
  });

  // -------------------------------------------------------------------
  // Empty / all-invalid subject fallback
  // -------------------------------------------------------------------
  it('returns "did:axiom:axiomid.app:user" when subject is empty string', () => {
    expect(createAxiomDid('')).toBe('did:axiom:axiomid.app:user');
  });

  it('returns "did:axiom:axiomid.app:user" when subject consists only of spaces', () => {
    expect(createAxiomDid('   ')).toBe('did:axiom:axiomid.app:user');
  });

  it('returns "did:axiom:axiomid.app:user" when subject consists only of special characters', () => {
    expect(createAxiomDid('!!!')).toBe('did:axiom:axiomid.app:user');
  });

  // -------------------------------------------------------------------
  // Maximum length enforcement (96 characters)
  // -------------------------------------------------------------------
  it('truncates the segment to 96 characters', () => {
    const long = 'a'.repeat(200);
    const result = createAxiomDid(long);
    const segment = result.replace('did:axiom:axiomid.app:', '');
    expect(segment.length).toBe(96);
  });

  it('does not truncate a subject that is exactly 96 characters long', () => {
    const exact96 = 'a'.repeat(96);
    const result = createAxiomDid(exact96);
    const segment = result.replace('did:axiom:axiomid.app:', '');
    expect(segment.length).toBe(96);
    expect(segment).toBe(exact96);
  });

  it('does not truncate a subject shorter than 96 characters', () => {
    const short = 'abc';
    const result = createAxiomDid(short);
    const segment = result.replace('did:axiom:axiomid.app:', '');
    expect(segment).toBe('abc');
  });

  // -------------------------------------------------------------------
  // Real-world wallet address inputs
  // -------------------------------------------------------------------
  it('handles a pi:uid style address used in the application', () => {
    const result = createAxiomDid('pi:abc-def-123');
    expect(result).toBe('did:axiom:axiomid.app:pi-abc-def-123');
  });

  it('handles a demo wallet address', () => {
    const result = createAxiomDid('demo:abc12345');
    expect(result).toBe('did:axiom:axiomid.app:demo-abc12345');
  });

  it('produces consistent output for the same input (pure function)', () => {
    const input = 'pi:testuser';
    expect(createAxiomDid(input)).toBe(createAxiomDid(input));
  });

  // -------------------------------------------------------------------
  // Edge: subject is only "pi:" (empty uid)
  // -------------------------------------------------------------------
  it('returns "did:axiom:axiomid.app:pi" when subject is "pi:" with empty uid', () => {
    // After replacement: "pi:" → "pi-" → strip trailing dash → "pi"
    expect(createAxiomDid('pi:')).toBe('did:axiom:axiomid.app:pi');
  });

  // -------------------------------------------------------------------
  // Unicode characters (all become "-")
  // -------------------------------------------------------------------
  it('replaces unicode characters with "-"', () => {
    const result = createAxiomDid('café');
    expect(result).toBe('did:axiom:axiomid.app:caf');
  });
});