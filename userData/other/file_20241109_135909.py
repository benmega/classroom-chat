import time
print("hello world")
playerName = input("what is your name?")
time.sleep(1)
print("hello," + playerName)
time.sleep(1)
print("you find youself at the streets you lost your way home. you could go left or right")
time.sleep(1)
directionChoice = input("which way would you like to go?")
time.sleep(1)
if directionChoice == "left":
    print("you went to a basement")
    time.sleep(1)
    print("you find a assasin")
    time.sleep(1)
    print("the assasin wants to kill you")
    time.sleep(2)
    print("game over")

if directionChoice == "right":
    time.sleep(1)
    print("you found a treasure")
    time.sleep(1)
    print("you find a teleportation tunnel in the treasure")
    time.sleep(1)
    print("you teleported to the sewers")
    time.sleep(1)
    print("you find a ghost he asked to be your friend")
    time.sleep(1)
    acceptChoice = input("will you accept?")
    if acceptChoice == "yes":
        print("the ghost lead you to a treasure chest")
        time.sleep(1)
        print("congratulations you won the game ")
        time.sleep(1)
        print("surprise in")
        time.sleep(1)
        print("3")
        time.sleep(2)
        print("2")
        time.sleep(2)
        print("1")
        time.sleep(2)
        print("""                               
               *
       /_\\
      |   |
      |   |
   *  |   |  *
   /_\\ |   | /_\\
  |   ||   ||   |
  |   ||   ||   |
 *|   ||   ||   |*
[_\\  |/ \\|/ \\|  /_]
    .-'     '-.
  .'           '.
 [  *  *  *  *   ]
 | *  *  *  *  *  |
 |*  *  *  *  *  *|
  \\  *  *  *  *  /
   '._       _.'
      '-._.-'
 
        
        
        
        """)
    if acceptChoice == "no":
        print("the ghost is mad at you")
        time.sleep(1)
        print("he kills you")
        time.sleep(1)
        print("game over")
