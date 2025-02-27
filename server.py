# IMPORTS FOR POSTGRESQL
import psycopg2
import psycopg2.extras

import os, uuid, re
import string
import random

# IMPORT FLASK
from flask import Flask, render_template, request, redirect, url_for, session, Markup, json, send_from_directory

# IMPORT FLASK LOGIN
from flask_login import LoginManager, login_user, logout_user, current_user, login_required

# IMPORT FLASK SOCKETIO
from flask_socketio import SocketIO, emit

# IMPORTS FOR FILE UPLOAD
from werkzeug import secure_filename
from parse import Parser
from sim import Simulation

# IMPORT FLASK MAIL
from flask_mail import Mail, Message

################################## Create App ##################################
app = Flask(__name__)
app.secret_key = os.urandom(24).encode('hex')


############################## Config Flask Mail ###############################
app.config['MAIL_SERVER']='smtp.gmail.com'
app.config['MAIL_PORT'] = 465
app.config['MAIL_USERNAME'] = 'mvuwebapp@gmail.com'
app.config['MAIL_PASSWORD'] = 'mvuwebapppass'
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USE_SSL'] = True

mail = Mail(app)
socketio = SocketIO(app)
globalAccess = {'accessCode': ''}

################################ Config Upload #################################
# This is the path to the upload directory, In cloud9 it sends the file to a folder named uploads
# Not needed since a parser will be used
# app.config['UPLOAD_FOLDER'] = 'uploads/'

# Only files containing these extensions will be accepted
app.config['ALLOWED_EXTENSIONS'] = set(['xls', 'xlsx', 'csv', 'xlsm', 'xlt', 'xml'])


################################ Set Variables #################################
mail = Mail(app)
socketio = SocketIO(app)

dataUploadStorage = {}


############################# Connect to Database ##############################
def connectToDB():
    connectionString = 'dbname=mousedb user=owner password=41PubBNmfQhmfCNy host=localhost'
    #print connectionString
    try:
        return psycopg2.connect(connectionString)
    except:
        #print("Can't connect to database")
        pass


################################################################################
########################### USER CLASS AND FUNCTIONS ###########################
################################################################################

# Setup Login Manager
login_manager = LoginManager()
login_manager.init_app(app)

# User Class
class User():
    def __init__(self, data):
        self.id = data['username']
        self.email = data['email']
        self.admin = data['admin']
        
    def is_authenticated(self):
        return True
    
    def is_active(self):
        return True
    
    def is_anonymous(self):
        return True

    def get_id(self):
        return unicode(self.id)
    
    def __repr__(self):
        return '<User %r>' % (self.id)

# User Loader
@login_manager.user_loader
def load_user(id):
    db = connectToDB()
    cur= db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    # grab user
    cur.execute("SELECT * FROM users WHERE username = %s;", (id,))
    user = cur.fetchone()
    
    cur.close()
    db.close()
    
    if user is not None:
        return User(user)
    
    return None # no user

# Handle Logout
@app.route('/logout')
def logout():
    # logout user
    logout_user()
    
    # clear session variables
    for key in session.keys():
        if key is not "remember":
            session.pop(key)
    
    # return to index page
    return redirect(url_for('index')) 

# Unauthorized Handler
@login_manager.unauthorized_handler
def unauthorized_handler():
    return render_template('login.html', login_failed = 'true', currentpage = 'login')


################################################################################
############################### PARSER FUNCTIONS ###############################
################################################################################

# This is a function to help bring a location map json back from the database and turn it back into a dictionary   
def convertLocationString(longstring):
    final = {}
    done = False
    counter = 0
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
                if longstring[counter] == "'":
                    done = True
            done = False
            counter += 4
            while longstring[counter] != "'":
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
    #print(final)
    return final
    
