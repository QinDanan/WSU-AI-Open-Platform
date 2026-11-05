const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const base = process.env.WSU_BASE || 'http://127.0.0.1:4173/';
const out = path.resolve(__dirname, '../assets/screenshots');
fs.mkdirSync(out, { recursive: true });
const routes = ['dashboard', 'chat', 'knowledge', 'docs', 'planner', 'tools', 'apps', 'about'];
const sizes = [
  { name: 'small', width: 320, height: 760 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const report = { pages: [], problems: [] };
  try {
    for (const size of sizes) {
      const context = await browser.newContext({
        viewport: { width: size.width, height: size.height },
        deviceScaleFactor: size.width <= 390 ? 3 : 1,
        isMobile: size.width <= 390,
        hasTouch: size.width <= 390,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const scriptErrors = [];
      page.on('pageerror', error => scriptErrors.push(error.message));
      for (const route of routes) {
        await page.goto(base + '#/' + route, { waitUntil: 'load', timeout: 30000 });
        await page.waitForTimeout(240);
        const check = await page.evaluate(() => {
          const visible = node => {
            const s = getComputedStyle(node);
            const r = node.getBoundingClientRect();
            return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0 && r.bottom >= 0 && r.top <= innerHeight * 3;
          };
          const active = document.querySelector('.page.active');
          const images = [...document.querySelectorAll('img')].filter(visible).map(img => ({
            src: img.currentSrc, loaded: img.complete && img.naturalWidth > 0
          }));
          const positions = [...document.querySelectorAll('.feature-icon svg,.stat-icon svg,.resource-mini svg,.icon-button svg')]
            .filter(visible).slice(0, 60).map(svg => {
              const parent = svg.parentElement.getBoundingClientRect();
              const own = svg.getBoundingClientRect();
              return {
                deltaX: Math.round(((own.left + own.right) - (parent.left + parent.right)) / 2),
                deltaY: Math.round(((own.top + own.bottom) - (parent.top + parent.bottom)) / 2),
              };
            });
          const modeSwitch = document.querySelector('#page-chat .chat-mode-switch');
          const chatSwitch = modeSwitch && visible(modeSwitch)
            ? { width: modeSwitch.getBoundingClientRect().width,
                left: modeSwitch.getBoundingClientRect().left,
                right: modeSwitch.getBoundingClientRect().right,
                buttons: modeSwitch.querySelectorAll('button').length }
            : null;
          const searchButton = document.querySelector('#global-search-trigger');
          const searchGlyph = searchButton?.querySelector('svg.search-native-icon');
          let searchIconOffset = null;
          if (searchButton && searchGlyph && visible(searchButton) && visible(searchGlyph)) {
            const buttonRect = searchButton.getBoundingClientRect();
            const glyphRect = searchGlyph.getBoundingClientRect();
            searchIconOffset = {
              x: +((glyphRect.left + glyphRect.width / 2) - (buttonRect.left + buttonRect.width / 2)).toFixed(2),
              y: +((glyphRect.top + glyphRect.height / 2) - (buttonRect.top + buttonRect.height / 2)).toFixed(2),
            };
          }
          return {
            searchIconOffset,
            chatSwitch,
            searchIconTag: searchGlyph?.tagName,
            searchIconPosition: searchGlyph ? getComputedStyle(searchGlyph).position : null,
            searchButtonLabel: searchButton?.getAttribute('aria-label'),
            viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
            bodyWidth: document.body.scrollWidth,
            active: active?.id || '',
            images, positions
          };
        });
        const problems = [];
        if (check.scrollWidth > size.width + 1 || check.bodyWidth > size.width + 1)
          problems.push('Horizontal overflow: ' + check.scrollWidth + '/' + check.bodyWidth);
        if (check.active !== 'page-' + route) problems.push('Route did not render: ' + check.active);
        if (check.images.some(img => !img.loaded)) problems.push('Broken image in visible UI');
        if (route === 'chat' && (!check.chatSwitch || check.chatSwitch.buttons !== 3
          || check.chatSwitch.left < -1 || check.chatSwitch.right > size.width + 1))
          problems.push('Chat mode selector is clipped or missing: ' + JSON.stringify(check.chatSwitch));
        if (size.width <= 700 && (!check.searchIconOffset ||
          Math.abs(check.searchIconOffset.x) > 1 || Math.abs(check.searchIconOffset.y) > 1))
          problems.push('Search icon off-center: ' + JSON.stringify(check.searchIconOffset));
        if (size.width <= 390 && (check.searchIconPosition !== 'absolute' || check.searchIconTag !== 'svg'))
          problems.push('Mobile search is not using static centered SVG');
        if (check.positions.some(p => Math.abs(p.deltaX) > 3 || Math.abs(p.deltaY) > 3))
          problems.push('Icon not centered');
        report.pages.push({ ...size, route, check, problems });
        if (problems.length) report.problems.push({ size: size.name, route, problems });
        if ((size.name === 'mobile' || size.name === 'desktop') &&
          ['dashboard','chat','docs','tools'].includes(route)) {
          await page.screenshot({ path: path.join(out, size.name + '-' + route + '.png'), fullPage: true, animations: 'disabled' });
        }
      }
      if (scriptErrors.length) report.problems.push({ size: size.name, route: 'global', problems: scriptErrors });
      await context.close();
    }
  } finally {
    fs.writeFileSync(path.join(out, 'visual-report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
  console.log('Checked ' + report.pages.length + ' page/viewport combinations');
  for (const problem of report.problems) console.log(JSON.stringify(problem));
  if (report.problems.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
