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
    testList = ['aDataSet1', 'aDataSet2', 'aDataSet3', 'aDataSet4', 'aDataSet5', 'aDataSet6', 'aDataSet7']
    return testList
    
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
        
        print('filename: ' + file.filename) # this is a test line, it should print the filename to the console...
        
        # The variable called file stores the file, this could be sent to the parser rather than being saved
        # Nothing withing this if statement is needed for parsing purposes. I am leaving it to show
        # functionality if you want to test it.
        # Move the file form the temporal folder to the upload folder
        
        # file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename)) # remove this line if we are not saving the file
        myData = Parser(file).getData()
        User.uploadingData = myData["data"]
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
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("INSERT INTO datasets (datasetname, userid, heatdata, vectordata, locationmap) VALUES (%s, %s, %s, %s, %s)",(myData["filename"], 1, json.dumps(theseHeatMaps), json.dumps(thesePaths), json.dumps(myData["locations"])))
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
    
    print("HI THERE" + dataset)
    
    # grab the dataset for the passed selection
    getDataset = "SELECT heatdata FROM datasets WHERE datasetname = %s;"
    print(getDataset % ("%%" + dataset + "%%"))
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
    
    
