import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 390, 'height': 844},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
        )
        page = await context.new_page()
        
        await page.goto("http://localhost:8000/dev-login?role=admin")
        await page.wait_for_timeout(500)
        
        # Profile
        await page.goto("http://localhost:5174/profile")
        await page.wait_for_timeout(2000)
        await page.screenshot(path="issues/screenshots/mobile_audit/04_profile.png")
        
        # Admin
        await page.goto("http://localhost:5174/admin")
        await page.wait_for_timeout(2000)
        await page.screenshot(path="issues/screenshots/mobile_audit/05_admin.png")
        
        await browser.close()

asyncio.run(run())
