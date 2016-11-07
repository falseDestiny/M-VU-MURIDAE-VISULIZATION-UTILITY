import psycopg2
import psycopg2.extras
import os, uuid, re
from flask import Flask, render_template, request, redirect, url_for, session, Markup, json, send_from_directory
import flask_login
from flask_login import current_user
from flask_socketio import SocketIO, emit
from werkzeug import secure_filename
from parse import Parser
from sim import Simulation


app = Flask(__name__)
app.secret_key = os.urandom(24).encode('hex')

# This is the path to the upload directory, In cloud9 it sends the file to a folder named uploads
# Not needed since a parser will be used
# app.config['UPLOAD_FOLDER'] = 'uploads/'

# Only files containing these extensions will be accepted
app.config['ALLOWED_EXTENSIONS'] = set(['xls', 'xlsx', 'csv', 'xlsm', 'xlt', 'xml'])

socketio = SocketIO(app)

login_manager = flask_login.LoginManager()
login_manager.init_app(app)

class User(flask_login.UserMixin):
    uploadingData = ""
    viewingData = ""
    
def connectToDB():
    connectionString = 'dbname=mousedb user=owner password=41PubBNmfQhmfCNy host=localhost'
    print connectionString
    try:
        return psycopg2.connect(connectionString)
    except:
        print("Can't connect to database")

# setup all of the values from the users table for the current user
def setup_User(user, data):
    user.id = data['username']
    
def getAllDataSets():
    db = connectToDB()
    cur= db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("SELECT datasetname FROM datasets;", )
    holddata = cur.fetchall()
    allsets = []
    for line in holddata:
        allsets.append(line[0])
    return allsets
    
def parseUploadForm(form):
    parsedData = {}
    locations = {}
    oldSet = False
    if "oldSet" in form.keys():
        oldSetName = str(form["prevSetName"])
        oldSet = True
        locations["oldSet"] = oldSetName
    else:
        for i in range(7):
            for j in range(7):
                oldKey = "[" + str(i) + ", " + str(j) + "]"
                newKey = (i * 7) + j
                value = form[oldKey]
                if str(value) != "-1":
                    locations[str(newKey)] = str(value)
                
    parsedData["locations"] = locations
    parsedData["filename"] = str(form["setName"])
    parsedData["datalines"] = User.uploadingData
    return parsedData  
    
def parseUpdatedForm(form):
    parsedData = {}
    locations = {}
    oldSet = False
    if "oldSet" in form.keys():
        oldSetName = str(form["prevSetName"])
        db = connectToDB()
        cur= db.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("SELECT locationmap from datasets where datasetname=%s", (oldSetName,))
        holdlocations = cur.fetchall()
        tempLocations = holdlocations[0][0]
        locations = convertString(tempLocations)  
    else:
        for i in range(49):
            value = form[str(i)]
            if str(value) != "-1":
                locations[str(i)]=str(value)
                
    print(form["setName"])
    if form["setName"] == "":
        parsedData["setName"] = User.viewingData
    else:
        parsedData["setName"] = form["setName"]
        
    parsedData["locations"] = locations
    return parsedData
    
# This is a function to help bring a location map json back from the database and turn it back into a dictionary   
def convertString(longstring):
    final = {}
    done = False
    counter = 0
   # print(longstring)
    while counter < len(longstring):
        if longstring[counter] == "{" or longstring[counter] == "}":
            counter += 1
        else:
            thiskey = ""
            thisvalue = ""
            #print("skipping: " + longstring[counter])
            counter += 1
            while not done:
                thiskey += longstring[counter]
                counter += 1
                if longstring[counter] == '"':
                    done = True
            done = False
            counter += 4
            while longstring[counter] != '"':
                thisvalue += longstring[counter]
                counter += 1
            counter += 3
            final[thiskey]=thisvalue
    return final

# this is a function to help bring a heat map data json from the database and turn it back into a dictionary
def convertHeatString(longstring):
    final = {}
    done = False
    counter = 2
    while not done:
        thisKey = ""
        while longstring[counter] !='"':
            thisKey += longstring[counter]
            counter += 1
        final[thisKey] = {}
        counter += 5
        secondDone = False
        while not secondDone:
            lockey = ""
            while longstring[counter] != '"':
                lockey += longstring[counter]
                counter += 1
            counter += 3
            value = ""
            while longstring[counter] != ',' and longstring[counter] != '}':
                value += longstring[counter]
                counter += 1
            final[thisKey][lockey] = int(value)
            if longstring[counter] == '}':
                secondDone = True
                counter += 1
            else:
                counter += 3
        if longstring[counter] == '}':
            done = True
        else:
            counter += 4
    return final
    
