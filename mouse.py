

class Mouse:
    def __init__(self, idNum):
        self.moveIndex = 0
        self.timeCounter = 0
        self.idNum = idNum
        self.done = False
        self.path = []
        self.heatData = {}
        self.leftToMove = 0

    def setUp(self, data):
        self.data = data
        self.path.append(self.getLocation())

    def getLocation(self):
        return self.data[self.moveIndex]["location"]
    
    def updateHeatData(self, location, time):
        if location not in self.heatData.keys():
            self.heatData[location]=0
        self.heatData[location] += time    

    def advance(self, time):
        if ((self.moveIndex + 1) >= len(self.data)):
            self.done = True
            self.path.append(self.getLocation())
            self.updateHeatData(self.getLocation(), time)
            self.timeCounter = 0
        else:
            remainder = self.timeCounter - int(self.data[self.moveIndex]["duration"])
            self.updateHeatData(self.getLocation(), time - remainder)
            self.path.append(self.getLocation())
            self.moveIndex += 1
            self.timeCounter = remainder
            self.updateHeatData(self.getLocation(), remainder)
            print("Mouse " + self.idNum + " moved to location " + self.getLocation())
    
    def update(self, time):
        if (self.done):
            print("Mouse " + self.idNum + " is done moving.")
            print("Mouse " + self.idNum + " is in location " + self.getLocation())
        else:
            self.leftToMove = time
            while (self.leftToMove > 0):
                if (self.timeCounter + self.leftToMove < int(self.data[self.moveIndex]["duration"])):
                    self.timeCounter += self.leftToMove
                    self.updateHeatData(self.getLocation(), self.leftToMove)
                    self.leftToMove = 0
#print("Mouse " + self.idNum + " did not move.")
#                    print("Mouse " + self.idNum + " is in location " + self.getLocation())
                else:
                    movedThisRound = int(self.data[self.moveIndex]["duration"]) - self.timeCounter
                    self.leftToMove -= movedThisRound
                    self.timeCounter = 0
                    self.updateHeatData(self.getLocation(), movedThisRound)
                    if ((self.moveIndex +1) >= len(self.data)):
                        self.done=True
                        self.leftToMove = 0
                    else:
                        self.moveIndex += 1
                        print("Mouse " + self.idNum + "moved to location " + self.getLocation())
                        self.path.append(self.getLocation())

#            self.timeCounter += time
#            if (self.timeCounter < int(self.data[self.moveIndex]["duration"])):
#                print("Mouse " + self.idNum + " did not move.")
#                print("Mouse " + self.idNum + " is in location " + self.getLocation())
#                self.updateHeatData(self.getLocation(), time)
#            while (self.timeCounter >= int(self.data[self.moveIndex]["duration"])):
#                self.advance(time)

    def getPath(self):
        return self.path

    def getHeatData(self):
        return self.heatData

    def isDone(self):
        return self.done
