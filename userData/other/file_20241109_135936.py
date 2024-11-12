import time

name = input ("What is your name?")
time.sleep(2.5)
print("You are in a hallway.")
time.sleep(2.5)
print("There are two doors.")
time.sleep(2.5)
print("One door is on the left and the other one is one the right.")
time.sleep(2.5)
choice = input("What door are you gonna choose?")
time.sleep(2.5)
if choice == "left":
    print("You found a box.")
    choice2 = input("Open it?")
    if choice2 == "yes":
        print("You fall into a pit of lava.")
        time.sleep(2.5)
        print("GAME OVER")
    if choice2 == "no":
        print("A cat attacks you.You die.")
        print("""
        
      
          /\\_/\\  
         / o.o \\ 
        (   "   ) 
         \\~(*)~/ 
          - ^ -
          
        """)
        time.sleep(2.5)
        print("GAME OVER")
elif choice == "right":
    print("You found the stairs to the basement.")
    time.sleep(2.5)
    choice3 = input("Do you want to go down?")
    if choice3 == "no":
        print("You got attacked by a asian mom.")
        time.sleep(2.5)
        print("YOU DIE GAME OVER")
    if choice3 == "yes":
        print("You found a treasure chest.")
        time.sleep(2.5)
        print("It has a lock on it.")
        import random
        secretNumber = random.randint(1, 10)
        print("I think the code is " + str(secretNumber)+",but i am not 100% sure though.")
        time.sleep(2.5)
        print("PLEASE ENTER THE CODE")
        time.sleep(2.5)
        choice4 = input ("ENTER THE CODE")
    if choice == "secretNumber":
        print(".........")
        time.sleep(2.5)
        print("YOU WIN!!!")
    else:
        print("CODE NOT RECOGNIZED")
        time.sleep(2.5)
        print("NUKE ACTIVE IN")
        time.sleep(1.5)
        print("5")
        time.sleep(1.5)
        print("4")
        time.sleep(1.5)
        print("3")
        time.sleep(1.5)
        print("2")
        time.sleep(1.5)
        print("1")
        time.sleep(1.5)
        print("GAME OVER YOU DIE")