# this is a function to help bring a vector map data json from the database and turn it back into a dictionary
def convertVectorString(longstring):
    final = {}
    done = False
    counter = 2
    while not done:
        thisKey = ""
        while longstring[counter] !='"':
            thisKey += longstring[counter]
            counter += 1
        final[thisKey] = []
        counter += 6
        secondDone = False
        while not secondDone:
            lockey = ""
            while longstring[counter] != '"':
                lockey += longstring[counter]
                counter += 1
            counter += 3
            value = ""
            while longstring[counter] != ']':
                value += longstring[counter]
                counter += 1
            thisEntry = []
            thisEntry.append(lockey)
            thisEntry.append(int(value))
            final[thisKey].append(thisEntry)
            counter += 1
            if longstring[counter] == ']':
                secondDone = True
                counter += 1
            else:
                counter += 4
        if longstring[counter] == '}':
            done = True
        else:
            counter += 3
    print(final)
    return final

@login_manager.user_loader
def user_loader(user_id):
    db = connectToDB()
    cur= db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("SELECT * FROM users WHERE username = %s;", (user_id,))
    data = cur.fetchone()
    if(len(data) > 0):
        user = User()
        setup_User(user, data)
        return user
        
    return #no user

@app.route('/logout')
def logout():
    flask_login.logout_user()
    return redirect(url_for('index'))

# the page to go to if a login is required and no one is loged in.
@login_manager.unauthorized_handler
def unauthorized_handler():
    return render_template('login.html', login_failed = 'true', currentpage='login')
    
@app.route('/', methods=['GET', 'POST']) #handle login
def index():
    if request.method == 'GET':
        if current_user.is_authenticated:
            return render_template('index.html', login_failed='false', currentpage='home')
        else:
            return render_template('login.html', login_failed='false', currentpage='login')
            
    #attempt login
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    usernameinput = request.form['username']
    passwordinput = request.form['password']
   
    cur.execute("SELECT * FROM users WHERE LOWER(username) = LOWER(%s) AND password = crypt(%s, password);", (usernameinput, passwordinput))
    if cur.fetchone():
        user = User()
        user.id = usernameinput
        flask_login.login_user(user)
        
        cur.execute("SELECT admin FROM users WHERE LOWER(username) = LOWER(%s) AND password = crypt(%s, password);", (usernameinput, passwordinput))
        admin = cur.fetchall()
        for row in admin:
            print "   xxx   xxx   xxx", admin[0]
        session["admin"]=admin[0]    
        return render_template('index.html', login_failed='false', currentpage='login', admin=session["admin"])

    #login failed
    return render_template('login.html', login_failed = 'true', currentpage='login')


@app.route('/maps')
@flask_login.login_required
def maps():
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    return render_template('maps.html', currentpage='maps', admin=session["admin"])
    
@app.route('/data')
@flask_login.login_required
def data():
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    otherDataSets = getAllDataSets()
    User.viewingData=""
    return render_template('data.html', currentpage='data', otherDataSets=getAllDataSets(), admin=session["admin"])

@app.route('/users', methods=['GET', 'POST'])
@flask_login.login_required
def manageusers():
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    cur.execute("SELECT * FROM users")
    userdata = cur.fetchall()
    session["userdata"]=userdata
    
    return render_template('users.html', currentpage='users', userdata=userdata, admin=session["admin"])

################################################################################
############################ File Upload Functions #############################
################################################################################

# For a given file, return whether it's an allowed type or not
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1] in app.config['ALLOWED_EXTENSIONS']

@app.route('/upload', methods=['POST'])
def upload():
    file = request.files['file']
    # Check if the file is one of the allowed types/extensions
    if file and allowed_file(file.filename):
        # Remove unsupported chars from filename
        filename = secure_filename(file.filename)
        
        # The variable called file stores the file, this could be sent to the parser rather than being saved
        # Nothing withing this if statement is needed for parsing purposes. I am leaving it to show
        # functionality if you want to test it.
        # Move the file form the temporal folder to the upload folder
        
        # file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename)) # remove this line if we are not saving the file
        myData = Parser(file).getData()
        User.uploadingData = myData["data"]
        User.uploadingFileName = myData["filename"]
        return render_template('loadeddata.html', myData=myData, otherDataSets=getAllDataSets())
        
        #return render_template('index.html')
        # Will return to index page if incorrect file format is uploaded
    else: 
        return render_template('loadeddata.html', admin=session["admin"])
        
@app.route('/setDataUpload', methods=['POST'])
def setDataUpload():
    myData = parseUploadForm(request.form)
    mySimulation = Simulation()
    mySimulation.setUp(myData["datalines"])
    mySimulation.runFullSim()
    thesePaths = mySimulation.getAllPaths()
    theseHeatMaps = mySimulation.getAllHeatData()
    if myData["filename"] == "":
        myData["filename"] = User.uploadingFileName
    
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    if "oldSet" in myData["locations"].keys():
        #print(myData["locations"]["oldSet"])
        oldLoc = myData["locations"]["oldSet"]
        cur.execute("SELECT locationmap from datasets where datasetname=%s", (oldLoc,))
        holdlocations = cur.fetchall()
        tempLocations = holdlocations[0][0]
        getLocations = convertString(tempLocations)
    else:
        getLocations = myData["locations"]
    
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("INSERT INTO datasets (datasetname, userid, heatdata, vectordata, locationmap) VALUES (%s, %s, %s, %s, %s)",(myData["filename"], 1, json.dumps(theseHeatMaps), json.dumps(thesePaths), json.dumps(getLocations)))
    db.commit()
    return viewDataPage(getDataToView(myData["filename"]))
    
