import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();
await page.goto('http://localhost:3000');

console.log('브라우저 창에서 로그인을 완료해 주세요. /dashboard 진입을 감지하면 세션을 저장합니다.');

await page.waitForURL('**/dashboard**', { timeout: 5 * 60 * 1000 });
await page.waitForTimeout(1500);

await context.storageState({ path: 'scripts/auth-state.json' });
console.log('로그인 세션 저장 완료: scripts/auth-state.json');
await browser.close();