def convertSubjectString(longstring):
    finalDict = {}
    trimmedStr = longstring[3:-3]
    trimmedSplit = trimmedStr.split(", ")
    for string in trimmedSplit:
        strSplit = string.split(": ")
        holdSub = strSplit[0].strip('"')
        while len(holdSub) < 10:
            holdSub = str(0) + holdSub
        finalDict[holdSub] = strSplit[1].strip('"')
    return finalDict
        
    
    
    # For a given file, return whether it's an allowed type or not

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1] in app.config['ALLOWED_EXTENSIONS']

def parseLocations(rows, cols, setData):
    locations = {}
    locations["rows"] = str(rows)
    locations["columns"] = str(cols)
    for i in range(int(rows)):
        for j in range(int(cols)):
            thisIndex = (i * int(cols)) + j
            locations[str(thisIndex)] = str(setData[thisIndex])
    return locations         

def parseSubjectMap(data):
    subjectMap = {}
    for entry in data:
        thisSubject = ""
        thisValue = ""
        for key in entry.keys():
            if (str(key)) == "subject":
                thisSubject = str(entry[key])
            if (str(key)) == "label":
                thisValue = str(entry[key])
        subjectMap[thisSubject] = thisValue
    return subjectMap
    
    
    
def encode(data):
    bytesFormatted = []
    bytesFormatted.append(129)

    bytesRaw = (str(data)).encode()
    bytesLength = len(bytesRaw)
    if bytesLength <= 125 :
        bytesFormatted.append(bytesLength)
    elif bytesLength >= 126 and bytesLength <= 65535 :
        bytesFormatted.append(126)
        bytesFormatted.append( ( bytesLength >> 8 ) & 255 )
        bytesFormatted.append( bytesLength & 255 )
    else :
        bytesFormatted.append( 127 )
        bytesFormatted.append( ( bytesLength >> 56 ) & 255 )
        bytesFormatted.append( ( bytesLength >> 48 ) & 255 )
        bytesFormatted.append( ( bytesLength >> 40 ) & 255 )
        bytesFormatted.append( ( bytesLength >> 32 ) & 255 )
        bytesFormatted.append( ( bytesLength >> 24 ) & 255 )
        bytesFormatted.append( ( bytesLength >> 16 ) & 255 )
        bytesFormatted.append( ( bytesLength >>  8 ) & 255 )
        bytesFormatted.append( bytesLength & 255 )

    bytesFormatted = bytes(bytesFormatted)
    bytesFormatted = bytesFormatted + bytesRaw
    return bytesFormatted


################################################################################
#################################### ROUTES ####################################
################################################################################
        
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
    user = cur.fetchone()
    
    cur.close()
    db.close()
    
    if user is not None:
        login_user(User(user), remember=True)
        return render_template('index.html', login_failed='false', currentpage='login')

    #login failed
    return render_template('login.html', login_failed = 'true', currentpage='login')


@app.route('/maps')
@login_required
def maps():
    return render_template('maps.html', currentpage='maps')
    
@app.route('/data', methods=["GET", "POST"])
@login_required
def data():
    if request.method == 'POST':
        file = request.files['file']
        #Check if the file is one of the allowed types/extensions
        if file and allowed_file(file.filename):
            # Remove unsupported chars from filename
            filename = secure_filename(file.filename)
            #print("Through here.")
            
            # The variable called file stores the file, this could be sent to the parser rather than being saved
            # Nothing withing this if statement is needed for parsing purposes. I am leaving it to show
            # functionality if you want to test it.
            # Move the file form the temporal folder to the upload folder
            
            myData = Parser(file).getData()
            session["currentlyUploading"] = True
            #print(session.keys())
            #print(myData)
            dataUploadStorage[session["user_id"]] = myData
            
            #print(myData["data"])
            #session["uploadingData"] = myData["data"] 
            #session["uploadingFileName"] = myData["filename"] 
            session["uploadingFileName"] = filename
            #print("Done parsing.")
    #        print(session["currentlyUploading"])
    #        print(session["uploadingData"])
    #        print(session["uploadingFileName"])
    else:
        session["uploadingFileName"] = ""
        session["currentlyUploading"] = False
        if session["user_id"] in dataUploadStorage.keys():
            del dataUploadStorage[session["user_id"]]
    return render_template('data.html', currentpage='data')
    
