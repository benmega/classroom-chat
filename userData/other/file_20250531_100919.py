import turtle

turtles = turtle.Turtle()
turtles.speed(200)

turtles.fillcolor("#99ffff")

# Body
turtles.begin_fill()
turtles.setheading(90)
turtles.forward(100)
turtles.left(90)
turtles.forward(200)
turtles.left(45)
turtles.forward(250)
turtles.setheading(20)
turtles.forward(175)
turtles.setheading(0)
turtles.end_fill()

# Legs
turtles.fillcolor("white")
turtles.begin_fill()
for i in range(4):
    turtles.setheading(270)
    turtles.forward(40)
    turtles.setheading(0)
    turtles.forward(20)
    turtles.setheading(90)
    turtles.forward(10)
    turtles.setheading(180)
    turtles.forward(10)
    turtles.setheading(90)
    turtles.forward(30)
    turtles.setheading(0)
    turtles.forward(40)
turtles.setheading(270)
turtles.forward(40)
turtles.setheading(0)
turtles.forward(20)
turtles.setheading(90)
turtles.forward(10)
turtles.setheading(180)
turtles.forward(10)
turtles.setheading(90)
turtles.forward(50)
turtles.setheading(90)
turtles.end_fill()

# Head
turtles.fillcolor("#99ffff")
turtles.begin_fill()
turtles.penup()
turtles.forward(100)
turtles.pendown()
turtles.forward(100)
turtles.setheading(0)
turtles.forward(50)
turtles.setheading(90)
turtles.forward(50)
turtles.setheading(180)
turtles.forward(75)
turtles.setheading(270)
turtles.forward(50)
turtles.setheading(0)
turtles.forward(5)
turtles.setheading(270)
turtles.forward(105)
turtles.end_fill()

# inside head
turtles.penup()
turtles.goto(25,235)
    # eye
turtles.dot(5)
    # mouth
turtles.fillcolor("white")
turtles.begin_fill()
turtles.goto(50, 215)
turtles.setheading(180)
turtles.pendown()
turtles.forward(20)
turtles.setheading(90)
turtles.forward(5)
turtles.setheading(0)
turtles.forward(20)
turtles.end_fill()

# horn
turtles.penup()
turtles.goto(50,250)
turtles.setheading(180)
turtles.forward(55)
turtles.setheading(125)
turtles.pendown()
turtles.forward(25)
turtles.setheading(245)
turtles.forward(25)
turtles.setheading(270)
turtles.penup()
turtles.forward(100)

# outer wing
turtles.fillcolor("cyan")
turtles.penup()
turtles.goto(-200,100)
turtles.setheading(90)
turtles.pendown()
turtles.begin_fill()
turtles.forward(200)
turtles.setheading(315)
turtles.forward(100)
turtles.setheading(270)
turtles.forward(130)
turtles.end_fill()

# inner wing
turtles.fillcolor("white")
turtles.begin_fill()
turtles.penup()
turtles.goto(-180,100)
turtles.pendown()
turtles.setheading(90)
turtles.forward(160)
turtles.setheading(315)
turtles.forward(60)
turtles.setheading(270)
turtles.forward(120)
turtles.end_fill()

# spike(first part)
turtles.penup()
turtles.goto(-20,100)
for i in range(4):
    turtles.pendown()
    turtles.setheading(135)
    turtles.forward(20)
    turtles.setheading(225)
    turtles.forward(20)

# spike(second part)
turtles.goto(-200,100)
for i in range(9):
    turtles.pendown()
    turtles.setheading(180)
    turtles.forward(20)
    turtles.setheading(-90)
    turtles.forward(20)

# spike(third part)
for i in range(7):
    turtles.pendown()
    turtles.setheading(-45)
    turtles.forward(30)
    turtles.setheading(90)
    turtles.forward(30)

turtles.pendown()
turtles.setheading(-45)
turtles.forward(28)
turtles.setheading(90)
turtles.forward(28)

















turtle.done()

