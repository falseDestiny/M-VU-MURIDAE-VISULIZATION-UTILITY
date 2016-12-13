#!/bin/bash
# Linux/UNIX box with ssh key based login
SERVERS="45.55.254.5"
# Set user variable
user="root"
# Clear the screen
clear
# For each server run these commands
for server in $SERVERS
do
	echo "The installation has began..."
	#ssh root@159.203.132.0 "cd mvu && \i mouseDB.sql"
	# chmod og+rX /mvu
	#sudo sudo -u postgres psql
	ssh ${user}@${server} "git clone https://github.com/KebertXela87/mvu.git"	
	ssh ${user}@${server} "sudo apt-get -y update"
	ssh ${user}@${server} "sudo apt-get -y upgrade"
	ssh ${user}@${server} "sudo apt install -y python-pip python-pip django"
	ssh ${user}@${server} "sudo easy_install -y flask flask markdown flask-login flask-socketio"
	ssh ${user}@${server} "sudo apt-get install -y python-psycopg2 postgresql-contrib-9.3 postgresql python-eventlet"
	ssh ${user}@${server} "sudo apt-get install -y postgresql-contrib flask python-pip python-dev build-essential"
	ssh ${user}@${server} "sudo apt-get install --upgrade pip -y"
	ssh ${user}@${server} "sudo apt-get -y update"
	ssh ${user}@${server} "sudo apt-get -y upgrade"	
	ssh ${user}@${server} "sudo pip install flask_mail==0.9.0"
	echo "The installation has finished..."	
done

