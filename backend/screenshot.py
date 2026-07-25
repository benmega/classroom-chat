import asyncio

from playwright.async_api import async_playwright


async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        print("Navigating to dev-login...")
        # Go to dev-login to get cookies
        await page.goto("http://localhost:8000/dev-login?role=admin")
        await page.wait_for_timeout(2000)

        print("Navigating to frontend...")
        # Now go to the frontend
        await page.goto("http://localhost:5173/")

        # Wait for something to load (e.g. body not empty)
        await page.wait_for_timeout(5000)

        # Take a screenshot
        await page.screenshot(
            path="C:\\Users\\Ben\\.gemini\\antigravity\\brain\\6a6fe065-d787-46be-a91e-8584fcbef506\\fix_verified_frontend.png"
        )
        print("Screenshot taken!")

        await browser.close()


if __name__ == "__main__":
    asyncio.run(run())
