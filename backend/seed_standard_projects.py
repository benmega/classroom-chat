from application import create_app
from application.extensions import db
from application.models.standard_project import StandardProject

seed_data = [
    ("Text-Based Adventure", "In this project students create a text-based adventure game where players navigate through different scenarios solving puzzles and making choices that affect the outcome. The game introduces basic coding concepts such as variables loops and conditionals. It offers an interactive and engaging way to learn programming while creating a fun story-driven experience.", "Computer Science 2"),
    ("Practical Programming", "In this project students designed and built a practical program to solve a real-life problem or simplify a daily task. They brainstormed ideas identified a need and used their coding skills to create a tool or script that met this need. The project encouraged creative thinking and helped students apply what they learned in class. By the end they had a functional program that could be used beyond the classroom showing how coding can make everyday tasks easier.", None),
    ("Dangerous Skies", "Create an obstacle course using for and while loops based on player performance. Learning Goals: Use for and while loops to build an obstacle course. Concepts Covered: Data Types For Loops Iteration Nesting While Loops", "Ozaria Chapter 3"),
    ("Turtle Dragon", "This project helps students practice key programming concepts like objects, methods, and arguements all while expressing their creativity. Each student will design and code their own unique dragon bringing it to life through code.", "Introduction to Computer Science"),
    ("Simulation", "In this capstone project students will create a simulation of their choosing. The project emphasizes applying the Engineering Design Process: defining the problem designing a solution building the simulation revising based on user feedback and reflecting on the process. Students are encouraged to use tools and resources including randomization or other functions to create dynamic simulations. Peer collaboration is key as students will test each other’s simulations and provide constructive feedback to improve the final project.", "Computer Science 3"),
    ("bolt.new", "In this project students utilize bolt.new—an AI-powered web development environment—to prompt iterate and deploy a full-stack web application using natural language commands.", None),
    ("Tabula Rasa", "In this project students create a CodeCombat game level from scratch by spawning all the objects enemies and goals needed to make the game playable. They learn how to use coordinates to position items on the grid set object properties to control behavior and define victory conditions through goals. By the end students understand how a game world is built programmatically—how each element is placed configured and connected to form a complete functional level.", "Game Development 1"),
    ("Gauntlet", "In this challenge students must program their hero to survive a gauntlet of enemies and traps. The project focuses on refining movement logic timing and debugging code to ensure the hero completes the course safely.", "Sky Mountain"),
    ("Game Dev 1 Final Project", "In this project students create a CodeCombat game level from scratch by spawning all the objects enemies and goals needed to make the game playable. They learn how to use coordinates to position items on the grid set object properties to control behavior and define victory conditions through goals.", "Game Development 1"),
    ("Story Maker", "Students use event handling and conditionals to create an interactive story. This project focuses on capturing user input to create branching narratives allowing players to choose different paths through the storyline.", "Ozaria Chapter 2"),
    ("Wanted Poster", "Students apply their knowledge of layout and positioning to design a digital Wanted Poster. This project emphasizes the use of coordinates (or HTML/CSS) to arrange text and images in a visually appealing format.", "Web Development 1"),
    ("Game Dev 2 Final Project", "Students build a complex game level that introduces user input handling. They learn to create event listeners for keyboard or mouse actions allowing for interactive character movement and game mechanics.", "Game Development 2"),
    ("Quizlet", "Students create a quiz application using data structures like arrays and dictionaries. The focus is on storing questions and answers paired together checking user input against the stored data and tracking the score.", "Web Development 2"),
    ("Game Dev 3", "In this advanced game development project students implement complex game logic including multiple levels scoring systems and enemy AI behavior. It requires mastering functions and state management.", "Game Development 3"),
    ("Arcade Card or Board Game", "Students design and program a digital version of a classic arcade card or board game. This project emphasizes object-oriented programming principles game physics and complex logic flow.", "Computer Science 4"),
    ("Curiosity Sandbox", "Students utilize advanced logic and creative coding tools to build an open-ended simulation or interactive art piece. The project encourages experimentation with loops and variables to generate dynamic visual effects.", "Ozaria 4"),
    ("Binary Search & Algorithms", "Students explore computer science fundamentals by implementing efficient search and sorting algorithms to solve complex data problems.", "Computer Science 5"),
    ("Capstone Challenge", "The final challenge where students combine all learned skills to solve complex algorithmic puzzles or build a comprehensive software application from scratch.", "Computer Science 6"),
    ("Group Roblox Game", "Our class has completed our first group project ” their very own Roblox game! By working together, they were able to build something much bigger than they could have achieved individually. While the game itself still has a lot of work ahead, this project has been a fantastic experience in teamwork, collaboration, and real-world development.", "Ozaria 4"),
    ("Favorite Animal Page", "", "Web Development 1"),
    ("Profile Page", "Students put their knowledge of HTML, CSS, and JS to work by creating their very own profile page! This will be a starting point for a future portfolio/resume page where they can show off all their accomplishments.", "Web Development 2")
]

app = create_app()
with app.app_context():
    count = 0
    # Also need to seed the new chapter field on ProjectTemplates.
    from application.models.project_template import ProjectTemplate
    for name, desc, chapter in seed_data:
        # Seed standard projects (which admins assign)
        sp = StandardProject.query.filter_by(name=name).first()
        if not sp:
            sp = StandardProject(name=name, description=desc)
            db.session.add(sp)
            count += 1
            
        # Seed project templates (used to render on the course map and assign dropdown)
        pt = ProjectTemplate.query.filter_by(name=name).first()
        if not pt:
            pt = ProjectTemplate(name=name, description=desc, chapter=chapter)
            db.session.add(pt)
        else:
            pt.chapter = chapter
            
    db.session.commit()
    print(f"Seeded standard projects and templates.")    
    db.session.commit()
    print(f"Seeded {count} standard projects.")
