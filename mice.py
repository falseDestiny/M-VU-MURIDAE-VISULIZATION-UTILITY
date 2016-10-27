#!/usr/bin/env python

from parse import Parser
from sim import Simulation

#----- Main

parser = Parser("sampledata.csv")
simulation = Simulation()
simulation.setUp(parser.getData())
print("Running ...")
simulation.runFullSim()
print(simulation.getAllPaths())
print(simulation.getAllHeatData())



'''
print('This is a test!')
parser = Parser("sampledata.csv")
simulation = Simulation()
simulation.setUp(parser.getData())
done = False
while not done:
    print("(25) to see all paths thus far. (35) to see all heat data. (99) to quit.")
    print("-xx to completely run sim, in increments of xx.")
    print("Total time so far: " + str(simulation.getTotalTime()))
    inputStr = str(input("How long to move? "))
    if(inputStr[0] == '-'):
        simulation.oneStep(int(inputStr[1:]))

    if (int(inputStr) == 99):
        done = True
    elif (int(inputStr) == 25):
        print(simulation.getAllPaths())
    elif (int(inputStr) == 35):
        print(simulation.getAllHeatData())
    else:
        simulation.updateAll(int(inputStr))

#data = simulation.getAllPaths()

#for key in data.keys():
#    print("****************")
#    print("Mouse ID: " + key)
#    for location in data[key]:
#        print(location) 


#print parser.getData()

#for key in parser.getData().keys():
#   print(key)
'''
