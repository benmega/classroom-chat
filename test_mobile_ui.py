import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Mobile viewport (iPhone 13 size 390x844)
        context = await browser.new_context(
            viewport={'width': 390, 'height': 844},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
        )
        page = await context.new_page()
        
        # Ensure screenshot dir exists
        os.makedirs("issues/screenshots/mobile_audit", exist_ok=True)
        
        # 1. Login
        print("Logging in...")
        await page.goto("http://localhost:8000/dev-login?role=admin")
        await page.wait_for_timeout(500)
        
        # 2. Go to Dashboard (Classes)
        print("Navigating to / (Dashboard)...")
        await page.goto("http://localhost:5173/")
        await page.wait_for_timeout(2000)
        await page.screenshot(path="issues/screenshots/mobile_audit/01_dashboard.png")
        
        # Try to find a hamburger menu button
        hamburger_selectors = [".hamburger-toggle", ".mobile-menu-button", "button[aria-label='Menu']", "button[aria-label='Open Menu']", ".menu-icon"]
        for sel in hamburger_selectors:
            loc = page.locator(sel).first
            if await loc.count() > 0 and await loc.is_visible():
                await loc.click()
                await page.wait_for_timeout(1000)
                await page.screenshot(path="issues/screenshots/mobile_audit/02_sidebar_open.png")
                await page.reload()
                await page.wait_for_timeout(2000)
                break

        # 3. Go to Chat
        print("Navigating to /chat...")
        await page.goto("http://localhost:5173/chat")
        await page.wait_for_timeout(2000)
        await page.screenshot(path="issues/screenshots/mobile_audit/03_chat.png")
        
        # Try typing a message in chat
        chat_input = page.locator("textarea, input[type='text']").last
        if await chat_input.count() > 0:
            await chat_input.fill("Hello mobile world!")
            await page.wait_for_timeout(500)
            await page.screenshot(path="issues/screenshots/mobile_audit/03b_chat_typing.png")
        
        # 4. Go to Profile
        print("Navigating to /profile...")
        await page.goto("http://localhost:5173/profile")
        await page.wait_for_timeout(2000)
        await page.screenshot(path="issues/screenshots/mobile_audit/04_profile.png")
        
        # 5. Go to Admin
        print("Navigating to /admin...")
        await page.goto("http://localhost:5173/admin")
        await page.wait_for_timeout(2000)
        await page.screenshot(path="issues/screenshots/mobile_audit/05_admin.png")
        
        await browser.close()
        print("Screenshots captured.")

asyncio.run(run())
