#!/bin/bash
# Linux/UNIX box with ssh key based login
SERVERS="162.243.184.113"
# Set user variable
user="root"
# Clear the screen
clear
# For each server run these commands
for server in $SERVERS
do
	echo "The server restart has began..."
	#ssh ${user}@${server} "reboot"	
	ssh ${user}@${server} "cd mvu &&  python server.py"
	echo "The server is running..."
done
