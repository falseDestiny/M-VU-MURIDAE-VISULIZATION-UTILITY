import psycopg2
import psycopg2.extras
import os, uuid, re
from flask import Flask, render_template, request, redirect, url_for, session, Markup
import flask.ext.login as flask_login
from flask_login import current_user
from flask.ext.socketio import SocketIO, emit


app = Flask(__name__)
app.secret_key = os.urandom(24).encode('hex')

socketio = SocketIO(app)

login_manager = flask_login.LoginManager()
login_manager.init_app(app)

class User(flask_login.UserMixin):
    pass
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

@login_manager.user_loader
def user_loader(user_id):
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
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
    return render_template('index.html', login_failed = 'true')
    
@app.route('/', methods=['GET', 'POST']) #handle login
def index():
    if request.method == 'GET':
        return render_template('index.html', login_failed='false')
    #attempt login
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    usernameinput = request.form['username']
    passwordinput = request.form['password']
   
    cur.execute("SELECT * FROM users WHERE LOWER(username) = LOWER(%s) AND password = crypt(%s, password);", (usernameinput, passwordinput))
    if cur.fetchone():
        print("TESTING")
        user = User()
        user.id = usernameinput
        flask_login.login_user(user)
            
        return redirect(url_for('index'))

    #login failed
    return render_template('index.html', login_failed = 'true')
    
@app.route('/confirm')
@flask_login.login_required
def confirm():
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    return render_template('confirm.html')
    
@app.route('/heatmap')
def heatmap():
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    return render_template('heatmap.html')

@app.route('/maps')
def maps():
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    return render_template('maps.html')
    
@app.route('/data')
def data():
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    return render_template('data.html')

@app.route('/users')
def manageusers():
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    return render_template('users.html')

@app.route('/account')
@flask_login.login_required
def account():
    db = connectToDB()
    cur = db.cursor(cursor_factory=psycopg2.extras.DictCursor)

    return render_template('account.html', currentpage = 'account')

    
@socketio.on('connect', namespace='/archives')
def makeConnection(): 
    print('connected')


if __name__ == '__main__':
    #app.run(host=os.getenv('IP', '0.0.0.0'), port=int(os.getenv('PORT', 8080)), debug = True)
    socketio.run(app, host=os.getenv('IP', '0.0.0.0'), port=int(os.getenv('PORT', 8080)), debug = True)
    