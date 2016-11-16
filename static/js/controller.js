/*global angular $*/
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
        
        console.log(heatData);
        console.log(heatData.length);
        console.log(vectorData);
        
        console.log(mapping);
        console.log(Object.keys(mapping).length);
        
        // // GET SIZE OF GRID (subtract rows and columns entries)
        size = Object.keys(mapping).length - 3;
        
        console.log(size);
        
        // // GET LIST OF MICE IN DATASET
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
        
        // for(var key = 0; key < Object.keys(keys).length; key++) {
        //     for(var r in rfidlist) {
        //         if (typeof getProperty(keys[key], rfidlist[r]) == 'undefined') {
        //             heatData[keys[key]][rfidlist[r]] = 0;
        //         }
        //     }
        // }
        
        // // CONVERT MAPPING TO USABLE FORMAT
        // newMap = [];
        // for(i in mapping) {
        //     newMap.push(mapping[i]);
        // }
        // newMap.splice(0, 0, "null");
        // newMap.splice(2, 0, "null");
        // newMap.splice(3, 0, "null");
        
        // if (size == 36) { // 6x6 grid
        //     newMap.splice(4, 0, "null");
        //     newMap.splice(5, 0, "null");
        // }
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

HeatmapApp.controller('UploadController', function($scope){
    
    var socket = io.connect('https://' + document.domain + ':' + location.port + '/heatmap');
  
    $scope.sensors=["---","RFID01","RFID02","RFID03","RFID04","RFID05","RFID06","RFID07","RFID08","RFID09","RFID10","RFID11","RFID12","RFID13","RFID14","RFID15","RFID16","RFID17","RFID18","RFID19","RFID20","RFID21","RFID22","RFID23","RFID24","RFID25","RFID26","RFID27","RFID28","RFID29","RFID30","RFID31","RFID32","RFID33","RFID34","RFID35","RFID36",];
    
    $scope.datasets = [{'name': 'Select Data Set'}];  
    
    socket.on('connect', function() {
        $scope.gridReady = false;
        $scope.setRows = "1";
        $scope.setCols = "1";
        $scope.datasets = [];
        socket.emit('getDatasetNames');
        $scope.rowsInt = 0;
        $scope.colsInt = 0;
        $scope.locationMap = [];
        $scope.mimicedGrid = "";
        $scope.thisFileName = "thisisasamplefilename";
        socket.emit('checkUploading');
    });
    
    socket.on('datasetnamelist', function(ser) {
       $scope.datasets.push(ser);
       $scope.$apply();
    });
    
    socket.on('haveSetName', function(setName) {
       $scope.thisFileName=setName; 
       $scope.$apply();
       
       var dataSetNames = [];
        
       for(var key in $scope.datasets){
            dataSetNames.push($scope.datasets[key].name);
       }
       if($scope.thisFileName==""){
           document.getElementById('completeUpload').setAttribute("disabled","true");
       }
       else if(dataSetNames.indexOf($scope['thisFileName']) != -1){
           document.getElementById('completeUpload').setAttribute("disabled","true");
       }
       else{
           document.getElementById('completeUpload').removeAttribute("disabled");
       }
    });
    
    socket.on('finishedUploading', function(){
        $scope.datasets = [];
        socket.emit('getDatasetNames');
    });
    
    $scope.popup_show = function popup_show(passedDiv) {
        //Header
        document.getElementById('headerHide').style.visibility = "visible";
        document.getElementById('headerHide').style.opacity = 1;
        //Popup
        document.getElementById(passedDiv).style.visibility = "visible";
        document.getElementById(passedDiv).style.opacity = 1;
    };
    
    // SHOW-HIDE POPUP
    $scope.popup_hide = function popup_hide(passedDiv) {
        document.getElementById('headerHide').style.visibility = "hidden";
        document.getElementById(passedDiv).style.visibility = "hidden";
        document.getElementById('headerHide').style.opacity = 0;
        document.getElementById(passedDiv).style.opacity = 0;
    };
    
    socket.on('checkedUploading', function(uploading){
        if(uploading==true){
            $scope.popup_show("gridOptionPopUp");
        }
    });
    
    socket.on('setMimicGrid', function(grid){
       $scope.colsInt = parseInt(grid["columns"]);
       $scope.rowsInt = parseInt(grid["rows"]);
       for(var i=0; i < $scope.rowsInt; i++){
           for(var j = 0; j < $scope.colsInt; j ++){
               var thisKey = ((i * $scope.colsInt) + j);
               var thisValue = grid[thisKey];
               $scope.locationMap[[i,j]] = thisValue;
           }
       }
       socket.emit('getSetName');
       
       $scope.popup_show("finalizeUpload");
    });
    
    $scope.defineGrid = function defineGrid() {
        $scope.popup_hide("gridOptionPopUp");
        $scope.popup_show('setDimensionsPopUp');
    };
    
    $scope.mimicGrid = function mimicGrid() {
        $scope.popup_hide("gridOptionPopUp");
        $scope.popup_show('mimicGridPopUp');
    };
    
    $scope.cancelMimic = function cancelMimic(){
        $scope.popup_hide('mimicGridPopUp');
        $scope.popup_show("gridOptionPopUp");
    };
    
    $scope.validateMimic = function validateMimic(){
        if($scope.mimicedGrid != ""){
            document.getElementById('submitMimicGrid').removeAttribute("disabled");
        }
        else{
            document.getElementById('submitMimicGrid').setAttribute("disabled","true");
        }
    };
    
    $scope.loadMimicGrid = function loadMimicGrid(){
        $scope.popup_hide('mimicGridPopUp');
        socket.emit("getGridToMimic", $scope.mimicedGrid);
    };
    
    $scope.cancelUpload = function cancelUpload() {
        $scope.popup_hide("gridOptionPopUp");
        socket.emit("clearUpload");
    };
    
    $scope.cancelDimenDef = function cancelDimenDef(){
        $scope.popup_hide('setDimensionsPopUp');
        $scope.popup_show("gridOptionPopUp");
    };
    
    $scope.cancelGridDef = function cancelGridDef(){
        $scope.popup_hide('defineGridPopUp');
        $scope.popup_show("setDimensionsPopUp");
    };
    
    $scope.getGridSelector = function getGridSelector(){
        $scope.popup_hide("setDimensionsPopUp");
        $scope.rowsInt = parseInt($scope.setRows, 10);
        $scope.colsInt = parseInt($scope.setCols, 10);
        $scope.popup_show("defineGridPopUp");
    };
    
    $scope.checkName = function checkName(){
        
        var dataSetNames = [];
        for(var key in $scope.datasets){
            dataSetNames.push($scope.datasets[key].name);
        }
        
        if($scope.thisFileName==""){
            document.getElementById('completeUpload').setAttribute("disabled","true");
        }
        else if(dataSetNames.indexOf($scope['thisFileName']) != -1){
            console.log("Duplicate file name.");
            document.getElementById('completeUpload').setAttribute("disabled","true");
        }
        else{
            document.getElementById('completeUpload').removeAttribute("disabled");
        }
    };
    
    
    $scope.confirmGridDef = function confirmGridDef(){
        $scope.popup_hide("defineGridPopUp");
        $scope.popup_show("finalizeUpload");
        socket.emit('getSetName');
    };
    
    $scope.dontFinalize = function dontFinalize(){
        $scope.popup_hide("finalizeUpload");
        socket.emit("clearUpload");
    };
    
    $scope.completeUpload = function completeUpload(){
        $scope.popup_hide("finalizeUpload");
        var finalOutput = [];
        finalOutput.push($scope.thisFileName);
        finalOutput.push($scope.rowsInt);
        finalOutput.push($scope.colsInt);
        var locMap = [];
        for(var keyS in $scope.locationMap){
            locMap.push($scope.locationMap[keyS.toString()]);
        }
        
        finalOutput.push(locMap);
        socket.emit('finishUpload', finalOutput);
    };
    
    
    $scope.checkGrid = function checkGrid(){
        var holdLocs = [];
        for(var key in $scope.locationMap){
            holdLocs.push(key.toString());
        }
        var failed = false;
        for(var i = 0; i < $scope.rowsInt; i++){
            for(var j = 0; j < $scope.colsInt; j ++){
               if(holdLocs.indexOf((i + "," + j).toString()) == -1){
                   failed = true;
                   i = $scope.rowsInt;
                   j = $scope.colsInt;
               }
            }
        }
        if(!failed){
            var holdValues = [];
            for(var keyS in $scope.locationMap){
                if($scope.locationMap[keyS.toString()] != "---"){
                    if(holdValues.indexOf($scope.locationMap[keyS.toString()]) == -1){
                        holdValues.push($scope.locationMap[keyS.toString()]);
                    }
                    else{
                        failed = true;
                        document.getElementById('dupRFID').style.visibility = "visible";
                    }
                }
            }
        }
        
        if(!failed){
            document.getElementById('checkedGrid').removeAttribute("disabled");
        }
        else{
            document.getElementById('checkedGrid').setAttribute("disabled","true");
        }
    };
    
    $scope.loadDataset = function loadDataset() {
        document.querySelector('#placeholder').style.visibility="hidden"; //hides the placeholder div
        $('.collapse').collapse("show");
        socket.emit('viewDataSet', $scope.selection);
    };
    
    $scope.showDelete = function showDelete(){
        $scope.popup_show("deletePopUp");
    };
    
    $scope.cancelDelete = function cancelDelete(){
        $scope.popup_hide("deletePopUp");  
    };
    
    $scope.deleteSet = function deleteSet(){
        socket.emit("deleteSet", $scope.displayName);  
    };
    
    $scope.cancelEdit = function cancelEdit(){
        $scope.popup_hide("editPopUp");
    }
    
    $scope.editSet = function editSet(){
        $scope.popup_show("editPopUp");
        $scope.tempName = $scope.displayName;
        socket.emit("loadGrid", $scope.displayName);
    };
    
    $scope.saveEdits = function saveEdits(){
        $scope.popup_hide("editPopUp");
        var finalOutput = [];
        finalOutput.push($scope.tempName);
        finalOutput.push($scope.rowsInt);
        finalOutput.push($scope.colsInt);
        var locMap = [];
        for(var keyS in $scope.locationMap){
            locMap.push($scope.locationMap[keyS.toString()]);
        }
        finalOutput.push(locMap);
        finalOutput.push($scope.displayName)
        socket.emit('finishUpdate', finalOutput);
        
        $scope.datasets = [];
        socket.emit('getDatasetNames');
        
        document.querySelector('#placeholder').style.visibility="hidden"; //hides the placeholder div
        $('.collapse').collapse("show");
        socket.emit('viewDataSet', $scope.tempName);
    };
        
    $scope.checkEdit = function checkEdit(){
        var holdLocs = [];
        for(var key in $scope.locationMap){
            holdLocs.push(key.toString());
        }
        var failed = false;
        for(var i = 0; i < $scope.rowsInt; i++){
            for(var j = 0; j < $scope.colsInt; j ++){
               if(holdLocs.indexOf((i + "," + j).toString()) == -1){
                   failed = true;
                   i = $scope.rowsInt;
                   j = $scope.colsInt;
               }
            }
        }
        if(!failed){
            var holdValues = [];
            for(var keyS in $scope.locationMap){
                if($scope.locationMap[keyS.toString()] != "---"){
                    if(holdValues.indexOf($scope.locationMap[keyS.toString()]) == -1){
                        holdValues.push($scope.locationMap[keyS.toString()]);
                    }
                    else{
                        failed = true;
                        //document.getElementById('dupRFID').style.visibility = "visible";
                    }
                }
            }
        }
        
        if(!failed){
            var dataSetNames = [];
            for(var key in $scope.datasets){
                if($scope.datasets[key].name != $scope.tempName){
                    dataSetNames.push($scope.datasets[key].name);
                }
            }
            
            if($scope.tempName ==""){
                failed=true;
            }
            else if(dataSetNames.indexOf($scope.tempName) != -1){
                failed=true;
            }
        }
        
        if(!failed){
            document.getElementById('saveEditsButton').removeAttribute("disabled");
        }
        else{
            document.getElementById('saveEditsButton').setAttribute("disabled","true");
        }
    };
    
    socket.on('setLoadedGrid', function(grid){
       $scope.colsInt = parseInt(grid["columns"]);
       $scope.rowsInt = parseInt(grid["rows"]);
       for(var i=0; i < $scope.rowsInt; i++){
           for(var j = 0; j < $scope.colsInt; j ++){
               var thisKey = ((i * $scope.colsInt) + j);
               var thisValue = grid[thisKey];
               $scope.locationMap[[i,j]] = thisValue;
           }
       }
    });
    
    
    socket.on('deletedSet', function(){
       $scope.popup_hide("deletePopUp");  
       $scope.heatData = [];
       $scope.vectorData = [];
       $scope.displayName = "";
       $('.collapse').collapse("hide");
       document.querySelector('#placeholder').style.visibility="visible"; //hides the placeholder div
       $scope.datasets = [];
       socket.emit('getDatasetNames');
    });
    
    $scope.heatData = [];
    $scope.vectorData = [];
    $scope.displayName = "";
    
    socket.on('returnSetData', function(setData){
        $scope.heatData = [];
        $scope.vectorData = [];
        $scope.displayName = "";
        
        $scope.displayName = setData[0];
        
        for(var key in setData[1]){
            for(var innerkey in setData[1][key]){
                var thisLine = [];
                thisLine["subject"] = key;
                thisLine["location"] = innerkey;
                thisLine["time"] = setData[1][key][innerkey];
                $scope.heatData.push(thisLine);
            }
        }
        
        for (var key in setData[2]){
            for(var x = 0; x < setData[2][key].length; x++){
                var thisLine = [];
                thisLine["subject"] = key;
                thisLine["location"] = setData[2][key][x][0];
                thisLine["time"] = setData[2][key][x][1];
                $scope.vectorData.push(thisLine);
            }
        }
        
        $scope.$apply();
    });
});

