import asyncio
import os

from playwright.async_api import async_playwright

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "docs", "screenshots"))
MOBILE_OUTPUT_DIR = os.path.join(OUTPUT_DIR, "mobile")

async def capture_screenshots():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(MOBILE_OUTPUT_DIR, exist_ok=True)
    print(f"Saving desktop screenshots to: {OUTPUT_DIR}")
    print(f"Saving mobile screenshots to: {MOBILE_OUTPUT_DIR}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        # ==========================================
        # 1. DESKTOP SCREENS & MODALS (1440x900)
        # ==========================================
        print("\n--- Capturing Admin Desktop Screens & Modals ---")
        admin_context = await browser.new_context(viewport={"width": 1440, "height": 900})
        admin_page = await admin_context.new_page()

        await admin_page.goto("http://localhost:8000/dev-login?role=admin")
        await admin_page.wait_for_timeout(1000)

        admin_routes = [
            ("http://localhost:5173/admin/dashboard", "admin_dashboard.png"),
            ("http://localhost:5173/admin/to-review", "admin_to_review.png"),
            ("http://localhost:5173/admin/projects", "admin_projects.png"),
            ("http://localhost:5173/admin/assign-project", "admin_assign_project.png"),
            ("http://localhost:5173/admin/standard-projects", "admin_standard_projects.png"),
            ("http://localhost:5173/admin/certificates", "admin_certificates.png"),
            ("http://localhost:5173/admin/users", "admin_users.png"),
            ("http://localhost:5173/admin/classes", "admin_classes.png"),
            ("http://localhost:5173/admin/analytics", "admin_analytics.png"),
            ("http://localhost:5173/admin/add-achievement", "admin_achievements.png"),
            ("http://localhost:5173/admin/add-challenges", "admin_challenges.png"),
            ("http://localhost:5173/admin/documents", "admin_documents.png"),
            ("http://localhost:5173/admin/pending-trades", "admin_pending_trades.png"),
            ("http://localhost:5173/admin/pending-users", "admin_pending_users.png"),
            ("http://localhost:5173/admin/advanced", "admin_advanced.png"),
            ("http://localhost:5173/admin/transactions", "admin_duck_transactions.png"),
            ("http://localhost:5173/admin/student-activity", "admin_student_activity.png"),
            ("http://localhost:5173/admin/advanced-crud", "admin_crud.png"),
        ]

        for url, filename in admin_routes:
            try:
                await admin_page.goto(url, wait_until="networkidle")
                await admin_page.wait_for_timeout(1500)
                await admin_page.screenshot(path=os.path.join(OUTPUT_DIR, filename))
                print(f"  Captured Desktop -> {filename}")
            except Exception as e:
                print(f"  Failed {filename}: {e}")

        # --- ADMIN MODALS ---
        print("\n--- Capturing Admin Modals ---")
        try:
            # 1. Create User Modal
            await admin_page.goto("http://localhost:5173/admin/users", wait_until="networkidle")
            await admin_page.wait_for_timeout(1500)
            create_user_btn = admin_page.get_by_role("button", name=lambda n: "create" in n.lower() or "user" in n.lower()).first
            if await create_user_btn.is_visible():
                await create_user_btn.click()
                await admin_page.wait_for_timeout(1000)
                await admin_page.screenshot(path=os.path.join(OUTPUT_DIR, "modal_create_user.png"))
                print("  Captured -> modal_create_user.png")

            # 2. Adjust Ducks Modal
            await admin_page.goto("http://localhost:5173/admin/users", wait_until="networkidle")
            await admin_page.wait_for_timeout(1500)
            duck_btn = admin_page.locator("button:has-text('Duck'), button:has-text('Adjust')").first
            if await duck_btn.is_visible():
                await duck_btn.click()
                await admin_page.wait_for_timeout(1000)
                await admin_page.screenshot(path=os.path.join(OUTPUT_DIR, "modal_adjust_ducks.png"))
                print("  Captured -> modal_adjust_ducks.png")

            # 3. Create Class Modal
            await admin_page.goto("http://localhost:5173/admin/classes", wait_until="networkidle")
            await admin_page.wait_for_timeout(1500)
            create_class_btn = admin_page.get_by_role("button", name=lambda n: "class" in n.lower()).first
            if await create_class_btn.is_visible():
                await create_class_btn.click()
                await admin_page.wait_for_timeout(1000)
                await admin_page.screenshot(path=os.path.join(OUTPUT_DIR, "modal_create_class.png"))
                print("  Captured -> modal_create_class.png")
        except Exception as e:
            print(f"  Modal capture notice: {e}")

        await admin_context.close()

        # --- STUDENT DESKTOP SCREENS & MODALS ---
        print("\n--- Capturing Student Desktop Screens & Modals ---")
        student_context = await browser.new_context(viewport={"width": 1440, "height": 900})
        student_page = await student_context.new_page()

        await student_page.goto("http://localhost:8000/dev-login?role=student")
        await student_page.wait_for_timeout(1000)

        student_routes = [
            ("http://localhost:5173/chat", "student_chat.png"),
            ("http://localhost:5173/profile", "student_profile.png"),
            ("http://localhost:5173/course-progress/intro-to-python", "student_course_progress.png"),
            ("http://localhost:5173/course-progress/intro-to-python/breakdown", "student_course_breakdown.png"),
            ("http://localhost:5173/achievements", "student_achievements.png"),
            ("http://localhost:5173/bit-shift", "student_bit_shift.png"),
            ("http://localhost:5173/shop", "student_shop.png"),
            ("http://localhost:5173/submit-work", "student_submit_work.png"),
            ("http://localhost:5173/settings", "student_settings.png"),
            ("http://localhost:5173/project/new", "student_create_project.png"),
        ]

        for url, filename in student_routes:
            try:
                await student_page.goto(url, wait_until="networkidle")
                await student_page.wait_for_timeout(1500)
                await student_page.screenshot(path=os.path.join(OUTPUT_DIR, filename))
                print(f"  Captured Desktop -> {filename}")
            except Exception as e:
                print(f"  Failed {filename}: {e}")

        # Student Modals & Dropdowns
        try:
            # User Profile Dropdown
            await student_page.goto("http://localhost:5173/chat", wait_until="networkidle")
            await student_page.wait_for_timeout(1500)
            user_menu_btn = student_page.locator(".avatar, .user-menu, button:has(.avatar)").first
            if await user_menu_btn.is_visible():
                await user_menu_btn.click()
                await student_page.wait_for_timeout(800)
                await student_page.screenshot(path=os.path.join(OUTPUT_DIR, "dropdown_user_profile.png"))
                print("  Captured -> dropdown_user_profile.png")

            # Shop Purchase Modal
            await student_page.goto("http://localhost:5173/shop", wait_until="networkidle")
            await student_page.wait_for_timeout(1500)
            buy_btn = student_page.locator("button:has-text('Buy'), button:has-text('Purchase'), button:has-text('Get')").first
            if await buy_btn.is_visible():
                await buy_btn.click()
                await student_page.wait_for_timeout(800)
                await student_page.screenshot(path=os.path.join(OUTPUT_DIR, "modal_shop_purchase.png"))
                print("  Captured -> modal_shop_purchase.png")
        except Exception as e:
            print(f"  Student interaction notice: {e}")

        await student_context.close()

        # --- PARENT & PUBLIC DESKTOP SCREENS ---
        print("\n--- Capturing Parent & Public Desktop Screens ---")
        parent_context = await browser.new_context(viewport={"width": 1440, "height": 900})
        parent_page = await parent_context.new_page()

        await parent_page.goto("http://localhost:8000/dev-login?role=parent")
        await parent_page.wait_for_timeout(1000)

        for url, filename in [("http://localhost:5173/parent/dashboard", "parent_dashboard.png"), ("http://localhost:5173/parent/connect", "parent_connect_child.png")]:
            await parent_page.goto(url, wait_until="networkidle")
            await parent_page.wait_for_timeout(1500)
            await parent_page.screenshot(path=os.path.join(OUTPUT_DIR, filename))
            print(f"  Captured Desktop -> {filename}")

        await parent_context.close()

        guest_context = await browser.new_context(viewport={"width": 1440, "height": 900})
        guest_page = await guest_context.new_page()

        for url, filename in [("http://localhost:5173/", "public_landing.png"), ("http://localhost:5173/login", "public_login.png"), ("http://localhost:5173/signup", "public_signup.png"), ("http://localhost:5173/forgot-password", "public_forgot_password.png")]:
            await guest_page.goto(url, wait_until="networkidle")
            await guest_page.wait_for_timeout(1500)
            await guest_page.screenshot(path=os.path.join(OUTPUT_DIR, filename))
            print(f"  Captured Desktop -> {filename}")

        await guest_context.close()

        # ==========================================
        # 2. MOBILE VIEWPORT SCREENS (390x844)
        # ==========================================
        print("\n--- Capturing Mobile Viewport Screens (390x844) ---")
        mobile_context = await browser.new_context(
            viewport={"width": 390, "height": 844},
            is_mobile=True,
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
        )
        mobile_page = await mobile_context.new_page()

        # Mobile Public Pages
        for url, filename in [
            ("http://localhost:5173/", "mobile_landing.png"),
            ("http://localhost:5173/login", "mobile_login.png"),
            ("http://localhost:5173/signup", "mobile_signup.png"),
            ("http://localhost:5173/forgot-password", "mobile_forgot_password.png"),
        ]:
            try:
                await mobile_page.goto(url, wait_until="networkidle")
                await mobile_page.wait_for_timeout(1500)
                await mobile_page.screenshot(path=os.path.join(MOBILE_OUTPUT_DIR, filename))
                print(f"  Captured Mobile -> {filename}")
            except Exception as e:
                print(f"  Failed Mobile {filename}: {e}")

        # Mobile Student Pages & Sidebar Drawer
        print("\nAuthenticating Mobile Student...")
        await mobile_page.goto("http://localhost:8000/dev-login?role=student")
        await mobile_page.wait_for_timeout(1000)

        mobile_student_routes = [
            ("http://localhost:5173/chat", "mobile_chat.png"),
            ("http://localhost:5173/profile", "mobile_profile.png"),
            ("http://localhost:5173/course-progress/intro-to-python", "mobile_course_progress.png"),
            ("http://localhost:5173/course-progress/intro-to-python/breakdown", "mobile_course_breakdown.png"),
            ("http://localhost:5173/achievements", "mobile_achievements.png"),
            ("http://localhost:5173/bit-shift", "mobile_bit_shift.png"),
            ("http://localhost:5173/shop", "mobile_shop.png"),
            ("http://localhost:5173/submit-work", "mobile_submit_work.png"),
            ("http://localhost:5173/settings", "mobile_settings.png"),
            ("http://localhost:5173/project/new", "mobile_create_project.png"),
        ]

        for url, filename in mobile_student_routes:
            try:
                await mobile_page.goto(url, wait_until="networkidle")
                await mobile_page.wait_for_timeout(1500)
                await mobile_page.screenshot(path=os.path.join(MOBILE_OUTPUT_DIR, filename))
                print(f"  Captured Mobile -> {filename}")
            except Exception as e:
                print(f"  Failed Mobile {filename}: {e}")

        # Mobile Sidebar Drawer Capture
        try:
            await mobile_page.goto("http://localhost:5173/chat", wait_until="networkidle")
            await mobile_page.wait_for_timeout(1500)
            hamburger_btn = mobile_page.locator(".hamburger-icon, button:has(svg), .menu-toggle, header button").first
            if await hamburger_btn.is_visible():
                await hamburger_btn.click()
                await mobile_page.wait_for_timeout(800)
                await mobile_page.screenshot(path=os.path.join(OUTPUT_DIR, "drawer_mobile_sidebar.png"))
                print("  Captured -> drawer_mobile_sidebar.png")
        except Exception as e:
            print(f"  Mobile drawer notice: {e}")

        # Mobile Admin Pages
        print("\nAuthenticating Mobile Admin...")
        await mobile_page.goto("http://localhost:8000/dev-login?role=admin")
        await mobile_page.wait_for_timeout(1000)

        mobile_admin_routes = [
            ("http://localhost:5173/admin/dashboard", "mobile_admin_dashboard.png"),
            ("http://localhost:5173/admin/to-review", "mobile_admin_to_review.png"),
            ("http://localhost:5173/admin/projects", "mobile_admin_projects.png"),
            ("http://localhost:5173/admin/users", "mobile_admin_users.png"),
            ("http://localhost:5173/admin/classes", "mobile_admin_classes.png"),
            ("http://localhost:5173/admin/analytics", "mobile_admin_analytics.png"),
        ]

        for url, filename in mobile_admin_routes:
            try:
                await mobile_page.goto(url, wait_until="networkidle")
                await mobile_page.wait_for_timeout(1500)
                await mobile_page.screenshot(path=os.path.join(MOBILE_OUTPUT_DIR, filename))
                print(f"  Captured Mobile -> {filename}")
            except Exception as e:
                print(f"  Failed Mobile {filename}: {e}")

        await mobile_context.close()
        await browser.close()
        print("\nAll Desktop, Mobile, and Modal screenshots captured successfully!")

if __name__ == "__main__":
    asyncio.run(capture_screenshots())
