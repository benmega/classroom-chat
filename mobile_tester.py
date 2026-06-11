import asyncio
import os
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 390, 'height': 844},
            is_mobile=True,
            has_touch=True
        )
        page = await context.new_page()

        print("Navigating to dev-login...")
        await page.goto("http://localhost:5174/api/dev-login?role=admin")
        await page.wait_for_timeout(1000)

        routes = ["/", "/dashboard", "/chat", "/profile", "/classes"]
        os.makedirs("issues/screenshots", exist_ok=True)

        for route in routes:
            print(f"Navigating to {route}...")
            url = f"http://localhost:5174{route}"
            await page.goto(url)
            await page.wait_for_timeout(3000)
            
            safe_route = route.replace("/", "_")
            if safe_route == "_": safe_route = "index"
            
            await page.screenshot(path=f"issues/screenshots/{safe_route}.png")

        await browser.close()

asyncio.run(run())