HeatmapApp.controller('UserController', function($scope){
    
    var socket = io.connect('https://' + document.domain + ':' + location.port + '/heatmap');
    
    $scope.users = [];
    $scope.MessageBoxMessage = "";
    
    // Create User Scope Variables
    $scope.formdata = {};
    
    // Delete User Scope Variables
    $scope.deleteName = "";
    
    // Change Password Scope Variables
    $scope.passName = "";
    $scope.changeformdata = {};
    
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
    
    socket.on('redirect', function (data) {
        window.location = data.url;
    });
    
    // SHOW-HIDE POPUP
    $scope.popup_hide = function popup_hide(passedDiv) {
        document.getElementById('headerHide').style.visibility = "hidden";
        document.getElementById(passedDiv).style.visibility = "hidden";
        
        document.getElementById('headerHide').style.opacity = 0;
        document.getElementById(passedDiv).style.opacity = 0;
    };
    
    $scope.popup_show = function popup_show(passedDiv, value) {
        //Header
        document.getElementById('headerHide').style.visibility = "visible";
        document.getElementById('headerHide').style.opacity = 1;
        //Popup
        document.getElementById(passedDiv).style.visibility = "visible";
        document.getElementById(passedDiv).style.opacity = 1;
      
        //if createUser
        if (passedDiv == "createUserPopup") {
            // Reset the form
            angular.copy({}, $scope.formdata);
            $scope.formdata.usertype = null;
            $('#createUserForm')[0].reset();
            $('#createUserForm').validator('destroy').validator();
        }
        else if(passedDiv == "changePasswordPopup") {
            $scope.passName = value;
            console.log("changing password for " + $scope.passName);
            
            // Reset the form
            angular.copy({}, $scope.changeformdata);
            $('#changePasswordForm')[0].reset();
            $('#changePasswordForm').validator('destroy').validator();
        }
        else if(passedDiv == "deleteUserPopup") {
            $scope.deleteName = value;
        }
    };

    // CREATE USER
    $scope.createUser = function createUser() {
        socket.emit('createDaUser', $scope.formdata);
        $scope.popup_hide("createUserPopup");
    };
    
    // CHANGE PASSWORD
    $scope.changeUserPassword = function changeUserPassword(value) {
        $scope.changeformdata.username = value;
        socket.emit('changeUserPassword', $scope.changeformdata);
        $scope.popup_hide("changePasswordPopup");
    };
    
    // DELETE USER
    $scope.delete_user = function delete_user() {
        console.log("Deleting " + $scope.deleteName + "...");
        socket.emit('deleteUser', $scope.deleteName);
        $scope.popup_hide("deleteUserPopup");
    };
    
    // MESSAGE BOX
    socket.on('loadMessageBox', function(message) {
        console.log(message);
        $scope.MessageBoxMessage = message;
        $scope.$apply();
        
        setTimeout($scope.popup_show, 300, "MessageBox", null);
        setTimeout($scope.popup_hide, 5000, "MessageBox");
        
        socket.emit('getUsers');
    });
    
    

});

HeatmapApp.filter('range', function() {
  return function(input, total) {
    total = parseInt(total);
    for (var i=0; i<total; i++)
      input.push(i);
    return input;
  };
});