# Classroom Chat — Complete UI & Screen Documentation

## Executive Overview
**Classroom Chat** is an interactive educational platform designed for computer science classrooms. It integrates real-time classroom communication, gamified learning rewards (Duck Coins), project showcase portfolios, achievement tracking, parent oversight, and admin management tools.

This document serves as the master UI reference manual containing visual documentation for **Desktop Viewports (1440x900)**, **Mobile Responsive Viewports (390x844)**, and **Interactive Modals, Drawers & Submenus**.

---

## Table of Contents
1. [Public & Guest Screens](#1-public--guest-screens)
2. [Student & General App Screens](#2-student--general-app-screens)
3. [Parent Portal Screens](#3-parent-portal-screens)
4. [Admin Management Portal Screens](#4-admin-management-portal-screens)
5. [Interactive Modals, Drawers & Submenus](#5-interactive-modals-drawers--submenus)

---

## 1. Public & Guest Screens

### 1.1 Landing Page
- **URL Path**: `/`
- **Access Role**: Public / Guest
- **Desktop Screenshot**: ![Landing Page Desktop](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/public_landing.png)
- **Mobile Viewport**: ![Landing Page Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/mobile/mobile_landing.png)
- **Description**: Public entry page introducing platform features, code snippets, interactive previews, and call-to-action buttons for registration and sign-in.

### 1.2 Login Page
- **URL Path**: `/login`
- **Access Role**: Public / Guest
- **Desktop Screenshot**: ![Login Page Desktop](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/public_login.png)
- **Mobile Viewport**: ![Login Page Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/mobile/mobile_login.png)
- **Description**: Authentication portal for student and teacher login. Features input fields for username and password, password visibility toggles, and links to registration and password reset.

### 1.3 Signup Page
- **URL Path**: `/signup`
- **Access Role**: Public / Guest
- **Desktop Screenshot**: ![Signup Page Desktop](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/public_signup.png)
- **Mobile Viewport**: ![Signup Page Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/mobile/mobile_signup.png)
- **Description**: Registration form supporting account creation for Students and Parents, including class code validation and account type selection.

### 1.4 Forgot Password Page
- **URL Path**: `/forgot-password`
- **Access Role**: Public / Guest
- **Desktop Screenshot**: ![Forgot Password Desktop](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/public_forgot_password.png)
- **Mobile Viewport**: ![Forgot Password Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/mobile/mobile_forgot_password.png)
- **Description**: Account recovery form allowing users to submit their email address to receive password reset links.

---

## 2. Student & General App Screens

### 2.1 Real-Time Chat & Channels
- **URL Path**: `/chat`
- **Access Role**: Authenticated (Student / Teacher / Admin)
- **Desktop Screenshot**: ![Chat Desktop](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/student_chat.png)
- **Mobile Viewport**: ![Chat Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/mobile/mobile_chat.png)
- **Description**: Central messaging hub with channels, direct messages, inline syntax-highlighted code blocks, duck tipping reactions, and active presence indicators.

### 2.2 Student Profile & Showcase
- **URL Path**: `/profile` / `/profile/:slug`
- **Access Role**: Authenticated Users
- **Desktop Screenshot**: ![Student Profile Desktop](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/student_profile.png)
- **Mobile Viewport**: ![Student Profile Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/mobile/mobile_profile.png)
- **Description**: Personal profile showcase displaying avatar artwork, bio, Duck Coin balance, unlocked badges, level stats, and published projects.

### 2.3 Course Progress Tree
- **URL Path**: `/course-progress/:slug`
- **Access Role**: Student / Parent
- **Desktop Screenshot**: ![Course Progress Tree Desktop](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/student_course_progress.png)
- **Mobile Viewport**: ![Course Progress Tree Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/mobile/mobile_course_progress.png)
- **Description**: Interactive graphical curriculum roadmap visualising course units, completed topics, locked lessons, and milestone checkpoints.

### 2.4 Course Level Breakdown
- **URL Path**: `/course-progress/:slug/breakdown`
- **Access Role**: Student / Parent
- **Desktop Screenshot**: ![Course Level Breakdown Desktop](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/student_course_breakdown.png)
- **Mobile Viewport**: ![Course Level Breakdown Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/mobile/mobile_course_breakdown.png)
- **Description**: Detailed list view of lessons, coding exercises, quizzes, and project submission statuses within a specific course unit.

### 2.5 Achievements & Badges
- **URL Path**: `/achievements`
- **Access Role**: Student
- **Desktop Screenshot**: ![Achievements Desktop](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/student_achievements.png)
- **Mobile Viewport**: ![Achievements Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/mobile/mobile_achievements.png)
- **Description**: Gamification screen showing unlocked achievement badges, progress toward incomplete milestones, and streak rewards.

### 2.6 Bit Shift Arcade Game
- **URL Path**: `/bit-shift`
- **Access Role**: Student
- **Desktop Screenshot**: ![Bit Shift Game Desktop](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/student_bit_shift.png)
- **Mobile Viewport**: ![Bit Shift Game Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/mobile/mobile_bit_shift.png)
- **Description**: Educational coding arcade game for mastering binary arithmetic and bitwise logic through timed puzzle challenges.

### 2.7 Duck Shop Storefront
- **URL Path**: `/shop`
- **Access Role**: Student
- **Desktop Screenshot**: ![Duck Shop Desktop](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/student_shop.png)
- **Mobile Viewport**: ![Duck Shop Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/mobile/mobile_shop.png)
- **Description**: Virtual storefront where students redeem earned Duck Coins for avatar cosmetics, chat badges, profile banners, and classroom perks.

### 2.8 Submit Work Interface
- **URL Path**: `/submit-work`
- **Access Role**: Student
- **Desktop Screenshot**: ![Submit Work Desktop](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/student_submit_work.png)
- **Mobile Viewport**: ![Submit Work Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/mobile/mobile_submit_work.png)
- **Description**: Submission studio for uploading project code repositories, external certificates, and coding challenge solutions for teacher evaluation.

### 2.9 User Settings & Edit Profile
- **URL Path**: `/settings`
- **Access Role**: Authenticated User
- **Desktop Screenshot**: ![Settings Desktop](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/student_settings.png)
- **Mobile Viewport**: ![Settings Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/mobile/mobile_settings.png)
- **Description**: Settings form allowing users to update display names, avatar art, email preferences, and security passwords.

### 2.10 Create / Edit Project Form
- **URL Path**: `/project/new` & `/project/edit/:projectId`
- **Access Role**: Student
- **Desktop Screenshot**: ![Create Project Desktop](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/student_create_project.png)
- **Mobile Viewport**: ![Create Project Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/mobile/mobile_create_project.png)
- **Description**: Project creation wizard for providing project titles, descriptions, repository links, demo URLs, cover images, and technology tags.

---

## 3. Parent Portal Screens

### 3.1 Parent Dashboard
- **URL Path**: `/parent/dashboard`
- **Access Role**: Parent
- **Desktop Screenshot**: ![Parent Dashboard Desktop](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/parent_dashboard.png)
- **Mobile Viewport**: ![Parent Dashboard Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/mobile/mobile_parent_dashboard.png)
- **Description**: Parent oversight dashboard for tracking linked children's course progress, assignment submissions, Duck Coin balance, and teacher notes.

### 3.2 Connect Child Account
- **URL Path**: `/parent/connect`
- **Access Role**: Parent
- **Desktop Screenshot**: ![Connect Child Desktop](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/parent_connect_child.png)
- **Mobile Viewport**: ![Connect Child Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/mobile/mobile_parent_connect.png)
- **Description**: Pairing interface allowing parents to connect to student accounts using a unique parent linkage code.

---

## 4. Admin Management Portal Screens

### 4.1 Admin Overview Dashboard
- **URL Path**: `/admin/dashboard`
- **Access Role**: Admin
- **Desktop Screenshot**: ![Admin Dashboard Desktop](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/admin_dashboard.png)
- **Mobile Viewport**: ![Admin Dashboard Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/mobile/mobile_admin_dashboard.png)
- **Description**: Command center displaying high-level system metrics, pending reviews, active user numbers, and administrative quick actions.

### 4.2 Submissions To Review
- **URL Path**: `/admin/to-review`
- **Access Role**: Admin
- **Desktop Screenshot**: ![To Review Desktop](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/admin_to_review.png)
- **Mobile Viewport**: ![To Review Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/mobile/mobile_admin_to_review.png)
- **Description**: Teacher review queue for assessing student code submissions, grading assignments, leaving feedback, and approving rewards.

### 4.3 Admin Projects Catalog
- **URL Path**: `/admin/projects`
- **Access Role**: Admin
- **Desktop Screenshot**: ![Admin Projects Desktop](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/admin_projects.png)
- **Mobile Viewport**: ![Admin Projects Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/mobile/mobile_admin_projects.png)
- **Description**: Full directory of student-submitted projects with status filters, student search, and approval toggles.

### 4.4 User Directory Management
- **URL Path**: `/admin/users`
- **Access Role**: Admin
- **Desktop Screenshot**: ![Admin Users Desktop](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/admin_users.png)
- **Mobile Viewport**: ![Admin Users Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/mobile/mobile_admin_users.png)
- **Description**: Master directory of all student, parent, and admin accounts supporting password resets, role changes, and duck balance adjustments.

### 4.5 Classroom Directory & Rosters
- **URL Path**: `/admin/classes`
- **Access Role**: Admin
- **Desktop Screenshot**: ![Admin Classes Desktop](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/admin_classes.png)
- **Mobile Viewport**: ![Admin Classes Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/mobile/mobile_admin_classes.png)
- **Description**: Classroom creation and management portal. Displays class join codes, student rosters, assigned teachers, and schedule metadata.

### 4.6 System Analytics Dashboard
- **URL Path**: `/admin/analytics`
- **Access Role**: Admin
- **Desktop Screenshot**: ![Admin Analytics Desktop](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/admin_analytics.png)
- **Mobile Viewport**: ![Admin Analytics Mobile](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/mobile/mobile_admin_analytics.png)
- **Description**: Visual analytics charts detailing student activity trends, chat message volume, assignment completions, and duck coin distribution.

---

## 5. Interactive Modals, Drawers & Submenus

### 5.1 Mobile Navigation Sidebar Drawer
- **Trigger**: Click hamburger menu icon on mobile viewports.
- **Screenshot**: ![Mobile Navigation Drawer](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/drawer_mobile_sidebar.png)
- **Description**: Slide-out navigation drawer providing mobile access to Chat, Profile, Admin Panel, Submit Work, Bit Shift arcade, and account logout.

### 5.2 Create New User Modal
- **Trigger**: Click "+ Create User" button on `/admin/users`.
- **Screenshot**: ![Create New User Modal](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/modal_create_user.png)
- **Description**: Modal dialog for creating new user accounts with username, initial password, starting Duck Coin balance, and assigned role.

### 5.3 Bulk Connection Cards Modal
- **Trigger**: Click "Bulk Connection Cards" button on `/admin/users`.
- **Screenshot**: ![Bulk Connection Cards Modal](file:///c:/Users/Ben/AntiGravity/classroom-chat/docs/screenshots/modal_bulk_connection_cards.png)
- **Description**: Modal window for generating and exporting printable parent connection cards for onboarding new student families.
