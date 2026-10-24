# Features

## Real-Time Chat
- Built using Flask-SocketIO for efficient, real-time communication.
- Detects URLs for educational purposes, such as CodeCombat links.

## Challenge Tracking & Gamification
- Challenges are assigned unique slug names for easy reference.
- Teachers can define challenge point values.
- Achievements and milestone badges awarded to students.
- **Interactive Course Progress (Skill Tree)**: A visual, zoomable skill tree mapping out tracks (Computer Science, Game Dev, Web Dev, Ozaria) that displays progress, prerequisites, and connects to detailed learning breakdowns highlighting educational concepts for parents.

## Economy & Shop (Duck System)
- Ducks are awarded upon challenge completion and achievements.
- **Test ducks**: A student's first submitted attempt at a [student test](student_tests.md) pays 1 duck per correct answer, once per test. Perks do not multiply it.
- **Note**: The "Permanent Double Duck" store perk doubles daily and challenge duck earnings, but **does not** apply to ducks awarded via achievements.
- Real-time updates to profile.
- **Duck Trades**: Students can trade ducks with peers.
- **Shop**: Students can spend ducks on virtual store items.
- **Bit Shift (Binary-to-Decimal Duck Trade)**: An educational mini-game where students convert their "digital ducks" into "bit" and "byte" ducks by solving binary math conversions.

## Student Tests
- Multiple-choice tests at `/tests`: one question at a time, flagging, autosave, an optional time limit with automatic submit, and diagrams (HTML/SVG in a sandboxed frame). Three Computer Science tests (grades 3-5, 6-8, 9-11) ship as JSON files loaded by `flask seed`.
- Graded on the server; the answer key is never sent before submit, and a snapshot taken at submit keeps old results fixed when questions change later.
- Students see the review (key and explanations) only when the test's "Answers shown" is on; admins and linked parents always see it. Results never appear on the public profile, in chat or in the activity feed.
- Admins (`/admin/tests`) switch each test active or inactive, show or hide answers, allow or stop retakes and set a time limit (1-600 min); they read results, export them as CSV and delete an attempt so the student can retake. Parents see their child's results on the report card.
- Details: [student_tests.md](student_tests.md).

## Customizable Profiles & Portfolios
- Users can edit their password and avatar.
- Ducks, achievements, and earned certificates are displayed prominently.
- **Projects**: Students can build and showcase programming projects on their profile. A project is a `code` or a `3d` project (3D modeling templates are `3d`) and holds files of three kinds: 3D models (STL, OBJ, glTF/GLB, 3MF, PLY), source files (shown as text) and assets (images, audio, PDF), uploaded with the project form and served publicly with the profile.
- **Skills**: Students can list acquired programming skills.
- **Project Templates & Assignments**: Teachers/admins can define standard project templates mapped to specific chapters and difficulty levels, and assign them directly to students.

## Roles & Portals
- Support for Student, Teacher (Admin), and **Parent** roles.
- Parent dashboard to monitor student progress and achievements.

## Classroom Management
- Support for multiple **Classrooms**, **Courses**, and **Course Instances**.
- Enables grouping students logically by their real-world classes.
- **Classroom Join Audit & Rate Limiting**: Tracks every student attempt to join a classroom via a join code, enforcing rate limits to prevent abuse and provide an audit log.
- **Approval Workflows**: Students can request access to different learning tracks and unrecognized course instances, which admins can approve or reject via a review dashboard.

## Moderation & Safety
- **Banned Words**: Automatic chat moderation to filter inappropriate language.
- Notes system for teachers to keep track of student behavior or progress privately.

## Submissions & Analytics
- **Session Tracking & Analytics**: Records start time, end time, and total duration of user sessions, as well as a "last seen" timestamp.
- **Homework Inbox & File Submissions**: A system for student file submissions, tracking uploaded files, notes, and review status.
- **Kiosk Upload Mode**: A mode allowing a classroom device to be set up as a kiosk for students to quickly upload photos of handwritten notes.