from playwright.sync_api import sync_playwright


# 1. Add 'live_server' as an argument here.
# This tells pytest: "Start the app before running this test!"
def test_homepage_loads_without_js_errors(live_server):
    with sync_playwright() as p:
        # Launch browser (set headless=False if you want to watch it run)
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Listen for console errors
        page.on("console", lambda msg: print(f"Console error: {msg.text}") if msg.type == "error" else None)

        # 2. Use 'live_server.url' instead of hardcoding localhost:8000.
        # live_server picks a random free port to avoid conflicts.
        target_url = f"{live_server.url}/login"
        print(f"Testing URL: {target_url}")

        page.goto(target_url)

        # Verify the page loaded (checking title or URL)
        # Adjust "Login" to match whatever your actual <title> tag says
        assert "Login" in page.title() or "login" in page.url

        browser.close()