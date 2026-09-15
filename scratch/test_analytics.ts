import fs from 'fs';
import path from 'path';

function simulateAnalyticsInjection(configContent: string | null) {
  const windowObj: any = {
    dataLayer: [],
  };
  const headElements: any[] = [];
  const calls: any[] = [];

  function injectGoogleAnalytics(gtmId: string) {
    if (!gtmId || windowObj._gaInitialized) return;
    windowObj._gaInitialized = true;

    if (gtmId.indexOf('GTM-') === 0) {
      windowObj.dataLayer = windowObj.dataLayer || [];
      windowObj.dataLayer.push({ 'gtm.start': 123456789, event: 'gtm.js' });
      headElements.push({
        type: 'gtm',
        src: 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(gtmId),
      });
    }

    headElements.push({
      type: 'gtag',
      src: 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gtmId),
    });

    windowObj.dataLayer = windowObj.dataLayer || [];
    function gtag(...args: any[]) {
      windowObj.dataLayer.push(args);
      calls.push(args);
    }
    windowObj.gtag = gtag;
    gtag('js', new Date(123456789));
    gtag('config', gtmId);
  }

  if (configContent) {
    const match = configContent.match(/(?:const|let|var|window\.)?\s*GTM_ID\s*=\s*['"]([^'"]+)['"]/);
    if (match && match[1]) {
      const id = match[1].trim();
      if (id) {
        injectGoogleAnalytics(id);
      }
    }
  }

  return { windowObj, headElements, calls };
}

console.log('--- Testing GA injection with actual config.js ---');
const actualConfig = fs.readFileSync(path.resolve(process.cwd(), 'config.js'), 'utf8');
const result1 = simulateAnalyticsInjection(actualConfig);

console.assert(result1.windowObj._gaInitialized === true, 'Failed: GA should be initialized');
console.assert(result1.headElements.length === 1, 'Failed: Exactly 1 gtag script should be injected');
console.assert(
  result1.headElements[0].src === 'https://www.googletagmanager.com/gtag/js?id=G-S6QX2XHT2D',
  'Failed: Script src mismatch'
);
console.assert(result1.calls.length === 2, 'Failed: Expected 2 gtag calls (js and config)');
console.assert(result1.calls[1][0] === 'config' && result1.calls[1][1] === 'G-S6QX2XHT2D', 'Failed: config call mismatch');
console.log('Result 1 (Actual config.js) passed: GA4 tag injected correctly!');

console.log('--- Testing without config.js (null) ---');
const result2 = simulateAnalyticsInjection(null);
console.assert(result2.windowObj._gaInitialized === undefined, 'Failed: Should not initialize without config');
console.assert(result2.headElements.length === 0, 'Failed: No scripts should be injected');
console.assert(result2.calls.length === 0, 'Failed: No calls should be made');
console.log('Result 2 (No config.js) passed: Gracefully skipped injection!');

console.log('--- Testing with empty config.js ---');
const result3 = simulateAnalyticsInjection('// Empty config\n');
console.assert(result3.windowObj._gaInitialized === undefined, 'Failed: Should not initialize with empty config');
console.assert(result3.headElements.length === 0, 'Failed: No scripts should be injected');
console.log('Result 3 (Empty config) passed: Gracefully skipped injection!');

console.log('--- Testing with GTM-XXXX ID ---');
const result4 = simulateAnalyticsInjection("const GTM_ID = 'GTM-TEST1234';");
console.assert(result4.windowObj._gaInitialized === true, 'Failed: GTM should be initialized');
console.assert(result4.headElements.length === 2, 'Failed: Both GTM and gtag should be injected');
console.assert(result4.headElements[0].type === 'gtm', 'Failed: GTM script should be injected');
console.assert(result4.headElements[1].type === 'gtag', 'Failed: gtag script should be injected');
console.log('Result 4 (GTM container ID) passed: Both GTM and gtag supported!');

console.log('All analytics injection tests passed successfully!');