def viewDataPage(data):
    return render_template('viewdata.html', myData=data, otherDataSets=getAllDataSets(), admin=session["admin"])

def getDataToView(setName):
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("SELECT * from datasets WHERE datasetname = %s", (setName,))
    thisData = cur.fetchall()
    if len(thisData) != 1:
        otherDataSets = getAllDataSets()
        return render_template('data.html', currentpage='data', otherDataSets=getAllDataSets(), admin=session["admin"])
    User.viewingData=setName
    formattedData = {}
    formattedData["setName"] = str(setName)
    formattedData["heatData"] = convertHeatString(thisData[0][3])
    formattedData["vectorData"] = convertVectorString(thisData[0][4])
    formattedData["datasetname"] = thisData[0][6]
    allLocations = []
    for i in range(1, 26):
            if i < 10:
                allLocations.append("RFID0" + str(i))
            else:
                allLocations.append("RFID" + str(i))
    formattedData["alllocations"] = allLocations
    assembleMap = []
    rowCounter = 0
    rowNames = ["firstRow", "secondRow", "thirdRow", "fourthRow", "fifthRow", "sixthRow", "seventhRow"]
    rawLocations = convertString(thisData[0][5])
    
    formattedData["rowMap"] = {}
    for name in rowNames:
        formattedData["rowMap"][name] = []
    for i in range (49):
        if i > 0 and i % 7 == 0:
            rowCounter += 1
        entry = {}
        entry["index"] = i
        if str(i) in rawLocations.keys():
            entry["value"] = rawLocations[str(i)]
        else:
            entry["value"] = "--"
        formattedData["rowMap"][rowNames[rowCounter]].append(entry)
    return formattedData
    

@app.route('/loadData', methods=['POST'])
def loadData():
    setToLoad = request.form["setToLoad"]
    return viewDataPage(getDataToView(setToLoad))
    
@app.route('/updateData', methods=['POST'])
def updateData():
    updatedForm = request.form
    updatedData = parseUpdatedForm(updatedForm)
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("UPDATE datasets SET datasetname=%s, locationmap=%s WHERE datasetname=%s",(updatedData["setName"], json.dumps(updatedData["locations"]), User.viewingData))
    db.commit()
    
    return viewDataPage(getDataToView(updatedData["setName"]))
    
@app.route('/deleteData', methods=['POST'])
def deleteData():
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("DELETE from datasets WHERE datasetname=%s",(User.viewingData,))
    db.commit()
    return render_template('data.html', currentpage='data', otherDataSets=getAllDataSets(), admin=session["admin"])

################################################################################
################################## SOCKET IO ###################################
################################################################################


@socketio.on('connect', namespace='/heatmap')
def makeConnection(): 
    print('connected')

@socketio.on('getDatasetNames', namespace='/heatmap')
def getDatasetNames():
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    # get dataset names from database
    datasetnames = "SELECT datasetname AS name FROM datasets;"
    cur.execute(datasetnames)
    results = cur.fetchall()
    
    test = []
    
    if(len(results) > 0):
        for result in results:
            tmp = {'name': result[0] }
            test.append(tmp)
    
        for i in test:
            emit('datasetnamelist', i)
            
@socketio.on('loadMice', namespace='/heatmap')
def loadMice(dataset):
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    # grab the dataset for the passed selection
    getDataset = "SELECT heatdata FROM datasets WHERE datasetname = %s;"
    #print(getDataset % ("%%" + dataset + "%%"))
    # cur.execute(getDataset, ("%%" + dataset + "%%"))
    cur.execute("SELECT heatdata FROM datasets WHERE datasetname = '%s';" % (dataset))
    result = cur.fetchone()
    cur.execute("SELECT vectordata FROM datasets WHERE datasetname = '%s';" % (dataset))
    vecresult = cur.fetchone()
    cur.execute("SELECT locationmap FROM datasets WHERE datasetname = '%s';" % (dataset))
    locresult = cur.fetchone()
    
    emit('returnDataset', {
        'data': {
            'heatdata': result,
            'vectdata': vecresult,
            'mapping': locresult
        }
    })

if __name__ == '__main__':
    #app.run(host=os.getenv('IP', '0.0.0.0'), port=int(os.getenv('PORT', 8080)), debug = True)
    socketio.run(app, host=os.getenv('IP', '0.0.0.0'), port=int(os.getenv('PORT', 8080)), debug = True)
    
    
