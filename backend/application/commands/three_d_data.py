"""
Seed data for the 3D Modeling learning track.

Every challenge is a mini-project with exactly one project template; the
template name equals the challenge name, and the template carries the
challenge slug so that approving the student's project completes the challenge.
"""

THREE_D_DOMAIN = "3d-modeling"

THREE_D_COURSES = [
    {
        "id": "3d-1",
        "name": "TinkerCAD 1",
        "description": (
            "Learn to design 3D objects right in your web browser with Tinkercad. "
            "You will build shapes, cut holes, combine parts, and make models that "
            "are ready to 3D print."
        ),
    },
    {
        "id": "3d-2",
        "name": "Blender 1",
        "description": (
            "Step up to Blender, the free tool that real artists use for movies and "
            "games. You will sculpt a donut from scratch, learn to move around in "
            "3D space, and bring your model to life with animation."
        ),
    },
]

_SUBMIT_TINKERCAD = (
    "Submit your Tinkercad share link in the project link field and attach a "
    "screenshot of your model."
)
_SUBMIT_BLENDER = (
    "Submit your Blender project link (or a shared cloud link to your .blend "
    "file) in the project link field and attach a screenshot of your render."
)

# One entry per challenge, in course order. The position within a course
# becomes Challenge.sequence (1..n).
THREE_D_CHALLENGES = [
    # ------------------------------------------------------------------ TinkerCAD 1
    {
        "course_id": "3d-1",
        "name": "How 3D Printers Work",
        "description": (
            "Find out how a 3D printer turns a computer design into a real object, "
            "then design a simple shape that could be printed."
        ),
        "difficulty": "Beginner",
        "concepts": ["3D Printing", "Layers", "Flat Bottoms", "Tinkercad Basics"],
        "goals": [
            "Explain in your own words how a 3D printer builds an object layer by layer.",
            "Open Tinkercad and place, move, and resize a few basic shapes.",
            "Design a simple object with a flat bottom so it could be printed without falling over.",
            _SUBMIT_TINKERCAD,
        ],
    },
    {
        "course_id": "3d-1",
        "name": "Name Tag Model",
        "description": (
            "Design a name tag with your name raised up on top, with a hole so it "
            "can hang on a backpack or key ring."
        ),
        "difficulty": "Beginner",
        "concepts": ["Text Shapes", "Grouping", "Workplane", "Sizing"],
        "goals": [
            "Add a text shape with your name and make it sit on top of a flat base.",
            "Group the letters and the base together so they print as one piece.",
            "Add a hole near the edge so the name tag can hang on a ring.",
            _SUBMIT_TINKERCAD,
        ],
    },
    {
        "course_id": "3d-1",
        "name": "Holes & Subtraction",
        "description": (
            "Use hole shapes to carve pieces out of solid objects, like cutting a "
            "window out of a house."
        ),
        "difficulty": "Beginner",
        "concepts": ["Hole Shapes", "Subtraction", "Grouping", "Alignment"],
        "goals": [
            "Turn a shape into a hole and use it to cut into a solid shape.",
            "Make an object with at least three cut-out parts, such as a house with a door and windows.",
            "Use the align tool to line up your holes neatly.",
            _SUBMIT_TINKERCAD,
        ],
    },
    {
        "course_id": "3d-1",
        "name": 'The "Snowman" Challenge',
        "description": (
            "Stack and shape spheres, a hat, and a face to build your own snowman "
            "that would stay in one piece when printed."
        ),
        "difficulty": "Beginner",
        "concepts": ["Spheres", "Stacking", "Scaling", "Alignment", "Creativity"],
        "goals": [
            "Build a snowman from at least three spheres of different sizes.",
            "Add details like eyes, a nose, arms, and a hat.",
            "Make sure every part touches the body so the snowman prints as one solid piece.",
            _SUBMIT_TINKERCAD,
        ],
    },
    {
        "course_id": "3d-1",
        "name": "Booleans & Holes",
        "description": (
            "Combine solid and hole shapes in clever ways to make a more "
            "complicated object, like a pencil holder or a cookie cutter."
        ),
        "difficulty": "Intermediate",
        "concepts": ["Boolean Operations", "Union", "Subtraction", "Planning a Design"],
        "goals": [
            "Combine at least five shapes, mixing solid shapes and holes.",
            "Group them step by step and check the result after each group.",
            "Finish with a useful object, such as a pencil holder, a phone stand, or a cookie cutter.",
            _SUBMIT_TINKERCAD,
        ],
    },
    {
        "course_id": "3d-1",
        "name": "Revolve & Spin",
        "description": (
            "Draw half of a shape and spin it around to make round objects like "
            "vases, cups, and chess pieces."
        ),
        "difficulty": "Intermediate",
        "concepts": ["Revolve", "Profiles", "Symmetry", "Round Objects"],
        "goals": [
            "Use the revolve or shape generator tools to make a round object by spinning a shape.",
            "Design something with a curved side, such as a vase, a cup, or a chess piece.",
            "Combine your spun shape with at least one other part or hole.",
            _SUBMIT_TINKERCAD,
        ],
    },
    # ------------------------------------------------------------------ Blender 1
    {
        "course_id": "3d-2",
        "name": "Intro to Blender",
        "description": (
            "Get comfortable moving around in Blender by adding, moving, rotating, "
            "and scaling objects in 3D space."
        ),
        "difficulty": "Beginner",
        "concepts": ["Blender Interface", "Navigation", "Move, Rotate, Scale", "Edit Mode"],
        "goals": [
            "Orbit, pan, and zoom the 3D view without getting lost.",
            "Add objects and use move, rotate, and scale to arrange a small scene.",
            "Change at least one object's shape in Edit Mode.",
            _SUBMIT_BLENDER,
        ],
    },
    {
        "course_id": "3d-2",
        "name": "The Donut",
        "description": (
            "Follow the classic Blender beginner project: model a donut, then add "
            "frosting, sprinkles, and a plate."
        ),
        "difficulty": "Intermediate",
        "concepts": ["Modifiers", "Materials", "Sculpting", "Rendering"],
        "goals": [
            "Model a donut shape and make it smooth with a modifier.",
            "Add frosting and sprinkles, and give each part its own color or material.",
            "Render a picture of your donut on a plate or table.",
            _SUBMIT_BLENDER,
        ],
    },
    {
        "course_id": "3d-2",
        "name": "Animation Basics",
        "description": (
            "Make something move! Use keyframes to animate an object, like a "
            "bouncing ball or a spinning donut."
        ),
        "difficulty": "Intermediate",
        "concepts": ["Keyframes", "Timeline", "Animation", "Rendering a Video"],
        "goals": [
            "Set keyframes on the timeline to move, rotate, or scale an object.",
            "Make an animation at least two seconds long that loops or ends cleanly.",
            "Render your animation, or a few frames of it, to share.",
            _SUBMIT_BLENDER,
        ],
    },
]
