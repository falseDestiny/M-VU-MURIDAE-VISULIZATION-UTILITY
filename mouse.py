
class Mouse:
    def __init__(self, idNum):
        self.moveIndex = 0
        self.timeCounter = 0
        self.idNum = idNum
        self.done = False
        self.path = []
        self.heatData = {}
        self.leftToMove = 0
        self.totalTime = 0

    def getLocation(self):
        return self.data[self.moveIndex]["location"]

    def setUp(self, data):
        self.data = data
        #    if "location" in self.data[self.moveIndex].keys():
        #        self.path.append((self.getLocation(), self.totalTime))  
        #except:
        #    pass

    def tick(self):
        
#        print("tick ... %s", self.timeCounter)
        self.totalTime += 1
        try:
            if self.timeCounter == int(self.data[self.moveIndex]["duration"]):
                self.moveIndex += 1
                if self.moveIndex == len(self.data):
                    self.done = True
                # print("%s is done",self.idNum)
                else:
                    move = (self.data[self.moveIndex]["location"],self.totalTime)
                    #print(self.idNum + " " +str(move))
                    self.path.append(move)
                    self.timeCounter = 0
            else:
                self.timeCounter += 1
                self.tickHeatData()
        except:
            pass

    def tickHeatData(self):
        location = self.data[self.moveIndex]["location"]
        if location not in self.heatData.keys():
            self.heatData[location] = 0
        self.heatData[location] += 1

    def getPath(self):
        return self.path

    def getHeatData(self):
        return self.heatData

    def isDone(self):
        return self.done
        
    def runNewSim(self):
        runningTime = 0
        x = 0
        #print("Lines: " + str(len(self.data)))
        while x < (len(self.data)):
            location = self.data[x]["location"]
            move = (location,(int(self.data[x]["duration"]) + runningTime))
            self.path.append(move)
            runningTime += int(self.data[x]["duration"])
            if location not in self.heatData.keys():
                self.heatData[location] = 0
            self.heatData[location] += int(self.data[x]["duration"])
            x += 1
