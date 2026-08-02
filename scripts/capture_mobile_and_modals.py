import asyncio
import os

from playwright.async_api import async_playwright

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "docs", "screenshots"))

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        admin_context = await browser.new_context(viewport={"width": 1440, "height": 900})
        admin_page = await admin_context.new_page()

        await admin_page.goto("http://localhost:8000/dev-login?role=admin", wait_until="domcontentloaded")
        await admin_page.wait_for_timeout(1000)

        # Go to Admin Users page
        await admin_page.goto("http://localhost:5173/admin/users", wait_until="domcontentloaded")
        await admin_page.wait_for_timeout(1500)

        # 1. Create User Modal
        try:
            create_btn = admin_page.locator("button.primary-btn:has-text('User'), button:has-text('Create User')").first
            if await create_btn.is_visible():
                await create_btn.click()
                await admin_page.wait_for_timeout(600)
                await admin_page.screenshot(path=os.path.join(OUTPUT_DIR, "modal_create_user.png"))
                print("Captured -> modal_create_user.png")
                # Close modal
                await admin_page.keyboard.press("Escape")
                await admin_page.wait_for_timeout(400)
        except Exception as e:
            print(f"Error create_user: {e}")

        # 2. Bulk Connection Cards Modal
        try:
            bulk_btn = admin_page.locator("button.bulk-conn-btn, button:has-text('Connection Cards')").first
            if await bulk_btn.is_visible():
                await bulk_btn.click()
                await admin_page.wait_for_timeout(600)
                await admin_page.screenshot(path=os.path.join(OUTPUT_DIR, "modal_bulk_connection_cards.png"))
                print("Captured -> modal_bulk_connection_cards.png")
                await admin_page.keyboard.press("Escape")
                await admin_page.wait_for_timeout(400)
        except Exception as e:
            print(f"Error bulk_conn: {e}")

        # 3. Kebab Menu & Adjust Ducks Modal
        try:
            kebab = admin_page.locator(".kebab-btn, button[aria-label*='more'], button.actions-btn").first
            if await kebab.is_visible():
                await kebab.click()
                await admin_page.wait_for_timeout(500)
                adjust_btn = admin_page.locator("button.kebab-item:has-text('Duck')").first
                if await adjust_btn.is_visible():
                    await adjust_btn.click()
                    await admin_page.wait_for_timeout(600)
                    await admin_page.screenshot(path=os.path.join(OUTPUT_DIR, "modal_adjust_ducks.png"))
                    print("Captured -> modal_adjust_ducks.png")
                    await admin_page.keyboard.press("Escape")
                    await admin_page.wait_for_timeout(400)
        except Exception as e:
            print(f"Error adjust_ducks: {e}")

        # 4. Reset Password Modal
        try:
            kebab = admin_page.locator(".kebab-btn, button[aria-label*='more'], button.actions-btn").first
            if await kebab.is_visible():
                await kebab.click()
                await admin_page.wait_for_timeout(500)
                reset_btn = admin_page.locator("button.kebab-item:has-text('Password')").first
                if await reset_btn.is_visible():
                    await reset_btn.click()
                    await admin_page.wait_for_timeout(600)
                    await admin_page.screenshot(path=os.path.join(OUTPUT_DIR, "modal_reset_password.png"))
                    print("Captured -> modal_reset_password.png")
        except Exception as e:
            print(f"Error reset_password: {e}")

        await admin_context.close()
        await browser.close()
        print("All additional modal captures complete!")

if __name__ == "__main__":
    asyncio.run(run())
