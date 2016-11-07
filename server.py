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
from flask import Flask
from flask_mail import Mail, Message

app =Flask(__name__)
mail=Mail(app)

app.config['MAIL_SERVER']='smtp.gmail.com'
app.config['MAIL_PORT'] = 465
app.config['MAIL_USERNAME'] = 'mvuwebapp@gmail.com'
app.config['MAIL_PASSWORD'] = 'mvuwebapppass'
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USE_SSL'] = True

mail=Mail(app)

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
    
# This is a function to help bring a json back from the database and turn it back into a dictionary   
def convertString(longstring):
    final = {}
    done = False
    counter = 0
    while counter < len(longstring):
        if longstring[counter] == "{" or longstring[counter] == "}":
            counter += 1
        else:
            thiskey = ""
            thisvalue = ""
            print("skipping: " + longstring[counter])
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
            return render_template('index.html', login_failed='false', currentpage='home', admin=session["admin"])
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

@app.route('/createaccount', methods=['GET', 'POST'])
def create_account():
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    if request.method == 'GET':
        return render_template('create_account.html', currentpage = 'create_account', admin=session["admin"])
    
    #POST
    # check username
    usernameinput = request.form['username']
    passwordinput = request.form['password']
    useremailinput = request.form['email']
    admin = request.form['admin']
    
    if admin == "user":
        admin = 'false'
    else:
        admin = 'true'
    print "User type is "+admin 

    print "Checking username...."
    cur.execute("SELECT username FROM users WHERE username = %s;", (usernameinput,))
    if cur.fetchone():
        return render_template('create_account.html', currentpage='create_account', bad_account='badusername', account_created='false', admin=session["admin"])
        
    # make sure passwords match
    print "Checking password...."
    password1 = request.form['password']
    password2 = request.form['retypepassword']
    if password1 != password2:
        return render_template('create_account.html', currentpage='create_account', bad_account='badpassword', account_created='false', admin=session["admin"])
    
    # make sure email doesn't exist
    print "Checking email...."
    pattern = re.compile("\A\S+@\S+\.\S+\Z")
    cur.execute("SELECT email FROM users WHERE email = %s;", (useremailinput,))
    if cur.fetchone() or not pattern.match(useremailinput):
        return render_template('create_account.html', currentpage='create_account', bad_account='bademail', account_created='false', admin=session["admin"])
        
    # attempt to create user
    print "Attempting to create user...."
    print "username" + request.form['username'] + " Password: " + request.form['password']
    try:
        cur.execute("INSERT INTO users (username, password, email, admin) VALUES (%s, crypt(%s, gen_salt('bf')), %s, %s);", (usernameinput, passwordinput, useremailinput, admin))
    except:
        print("Error creating user...")
        db.rollback()
    db.commit()
        
    # check to see if user was created
    print "Checking success of user creation...."
    cur.execute("SELECT username FROM users WHERE username = %s;", (usernameinput,))
    if cur.fetchone():
        # user was created
        print "User created"
        account_created = 'true'
    else:
        # user was NOT created
        print "User not created"
        account_created = 'false'
            
    return render_template('account_created.html', currentpage='create_account', bad_account='unknown', admin=session["admin"], account_created=account_created, user=usernameinput)

@app.route('/deleteaccount', methods=['GET', 'POST'])
def delete_account():
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    if request.method == 'GET':
        return render_template('delete_account.html', currentpage = 'delete_account', admin=session["admin"])

    # make sure user input matches
    print "Checking username match...."
    username1 = request.form['username1']
    username2 = request.form['username2']
    if username1 != username2:
        return render_template('delete_account.html', currentpage='delete_account', bad_account='badpassword', account_created='false', admin=session["admin"])

    print "Checking for username in database...."
    cur.execute("SELECT username FROM users WHERE username = %s;", (username1,))
    if cur.fetchone():
        print "Username is found."
    else:
        return render_template('delete_account.html', currentpage='delete_account', bad_account='badusername', account_created='false', admin=session["admin"])
    
    # attempt to delete user
    print "Attempting to delete user...."
    try:
        print(cur.mogrify("DELETE FROM users WHERE username = 'sean';"))
        cur.execute("DELETE FROM users WHERE username = 'sean';")
    except:
        print("Error deleting user...")
        db.rollback()
    db.commit()
        
    # check to see if user was deleted
    print "Checking success of user deletion...."
    cur.execute("SELECT username FROM users WHERE username = %s;", (username1,))
    if cur.fetchone():
        # user not deleted
        print "User not deleted"
        account_created = 'true'
    else:
        # user deleted
        print "User deleted"
        account_created = 'false'
            
    return render_template('account_deleted.html', currentpage='delete_account', bad_account='unknown', account_created=account_created, user=username1, admin=session["admin"])