@app.route('/users')
@login_required
def manageusers():
    return render_template('users.html', currentpage='users')


################################################################################
############################## RESET PASSWORD ##################################
################################################################################

@app.route('/sendAccessCode', methods=['GET', 'POST'])
def sendAccessCode():
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)

    chars = string.ascii_uppercase + string.ascii_lowercase + string.digits
    accessCode = ''.join(random.SystemRandom().choice(chars) for _ in range(10))
    globalAccess['accessCode'] = accessCode
    
    #print accessCode
    session["accessCode"]=accessCode   
    if request.method == 'GET':
        return render_template('sendaccesscode.html', currentpage = 'sendaccesscode')
        
    # get email from form
    session["email"] = request.form['email']
    #print "User email is ."+session["email"]

    # check to see if user exists
    #print "Checking username...."
    cur.execute("SELECT email FROM users WHERE email = %s;", (session["email"],))
    if cur.fetchone():
        #print "Checking message...."
            
        # prepare the email to be sent, include message with random access code  
        msg = Message('MVU Password', sender = 'mvuwebapp@yahoo.com', recipients = [session["email"]])
        msg.body =  "A password reset has been requested.\n\n" + \
            "If you did not make this request, you can ignore this email. This password reset can only be made by those who have access to the login site. " + \
            "It does not indicate that the application is in any danger of being accessed by someone else.\n\n" + \
            "The access code to reset your password is: " +str(accessCode) 
        mail.send(msg)
        #print "Mail Sent."
    else:
        return render_template('sendaccesscode.html', currentpage='sendaccesscode', bad_account='bademail', account_created='false')
            
    return render_template('confirmaccesscode.html', currentpage='confirmaccesscode', email=session["email"], bad_account='unknown', accessCode=accessCode)

@app.route('/confirmAccessCode', methods=['GET', 'POST'])
def confirmAccessCode():
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    if request.method == 'GET':
        return render_template('confirmaccesscode.html', currentpage = 'confirmaccesscode')
    
    inputcode = request.form['inputCode']
    
    # check to see codes match
    #print "Checking access code...."
    if (inputcode == session["accessCode"]):
        #print "YAHYAYAYAY"
        pass
    else:
        return render_template('confirmaccesscode.html', currentpage='confirmaccesscode', email=session["email"], bad_account='badcode', access_code_match='false')
            
    return render_template('createnewpassword.html', currentpage='createnewpassword', bad_account='unknown')

@app.route('/createNewPassword', methods=['GET', 'POST'])
def createNewPassword():
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)

    if request.method == 'GET':
        return render_template('createnewpassword.html', currentpage = 'confirmaccesscode')
    
    # get passwords from the form
    #print "Get matching passwords...."
    password = request.form['password']
    retypepassword = request.form['retypepassword']
    
    # check to see if passwords match
    #print "Checking for matching passwords...."
    if (password != retypepassword):
        return render_template('createnewpassword.html', currentpage='createnewpassword', bad_account='passwords_dont_match', account_created='false')
            
    # try to insert new password        
    try:
        #print("Inserting password...")
        passwordInsertQuery = "UPDATE users SET password = crypt(%s, gen_salt('bf')) WHERE email = %s;"
        cur.execute(passwordInsertQuery, (password, session["email"]))
    except:
        #print("Error Inserting password...")
        db.rollback()
    db.commit()
    
    return render_template('login.html', currentpage='login', bad_account='unknown')


################################################################################
################################## SOCKET IO ###################################
################################################################################

@socketio.on('connect', namespace='/heatmap')
def makeConnection(): 
    print('connected')
    
