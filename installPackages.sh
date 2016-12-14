ash
# Linux/UNIX box with ssh key based login
SERVERS="162.243.184.113"
# Set user variable
user="root"
# Clear the screen
clear
# For each server run these commands
for server in $SERVERS
do
	echo "The installation has began..."
	#ssh root@159.203.132.0 "cd mvu && \i mouseDB.sql"
	#sudo sudo -u postgres psql
	ssh ${user}@${server} "git clone https://github.com/KebertXela87/mvu.git"	
	ssh ${user}@${server} "sudo apt-get update -y"
	ssh ${user}@${server} "sudo apt-get upgrade -y"
	ssh ${user}@${server} "sudo apt install python-pip -y"
	ssh ${user}@${server} "sudo apt-get install postgresql -y"
	ssh ${user}@${server} "sudo easy_install flask"
	ssh ${user}@${server} "sudo easy_install flask markdown"
	ssh ${user}@${server} "sudo easy_install flask-login"
	ssh ${user}@${server} "sudo easy_install flask-socketio"
	ssh ${user}@${server} "sudo apt-get install python-psycopg2 -y"
	ssh ${user}@${server} "sudo apt-get install postgresql-contrib-9.3 -y"
	ssh ${user}@${server} "sudo apt-get install python-eventlet -y"		
	ssh ${user}@${server} "sudo apt-get install postgresql-contrib -y"
	ssh ${user}@${server} "sudo apt-get install python-pip python-dev build-essential -y"	
	ssh ${user}@${server} "sudo apt-get install --upgrade pip -y"
	ssh ${user}@${server} "sudo apt-get -y update"
	ssh ${user}@${server} "sudo apt-get -y upgrade"	
	ssh ${user}@${server} "sudo pip install flask_mail==0.9.0"
	echo "The installation has finished..."	
done
