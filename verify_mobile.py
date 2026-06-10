import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Mobile viewport (e.g. 390x844 iPhone 12)
        context = await browser.new_context(
            viewport={'width': 390, 'height': 844},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
        )
        page = await context.new_page()
        
        # 1. Login
        print("Logging in...")
        await page.goto("http://localhost:8000/dev-login?role=admin")
        
        # 2. Go to frontend profile page
        print("Navigating to /profile...")
        await page.goto("http://localhost:5173/profile")
        await page.wait_for_timeout(2000) # wait for load
        
        # 3. Click hamburger menu
        print("Opening sidebar...")
        hamburger = page.locator(".hamburger-toggle.mobile-only")
        if await hamburger.is_visible():
            await hamburger.click()
            await page.wait_for_timeout(1000)
            
            # 4. Take screenshot
            os.makedirs("issues/screenshots", exist_ok=True)
            screenshot_path = "issues/screenshots/iss_175_fixed.png"
            await page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")
            
            # 5. Check if Chat link is present
            chat_link = page.locator(".sidebar-nav >> text=Chat")
            if await chat_link.count() > 0:
                print("SUCCESS: Chat link found in mobile sidebar.")
            else:
                print("ERROR: Chat link NOT found.")
        else:
            print("ERROR: Hamburger menu not visible.")

        await browser.close()

asyncio.run(run())