############################################################
#################### UPLOAD FUNCTIONS ######################
############################################################
@socketio.on('finishUpload', namespace='/heatmap')
def uploadData(setData):
    try:
        mySimulation = Simulation()
        mySimulation.setUp(dataUploadStorage[session["user_id"]]["data"])
        mySimulation.runNewSim()
    except:
        #print("Simulation failed.")
        pass
    thesePaths = mySimulation.getAllPaths()
    theseHeatMaps = mySimulation.getAllHeatData()
    thisFileName = str(setData[0])
    rows = str(setData[1])
    cols = str(setData[2])
    getLocations = parseLocations(rows, cols, setData[3])
    getSubjectMap = parseSubjectMap(setData[4])
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("INSERT INTO datasets (datasetname, userid, heatdata, vectordata, locationmap, subjectmap) VALUES (%s, %s, %s, %s, %s, %s)", (thisFileName, 1, json.dumps(theseHeatMaps), json.dumps(thesePaths), json.dumps(getLocations), json.dumps(getSubjectMap)))
    db.commit()
    cur.close()
    db.close()
    session["currentlyUploading"] = False
    del dataUploadStorage[session["user_id"]]
    session["uploadingFileName"] = ""
    emit('finishedUploading')
    
@socketio.on('finishUpdate', namespace='/heatmap')
def finishUpdate(setData):
    newFileName = str(setData[0])
    oldFileName = str(setData[4])
    rows = str(setData[1])
    cols = str(setData[2])
    getLocations = parseLocations(rows, cols, setData[3])
    getSubjectMap = parseSubjectMap(setData[5])
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("UPDATE datasets SET datasetname = %s, locationmap = %s, subjectmap = %s WHERE datasetname = %s", (newFileName,  json.dumps(getLocations), json.dumps(getSubjectMap), oldFileName))
    db.commit()
    cur.close()
    db.close()
        
@socketio.on('getSetName', namespace='/heatmap')
def getSetName():
    #print("Tried to get a set name.")
    emit('haveSetName', session["uploadingFileName"])
    
@socketio.on('checkUploading', namespace='/heatmap')
def checkIfUploading():
    #print(session["currentlyUploading"])
    if "currentlyUploading" in session.keys():
        emit('checkedUploading', session["currentlyUploading"])
    else:
        emit('checkedUploading', False)
        
@socketio.on('clearUpload', namespace='/heatmap')
def clearUpload():
    session["currentlyUploading"] = False
    if session['user_id'] in dataUploadStorage.keys():
        del dataUploadStorage[session["user_id"]]
    session["uploadingFileName"] = ""
    
@socketio.on('getGridToMimic', namespace='/heatmap')
def getGridToMimic(gridName):
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("SELECT locationmap FROM datasets WHERE datasetname = '%s';" % (gridName))
    result = cur.fetchone()
    #finalResult = convertLocationString(result[0])
    emit('setMimicGrid', json.dumps(result[0]))
    cur.close()
    db.close()
    
@socketio.on('getSubjectMap', namespace='/heatmap')
def getSubjectMap():
    emit('showSubjectMap', dataUploadStorage[session["user_id"]]["subjects"])
    
@socketio.on('loadGrid', namespace='/heatmap')
def loadGrid(gridName):
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("SELECT locationmap FROM datasets WHERE datasetname = '%s';" % (gridName))
    result = cur.fetchone()
#    finalResult = convertLocationString(str(result[0]))
#    emit('setLoadedGrid', encode(finalResult))
    emit('setLoadedGrid', encode(json.dumps(result[0])))
    cur.close()
    db.close()
    
@socketio.on('loadSubMap', namespace='/heatmap')
def loadSubMap(gridName):
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("SELECT subjectmap FROM datasets WHERE datasetname = '%s';" % (gridName))
    result = cur.fetchone()
#    finalResult = convertSubjectString(result[0])
#    emit('setLoadedSubMap', finalResult)
    emit('setLoadedSubMap', encode(json.dumps(result[0])))
    cur.close()
    db.close()
    
@socketio.on('viewHeatData', namespace='/heatmap')
def viewHeatData(setName):
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("SELECT heatdata FROM datasets WHERE datasetname = '%s';" % (setName))
    result = cur.fetchone()
    #finalHeat = convertHeatString(result[0])
    finalResults = []
    finalResults.append(setName)
    finalResults.append(json.dumps(result[0]))
    emit('returnViewHeatData', finalResults)
    cur.close()
    db.close()
    #emit('returnViewHeatData', finalResults)
    
