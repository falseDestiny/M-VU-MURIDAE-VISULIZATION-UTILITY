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

### DigitalOcean setup

#### Create Droplet
Once a user has created an account on DigitalOcean they will be able to create what is called a droplet.
* Click on the green button at the top right of the screen labeled “Create Droplet”
* The default settings for the droplet are already in place. 
* The only setting that should be modified is the “Choose a size” setting. 
  * This should be switched to $5 a month. 
  * This can be done by clicking the box labeled $5. 
  * After this change has been made click on the green submit button at the bottom of the page that is labeled “Create”.
  
#### Modify user account on the droplet
Now that the droplet has been created you will be taken to the droplet screen, and you are ready to begin installing the packages that are necessary for running the web application.  

* Click on your new droplet that is located under the name field of the page.
* You are now presented with the droplets data activity.  
  * To the upper right there are two green buttons.  
  * They are called “Create Droplet” and “ON”.  
  * Just below the two of them there is a button that says “Console”.  
  * To the far right of this button you will see “ipv4:” followed by a string of numbers separated by period.  
  * Write down this number.  
* Now click on the button labeled “Console”.
* When you first enter the Console window you will be asked for a username.  
  * The default username is “root”.  
* Type “root” and press enter.  
* You will now be prompted for a password.  
  * This password has been emailed to the email address that was used when creating the DigitalOcean account.  
* Enter this password now.
* After you enter the password that was emailed to you you will be prompted to enter the same password again.  
* Enter this password once again and press enter.
* Now you will be prompted to enter a new password.  
* Please enter a password that is easily remembered by you.

#### Run keySetup.sh
* Open the file called “keySetup.sh”.
* On line 4 you will see “root@162.243.186.124”.  
* Change the numbers after root to the numbers you wrote down that were after the text “ipv4”.
* In terminal change your directory to the directory containing the keySetup.sh file.  
  * This can be done by typing “cd DESIRED DIRECTORY”. 
  * For example if the .sh file is on your desktop type “cd Desktop”.  
* Once your directory has been changed execute the file by typing “./keySetup.sh”.
* When prompted “Enter file in which to save the key”, press enter.
* If asked to overwrite say yes.
* When asked to enter a passphrase, leave it blank and press enter.
* You will now be asked to enter the password for the root user of the server.  
* Enter the password you chose earlier that was used to replace the password that was emailed to you.

#### Install packages onto the server
* Open the file called “installPackages.sh”.
* On line 3 you will see “SERVERS="162.243.186.124”.  
* Changes the numbers after “SERVERS” to the numbers you wrote down that were after the text “ipv4”.
* In terminal change your directory to the directory containing the installPackages.sh file.  
  * This can be done by typing “cd DESIRED DIRECTORY”. 
  * For example if the .sh file is on your desktop type “cd Desktop”.  
* Once your directory has been changed execute the file by typing “./installPackages.sh”.
* All appropriate packages have now been installed

#### Setup the database
* Open terminal and execute this command-“ssh root@162.243.186.124” where the long string of numbers after “root@“ is replaced by the numbers you wrote down that were after the text “ipv4”.
* enter the command “cd mvu” then press enter.  
  * This will change your directory to mvu.
* enter the command “sudo sudo -u postgres psql”.  
  * This will allow you to enter postgres.
* Enter the command “\password postgres”. 
  * This will allow you to create a new postgres password.  
* After entering your new password press enter.  
* Next enter the command “\quit”.
* Now you are back into the “mvu” directory. 
* Enter the command “psql -U postgres -h localhost”.
* After entering postgres the second time you will be able to setup the database with the necessary tables.  
* Enter the command “\i mouseDB.sql”.  
  * The needed database has now been created.

#### Setup the Hosting Service
* Open the file called “restartServer.sh”.
* On line 3 you will see “SERVERS="45.55.254.5”.  
* Change the numbers after “SERVERS” to the numbers you wrote down that were after the text “ipv4”.
* In terminal change your directory to the directory containing the restartServer.sh file.  
  * This can be done by typing “cd DESIRED DIRECTORY”. 
  * For example if the .sh file is on your desktop type “cd Desktop”.  
* Once your directory has been changed execute the file by typing “./restartServer.sh”.  

#### View the website
* Open up a web browser.
* In the address bar enter the string of numbers that you wrote down that were after the text “ipv4”.

#### Congratulations! You have setup a web server, give yourself a pat on the back:)

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

* 3rd Party Code

  * CSS  
    * /static/css/bootstrap-switch.css - provides CSS for the bootstrap switch utility  
    * /static/css/dropdowns-enhancemnet.min.css - provides CSS changes for bootstrap dropdowns
  * JavaScript  
    * /static/js/bootstrap-switch.min.js - provides JavaScript for the bootstrap switch utility  
    * /static/js/dropdowns-enhancement.js - provides JavaScript changes for bootsstrap dropdowns  
    * /static/js/rainbowvis.js - provides color gradients for the Heatmap utility
