# M-VU: MURIDAE VISULIZATION UTILITY

## Description:
The Muridae Visulization Utility (M-VU) is a web application designed to provide a visual reprensentation of collected data. Its main function is to allow researchers the ability to quickly see an overview of large amounts of data in a heatmap presentation. Addtional features allow for viewing vector map reprensentations of the same data as well as being able to edit various aspects of the uploaded datasets. User management is also included to provide researchers different levels of permissions for viewing and editing datasets. 

## Dependencies:

### Language Dependencies:
- Python 2.7.12
 - flask
 - flask-login
 - flask-socketio
 - flask_mail==0.9.0
 - werkzeug
- AngularJS 1.4.8
- SocketIO 1.4.4
- Bootstrap 3.3.7
- dropdowns-enhancement.js
- bootstrap-switch.css
- jQuery 2.2.4

### Database Dependencies:
- postgresql
- python-psycopg 2
- postgresql-contrib-9.3

### Deployment Dependencies:
- nginx
- python-eventlet
- Digital Ocean server using Ubuntu 16.04

## Installation:
add stuff here

## Common Features:
### Login:
To login you will need to access the website and provide a valid *username* and *password*.

example:  
username: sean  
password: password  

If you forgot your password and need to reset it, select the **Forgot Password** link and provide a valid email address to receive a reset code. Enter the reset code and supply matching passwords.  

### Upload Dataset:
To upload a dataset, first you must navagate to the Data Page of the application.  
From there select **Upload Data Set** and select a valid file.  
Finally click **Submit** and proceed through the various upload options for the dataset.

example info:  
dataset: sampledata.csv  
grid size: 7 x 4  

valid file types: csv, xls, xlsx, xlsm, xlt

### View Heatmaps and Vectormaps:
To view a heatmap, first you must navagate to the Maps Page of the application.  
From there select a dataset from the **Select Dataset** dropdown.  
Finally, toggle the mice you want to view heatmaps for.

For vectormaps, toggle the large **Vector Maps** switch.  

### User Management:
User Management is located on the Users Page of the application.  
To create a user, select the **Create User** icon (person with plus sign) in the top right and fill in the required info.  
To remove a user, select the **Delete User** icon (trash can) and confirm the selection.  
To change a user password, select the **Change Password** icon (lock) and supply the new password.  

### user inputs:
username - cannot be a duplicate of exsiting user  
password - must be at least 6 characters long  
reset password code - *provided*  
email address - must follow standard email format (ex: someone@something.com)  
dataset file - must be a valid file format  
dataset name - cannot be a duplicate of existing dataset  
subject names - no limitations  

## Files:
- HTML
 - /templates/layout.html - provides common html code accross site
 - /templates/login.html - handles login page html 
 - /templates/index.html - handles main page html 
 - /templates/maps.html - handles map page html 
 - /templates/data.html - handles data page html 
 - /templates/users.html - handles users page html 
 - /templates/sendaccesscode.html - handles send access code html
 - /templates/confirmaccesscode.html - handles confirm access code html
 - /templates/createnewpassword.html - handles create new password html
- CSS
 - /static/css/main.css - provides the custom CSS for the web application
- JavaScript
 - /static/js/controller.js - Provides the AngularJS controller for the application
 - /static/js/heatmap.js - The Heatmap Utility used to display heatmaps
 - /static/js/vectormap.js - The Vectormap Utility to display vectormaps
- Scripts
 - Python
  - server.py - Main server script to run the applacation and handle database queries
  - mouse.py - the object for mice in the simulation
  - parse.py - parses the data file for use in the simulation
  - sim.py - simulates the mouse objects and constructs the heatmap and vectormap data
 - Shell
  - installPackages.sh - installs necessary packages for running the web application
  - keySetup.sh - setups user key to elminate the necessity of entering passwords during server interaction
  - restartServer.sh - restarts the server
- SQL
 - mouseDB.sql - creates the postgres database for the application 

- 3rd Party Code
 - CSS
  - /static/css/bootstrap-switch.css - provides CSS for the bootstrap switch utility
  - /static/css/dropdowns-enhancemnet.min.css - provides CSS changes for bootstrap dropdowns
 - JavaScript
  - /static/js/bootstrap-switch.min.js - provides JavaScript for the bootstrap switch utility
  - /static/js/dropdowns-enhancement.js - provides JavaScript changes for bootsstrap dropdowns
  - /static/js/rainbowvis.js - provides color gradients for the Heatmap utility
