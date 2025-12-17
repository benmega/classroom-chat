# --- HELPERS ---

def login(page, base_url, username, password):
    """
    Helper to handle login.
    """
    # 1. Go to the correct blueprint URL
    page.goto(f"{base_url}/user/login")

    # 2. Fill credentials
    page.fill("#username", username)
    page.fill("#password", password)

    # 3. Click input OR button (Handles both <input type="submit"> and <button>)
    page.click("input[type='submit'], button[type='submit']")

    # 4. Wait for redirect to the homepage
    page.wait_for_url(f"{base_url}/")

#
# # --- TESTS ---
#
# def test_homepage_loads_without_js_errors(live_server):
#     with sync_playwright() as p:
#         browser = p.chromium.launch(headless=True)
#         page = browser.new_page()
#
#         page.on("console", lambda msg: print(f"Console error: {msg.text}") if msg.type == "error" else None)
#
#         target_url = f"{live_server.url}/user/login"
#         print(f"Testing URL: {target_url}")
#
#         page.goto(target_url)
#         assert "Login" in page.title() or "login" in page.url
#         browser.close()
#
#
# # CRITICAL FIX: Added 'sample_admin' to arguments!
# # This forces pytest to create the user in the DB before the test starts.
# def test_login_and_view_homepage(live_server, sample_admin, page):
#     """
#     CUJ: User can log in and sees the main chat interface.
#     """
#     # FIX: Use password '1234' (matches your Config and sample_admin fixture)
#     login(page, live_server.url, "admin", "1234")
#
#     # Assert we are on the homepage
#     expect(page).to_have_title(lambda t: "Chat" in t or "Home" in t)
#
#     # Assert the Chat UI elements exist
#     expect(page.locator("#chat")).to_be_visible()
#     expect(page.locator("#messageForm")).to_be_visible()
#
#
# def test_send_message_appears_in_chat(live_server, sample_admin, page):
#     """
#     CUJ: User sends a message and it appears in the chat window immediately.
#     """
#     login(page, live_server.url, "admin", "1234")
#
#     test_message = f"Automated Test Message {live_server.url}"
#
#     # Type message
#     page.fill("#message", test_message)
#
#     # FIX: Use the class selector '.send-button' (from your index.html)
#     # The old 'button[type=submit]' might miss if you change the HTML structure.
#     page.click(".send-button")
#
#     # Check if the message appears in the chat container
#     expect(page.locator("#chat")).to_contain_text(test_message, timeout=5000)
#
#
# def test_profile_link_navigation(live_server, sample_admin, page):
#     """
#     CUJ: Clicking a username in chat navigates to their profile.
#     """
#     login(page, live_server.url, "admin", "1234")
#
#     # 1. Ensure there is a message
#     page.fill("#message", "Link Test")
#     page.click(".send-button")
#
#     # 2. Find the profile link for 'admin'
#     # We use .first because multiple messages might exist
#     profile_link = page.locator("#chat a[href*='/user/profile/admin']").first
#
#     # 3. Click and verify navigation
#     profile_link.click()
#
#     # 4. Assert URL is correct
#     expect(page).to_have_url(f"{live_server.url}/user/profile/admin")