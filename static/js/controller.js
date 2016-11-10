/*global angular*/
/*global heatmap vectormap*/
/*global io location*/
var HeatmapApp = angular.module('HeatmapApp', []);

HeatmapApp.controller('HeatmapController', function($scope){
   
    var socket = io.connect('https://' + document.domain + ':' + location.port + '/heatmap');
  
    // VARIABLES
    $scope.testdata = []; // heatmap data
    
    var sampleChart = null;
    var vectorChart = null;

    $scope.datasets = [{'name': 'Select Data Set'}];    
    $scope.selection = $scope.datasets[0].name;
    
    $scope.mice = [{'list': 'Select Mouse'}];
    $scope.mouseselection = $scope.mice[0].list;
    
    var heatData = [];
    var vectorData = [];
    var mapping = [];
    
    var size = 0;
    var keys = [];
    var rfidlist = [];
    var newMap = [];
    
    // FUNCTIONS
    socket.on('connect', function(){
        console.log('Connected');
        socket.emit('getDatasetNames');
    });
    
    socket.on('testUpload', function(){
        console.log('I made it.');
    });
    
    socket.on('datasetnamelist', function(ser) {
       console.log("Adding " + ser.name + " to list...");
       $scope.datasets.push(ser);
       $scope.$apply();
    });
    
    $scope.loadDataset = function loadDataset() {
        if($scope.selection != $scope.datasets[0].name) {
            console.log("Loading " + $scope.selection + "...");
            
            socket.emit('loadMice', $scope.selection);
        }
    };
    
    socket.on('returnDataset', function(data) {
        
        heatData = JSON.parse(data.data.heatdata);
        vectorData = JSON.parse(data.data.vectdata);
        mapping = JSON.parse(data.data.mapping);
        
        console.log(vectorData);
        
        // GET SIZE OF GRID
        size = Object.keys(mapping).length - 1;
        
        // GET LIST OF MICE IN DATASET
        keys = Object.keys(heatData);

        $scope.mice = [];
        $scope.mice.push({'list': 'Select Mouse'});
        
        for(var i in keys) {
            $scope.mice.push({'list': keys[i]});
            $scope.$apply();
        }
        
        // ADD MISSING RFIDs TO HEATDATA
        rfidlist = [];
        for(i = 1; i <= size + 1; i++) {
            if(i < 10) {
                rfidlist.push("RFID0" + i);
            }
            else {
                rfidlist.push("RFID" + i);
            }
        }
        
        var getProperty = function (key, propertyName) {
            return heatData[key][propertyName];
        };
        
        for(var key = 0; key < Object.keys(keys).length; key++) {
            for(var r in rfidlist) {
                if (typeof getProperty(keys[key], rfidlist[r]) == 'undefined') {
                    heatData[keys[key]][rfidlist[r]] = 0;
                }
            }
        }
        
        // CONVERT MAPPING TO USABLE FORMAT
        newMap = [];
        for(i in mapping) {
            newMap.push(mapping[i]);
        }
        newMap.splice(0, 0, "null");
        newMap.splice(2, 0, "null");
        newMap.splice(3, 0, "null");
        
        if (size == 36) { // 6x6 grid
            newMap.splice(4, 0, "null");
            newMap.splice(5, 0, "null");
        }
    });
    
    $scope.showVectorMap = function showVectorMap() {
        
        if($scope.mouseselection != $scope.mice[0].list) {
            console.log("Loading vector map for " + $scope.mouseselection + "...");
            
            var mousevecdata = vectorData[$scope.mouseselection];
            var mapping = Object.keys(newMap).map(function(k) { return newMap[k] });
            
            var newDataset = [];
            
            console.log(mousevecdata[0]);
            console.log(mousevecdata);
            // console.log("Length: " + mousevecdata.length);
            
            // newDataset.push({'x': 0, 'y': 0, 'value': mousevecdata[0][1]});
            // console.log(newDataset);
            // console.log(mapping);
            
            var rows = 7;
            var cols = 4;
            
            for(var i = 0; i < mousevecdata.length; i++)
            {
                for(var j in mapping)
                {
                    // console.log("data: " + mousevecdata[i][0] + " map: " + mapping[j]);
                    if(mousevecdata[i][0] == mapping[j])
                    {
                        // console.log("RFID: " + mapping[j]);
                        // console.log("j: " + j + " rows: " + rows + " cols: " + cols);
                        
                        // Get Row and Col from 1D array           
                        rowcol:
                        for(var row = 0; row < rows; row++) 
                        {
                            for(var col = 0; col < cols; col++) 
                            {
                                if(j == (row * cols + col)) 
                                {
                                    newDataset.push({'x': row, 'y': col, 'value': mousevecdata[i][1]});
                                    break rowcol;
                                }
                            }
                        }
                    }
                }//End for j in mapping for loop
            }//End for mousevecdata.length for loop
            
            console.log(newDataset);
            
            vectorChart = null;
            vectorChart = new vectormap('vectormap', newDataset, {
                border: 10,
                gutterHeight: 5,
                gutterWidth: 5,
                cols: cols,
                rows: rows
            });
        }  
    };
    
    $scope.showHeatMap = function showHeatMap() {
        
        if($scope.mouseselection != $scope.mice[0].list) {
            console.log("Loading heatmap for " + $scope.mouseselection + "...");
            
            var mousedata = heatData[$scope.mouseselection];
            var arr = Object.keys(newMap).map(function(k) { return newMap[k] });
            
            var newarr = [];
            
            for (var i in arr)
            {
                if (mousedata.hasOwnProperty(arr[i]))
                {
                    newarr.push(mousedata[arr[i]]);
                }
                else
                {
                    newarr.push(-1);
                }
            }
            
            sampleChart = null;
            sampleChart = new heatmap('heatmap', newarr, {
                stroke: true,
                radius: 0
            });
            
            document.querySelector('#placeholder').style.visibility="hidden"; //hides the placeholder div
        }
    };
});


