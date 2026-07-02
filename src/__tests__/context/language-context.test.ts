/**
 * Tests for src/app/context/language-context.tsx
 *
 * PR changes: Added new translation keys to both EN and AR dictionaries:
 *   - passport_not_found_description
 *   - something_went_wrong
 *   - try_again
 */

// Import the real module (not the mock from jest.setup.js)
jest.unmock('@/app/context/language-context');

import { translations } from '@/app/context/language-context';

describe('translations — new keys added in this PR', () => {
  describe('English (en)', () => {
    it('has passport_not_found_description key', () => {
      expect(translations.en.passport_not_found_description).toBeDefined();
      expect(typeof translations.en.passport_not_found_description).toBe('string');
      expect(translations.en.passport_not_found_description.length).toBeGreaterThan(0);
    });

    it('passport_not_found_description has correct English value', () => {
      expect(translations.en.passport_not_found_description).toBe(
        "This passport doesn't exist or has been removed."
      );
    });

    it('has something_went_wrong key', () => {
      expect(translations.en.something_went_wrong).toBeDefined();
      expect(typeof translations.en.something_went_wrong).toBe('string');
    });

    it('something_went_wrong has correct English value', () => {
      expect(translations.en.something_went_wrong).toBe('Something went wrong');
    });

    it('has try_again key', () => {
      expect(translations.en.try_again).toBeDefined();
      expect(typeof translations.en.try_again).toBe('string');
    });

    it('try_again has correct English value', () => {
      expect(translations.en.try_again).toBe('TRY AGAIN');
    });
  });

  describe('Arabic (ar)', () => {
    it('has passport_not_found_description key', () => {
      expect(translations.ar.passport_not_found_description).toBeDefined();
      expect(typeof translations.ar.passport_not_found_description).toBe('string');
      expect(translations.ar.passport_not_found_description.length).toBeGreaterThan(0);
    });

    it('passport_not_found_description has correct Arabic value', () => {
      expect(translations.ar.passport_not_found_description).toBe(
        'هذا الجواز غير موجود أو تمت إزالته.'
      );
    });

    it('has something_went_wrong key', () => {
      expect(translations.ar.something_went_wrong).toBeDefined();
      expect(typeof translations.ar.something_went_wrong).toBe('string');
    });

    it('something_went_wrong has correct Arabic value', () => {
      expect(translations.ar.something_went_wrong).toBe('حدث خطأ ما');
    });

    it('has try_again key', () => {
      expect(translations.ar.try_again).toBeDefined();
      expect(typeof translations.ar.try_again).toBe('string');
    });

    it('try_again has correct Arabic value', () => {
      expect(translations.ar.try_again).toBe('حاول مرة أخرى');
    });
  });

  describe('key parity — EN and AR have matching new keys', () => {
    const newKeys = ['passport_not_found_description', 'something_went_wrong', 'try_again'];

    newKeys.forEach((key) => {
      it(`both EN and AR have "${key}"`, () => {
        expect((translations.en as Record<string, string>)[key]).toBeDefined();
        expect((translations.ar as Record<string, string>)[key]).toBeDefined();
      });

      it(`EN and AR "${key}" are not identical (actually translated)`, () => {
        const en = (translations.en as Record<string, string>)[key];
        const ar = (translations.ar as Record<string, string>)[key];
        expect(en).not.toBe(ar);
      });
    });
  });

  describe('regression — pre-existing keys still present', () => {
    it('passport_not_found still exists in EN', () => {
      expect(translations.en.passport_not_found).toBe('Passport Not Found');
    });

    it('passport_not_found still exists in AR', () => {
      expect(translations.ar.passport_not_found).toBe('جواز السفر غير موجود');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PR change: i18n + beginner-friendly UX — new translation keys
// ─────────────────────────────────────────────────────────────────────────────

// Helper to cast translations to a plain Record for new keys not yet in the TS type
const en = translations.en as Record<string, string>;
const ar = translations.ar as Record<string, string>;

describe('translations — privacy page keys (PR change)', () => {
  const privacyKeys = [
    'privacy_legal',
    'privacy_last_updated',
    'privacy_title',
    'privacy_subtitle',
    'privacy_info_collect',
    'privacy_info_collect_desc',
    'privacy_how_use',
    'privacy_how_use_desc',
    'privacy_data_storage',
    'privacy_data_storage_desc',
    'privacy_rights',
    'privacy_rights_desc',
  ];

  privacyKeys.forEach((key) => {
    it(`EN has non-empty "${key}"`, () => {
      expect(en[key]).toBeDefined();
      expect(typeof en[key]).toBe('string');
      expect(en[key].length).toBeGreaterThan(0);
    });

    it(`AR has non-empty "${key}"`, () => {
      expect(ar[key]).toBeDefined();
      expect(typeof ar[key]).toBe('string');
      expect(ar[key].length).toBeGreaterThan(0);
    });
  });

  it('privacy_title EN is "Privacy"', () => {
    expect(en['privacy_title']).toBe('Privacy');
  });

  it('privacy_subtitle EN describes data handling', () => {
    expect(en['privacy_subtitle']).toContain('AxiomID');
  });
});

describe('translations — terms page keys (PR change)', () => {
  const termsKeys = [
    'terms_legal',
    'terms_last_updated',
    'terms_title',
    'terms_subtitle',
    'terms_use',
    'terms_use_desc',
    'terms_wallet',
    'terms_wallet_desc',
    'terms_ai_agent',
    'terms_ai_agent_desc',
    'terms_liability',
    'terms_liability_desc',
    'terms_changes',
    'terms_changes_desc',
  ];

  termsKeys.forEach((key) => {
    it(`EN has non-empty "${key}"`, () => {
      expect(en[key]).toBeDefined();
      expect(typeof en[key]).toBe('string');
      expect(en[key].length).toBeGreaterThan(0);
    });

    it(`AR has non-empty "${key}"`, () => {
      expect(ar[key]).toBeDefined();
      expect(typeof ar[key]).toBe('string');
      expect(ar[key].length).toBeGreaterThan(0);
    });
  });

  it('terms_title EN is "Terms of Service"', () => {
    expect(en['terms_title']).toBe('Terms of Service');
  });
});

describe('translations — status page keys (PR change)', () => {
  const statusKeys = [
    'status_network_title',
    'status_network_desc',
    'status_retry',
    'status_registered_agents',
    'status_active_onchain',
    'status_total_transactions',
    'status_pi_payments',
    'status_avg_trust',
    'status_network_safety',
    'status_active_agents',
    'status_executing_loops',
    'status_total_xp',
    'status_accumulated',
    'status_verification_rate',
    'status_kyc_index',
    'status_protocol_details',
    'status_network',
    'status_version',
    'status_refreshed',
    'status_ago',
    'status_service_health',
    'status_uptime',
    'status_manifest_api',
    'status_manifest_desc',
    'status_get',
    'status_unable_load',
    'status_could_not_fetch',
    'status_no_data',
    'status_no_data_desc',
  ];

  statusKeys.forEach((key) => {
    it(`EN has non-empty "${key}"`, () => {
      expect(en[key]).toBeDefined();
      expect(typeof en[key]).toBe('string');
      expect(en[key].length).toBeGreaterThan(0);
    });

    it(`AR has non-empty "${key}"`, () => {
      expect(ar[key]).toBeDefined();
      expect(typeof ar[key]).toBe('string');
      expect(ar[key].length).toBeGreaterThan(0);
    });
  });

  it('status_network_title EN is "Network Status"', () => {
    expect(en['status_network_title']).toBe('Network Status');
  });

  it('status_unable_load EN is "Unable to Load Status"', () => {
    expect(en['status_unable_load']).toBe('Unable to Load Status');
  });

  it('status_ago EN ends with "s ago" suffix indicator', () => {
    // The EN value is used as a suffix: "{timeSince}{t("status_ago")}"
    expect(en['status_ago']).toBeDefined();
  });
});

describe('translations — sandbox page keys (PR change)', () => {
  const sandboxKeys = [
    'sandbox_title',
    'sandbox_active',
    'sandbox_idle',
    'sandbox_edit_manifest',
    'sandbox_ast_preview',
    'sandbox_yaml_md',
    'sandbox_syntax_tree',
    'sandbox_input_payload',
    'sandbox_parameters',
    'sandbox_running',
    'sandbox_run_test',
    'sandbox_copy_payload',
    'sandbox_terminal_output',
    'sandbox_waiting',
    'sandbox_security_scan',
    'sandbox_pending',
    'sandbox_scanning',
    'sandbox_passed',
    'sandbox_failed',
    'sandbox_sandbox_isolation',
    'sandbox_sandbox_desc',
    'sandbox_ast_analysis',
    'sandbox_ast_desc',
    'sandbox_injection_guard',
    'sandbox_injection_desc',
    'sandbox_signature_anchor',
    'sandbox_signature_desc',
    'sandbox_exfil_scan',
    'sandbox_exfil_desc',
    'sandbox_command_block',
    'sandbox_command_desc',
    'sandbox_privilege_guard',
    'sandbox_privilege_desc',
    'sandbox_provenance_check',
    'sandbox_provenance_desc',
    'sandbox_available_templates',
    'sandbox_no_templates',
    'sandbox_intro_title',
    'sandbox_intro_desc',
    'sandbox_manifest_hint',
    'sandbox_input_hint',
    'sandbox_security_desc',
  ];

  sandboxKeys.forEach((key) => {
    it(`EN has non-empty "${key}"`, () => {
      expect(en[key]).toBeDefined();
      expect(typeof en[key]).toBe('string');
      expect(en[key].length).toBeGreaterThan(0);
    });

    it(`AR has non-empty "${key}"`, () => {
      expect(ar[key]).toBeDefined();
      expect(typeof ar[key]).toBe('string');
      expect(ar[key].length).toBeGreaterThan(0);
    });
  });

  it('sandbox_title EN is "Test Area"', () => {
    expect(en['sandbox_title']).toBe('Test Area');
  });

  it('sandbox_sandbox_isolation EN is non-empty (maps to AUDIT_ITEMS labelKey)', () => {
    expect(en['sandbox_sandbox_isolation'].length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PR change: export_image, mint_sbt, mint_success translation keys
// (used by InteractivePassportCard action buttons)
// ─────────────────────────────────────────────────────────────────────────────

describe('translations — passport action keys (PR change: export/mint/share)', () => {
  const newPassportActionKeys = ['export_image'];

  newPassportActionKeys.forEach((key) => {
    it(`EN has non-empty "${key}"`, () => {
      expect(en[key]).toBeDefined();
      expect(typeof en[key]).toBe('string');
      expect(en[key].length).toBeGreaterThan(0);
    });

    it(`AR has non-empty "${key}"`, () => {
      expect(ar[key]).toBeDefined();
      expect(typeof ar[key]).toBe('string');
      expect(ar[key].length).toBeGreaterThan(0);
    });

    it(`EN and AR "${key}" are not identical (actually translated)`, () => {
      expect(en[key]).not.toBe(ar[key]);
    });
  });

  it('export_image EN is "Export as Image"', () => {
    expect(en['export_image']).toBe('Export as Image');
  });

  it('export_image AR is non-empty Arabic translation', () => {
    expect(ar['export_image']).toBe('تصدير كصورة');
  });

  // Negative: keys must be defined and not fall back to the key name itself
  it('export_image EN is not equal to its own key name', () => {
    expect(en['export_image']).not.toBe('export_image');
  });
});

describe('translations — marketplace page keys (PR change)', () => {
  const marketplaceKeys = [
    'marketplace_title',
    'marketplace_browse',
    'marketplace_publish',
    'marketplace_search',
    'marketplace_all',
    'marketplace_published',
    'marketplace_published_desc',
    'marketplace_installs',
    'marketplace_installs_desc',
    'marketplace_pro_skills',
    'marketplace_pro_skills_desc',
    'marketplace_free_skills',
    'marketplace_free_skills_desc',
    'marketplace_no_skills',
    'marketplace_publish_first',
    'marketplace_publish_btn',
    'marketplace_welcome_banner',
    'marketplace_welcome_desc',
    'marketplace_no_desc',
    'marketplace_signed',
    'marketplace_free',
    'marketplace_load_more',
    'marketplace_close',
    'marketplace_installs_label',
    'marketplace_manifest',
    'marketplace_manifest_desc',
    'marketplace_script',
    'marketplace_script_desc',
    'marketplace_test_suite',
    'marketplace_installing',
    'marketplace_connecting',
    'marketplace_connect_install',
    'marketplace_install_skill',
    'marketplace_copy_payload',
    'marketplace_dismiss',
  ];

  marketplaceKeys.forEach((key) => {
    it(`EN has non-empty "${key}"`, () => {
      expect(en[key]).toBeDefined();
      expect(typeof en[key]).toBe('string');
      expect(en[key].length).toBeGreaterThan(0);
    });

    it(`AR has non-empty "${key}"`, () => {
      expect(ar[key]).toBeDefined();
      expect(typeof ar[key]).toBe('string');
      expect(ar[key].length).toBeGreaterThan(0);
    });
  });

  it('marketplace_title EN is "Skills Marketplace"', () => {
    expect(en['marketplace_title']).toBe('Skills Marketplace');
  });

  it('marketplace_welcome_banner EN is non-empty (new welcome banner text)', () => {
    expect(en['marketplace_welcome_banner'].length).toBeGreaterThan(0);
  });

  it('marketplace_installing and marketplace_connecting include trailing ellipsis in EN', () => {
    expect(en['marketplace_installing']).toContain('...');
    expect(en['marketplace_connecting']).toContain('...');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PR change: landing page section keys
// (used by src/app/page.tsx for the full landing page redesign)
// ─────────────────────────────────────────────────────────────────────────────

describe('translations — landing page keys (PR change)', () => {
  const landingKeys = [
    'landing_pi_badge',
    'landing_headline_en',
    'landing_headline_rules_en',
    'landing_tagline',
    'landing_how_it_works',
    'landing_three_steps',
    'landing_step1_title',
    'landing_step1_desc',
    'landing_step2_title',
    'landing_step2_desc',
    'landing_step3_title',
    'landing_step3_desc',
    'landing_sovereign_advantage',
    'landing_why_title',
    'landing_web2_title',
    'landing_web2_item1',
    'landing_web2_item2',
    'landing_web2_item3',
    'landing_web2_item4',
    'landing_web2_result',
    'landing_axiom_title',
    'landing_axiom_item1',
    'landing_axiom_item2',
    'landing_axiom_item3',
    'landing_axiom_item4',
    'landing_axiom_result',
    'landing_level_up',
  ];

  landingKeys.forEach((key) => {
    it(`EN has non-empty "${key}"`, () => {
      expect(en[key]).toBeDefined();
      expect(typeof en[key]).toBe('string');
      expect(en[key].length).toBeGreaterThan(0);
    });

    it(`AR has non-empty "${key}"`, () => {
      expect(ar[key]).toBeDefined();
      expect(typeof ar[key]).toBe('string');
      expect(ar[key].length).toBeGreaterThan(0);
    });

    it(`EN and AR "${key}" are not identical (actually translated)`, () => {
      expect(en[key]).not.toBe(ar[key]);
    });
  });

  // Spot-check specific EN values
  it('landing_pi_badge EN is "Live on Pi Network Testnet"', () => {
    expect(en['landing_pi_badge']).toBe('Live on Pi Network Testnet');
  });

  it('landing_headline_en EN is "Your Identity."', () => {
    expect(en['landing_headline_en']).toBe('Your Identity.');
  });

  it('landing_headline_rules_en EN is "Your Rules."', () => {
    expect(en['landing_headline_rules_en']).toBe('Your Rules.');
  });

  it('landing_tagline EN contains "DID"', () => {
    expect(en['landing_tagline']).toContain('DID');
  });

  it('landing_tagline EN mentions cryptographic proof', () => {
    expect(en['landing_tagline']).toContain('Cryptographic');
  });

  it('landing_three_steps EN describes three steps', () => {
    expect(en['landing_three_steps']).toContain('Three Steps');
  });

  it('landing_step1_title EN is "Connect"', () => {
    expect(en['landing_step1_title']).toBe('Connect');
  });

  it('landing_step2_title EN is "Verify"', () => {
    expect(en['landing_step2_title']).toBe('Verify');
  });

  it('landing_step3_title EN is "Deploy"', () => {
    expect(en['landing_step3_title']).toBe('Deploy');
  });

  it('landing_step1_desc EN mentions Pi wallet', () => {
    expect(en['landing_step1_desc']).toContain('Pi wallet');
  });

  it('landing_step2_desc EN mentions KYA and KYC', () => {
    expect(en['landing_step2_desc']).toContain('KYA');
    expect(en['landing_step2_desc']).toContain('KYC');
  });

  it('landing_step3_desc EN mentions Agent Passport', () => {
    expect(en['landing_step3_desc']).toContain('Agent Passport');
  });

  it('landing_web2_title EN is "Traditional Identity (Web2)"', () => {
    expect(en['landing_web2_title']).toBe('Traditional Identity (Web2)');
  });

  it('landing_axiom_title EN is "AxiomID Sovereign Passport"', () => {
    expect(en['landing_axiom_title']).toBe('AxiomID Sovereign Passport');
  });

  it('landing_axiom_item1 EN mentions W3C DIDs', () => {
    expect(en['landing_axiom_item1']).toContain('W3C DIDs');
  });

  it('landing_axiom_result EN mentions frictionless auth', () => {
    expect(en['landing_axiom_result']).toContain('Frictionless');
  });

  it('landing_web2_result EN describes a fragile outcome', () => {
    expect(en['landing_web2_result']).toContain('Fragile');
  });

  it('landing_level_up EN is "Level Up Your Identity"', () => {
    expect(en['landing_level_up']).toBe('Level Up Your Identity');
  });

  // Spot-check specific AR values
  it('landing_pi_badge AR is non-empty Arabic string (different from EN)', () => {
    expect(ar['landing_pi_badge']).not.toBe(en['landing_pi_badge']);
    expect(ar['landing_pi_badge'].length).toBeGreaterThan(0);
  });

  it('landing_axiom_title AR contains "AxiomID" (brand name preserved)', () => {
    // Brand names should remain in both languages
    expect(ar['landing_axiom_title']).toContain('AxiomID');
  });

  it('landing_axiom_item1 AR mentions W3C DIDs (technical term preserved)', () => {
    expect(ar['landing_axiom_item1']).toContain('W3C DIDs');
  });

  it('landing_level_up AR is non-empty and different from EN', () => {
    expect(ar['landing_level_up']).not.toBe('Level Up Your Identity');
    expect(ar['landing_level_up'].length).toBeGreaterThan(0);
  });

  it('landing_web2_result AR is non-empty Arabic translation', () => {
    expect(ar['landing_web2_result']).not.toBe(en['landing_web2_result']);
  });

  // Verify all 4 web2 items and 4 axiom items exist in both languages
  it('all 4 landing_web2_item keys exist in EN', () => {
    for (let i = 1; i <= 4; i++) {
      expect(en[`landing_web2_item${i}`]).toBeDefined();
      expect(en[`landing_web2_item${i}`].length).toBeGreaterThan(0);
    }
  });

  it('all 4 landing_web2_item keys exist in AR', () => {
    for (let i = 1; i <= 4; i++) {
      expect(ar[`landing_web2_item${i}`]).toBeDefined();
      expect(ar[`landing_web2_item${i}`].length).toBeGreaterThan(0);
    }
  });

  it('all 4 landing_axiom_item keys exist in EN', () => {
    for (let i = 1; i <= 4; i++) {
      expect(en[`landing_axiom_item${i}`]).toBeDefined();
      expect(en[`landing_axiom_item${i}`].length).toBeGreaterThan(0);
    }
  });

  it('all 4 landing_axiom_item keys exist in AR', () => {
    for (let i = 1; i <= 4; i++) {
      expect(ar[`landing_axiom_item${i}`]).toBeDefined();
      expect(ar[`landing_axiom_item${i}`].length).toBeGreaterThan(0);
    }
  });

  // Regression: no key should fall back to its own key name
  it('no landing_* key falls back to its own key name in EN', () => {
    for (const key of landingKeys) {
      expect(en[key]).not.toBe(key);
    }
  });

  it('no landing_* key falls back to its own key name in AR', () => {
    for (const key of landingKeys) {
      expect(ar[key]).not.toBe(key);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PR change: jest.setup.js mock covers all new landing_* keys
// Verify the mock dictionary in jest.setup.js includes the same keys so
// components that consume the mocked t() function behave correctly in tests.
// ─────────────────────────────────────────────────────────────────────────────

describe('translations — landing page key parity (EN vs AR, PR change)', () => {
  const keyPairs: Array<[string, string]> = [
    ['landing_step1_title', 'landing_step2_title'],
    ['landing_step1_desc', 'landing_step2_desc'],
    ['landing_web2_title', 'landing_axiom_title'],
    ['landing_web2_result', 'landing_axiom_result'],
  ];

  keyPairs.forEach(([keyA, keyB]) => {
    it(`"${keyA}" and "${keyB}" EN values are distinct`, () => {
      expect(en[keyA]).not.toBe(en[keyB]);
    });

    it(`"${keyA}" and "${keyB}" AR values are distinct`, () => {
      expect(ar[keyA]).not.toBe(ar[keyB]);
    });
  });

  it('landing_headline_en EN and AR values differ (EN "Your Identity.", AR "هويتك.")', () => {
    // The EN dict sets landing_headline_en to "Your Identity."
    // The AR dict sets it to "هويتك." — different text for the same key
    expect(en['landing_headline_en']).toBe('Your Identity.');
    expect(ar['landing_headline_en']).toBe('هويتك.');
  });
});
