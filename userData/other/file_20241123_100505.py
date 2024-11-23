import time

print('Hello World')
playerName = input("What is your name?")
print("hello " + playerName)
time.sleep(0.5)

print("welcome to Adventure world")
time.sleep(0.5)
playercharater = input("what charater do you want to be,a criminal or a police")
# Thank your Mr. Mega for the below loop
chacterOptions = ["criminal", "police"]
while playercharater not in chacterOptions:
    print("try again")
    playercharater = input("what charater do you want to be,a criminal or a police")

if playercharater == "criminal":
    print("run away from the police")
    print("ok, go do steal something (5 total)")

elif playercharater == "police":
    print("go catch a criminal")
    print("ok, go catch 5 criminal ")
playermove = input("")





