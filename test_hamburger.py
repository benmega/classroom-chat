import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 390, 'height': 844},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
            has_touch=True,
            is_mobile=True
        )
        page = await context.new_page()
        
        print("Logging in...")
        await page.goto("http://localhost:8000/dev-login?role=admin")
        await page.wait_for_url("**/localhost:5173/**", timeout=10000)
        
        print("Navigating to Profile...")
        await page.goto("http://localhost:5173/profile")
        await page.wait_for_timeout(3000)
        
        hamburger = page.locator('header button.hamburger-toggle').first
        is_visible = await hamburger.is_visible()
        print(f"Hamburger visible: {is_visible}")
        
        try:
            await hamburger.click(timeout=5000)
            print("Clicked successfully!")
        except Exception as e:
            print(f"Click failed: {e}")
            # Try to evaluate what is on top of it
            box = await hamburger.bounding_box()
            if box:
                x = box['x'] + box['width'] / 2
                y = box['y'] + box['height'] / 2
                overlapping_element = await page.evaluate(f"""
                    () => {{
                        const el = document.elementFromPoint({x}, {y});
                        return el ? el.outerHTML : 'none';
                    }}
                """)
                print("Element at hamburger position:")
                print(overlapping_element)

        await browser.close()

asyncio.run(main())
