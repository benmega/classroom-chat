# Features

## Real-Time Chat & AI
- Built using Flask-SocketIO for efficient, real-time communication.
- Detects URLs for educational purposes, such as CodeCombat links.
- "AI Teacher" integration for automated conversational support.
- **AI Settings**: Dynamic configuration for the AI Teacher, allowing admins to modify the AI's role/prompt, customize its username, and toggle the bot on or off globally.

## Challenge Tracking & Gamification
- Challenges are assigned unique slug names for easy reference.
- Teachers can define challenge point values.
- Achievements and milestone badges awarded to students.
- **Interactive Course Progress (Skill Tree)**: A visual, zoomable skill tree mapping out tracks (Computer Science, Game Dev, Web Dev, Ozaria) that displays progress, prerequisites, and connects to detailed learning breakdowns highlighting educational concepts for parents.

## Economy & Shop (Duck System)
- Ducks are awarded upon challenge completion and achievements.
- Real-time updates to profile.
- **Duck Trades**: Students can trade ducks with peers.
- **Shop**: Students can spend ducks on virtual store items.
- **Bit Shift (Binary-to-Decimal Duck Trade)**: An educational mini-game where students convert their "digital ducks" into "bit" and "byte" ducks by solving binary math conversions.

## Customizable Profiles & Portfolios
- Users can edit their username, password, and avatar.
- Ducks, achievements, and earned certificates are displayed prominently.
- **Projects**: Students can build and showcase programming projects on their profile.
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