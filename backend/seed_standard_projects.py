from application import create_app
from application.extensions import db

seed_data = [
    (
        "Text-Based Adventure",
        "In this project students create a text-based adventure game where players navigate through different scenarios solving puzzles and making choices that affect the outcome. The game introduces basic coding concepts such as variables loops and conditionals. It offers an interactive and engaging way to learn programming while creating a fun story-driven experience.",
        "Computer Science 2",
    ),
    (
        "Practical Programming",
        "In this project students designed and built a practical program to solve a real-life problem or simplify a daily task. They brainstormed ideas identified a need and used their coding skills to create a tool or script that met this need. The project encouraged creative thinking and helped students apply what they learned in class. By the end they had a functional program that could be used beyond the classroom showing how coding can make everyday tasks easier.",
        None,
    ),
    (
        "Dangerous Skies",
        "Create an obstacle course using for and while loops based on player performance. Learning Goals: Use for and while loops to build an obstacle course. Concepts Covered: Data Types For Loops Iteration Nesting While Loops",
        "Ozaria Chapter 3",
    ),
    (
        "Turtle Dragon",
        "This project helps students practice key programming concepts like objects, methods, and arguements all while expressing their creativity. Each student will design and code their own unique dragon bringing it to life through code.",
        "Introduction to Computer Science",
    ),
    (
        "Simulation",
        "In this capstone project students will create a simulation of their choosing. The project emphasizes applying the Engineering Design Process: defining the problem designing a solution building the simulation revising based on user feedback and reflecting on the process. Students are encouraged to use tools and resources including randomization or other functions to create dynamic simulations. Peer collaboration is key as students will test each other's simulations and provide constructive feedback to improve the final project.",

        "Computer Science 3",
    ),
    (
        "bolt.new",
        "In this project students utilize bolt.new—an AI-powered web development environment—to prompt iterate and deploy a full-stack web application using natural language commands.",
        None,
    ),
    (
        "Tabula Rasa",
        "In this project students create a CodeCombat game level from scratch by spawning all the objects enemies and goals needed to make the game playable. They learn how to use coordinates to position items on the grid set object properties to control behavior and define victory conditions through goals. By the end students understand how a game world is built programmatically—how each element is placed configured and connected to form a complete functional level.",
        "Game Development 1",
    ),
    (
        "Gauntlet",
        "In this challenge students must program their hero to survive a gauntlet of enemies and traps. The project focuses on refining movement logic timing and debugging code to ensure the hero completes the course safely.",
        "Sky Mountain",
    ),
    (
        "Game Dev 1 Final Project",
        "In this project students create a CodeCombat game level from scratch by spawning all the objects enemies and goals needed to make the game playable. They learn how to use coordinates to position items on the grid set object properties to control behavior and define victory conditions through goals.",
        "Game Development 1",
    ),
    (
        "Story Maker",
        "Students use event handling and conditionals to create an interactive story. This project focuses on capturing user input to create branching narratives allowing players to choose different paths through the storyline.",
        "Ozaria Chapter 2",
    ),
    (
        "Wanted Poster",
        "Students apply their knowledge of layout and positioning to design a digital Wanted Poster. This project emphasizes the use of coordinates (or HTML/CSS) to arrange text and images in a visually appealing format.",
        "Web Development 1",
    ),
    (
        "Game Dev 2 Final Project",
        "Students build a complex game level that introduces user input handling. They learn to create event listeners for keyboard or mouse actions allowing for interactive character movement and game mechanics.",
        "Game Development 2",
    ),
    (
        "Quizlet",
        "Students create a quiz application using data structures like arrays and dictionaries. The focus is on storing questions and answers paired together checking user input against the stored data and tracking the score.",
        "Web Development 2",
    ),
    (
        "Game Dev 3",
        "In this advanced game development project students implement complex game logic including multiple levels scoring systems and enemy AI behavior. It requires mastering functions and state management.",
        "Game Development 3",
    ),
    (
        "Arcade Card or Board Game",
        "Students design and program a digital version of a classic arcade card or board game. This project emphasizes object-oriented programming principles game physics and complex logic flow.",
        "Computer Science 4",
    ),
    (
        "Curiosity Sandbox",
        "Students utilize advanced logic and creative coding tools to build an open-ended simulation or interactive art piece. The project encourages experimentation with loops and variables to generate dynamic visual effects.",
        "Ozaria 4",
    ),
    (
        "Binary Search & Algorithms",
        "Students explore computer science fundamentals by implementing efficient search and sorting algorithms to solve complex data problems.",
        "Computer Science 5",
    ),
    (
        "Capstone Challenge",
        "The final challenge where students combine all learned skills to solve complex algorithmic puzzles or build a comprehensive software application from scratch.",
        "Computer Science 6",
    ),
    (
        "Group Roblox Game",
        "Our class has completed our first group project ” their very own Roblox game! By working together, they were able to build something much bigger than they could have achieved individually. While the game itself still has a lot of work ahead, this project has been a fantastic experience in teamwork, collaboration, and real-world development.",
        "Ozaria 4",
    ),
    ("Favorite Animal Page", "", "Web Development 1"),
    (
        "Profile Page",
        "Students put their knowledge of HTML, CSS, and JS to work by creating their very own profile page! This will be a starting point for a future portfolio/resume page where they can show off all their accomplishments.",
        "Web Development 2",
    ),
]
PROJECT_EXTRA_DETAILS = {
    "Text-Based Adventure": {
        "difficulty": "Beginner",
        "concepts": ["Variables", "Loops", "Conditionals", "Input Handling"],
        "goals": [
            "Create a branching story structure using if/else conditions.",
            "Understand user input loop control.",
            "Implement scoring or inventory tracking with variables."
        ]
    },
    "Practical Programming": {
        "difficulty": "Intermediate",
        "concepts": ["Real-world application", "Problem Solving", "Scripting"],
        "goals": [
            "Identify a day-to-day problem that can be automated.",
            "Design and build a tool/script to address the problem.",
            "Refactor code to make it reusable."
        ]
    },
    "Dangerous Skies": {
        "difficulty": "Beginner",
        "concepts": ["For Loops", "While Loops", "Iteration", "Nesting"],
        "goals": [
            "Build an obstacle course based on player performance.",
            "Combine for and while loops for game flow control.",
            "Master iterating through complex structures."
        ]
    },
    "Turtle Dragon": {
        "difficulty": "Beginner",
        "concepts": ["Objects", "Methods", "Arguments", "Creative Coding"],
        "goals": [
            "Practice core programming syntax: instantiating objects.",
            "Design unique custom dragon behaviors.",
            "Pass parameters/arguments to custom functions."
        ]
    },
    "Simulation": {
        "difficulty": "Advanced",
        "concepts": ["Engineering Design Process", "Randomization", "Collaboration"],
        "goals": [
            "Build a dynamic system simulation of your choice.",
            "Apply user testing feedback to improve the model.",
            "Incorporate randomized outcomes to mimic real-world complexity."
        ]
    },
    "bolt.new": {
        "difficulty": "Intermediate",
        "concepts": ["AI Prompting", "Full-Stack Deployment", "Rapid Prototyping"],
        "goals": [
            "Use natural language prompts to model full-stack apps.",
            "Understand iterative deployment workflows.",
            "Deploy a live functional application."
        ]
    },
    "Tabula Rasa": {
        "difficulty": "Intermediate",
        "concepts": ["Coordinates", "Object Properties", "Victory Conditions"],
        "goals": [
            "Program a grid game level from scratch.",
            "Set coordinates and properties for spawned entities.",
            "Define custom victory triggers."
        ]
    },
    "Gauntlet": {
        "difficulty": "Intermediate",
        "concepts": ["Movement Logic", "Timing", "Debugging"],
        "goals": [
            "Refine character movement and collision detection.",
            "Time enemy spawns and environmental traps.",
            "Debug complex logical loops to ensure player survival."
        ]
    },
    "Game Dev 1 Final Project": {
        "difficulty": "Intermediate",
        "concepts": ["Game Grid", "Spawning", "Victory States"],
        "goals": [
            "Create a playable CodeCombat level.",
            "Spawn enemies and configure coordinates.",
            "Build interactive goals."
        ]
    },
    "Story Maker": {
        "difficulty": "Beginner",
        "concepts": ["Event Handling", "Branching Narratives", "Conditionals"],
        "goals": [
            "Capture player keyboard/mouse input.",
            "Design event listeners for branching stories.",
            "Practice conditional branching."
        ]
    },
    "Wanted Poster": {
        "difficulty": "Beginner",
        "concepts": ["Layout Positioning", "HTML/CSS Layouts", "Styling"],
        "goals": [
            "Design a digital Wanted Poster graphic.",
            "Apply layout structure and grid positioning.",
            "Combine typography and color themes."
        ]
    },
    "Game Dev 2 Final Project": {
        "difficulty": "Intermediate",
        "concepts": ["Event Listeners", "Keyboard Control", "Physics Rules"],
        "goals": [
            "Handle mouse and key listeners for game objects.",
            "Define basic physics and momentum parameters.",
            "Implement multi-button control bindings."
        ]
    },
    "Quizlet": {
        "difficulty": "Intermediate",
        "concepts": ["Arrays", "Dictionaries", "Score Tracking"],
        "goals": [
            "Store paired question/answer sets in key-value maps.",
            "Verify text inputs against storage records.",
            "Implement scoring and level-complete calculations."
        ]
    },
    "Game Dev 3": {
        "difficulty": "Advanced",
        "concepts": ["State Management", "Enemy AI Pathfinding", "Functions"],
        "goals": [
            "Create a complex game with multiple levels.",
            "Implement state patterns for game loops.",
            "Write custom AI movement behavior."
        ]
    },
    "Arcade Card or Board Game": {
        "difficulty": "Advanced",
        "concepts": ["OOP Principles", "Game Physics", "Flow Logic"],
        "goals": [
            "Model card/board rules programmatically using classes.",
            "Code turn-based and phase-based game logic.",
            "Add visual effects for board state changes."
        ]
    },
    "Curiosity Sandbox": {
        "difficulty": "Advanced",
        "concepts": ["Loops & Variables", "Dynamic Art", "Experimental Logic"],
        "goals": [
            "Build an open-ended artistic sandbox simulation.",
            "Utilize loops to generate particles and graphics.",
            "Encourage player interaction and modifications."
        ]
    },
    "Binary Search & Algorithms": {
        "difficulty": "Advanced",
        "concepts": ["Search Algorithms", "Sort Complexity", "Big O Notation"],
        "goals": [
            "Implement binary search and bubble/quick sort.",
            "Understand execution speeds on large data arrays.",
            "Write tests to analyze algorithmic efficiency."
        ]
    },
    "Capstone Challenge": {
        "difficulty": "Advanced",
        "concepts": ["Full-Stack Architecture", "Algorithmic Puzzles", "Deployment"],
        "goals": [
            "Construct a fully-realized custom software app.",
            "Solve complex algorithmic logic problems.",
            "Document code structure and project steps."
        ]
    },
    "Group Roblox Game": {
        "difficulty": "Intermediate",
        "concepts": ["Team Collaboration", "Roblox Lua Scripting", "3D Building"],
        "goals": [
            "Collaborate as a team to construct a Roblox world.",
            "Use Lua scripting to bind elements to interactions.",
            "Learn coordination, versioning, and project management."
        ]
    },
    "Favorite Animal Page": {
        "difficulty": "Beginner",
        "concepts": ["HTML Tags", "Image Embedding", "Basic CSS"],
        "goals": [
            "Learn core HTML elements (headings, paragraphs, images).",
            "Apply CSS font styles, borders, and margins.",
            "Publish a simple website showing facts about an animal."
        ]
    },
    "Profile Page": {
        "difficulty": "Intermediate",
        "concepts": ["Portfolio Design", "Responsive Layouts", "Media Queries"],
        "goals": [
            "Build a responsive profile/portfolio page.",
            "Incorporate responsive layouts that work on mobile and desktop.",
            "Showcase course accomplishments, stats, and links."
        ]
    }
}

DEFAULT_EXTRA = {
    "difficulty": "Intermediate",
    "concepts": ["Computer Science", "Coding Logic", "Problem Solving"],
    "goals": [
        "Define project scope and flow.",
        "Implement basic variables and conditional structures.",
        "Submit final work to teacher for feedback."
    ]
}

app = create_app()
with app.app_context():
    count = 0
    from application.models.project_template import ProjectTemplate

    for name, desc, chapter in seed_data:
        pt = ProjectTemplate.query.filter_by(name=name).first()
        if not pt:
            pt = ProjectTemplate(name=name, description=desc, chapter=chapter)
            db.session.add(pt)
            count += 1
        else:
            pt.chapter = chapter
            pt.description = desc

    db.session.commit()
    print(f"Seeded {count} new project templates.")
