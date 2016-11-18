/*global angular $*/
/*global heatmap vectormap*/
/*global io location*/
var HeatmapApp = angular.module('HeatmapApp', []);

HeatmapApp.controller('HeatmapController', function($scope){
   
    var socket = io.connect('https://' + document.domain + ':' + location.port + '/heatmap');
    
    // VARIABLES
    $scope.testdata = []; // heatmap data
    
    var heatmapChart = null;
    var vectorChart = {};

    $scope.datasets = [{'name': 'Select Data Set'}];    
    $scope.selection = $scope.datasets[0].name;
    
    $scope.mice = []; //[{'list': 'Select Mouse'}];
    // $scope.mouseselection = ""; //$scope.mice[0].list;
    
    var heatData = [];
    var vectorData = [];
    var mapping = [];
    
    var size = 0;
    var keys = [];
    var rfidlist = [];
    var gridMapping = [];
    var miceON = [];
    
    $scope.gridColumns = 0;
    $scope.gridRows = 0;
    
    var toggleLabelWidthOffset = 95;
    var vectorToggleWidthOffset = toggleLabelWidthOffset + 12;
    
    $scope.vectorstate = false;
    
    // FUNCTIONS
    socket.on('connect', function(){
        console.log('Connected');
        socket.emit('getDatasetNames');
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
        console.log(vectorData);
        
        // GET SIZE OF GRID (subtract rows and columns entries)
        size = Object.keys(mapping).length - 3;
        
        // GET LIST OF MICE IN DATASET
        keys = Object.keys(heatData);

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

        $scope.mice = [];
        
        var z_index = 1;
        for(var i in keys) {
            $scope.mice.push({'list': keys[i], 'zindex': z_index});
            $scope.$apply();
            
            // Init Toggle Switches
            $("." + $scope.mice[i].list).bootstrapSwitch('state', false);
            $("." + $scope.mice[i].list).bootstrapSwitch('labelWidth', document.getElementById("optionpanel").clientWidth - toggleLabelWidthOffset);
            $("." + $scope.mice[i].list).on('switchChange.bootstrapSwitch', function(e, state) {
                toggleFunc(e, state);
            });
            z_index += 1;
        }
        
        // Display Vector Map Toggle
        document.getElementById("vectorTogglegap").style.display = "block";
        
        // CONVERT MAPPING TO USABLE FORMAT
        gridMapping = [];
        for(i in mapping) {

            if (i == "columns") {
                $scope.gridColumns = mapping[i];
            }
            else if (i == "rows") {
                $scope.gridRows = mapping[i];
            }
            else {
                gridMapping.push(mapping[i]);
            }
        }
    });
    
    $scope.showVectorMap = function showVectorMap(mouseID) {
        
        console.log("Loading vector map for " + mouseID + "...");
        
        var mousevecdata = vectorData[mouseID]; //$scope.mouseselection];
        var mapping = Object.keys(gridMapping).map(function(k) { return gridMapping[k] });
        
        var newDataset = [];
        
        // console.log(mousevecdata[0]);
        // console.log(mousevecdata);
        
        var rows = $scope.gridRows;
        var cols = $scope.gridColumns;
        
        for(var i = 0; i < mousevecdata.length; i++)
        {
            for(var j in mapping)
            {
                if(mousevecdata[i][0] == mapping[j])
                {
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
        
        var vectorGridResize;
        
        for(var i = 0; i < miceON.length; i++)
        {
            if (mouseID == miceON[i])
            {
                vectorChart[miceON[i]] = new vectormap(mouseID, newDataset, {
                    border: 10,
                    gutterHeight: 5,
                    gutterWidth: 5,
                    cols: cols,
                    rows: rows
                });
                
                vectorGridResize = vectorChart[miceON[i]].getHandler();
                window.addEventListener('resize', vectorGridResize, true);
            }
        }
        
        console.log(vectorChart);
    };
    
    $scope.showHeatMap = function showHeatMap() {
        
        console.log("Loading heatmap...");
        
        var mousedata = [];
        
        if (miceON.length == 1)
        {
            mousedata[0] = heatData[miceON[0]];    
        }
        else
        {
            for (var mouse = 0; mouse < miceON.length; mouse++)
            {
                mousedata[mouse] = heatData[miceON[mouse]];
            }
        }

        var rfidMap = Object.keys(gridMapping).map(function(k) { return gridMapping[k] });

        var convergeData = [];
        
        // create data array based on number of heat data sets selected
        for (var x = 0; x < mousedata.length; x++)
        {
            var position = 0;
            
            for (var i in rfidMap)
            {
                if (mousedata[x].hasOwnProperty(rfidMap[i]))
                {
                    if (x > 0)
                    {
                        convergeData[position] = convergeData[position] + mousedata[x][rfidMap[i]];
                    }
                    else
                    {
                        convergeData.push(mousedata[x][rfidMap[i]]);
                    }
                }
                else if (x == 0)
                {
                    convergeData.push(-1);
                }
                
                position += 1;
            }
        }
        
        var GridResize;
        
        if (heatmapChart != null)
        {
            GridResize = heatmapChart.getHandler();
            window.removeEventListener('resize', GridResize, true);
        }
        
        heatmapChart = null;
        heatmapChart = new heatmap('heatmap', convergeData, {
            stroke: true,
            radius: 0,
            rows: $scope.gridRows,
            cols: $scope.gridColumns
        });
        
        GridResize = heatmapChart.getHandler();
        window.addEventListener('resize', GridResize, true);
        
        document.querySelector('#placeholder').style.visibility="hidden"; //hides the placeholder div
    };
    
    // TOGGLE SWITCH FUNCTION
    function toggleFunc(e, state) {
        
        var mouseID = e.target.className;
        console.log("Toggling " + mouseID);
        if(state) // Turning toggle on
        {
            miceON.push(mouseID);
            
            $scope.showHeatMap();
            
            // re-adjust div height
            var myCanvas = document.getElementById('heatmap');
            document.getElementById('canvasContainer').style.height = myCanvas.height + "px";
            
            
            if ($scope.vectorstate) 
            {
                $scope.showVectorMap(mouseID);
                document.getElementById(mouseID).style.zIndex = e.target.name;
            }
        }
        else // Turning toggle off
        {
            // remove mouse from miceON array
            for (var m = 0; m < mouseID.length; m++) 
            {
                if (miceON[m] == mouseID)
                {
                    miceON.splice(m, 1);
                }
            }
            
            if ( Object.keys(vectorChart).length > 0 )
            {
                console.log("Deleting from vectorChart: " + mouseID);
                var vectorGridResize = vectorChart[mouseID].getHandler();
                window.removeEventListener('resize', vectorGridResize, true);
                $scope.clearVectorMap(mouseID);
                delete vectorChart[mouseID];
            }
            
            console.log(vectorChart);
            
            console.log(miceON.length);
            if (miceON.length > 0) 
            {
                //reload heatmap
                $scope.showHeatMap();
            }
            else
            {
                $scope.clearHeatMap();        
            }
        }
    }
    
    // TOGGLE SWITCH RESIZER
    window.addEventListener('resize', function() { 
        for (var mouse in $scope.mice) {
            $("." + $scope.mice[mouse].list).bootstrapSwitch('labelWidth', document.getElementById("optionpanel").clientWidth - toggleLabelWidthOffset);
        }
        $(".vectorToggle").bootstrapSwitch('labelWidth', document.getElementById("optionpanel").clientWidth - vectorToggleWidthOffset);
    }, true);
    
    // VECTOR MAP TOGGLE
    // Init Toggle Switches
    $(".vectorToggle").bootstrapSwitch('state', false);
    $(".vectorToggle").bootstrapSwitch('labelWidth', document.getElementById("optionpanel").clientWidth - vectorToggleWidthOffset);
    $(".vectorToggle").on('switchChange.bootstrapSwitch', function(e, state) { 
        $scope.vectorstate = state;
        console.log("IN VECTOR TOGGLE");
        console.log(miceON);
        // if any mouse toggles are on
        if (miceON.length > 0)
        {
            //loop thru and clear all vector map divs
            for (var i = 0; i < miceON.length; i++)
            {
                console.log("in for loop: " + i);
                if ($scope.vectorstate) // TURN ON VECTOR MAPS
                {
                    $scope.showVectorMap(miceON[i]);
                }
                else // TURN OFF VECTOR MAPS
                {
                    console.log("Deleting from vectorChart: " + miceON[i]);
                    var vectorGridResize = vectorChart[miceON[i]].getHandler();
                    window.removeEventListener('resize', vectorGridResize, true);
                    $scope.clearVectorMap(miceON[i]);
                    delete vectorChart[miceON[i]];
                }
            }
        }
        
    });
    
    // CLEAR FUNCTIONS
    $scope.clearVectorMap = function clearVectorMap(mouseID) {
      
      var vectorCanvas = document.getElementById(mouseID);
      
      $scope.clearCanvas(vectorCanvas);
      
    };
    
    $scope.clearHeatMap = function clearHeatMap() {
      
        var heatCanvas = document.getElementById('heatmap');
        
        $scope.clearCanvas(heatCanvas);
        
        var removeGridResize = heatmapChart.getHandler();
        window.removeEventListener('resize', removeGridResize, true);
        heatmapChart = null;
        
        // Because we are clearing the last heatmap - show the placeholder div
        // reset placeholder div
        document.getElementById("canvasContainer").removeAttribute("style");
        document.getElementById("placeholder").style.visibility = "visible";
    };
    
    $scope.clearCanvas = function clearCanvas(canvas) {
        
        var ctx = canvas.getContext('2d');
        
        // Store the current transformation matrix
        ctx.save();
        
        // Use the identity matrix while clearing the canvas
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Restore the transform
        ctx.restore();
        
        canvas.width = 0;
        canvas.height = 0;
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
       $scope.colsInt = parseInt(grid["columns"], 10);
       $scope.rowsInt = parseInt(grid["rows"], 10);
       for(var i=0; i < $scope.rowsInt; i++){
           $scope.locationMap[i] = [];
           for(var j = 0; j < $scope.colsInt; j ++){
               var thisKey = ((i * $scope.colsInt) + j).toString();
               $scope.locationMap[i][j] = grid[thisKey];
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
        for(var i = 0; i < $scope.rowsInt; i++){
            $scope.locationMap[i] = [];
            for(var j = 0; j < $scope.colsInt; j++){
                $scope.locationMap[i][j] = "";
            }        
        }
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
        for(var i = 0; i < $scope.rowsInt; i++){
            for(var j = 0; j < $scope.colsInt; j++){
                locMap.push($scope.locationMap[i][j]);
            }
        }
        
        finalOutput.push(locMap);
        socket.emit('finishUpload', finalOutput);
    };
    
    
    $scope.checkGrid = function checkGrid(){
        
        var failed = false;
        
        for(var i = 0; i < $scope.rowsInt; i++){
            for(var j = 0; j < $scope.colsInt; j ++){
                if($scope.locationMap[i][j] == ""){
                    failed = true;
                    i = $scope.rowsInt;
                    j = $scope.colsInt;
                }
                else if($scope.locationMap[i][j] != "---"){
                    for(var k = 0; k < $scope.rowsInt; k++){
                        for(var l = 0; l < $scope.colsInt; l++){
                            
                            if(!(k==i && l==j)){
                                if($scope.locationMap[k][l] == $scope.locationMap[i][j]){
                                    failed = true;
                                    i = $scope.rowsInt;
                                    k = $scope.rowsInt;
                                    j = $scope.colsInt;
                                    l = $scope.colsInt;
                                }
                            }
                        }
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
        document.querySelector('#placeholder').style.display="none"; //hides the placeholder div
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
    };
    
    $scope.editSet = function editSet(){
        socket.emit("loadGrid", $scope.displayName);
        $scope.tempName = $scope.displayName;
        $scope.popup_show("editPopUp");
    };
    
    $scope.saveEdits = function saveEdits(){
        $scope.popup_hide("editPopUp");
        var finalOutput = [];
        finalOutput.push($scope.tempName);
        finalOutput.push($scope.rowsInt);
        finalOutput.push($scope.colsInt);
        var locMap = [];
        for (var i = 0; i < $scope.rowsInt; i++){
            for(var j = 0; j < $scope.colsInt; j++){
                locMap.push($scope.locationMap[i][j]);
            }
        }
        
        finalOutput.push(locMap);
        finalOutput.push($scope.displayName);
        socket.emit('finishUpdate', finalOutput);
        
        $scope.datasets = [];
        socket.emit('getDatasetNames');
        
        document.querySelector('#placeholder').style.display="none"; //hides the placeholder div
        $('.collapse').collapse("show");
        socket.emit('viewDataSet', $scope.tempName);
    };
        
    $scope.checkEdit = function checkEdit(){
        
        var failed = false;
        
        for(var i = 0; i < $scope.rowsInt; i++){
            for(var j = 0; j < $scope.colsInt; j ++){
                if($scope.locationMap[i][j] == ""){
                    failed = true;
                    i = $scope.rowsInt;
                    j = $scope.colsInt;
                }
                else if($scope.locationMap[i][j] != "---"){
                    for(var k = 0; k < $scope.rowsInt; k++){
                        for(var l = 0; l < $scope.colsInt; l++){
                            
                            if(!(k==i && l==j)){
                                if($scope.locationMap[k][l] == $scope.locationMap[i][j]){
                                    failed = true;
                                    i = $scope.rowsInt;
                                    k = $scope.rowsInt;
                                    j = $scope.colsInt;
                                    l = $scope.colsInt;
                                }
                            }
                        }
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
       $scope.colsInt = parseInt(grid["columns"], 10);
       $scope.rowsInt = parseInt(grid["rows"], 10);
       for(var i=0; i < $scope.rowsInt; i++){
           $scope.locationMap[i] = [];
           for(var j = 0; j < $scope.colsInt; j ++){
               var thisKey = ((i * $scope.colsInt) + j).toString();
               $scope.locationMap[i][j] = grid[thisKey];
           }
       }
    });
    
    
    socket.on('deletedSet', function(){
       $scope.popup_hide("deletePopUp");  
       $scope.heatData = [];
       $scope.vectorData = [];
       $scope.displayName = "";
       $('.collapse').collapse("hide");
       document.querySelector('#placeholder').style.display="block";
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
        setTimeout($scope.popup_hide, 3500, "MessageBox");
        
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