@socketio.on('viewVectorData', namespace='/heatmap')
def viewVectorData(setName):
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("SELECT vectordata FROM datasets WHERE datasetname = '%s';" % (setName))
    result = cur.fetchone()
    #finalvector = convertVectorString(result[0])
    cur.close()
    db.close()
    emit('returnViewVectorData', json.dumps(result[0]))
    
    
@socketio.on('deleteSet', namespace='/heatmap')
def deleteSet(setName):
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("DELETE FROM datasets WHERE datasetname = '%s';" % (setName))
    db.commit()
    emit('deletedSet')
    cur.close()
    db.close()
    


############################################################
##################### USER FUNCTIONS #######################
############################################################

@socketio.on('getUsers', namespace='/heatmap')
def getUsers():
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)

    cur.execute("SELECT * FROM users")
    results = cur.fetchall()
    
    cur.close()
    db.close()
    
    userdata = []
    
    if(len(results) > 0):
        for result in results:
            # result[1] = username, result[3] = email, result[4] = admin
            adminValue = "No"
            if result[4]:
                adminValue = "Yes"
            user = {'name': result[1], 'admin': adminValue, 'email': result[3]}
            userdata.append(user)
        
        emit('returnUsers', userdata)
    else:
        #print("Error retrieving users from database...");
        pass

@socketio.on('createDaUser', namespace='/heatmap')
def createDaUser(formdata):
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)

    # user variables
    username = formdata['username']
    password = formdata['password']
    email = formdata['email']
    usertype = formdata['usertype']
    
    # check usertype
    if usertype == "user":
        usertype = "false"
    else:
        usertype = "true"
    
    # Check for username
    #print("Checking username....")
    usernameExists = False
    checkUserQuery = "SELECT username FROM users WHERE username = %s;"
    cur.execute(checkUserQuery, (username,))
    if cur.fetchone():
        #username found - throw error
        error_message = "Sorry, the username '" + username + "' already exists!"
        #print(error_message)
        emit('loadMessageBox', error_message)
        usernameExists = True
    
    # Attempt to create user
    if not usernameExists:
        usernameInsertGood = True
        #print("Attempting to create user....")
        try:
            createUserQuery = "INSERT INTO users (username, password, email, admin) VALUES (%s, crypt(%s, gen_salt('bf')), %s, %s);"
            cur.execute(createUserQuery, (username, password, email, usertype))
        except:
            usernameInsertGood = False
            errormessage = "Whoops! User Creation Failed!"
            #print(errormessage)
            emit('loadMessageBox', errormessage)
            db.rollback()
        db.commit()
        
        # Check to see if user was created
        if usernameInsertGood:
            #print("Checking success of user creation....")
            cur.execute(checkUserQuery, (username,))
            if cur.fetchone():
                # user created
                success_message = "User created!"
                print(success_message)
                emit('loadMessageBox', success_message)
            else:
                errormessage = "Whoops! User Creation Failed!"
                #print(errormessage)
                emit('loadMessageBox', errormessage)
    
    cur.close()
    db.close()

@socketio.on('changeUserPassword', namespace='/heatmap')
def changeUserPassword(changeformdata):
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    username = changeformdata['username']
    password = changeformdata['password']
    matchpassword = changeformdata['matchpassword']
    
    # Check to see if user exists
    #print("Checking for username....")
    errorCheckPass = False
    checkUserQuery = "SELECT username FROM users WHERE username = %s;"
    cur.execute(checkUserQuery, (username,))
    if cur.fetchone():
        #print("Username found")
        errorCheckPass = True
    else:
        errorMessage = "ERROR: Username not found."
        #print(errorMessage)
        emit('loadMessageBox', errorMessage);
    
    # make sure passwords match
    if password != matchpassword:
        errorMessage = "ERROR: Passwords don't match."
        #print(errorMessage)
        emit('loadMessageBox', errorMessage);
        errorCheckPass = False
    
    # try to insert new password
    try:
        #print("Inserting password...")
        passwordInsertQuery = "UPDATE users SET password = crypt(%s, gen_salt('bf')) WHERE username = %s;"
        cur.execute(passwordInsertQuery, (password, username))
        success_message = "Password changed!"
        emit('loadMessageBox', success_message)
    except:
        errorMessage = "ERROR: Problem updating password..."
        #print(errorMessage)
        emit('loadMessageBox', errorMessage)
        db.rollback()
    db.commit()
    
    cur.close()
    db.close()
        
