const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({headless: "new"});
    const page = await browser.newPage();
    
    // Set mobile viewport
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    
    // Login
    await page.goto('http://localhost:8000/dev-login?role=admin');
    
    // Go to admin panel
    await page.goto('http://localhost:5173/admin');
    
    // Wait a bit for layout to settle
    await new Promise(r => setTimeout(r, 2000));
    
    // Take screenshot
    await page.screenshot({ path: 'issues/screenshots/mobile_admin_fixed.png' });
    
    // Also test advanced admin
    await page.goto('http://localhost:5173/admin/advanced');
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'issues/screenshots/mobile_admin_advanced_fixed.png' });
    
    await browser.close();
    console.log("Screenshots captured successfully.");
})();
