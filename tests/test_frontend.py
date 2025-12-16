from playwright.sync_api import expect
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


# Helper to handle login quickly for multiple tests
def login(page, base_url, username, password):
    page.goto(f"{base_url}/login")
    # Update these selectors if your HTML IDs are different
    page.fill("input[name='username']", username)
    page.fill("input[name='password']", password)
    page.click("button[type='submit']")
    # Wait for redirect to homepage/chat
    page.wait_for_url(f"{base_url}/")


def test_login_and_view_homepage(live_server, page):
    """
    CUJ (Critical User Journey): User can log in and sees the main chat interface.
    """
    login(page, live_server.url, "admin", "password")

    # Assert we are on the homepage
    expect(page).to_have_title(lambda t: "Chat" in t or "Home" in t)

    # Assert the Chat UI elements exist
    expect(page.locator("#chat")).to_be_visible()
    expect(page.locator("#messageForm")).to_be_visible()


def test_send_message_appears_in_chat(live_server, page):
    """
    CUJ: User sends a message and it appears in the chat window immediately.
    """
    login(page, live_server.url, "admin", "password")

    test_message = f"Automated Test Message {live_server.url}"

    # Type and send
    page.fill("#message", test_message)
    page.click("button[type='submit']")  # Or press Enter if your app supports it

    # Check if the message appears in the chat container
    # We use 'first' or a specific filter to avoid ambiguity if multiple exist
    expect(page.locator("#chat")).to_contain_text(test_message, timeout=5000)


def test_profile_link_navigation(live_server, page):
    """
    CUJ: Clicking a username in chat navigates to their profile.
    (This validates the fix we just made for user_id vs username links)
    """
    login(page, live_server.url, "admin", "password")

    # 1. Ensure there is a message (Send one to be safe)
    page.fill("#message", "Link Test")
    page.click("button[type='submit']")

    # 2. Find the profile link for the current user in the chat
    # Looking for an <a> tag inside the chat that links to a profile
    # Note: We look for the 'admin' link since we logged in as admin
    profile_link = page.locator("#chat a[href*='/user/profile/admin']").last

    # 3. Click and verify navigation
    profile_link.click()

    # 4. Assert URL is correct
    expect(page).to_have_url(f"{live_server.url}/user/profile/admin")
    expect(page.locator("h1")).to_contain_text("admin")