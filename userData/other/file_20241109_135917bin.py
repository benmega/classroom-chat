import time




playerName = (input)("What is your name?")
time.sleep(1)
print ("Hello, " + playerName)
time.sleep(1)
print ("You found door!There is two of them")
Choose  = input("Would you like to go to left or right choose one!")
choices = ["left", "right"]
while Choose not in choices:
    Choose = input("left or right?")
if Choose == "left":
    print("You find dragon.")
    time.sleep(1)
    print ("HE KILL YOU U DIE")
    time.sleep(1)
    print ("somebody brought you to the hospital , but you die already")
elif Choose == "right":
    print("Time for question")

    time.sleep(1)

    num = input("Pick number one or two")
    choices = ["one", "two"]
    while num not in choices:
        num = input("one or two?")
    if num == "one":
        print("you think that will be easy")
        time.sleep(1)
        print("you lose")
    elif num == "two":
        print("you w0n the game!")
        time.sleep(1)
        m = input("do you want to continue")
        choices = ["yes", "no"]
        while m not in choices:
            m = input("yes or no")
        if m == "no":
            print("bye, see you next time!")
            time.sleep(1)
            print("The end")
        if m == "yes":
            n = input("Guess what is my fav color(blue or white)")
            choices = ["blue", "white"]
            while n not in choices:
                n = input("blue or white")
            if n == "white":
                print("ohno")
                time.sleep(1)
                print("you lose!")
            elif n == "blue":
                print("ohno")
                time.sleep(1)
                print("you win!")
                time.sleep(1)
                print("BUT WE WILl CONTINUE")
                time.sleep(1)
                print("LETS PLAY GAME!")
                time.sleep(1)
                print("guess a number between 1, 500")
                time.sleep(1)
                import random
                secretNumber = random.randint(1, 500)
                # Thank you mega
                userGuess = int(input("Try to guess it! "))
                while userGuess != secretNumber:
                    if userGuess > secretNumber:
                        userGuess = int(input("Too big! Try again."))
                    else:
                        userGuess = int(input("Too small! Try again."))
                print("You won!")
                print ("and you beat it")
                print("CONGRATS")
                time.sleep(1)
                print("""
        /\\
       /  \\
      /    \\
     |      |
     |      |
     |      |
     |      |
     |      |
    /|##!##|\\
   / |##!##| \\
  /  |##!##|  \\
 /   |##!##|   \\
/____|##!##|____\\
|    |    |    |
|    |    |    |
|    |    |    |
|    |    |    |
|    |    |    |
|    |    |    |
|____|____|____|
      |  |
     /    \\
    /______\\
     |    |
     |    |
     |    |
     |    |
    /      \\
   /________\\

    | | | | |
     | | | |
      | | |
       | |
        |
   
   
   
   
   
    blast off!!!        
                
                
                
                """)



