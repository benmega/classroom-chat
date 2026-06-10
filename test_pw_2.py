from playwright.sync_api import sync_playwright
import os

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 390, 'height': 844})
        page = context.new_page()
        page.goto('http://localhost:5173/login')
        
        page.get_by_role("textbox", name="Username").fill("ben")
        page.get_by_role("textbox", name="Password").fill("rK@76E6P7z7E")
        page.get_by_role("button", name="Login").click()
        page.wait_for_timeout(2000)

        routes = [
            ('admin_projects', 'http://localhost:5173/admin/projects'),
            ('admin_certificates', 'http://localhost:5173/admin/certificates'),
            ('admin_analytics', 'http://localhost:5173/admin/analytics'),
            ('admin_achievements', 'http://localhost:5173/admin/add-achievement'),
            ('admin_advanced', 'http://localhost:5173/admin/advanced')
        ]
        
        screenshot_dir = os.path.abspath('issues/screenshots')
        for i, (name, url) in enumerate(routes):
            page.goto(url)
            page.wait_for_timeout(2000)
            page.screenshot(path=os.path.join(screenshot_dir, f'iss_{202+i}_{name}.png'), full_page=True)
            print(f"Captured {name}")
        
        browser.close()

if __name__ == '__main__':
    main()
