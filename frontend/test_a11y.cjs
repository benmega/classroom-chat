const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Logging in...');
  await page.goto('http://localhost:8000/dev-login?role=admin');
  
  const adminRoutes = [
    'http://localhost:5173/',
    'http://localhost:5173/classes',
    'http://localhost:5173/users',
    'http://localhost:5173/projects',
    'http://localhost:5173/analytics'
  ];

  for (const route of adminRoutes) {
    console.log(`\nTesting ${route}...`);
    await page.goto(route);
    await page.waitForTimeout(2000); // Wait for render
    
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.0/axe.min.js' });
    
    const results = await page.evaluate(async () => {
      const results = await axe.run({
        runOnly: {
          type: 'tag',
          values: ['wcag2aa', 'wcag21aa']
        }
      });
      return results.violations.filter(v => v.id === 'color-contrast');
    });

    if (results.length > 0) {
      console.log(`Found ${results.length} contrast violations!`);
      for (const v of results) {
        console.log(`- ${v.description}`);
        for (const node of v.nodes) {
          console.log(`  Element: ${node.html}`);
          console.log(`  Selector: ${node.target.join(', ')}`);
          console.log(`  Summary: ${node.failureSummary}`);
        }
      }
    } else {
      console.log('No contrast violations found.');
    }
  }

  await browser.close();
})();
