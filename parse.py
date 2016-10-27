# Parser class exists to parse a data file into a dictionary
# The dictionary could then be pushed into the database
# Or returned as a dictionary for other uses


# This function is to remove those \x00 characters
# from the CSV when parsing strings
def cleanText(string):
    assembledWord = ""
    for char in string:
        if (char != "\x00"):
            assembledWord += char
    return assembledWord

class Parser:
    # Open file opens a file and parses the data into a dictionary
    # Each subject in the data file serves as a key to this dictionary
    # Each key points to a list of dictionaries
    # (Each data line is a dictionary itself, contained in this list)
    def openFile(self, fileName):
        dataFile = open(fileName)
        data = {}
        linecount = 0
        for line in dataFile:
            # We want to skip the first 27 lines of the data file.
            linecount += 1
            if linecount < 28:
                continue
            # We also want to ignore blank lines
            if len(line) < 2:
                continue
            # Split the line
            lineSplit = (line.strip()).split(";")
            # All the words need to run through the cleanText function.
            # Also, we're adding trailing zeros to time stamps to make
            # them all the same length
            timeStamp = cleanText(lineSplit[0].strip())    
            while (len(timeStamp) < 16):
                timeStamp += "0"
            mouseID = cleanText(lineSplit[1].strip())
            label = cleanText(lineSplit[2].strip())
            location = cleanText(lineSplit[3].strip())
            duration = cleanText(lineSplit[4].strip())
            # Build a dictionary for this line
            line = {"timeStamp":timeStamp, 
                "label":label,
                "location":location,
                "duration":duration
            }
            # Add a new mouse if this mouseID isn't already in the data
            if (mouseID not in data.keys()):
                data[mouseID] = []
            # Add this data line to this particular subject
            data[mouseID].append(line)
        return data

    def __init__(self, fileName):
        self.data = self.openFile(fileName)

    def getData(self):
        return self.data
