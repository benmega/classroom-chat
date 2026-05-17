

def append_to_file(filename, content):
    path = f"c:/Users/Ben/AntiGravity/classroom-chat/issues/completed/{filename}"
    with open(path, "a") as f:
        f.write("\n\n" + content)

append_to_file("iss_007_backend_test_failures.md", "## Root Cause\nThe test failure was due to an obsolete feature test (login auto-joins recent conversation) that had been removed but the test was not updated. A SQLAlchemy 2.0 deprecation warning was also emitted.\n\n## Changed Files\n- backend/tests/app/routes/test_user_routes.py\n- backend/application/routes/message_routes.py\n- backend/test_results.txt (deleted)")

append_to_file("iss_008_modal_positioning_bug.md", "## Root Cause\nThe `.profile-page` component wrapped the modal components. The CSS `fadeIn` animation on `.profile-page` used a `transform: translateY`, establishing a new containing block for all descendants. This trapped the fixed-position modals inside the `.profile-page` block instead of the viewport.\n\n## Changed Files\n- frontend/src/pages/Profile/index.jsx")

append_to_file("iss_009_profile_modal_aesthetics.md", "## Root Cause\nThere was no CSS definition for `.modal-actions` leaving it unstyled and cramped. The Description heading lacked a Lucide icon. `.teacher-feedback` was using a simple blockquote style, and `.note-item` lacked `cursor: pointer`.\n\n## Changed Files\n- frontend/src/components/profile/ProjectModal.jsx\n- frontend/src/pages/Profile/Profile.css")

append_to_file("iss_010_missing_project_data.md", "## Root Cause\nThe database seeding process lacked logic to provide a high-quality screenshot or proper code snippet for the Classroom Chat project.\n\n## Changed Files\n- backend/scratch/fix_project.py\n- backend/userData/image/classroom_chat_screenshot.png\n- Database updated")

append_to_file("iss_011_mobile_tap_target_sizes.md", "## Root Cause\nThe close buttons were explicitly sized to 40x40px, missing the mobile standard of 44x44px. The media query lacked rules to enlarge them on touch devices.\n\n## Changed Files\n- frontend/src/pages/Profile/Profile.css")

append_to_file("iss_012_mobile_slideshow_navigation.md", "## Root Cause\nMissing CSS rules for `.nav-slide` and `.slide-content`. The arrows had no absolute positioning, opacity, or size. The images defaulted to generic object-fit instead of `contain`.\n\n## Changed Files\n- frontend/src/pages/Profile/Profile.css")

append_to_file("iss_013_mobile_project_admin_overlay.md", "## Root Cause\nThe edit button was placed directly over the project thumbnail and triggered on hover, which caused touch-target collisions on mobile. The fix was to move the edit button entirely to the footer next to 'Details'.\n\n## Changed Files\n- frontend/src/components/profile/ProjectPortfolio.jsx")