HeatmapApp.controller('DataController', function($scope){
    
    var socket = io.connect('https://' + document.domain + ':' + location.port + '/heatmap');
    
    // This is a scope variable - if you want to access a variable from the html page, it needs to be a scope variable.
    $scope.variable = ""; // in javascript there is no type declaration, just like python. the variable will be whatever type you init it to.
    
    // This is a normal variable:
    var normalVariable = "";
    
    socket.on('connect', function() {
        console.log('Connected');
    });
    
    // This is an example function that you can use to emit to from the server file.
    // in server.py just call: emit('keyword')
    // if you want a parameter do: emit('keyword', parameter)
    // the function header will need to be like this: socket.on('keyword', function(parameter) {
    // I think you can only pass one parameter to these functions. However if you put your parameters into a array of some sort (JSON) you can just pass that.
    socket.on('keyword', function() {
        console.log('Whatd Up?');
    }); // these functions need a semi-colon here
    
    // This is an example function that you can call from the html page like: ng-click="exampleFunction()" or ng-submit="exampleFunction()"
    // you can give the function parameters if you want to pass things.
    $scope.exampleFunction = function exampleFunction() {
        console.log("HI THERE!");
    }; // these functions need a semi-colon here
    
    // to emit to python you need to call:
    socket.emit('keyword'); 
    // or if you want a parameter
    $scope.parameter = "";
    socket.emit('keyword', $scope.parameter);
    
    // In python to catch this emit call your function header should look like this:
    // @socketio.on('keyword', namespace='/heatmap')
    // def pythonFunction(parameter):
    
    // you can call $scope functions in javascript like this: $scope.exampleFunction();
    
    // if you want to push data to an array you need to call "$apply()"
    // example:
    $scope.array = [];
    $scope.array.push({'data': "data"});
    $scope.$apply();
});

HeatmapApp.controller('UserController', function($scope){
    
    var socket = io.connect('https://' + document.domain + ':' + location.port + '/heatmap');
    
    $scope.deleteName = "";
    $scope.passName = "";
    $scope.pass1 = "";
    $scope.pass2 = "";
    $scope.users = [];
    
    socket.on('connect', function(){
        console.log('Connected');
        socket.emit('getUsers');
    });
    
    socket.on('returnUsers', function(users) {
       console.log('Retrieving Users...');
       
       $scope.users = [];
       for (var user in users)
       {
           $scope.users.push(users[user]);
           $scope.$apply();
       }
       
       console.log($scope.users);
    });
    
    socket.on('errorDeletingUser', function(message) {
       console.log(message);
       
    });
    
    socket.on('lastAdminDelete', function(message) {
       console.log(message);
       
    });
    
    socket.on('redirect', function (data) {
        window.location = data.url;
    });
    
    $scope.popup_hide = function popup_hide() {
        document.getElementById('headerHide').style.display = "none";
        document.getElementById('deleteUserPopup').style.display = "none";
        document.getElementById('createUserPopup').style.display = "none";
        document.getElementById('changePasswordPopup').style.display = "none";
    };
    
    $scope.createUser_show = function createUser_show(value) {
        document.getElementById('headerHide').style.display = "block";
        document.getElementById('createUserPopup').style.display = "block";
    };
    
    $scope.changepassword_show = function changepassword_show(value) {
        document.getElementById('headerHide').style.display = "block";
        document.getElementById('changePasswordPopup').style.display = "block";
        $scope.passName = value;
        console.log("changing password for " + $scope.passName);
    };
    
    $scope.deleteuser_show = function deleteuser_show(value) {
        document.getElementById('headerHide').style.display = "block";
        document.getElementById('deleteUserPopup').style.display = "block";
        $scope.deleteName = value;
    };
    
    
    $scope.changeUserPassword = function changeUserPassword() {
        console.log("password one: " + $scope.pass1);
        console.log("password two: " + $scope.pass2);
        $scope.popup_hide();
        $scope.pass1 = '';
        $scope.pass2 = '';
    };
    
    $scope.delete_user = function delete_user() {
        console.log("Deleting " + $scope.deleteName + "...");
        socket.emit('deleteUser', $scope.deleteName);
        socket.emit('getUsers');
        $scope.popup_hide();
    };
});