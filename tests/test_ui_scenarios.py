# from playwright.sync_api import expect
#
#
# # --- Helpers ---
#
# def login_as_admin(page, base_url):
#     """
#     Helper to log in as the admin user created by fixtures.
#     """
#     page.goto(f"{base_url}/user/login")
#
#     # Selectors from your login.html
#     page.fill("#username", "admin")
#     page.fill("#password", "1234")  # Default from your config.py
#
#     # WTForms usually renders submit as an input or button
#     page.click("input[type='submit'], button[type='submit']")
#
#     # Wait for redirect to confirm success
#     page.wait_for_url(f"{base_url}/")
#
#
# # --- Tests ---
#
# def test_login_flow(live_server, sample_admin, page):
#     """
#     Verifies a user can log in and sees the correct dashboard elements.
#     """
#     login_as_admin(page, live_server.url)
#
#     # Check for elements in base.html and index.html
#     expect(page.locator("#logo-container")).to_be_visible()
#     expect(page.locator("#messageForm")).to_be_visible()
#
#     # Check if the "Ducks" balance from base.html is visible (default 0)
#     expect(page.locator(".digital-ducks .count")).to_be_visible()
#
#
# def test_chat_messaging(live_server, sample_admin, page):
#     """
#     Verifies sending a text message updates the UI immediately.
#     """
#     login_as_admin(page, live_server.url)
#
#     test_message = f"Hello Playwright {live_server.url}"
#
#     # 1. Type message
#     page.fill("#message", test_message)
#
#     # 2. Click send (using the class from index.html)
#     page.click(".send-button")
#
#     # 3. Verify it appears in the chat div
#     # We increase timeout slightly because of the 2000ms polling interval in JS
#     expect(page.locator("#chat")).to_contain_text(test_message, timeout=4000)
#
#
# def test_profile_link_generation(live_server, sample_admin, page):
#     """
#     Verifies that chat messages contain clickable links to user profiles
#     using the username (handle), NOT the ID.
#     """
#     login_as_admin(page, live_server.url)
#
#     # Send a message to ensure we have content
#     page.fill("#message", "Link Check")
#     page.click(".send-button")
#
#     # Wait for the message to appear
#     expect(page.locator("#chat")).to_contain_text("Link Check")
#
#     # Locate the profile image link inside the chat message
#     # Your JS: <a href="/user/profile/admin">...</a>
#     # We look for the 'admin' part specifically
#     profile_link = page.locator(f"#chat a[href*='/user/profile/admin']").first
#
#     # Click it
#     profile_link.click()
#
#     # Verify we navigated to the profile page
#     expect(page).to_have_url(f"{live_server.url}/user/profile/admin")
#
#
# def test_file_upload_ui(live_server, sample_admin, page):
#     """
#     Verifies the file input accepts a file and attempts an upload.
#     """
#     login_as_admin(page, live_server.url)
#
#     # Create a dummy file in memory
#     page.set_input_files("#file", {
#         "name": "test_image.png",
#         "mimeType": "image/png",
#         "buffer": b"fake_image_content"
#     })
#
#     # In your JS, submitting the form triggers uploadFile() if a file is present
#     page.click(".send-button")
#
#     # We expect a SweetAlert2 popup (Mr. Mega says...)
#     # We check for the class 'swal2-popup' which is standard for SweetAlert
#     expect(page.locator(".swal2-popup")).to_be_visible()
#
#     # Optional: Check if the text says "uploaded successfully" or similar
#     # (Depending on how your backend handles the fake image)
#     # expect(page.locator(".swal2-html-container")).to_contain_text("successfully")