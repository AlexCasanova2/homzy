import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'El script de consentimiento debe estar en el HTML');

function createPage(status) {
  const scripts = [];
  const events = [];
  const window = {
    googlefc: { getGoogleConsentModeValues: () => status },
    dispatchEvent: (event) => events.push(event)
  };
  const document = {
    createElement: () => ({}),
    head: { appendChild: (element) => scripts.push(element) }
  };
  window.window = window;
  window.document = document;
  window.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options.detail; } };
  runInNewContext(script, window);
  const ready = window.googlefc.callbackQueue[0].CONSENT_MODE_DATA_READY;
  return { window, scripts, events, ready };
}

test('carga GA4 una vez cuando se concede analítica y comunica el consentimiento', () => {
  const page = createPage({
    adStoragePurposeConsentStatus: 2,
    analyticsStoragePurposeConsentStatus: 1,
    adUserDataPurposeConsentStatus: 2,
    adPersonalizationPurposeConsentStatus: 2
  });
  page.ready();
  page.ready();

  assert.equal(page.window.homzyConsent.analytics_storage, 'granted');
  assert.equal(page.window.homzyConsent.ad_storage, 'denied');
  assert.equal(page.scripts.length, 1);
  assert.match(page.scripts[0].src, /googletagmanager\.com\/gtag\/js/);
  assert.equal(page.events[0].detail.analytics_storage, 'granted');
  assert.equal(page.window.dataLayer.filter((entry) => entry[0] === 'config').length, 1);
});

test('no carga GA4 sin permiso explícito, incluso si la finalidad no está configurada', () => {
  for (const status of [0, 2, 3, 4]) {
    const page = createPage({ analyticsStoragePurposeConsentStatus: status });
    page.ready();
    assert.equal(page.window.homzyConsent.analytics_storage, 'denied');
    assert.equal(page.scripts.length, 0);
    assert.equal(page.window.dataLayer.some((entry) => entry[0] === 'config'), false);
  }
});
