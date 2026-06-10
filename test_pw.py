from playwright.sync_api import sync_playwright
import os

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 390, 'height': 844})
        page = context.new_page()
        page.goto('http://localhost:5173/login')
        
        # We can fill by placeholder or name
        page.get_by_role("textbox", name="Username").fill("ben")
        page.get_by_role("textbox", name="Password").fill("rK@76E6P7z7E")
        page.get_by_role("button", name="Login").click()
        
        page.wait_for_timeout(3000)
        print("URL after login:", page.url)

        # Let's take screenshot of admin dashboard!
        page.goto('http://localhost:5173/admin')
        page.wait_for_timeout(3000)
        
        screenshot_dir = os.path.abspath('issues/screenshots')
        os.makedirs(screenshot_dir, exist_ok=True)
        
        page.screenshot(path=os.path.join(screenshot_dir, 'iss_200_admin_dashboard.png'), full_page=True)
        
        # Go to Users
        page.goto('http://localhost:5173/admin/users')
        page.wait_for_timeout(3000)
        page.screenshot(path=os.path.join(screenshot_dir, 'iss_201_admin_users.png'), full_page=True)
        
        browser.close()

if __name__ == '__main__':
    main()