@socketio.on('deleteUser', namespace='/heatmap')
def deleteUser(username):
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    testDeletion = True
    savedUser = current_user
    
    # Make sure user exists in database
    #print("Checking for username in database....")
    cur.execute("SELECT username FROM users WHERE username = %s;", (username,))
    if cur.fetchone():
        #print("Username is found.")
        pass
    else:
        # send message alerting user to error
        message = "User '" + username + "' not found."
        emit('loadMessageBox', message)
        testDeletion = False
        
    # Attempt to delete user
    #print("Attempting to delete user....")
    try:
        query = "DELETE FROM users WHERE username = %s;"
        
        # Check to see if current user is deleting themself
        selfdeletion = False
        if current_user.id == username:
            logout_user()
            selfdeletion = True
        
        # Check to see if more than one admin
        dontDeleteLastAdmin = False
        if selfdeletion:
            #print("CHECKING FOR ADMIN COUNT")
            cur.execute("SELECT admin FROM users WHERE admin = 't';")
            result = cur.fetchall()
            if len(result) < 2:
                dontDeleteLastAdmin = True # if user is last admin do not delete them.
        
        if dontDeleteLastAdmin:
            # send message alerting user to last admin rule
            message = "You cannot delete the last Admin User."
            #print(message)
            emit('loadMessageBox', message)
            testDeletion = False
        else:
            #print(cur.mogrify(query, (username,)))
            cur.execute(query, (username,))
            
    except:
        #print("Error deleting user...")
        if selfdeletion:
            login_user(savedUser, remember=True)
            
        # send message alerting user to error
        message = "Error deleting user " + username + " from database."
        emit('loadMessageBox', message)
        testDeletion = False
        db.rollback()
    db.commit()
    
    if testDeletion:
        # Check to make sure user was deleted
        #print("Checking success of user deletion....")
        cur.execute("SELECT username FROM users WHERE username = %s;", (username,))
        if cur.fetchone():
            # user not deleted
            #print("User not deleted")
            # send message alerting user to this fact
            message = "Error deleting user " + username + " from database."
            emit('loadMessageBox', message)
        else:
            #print("User deleted")
            if selfdeletion:
                #print("I DELETED MYSELF")
                
                # clear session variables
                for key in session.keys():
                    if key is not "remember":
                        session.pop(key)
                        
                emit('redirect', {'url': url_for('index')})
            else:
                message = username + " has been deleted!"
                emit('loadMessageBox', message)
    
    cur.close()
    db.close()

############################################################
###################### MAP FUNCTIONS #######################
############################################################
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
            
    cur.close()
    db.close()
            
@socketio.on('loadMice', namespace='/heatmap')
def loadMice(dataset):
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    # grab the dataset for the passed selection
    cur.execute("SELECT heatdata, vectordata, locationmap, subjectmap FROM datasets WHERE datasetname = %s;", (dataset,))
    result = cur.fetchone()
    
    #print(result['subjectmap'])
    
    emit('returnDataset', {
        'data': {
            'heatdata': result['heatdata'],
            'vectdata': result['vectordata'],
            'mapping': result['locationmap'],
            'subjects': result['subjectmap']
        }
    })
    
    cur.close()
    db.close()

if __name__ == '__main__':
    socketio.run(app, host=os.getenv('IP', '0.0.0.0'), port=int(os.getenv('PORT', 80)), debug = True)
