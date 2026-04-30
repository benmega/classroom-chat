# Classroom Chat and Duck System

![Demo Screenshot](assets/demo_screenshot.png)

![Linting Status](https://github.com/your-repo/your-project/actions/workflows/lint.yml/badge.svg)

## Overview
Classroom Chat is a web-based application designed to enhance student interaction and engagement during class. It features real-time chat functionality, challenge tracking, and a gamified reward system called "Ducks." Students can complete challenges to earn ducks, which are displayed on their profiles and the leaderboard.

## Core Features
- **Real-Time Chat:** Allows students to communicate seamlessly during lessons.
- **Challenge System:** Assign and track challenges with specific point values.
- **Duck Rewards:** Gamified system rewarding student achievements.
- **Leaderboards:** Track and display top performers in the class.
- **Profile Customization:** Users can manage their profile and view earned achievements.
- **Educational Design:** Intentional "thinking in binary" philosophy (see [EDUCATIONAL_DESIGN.md](EDUCATIONAL_DESIGN.md)).

## Quick Start

- Follow the installation guide: [INSTALLATION.md](docs/INSTALLATION.md)
- After installing dependencies, run the backend server:

  ```bash
  flask run
  ```

- In another terminal, start the frontend dev server:

  ```bash
  cd frontend
  npm run dev -- --host
  ```

- Open the app at http://127.0.0.1:8000.

## Key Technologies
- Flask (Backend)
- SQLAlchemy (Database)
- HTML/CSS + JavaScript (Frontend)

## Getting Started
For detailed setup instructions, refer to [INSTALLATION.md](docs/INSTALLATION.md).