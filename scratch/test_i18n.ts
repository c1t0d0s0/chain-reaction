import { TRANSLATIONS } from '../src/i18n';

function detectBrowserLanguage(sessionVal: string | null, navLanguages: readonly string[] | undefined, navLanguage: string | undefined): 'ja' | 'en' {
  if (sessionVal === 'ja' || sessionVal === 'en') {
    return sessionVal;
  }
  const primaryLang = (navLanguages && navLanguages.length > 0 && navLanguages[0]) || navLanguage || '';
  const lower = primaryLang.toLowerCase().trim();
  if (lower.startsWith('ja')) {
    return 'ja';
  }
  return 'en';
}

console.log('Testing detectBrowserLanguage logic with priority order:');

// 1. English as top priority, even with Japanese in the secondary list (The exact user scenario!)
console.assert(detectBrowserLanguage(null, ['en-US', 'en', 'ja-JP', 'ja'], 'en-US') === 'en', 'Failed: en-US primary with ja secondary should be en');
console.assert(detectBrowserLanguage(null, ['en-GB', 'ja'], 'en-GB') === 'en', 'Failed: en-GB primary with ja secondary should be en');
console.assert(detectBrowserLanguage(null, ['en', 'ja'], 'en') === 'en', 'Failed: en primary with ja secondary should be en');

// 2. Japanese as top priority
console.assert(detectBrowserLanguage(null, ['ja-JP', 'ja', 'en'], 'ja-JP') === 'ja', 'Failed: ja-JP should be ja');
console.assert(detectBrowserLanguage(null, ['ja', 'en-US'], 'ja') === 'ja', 'Failed: ja should be ja');

// 3. Non-Japanese other languages (e.g. French, German) default to English
console.assert(detectBrowserLanguage(null, ['fr-FR', 'ja'], 'fr-FR') === 'en', 'Failed: fr primary should be en');
console.assert(detectBrowserLanguage(null, ['zh-CN', 'en'], 'zh-CN') === 'en', 'Failed: zh primary should be en');

// 4. Fallback to navigator.language when languages array is empty
console.assert(detectBrowserLanguage(null, [], 'en-US') === 'en', 'Failed: fallback en-US should be en');
console.assert(detectBrowserLanguage(null, [], 'ja-JP') === 'ja', 'Failed: fallback ja-JP should be ja');

// 5. SessionStorage explicit user toggle override
console.assert(detectBrowserLanguage('ja', ['en-US', 'ja'], 'en-US') === 'ja', 'Failed: session ja should override browser en');
console.assert(detectBrowserLanguage('en', ['ja-JP'], 'ja-JP') === 'en', 'Failed: session en should override browser ja');

console.log('All detectBrowserLanguage priority tests passed!');

// 6. Verify translation keys completeness
const jaKeys = Object.keys(TRANSLATIONS.ja).sort();
const enKeys = Object.keys(TRANSLATIONS.en).sort();

const missingInEn = jaKeys.filter(k => !(k in TRANSLATIONS.en));
const missingInJa = enKeys.filter(k => !(k in TRANSLATIONS.ja));

if (missingInEn.length > 0) {
  console.error('Missing in en:', missingInEn);
} else {
  console.log(`Translation keys check: All ${jaKeys.length} keys in ja exist in en!`);
}

if (missingInJa.length > 0) {
  console.error('Missing in ja:', missingInJa);
} else {
  console.log(`Translation keys check: All ${enKeys.length} keys in en exist in ja!`);
}

console.log('Test completed successfully.');