@app.route('/changepassword', methods=['GET', 'POST'])
def change_password():
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    if request.method == 'GET':
        return render_template('change_password.html', currentpage = 'change_password', admin=session["admin"])

    password = request.form['password']
    retypepassword = request.form['retypepassword']
    username = request.form['username']

    # check to see if user exists
    print "Checking username...."
    cur.execute("SELECT username FROM users WHERE username = %s;", (username,))
    if cur.fetchone():
        print "Username is found."
    else:
        return render_template('change_password.html', currentpage='change_password', bad_account='badusername', account_created='false', admin=session["admin"])

    # make sure user password matches
    print "Checking passwords...."
    if password != retypepassword:
        return render_template('change_password.html', currentpage='change_password', bad_account='badpassword', account_created='false', admin=session["admin"])
        
    # try to insert new password
    try:
        print("Inserting password...")
        cur.execute("UPDATE users SET password = crypt('%s', gen_salt('bf')) WHERE username= '%s'" % (password, username))
    except:
        print("Error Inserting password...")
        db.rollback()
    db.commit()
            
    return render_template('password_changed.html', currentpage='change_password', bad_account='unknown', user=username, admin=session["admin"])


@app.route('/sendpassword', methods=['GET', 'POST'])
def send_password():
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    if request.method == 'GET':
        return render_template('send_password.html', currentpage = 'send_password')
        
    # get email from form
    email = request.form['email']
    print "User email is ."+email

    # check to see if user exists
    print "Checking username...."
    cur.execute("SELECT email FROM users WHERE email = %s;", (email,))
    if cur.fetchone():
        print "Checking password...."
        # cur.execute("SELECT INTO users password VALUES (crypt(%s, gen_salt('bf')) WHERE username = %s);", (password, username,))

        cur.execute("SELECT password = crypt('password', gen_salt('bf')) FROM users WHERE email = %s;", (email,))
        password = cur.fetchall()
        print password
        print password
        print password
        print password
            
        msg = Message('MVU Password', sender = 'mvuwebapp@yahoo.com', recipients = [email])
        msg.body = "Hello, this is yot password- "+str(password) 
        mail.send(msg)
        
        print "Mail Sent."
    else:
        return render_template('send_password.html', currentpage='change_password', bad_account='badusername', account_created='false')
            
    return render_template('password_sent.html', currentpage='send_password', email=email, bad_account='unknown')




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
        
        #print('filename: ' + file.filename) # this is a test line, it should print the filename to the console...
        
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
        return render_template('loadeddata.html')
        
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
    
    #print("Filename! " + myData["filename"])
    #myData[""]
    #print(myData)
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    if "oldSet" in myData["locations"].keys():
        #print(myData["locations"]["oldSet"])
        oldLoc = myData["locations"]["oldSet"]
        cur.execute("SELECT locationmap from datasets where datasetname=%s", (oldLoc,))
        holdlocations = cur.fetchall()
        tempLocations = holdlocations[0][0]
        getLocations = convertString(tempLocations)
        #for key in tempLocations.keys():
            #getLocations[key.strip()] = tempLocations[key].strip()
        #for item in getLocations:
            #print(item)
    else:
        getLocations = myData["locations"]
    
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("INSERT INTO datasets (datasetname, userid, heatdata, vectordata, locationmap) VALUES (%s, %s, %s, %s, %s)",(myData["filename"], 1, json.dumps(theseHeatMaps), json.dumps(thesePaths), json.dumps(getLocations)))
    db.commit()
    return render_template('data.html')


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
    
    
