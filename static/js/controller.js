/*global angular $*/
/*global heatmap vectormap*/
/*global io location*/
var HeatmapApp = angular.module('HeatmapApp', []);

HeatmapApp.controller('HeatmapController', function($scope){
   
    var socket = io.connect('https://' + document.domain + ':' + location.port + '/heatmap');
    
    // VARIABLES
    var heatmapChart = null;
    var vectorChart = {};

    $scope.datasets = [{'name': 'Select Data Set'}];    
    $scope.selection = $scope.datasets[0].name;
    
    $scope.mice = [];
    
    var heatData = [];
    var vectorData = [];
    var mapping = [];
    var subjectMap = [];
    
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
    
    var mouseColors = {
        "green": "#03AC00", 
        "yellow": "#DCE16C", 
        "purple": "#C86CE1", 
        "lightblue": "#6CE1E1", 
        "darkgrey": "#333", 
        "lightgrey": "#A2A2A2", 
        "brown": "#AC4E00", 
        "teal": "#00AC78"
    };
    
    // FUNCTIONS
    
    // CONNECT TO SOCKET AND REQUEST DATASET NAMES
    socket.on('connect', function(){
        //console.log('Connected');
        socket.emit('getDatasetNames');
    });
    
    // PUSH DATASET NAMES TO DROPDOWN
    socket.on('datasetnamelist', function(ser) {
       //console.log("Adding " + ser.name + " to list...");
       $scope.datasets.push(ser);
       $scope.$apply();
    });
    
    // REQUEST SELECTED DATASET MICE
    $scope.loadDataset = function loadDataset() {
        if($scope.selection != $scope.datasets[0].name) {
            //console.log("Loading " + $scope.selection + "...");
            
            socket.emit('loadMice', $scope.selection);
        }
    };
    
    // LOAD, PARSE, AND ASSEMBLE DATA OBJECTS FOR MAPS
    socket.on('returnDataset', function(data) {
        subjectMap = [];
        
        heatData = JSON.parse(JSON.stringify(data.data.heatdata));
        vectorData = JSON.parse(JSON.stringify(data.data.vectdata));
        mapping = JSON.parse(JSON.stringify(data.data.mapping));
        subjectMap = JSON.parse(JSON.stringify(data.data.subjects))
        
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
        
        var rfidTest = "RFID17";
        var numberTest = "041940A1C3";
        
        for(var key = 0; key < Object.keys(keys).length; key++) {
            for(var r in rfidlist) {
                if (typeof getProperty(keys[key], rfidlist[r]) == 'undefined') {
                    heatData[keys[key]][rfidlist[r]] = 0;
                }
                
                // test code - print out RFID01
                if (rfidlist[r] == rfidTest) {
                    // if(keys[key] == numberTest) {
                        console.log("Heatmap " + rfidTest + " (" + keys[key] + "): " + heatData[keys[key]][rfidlist[r]]);
                    // }
                }
                // end of test code
            }
        }
        
        // test code
        //console.log(heatData);
        //console.log(vectorData);
        
        for(key = 0; key < Object.keys(keys).length; key++) {
        
            var rfid01vectotal = 0;
            var stopcount = 0;
            var totalHeatData = 0;
            
            for(i = 1; i <= size + 1; i++) 
            {
                if(i < 10) 
                {
                    totalHeatData += heatData[keys[key]]["RFID0" + i];
                }
                else 
                {
                    totalHeatData += heatData[keys[key]]["RFID" + i];
                }
            }
            
            if(keys[key] == numberTest) {
                // console.log("TOTAL HEAT DATA FOR " + rfidTest + " of " + keys[key] + ": " + totalHeatData);
            }
            
            for (var a = 0; a < vectorData[keys[key]].length; a++) {
                if (vectorData[keys[key]][a][0] == rfidTest) 
                {
                    if ((a + 1) != vectorData[keys[key]].length) {
                        rfid01vectotal += (vectorData[keys[key]][a + 1][1] - vectorData[keys[key]][a][1]);
                        stopcount += 1;
                        // console.log(keys[key] + " " + rfidTest);
                        // if (keys[key] == numberTest)
                        // {
                        //     console.log(keys[key] + " " + rfidTest + " - array position [" + a + "]: " + vectorData[keys[key]][a][1]);
                        //     console.log("following position [" + (a + 1) + "]: " + vectorData[keys[key]][a + 1][1]);
                        
                        // }
                    }
                    else
                    {
                        // if(keys[key] == numberTest) {
                        //     console.log("HeatData of " + rfidTest + " for " + keys[key] + ": " + heatData[keys[key]][rfidTest]);
                        //     console.log("VectorData of position [" + a + "]: " + vectorData[keys[key]][a][1]);
                        // }
                        rfid01vectotal += (totalHeatData - vectorData[keys[key]][a][1]);
                    }
                }
                
            }
            
            rfid01vectotal -= stopcount;
            if(rfidTest == vectorData[keys[key]][vectorData[keys[key]].length - 1][0]) {
                rfid01vectotal += (vectorData[keys[key]].length - 1);
            }
            
            
            //console.log("Vectormap " + rfidTest + " (" + keys[key] + "): " + rfid01vectotal);
            // console.log("Stop Count: " + stopcount);
            
        }
        // end of test code

        // LOAD MICE TOGGLE SWITCHES
        $scope.mice = [];
        
        var z_index = 1;
        var colorKeyArray = Object.keys(mouseColors);
        for(var i in keys) {
            //console.log("Key: " +String(keys[i]));
            //console.log(subjectMap[String(keys[i])]);
            $scope.mice.push({'list': keys[i], 'label': subjectMap[String(keys[i])], 'zindex': z_index, 'color': colorKeyArray[z_index - 1]});
            $scope.$apply();
            
            // Init Toggle Switches
            $("." + $scope.mice[i].list).bootstrapSwitch('state', false);
            $("." + $scope.mice[i].list).bootstrapSwitch('labelWidth', document.getElementById("optionpanel").clientWidth - toggleLabelWidthOffset);
            $("." + $scope.mice[i].list).bootstrapSwitch('offColor', 'danger');
            $("." + $scope.mice[i].list).bootstrapSwitch('onColor', Object.keys(mouseColors)[i]);
            $("." + $scope.mice[i].list).on('switchChange.bootstrapSwitch', function(e, state) {
                toggleFunc(e, state);
            });
            z_index += 1;
        }
        
        // DISPLAY VECTOR MAP TOGGLE
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
    
    // DISPLAY VECTOR MAP
    $scope.showVectorMap = function showVectorMap(mouseID) {
        
        //console.log("Loading vector map for " + mouseID + "...");
        
        var mousevecdata = vectorData[mouseID]; //$scope.mouseselection];
        var mapping = Object.keys(gridMapping).map(function(k) { return gridMapping[k] });
        
        var newDataset = [];
        
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
        var mouseLineColor;
        var index;
        
        for (index = 0; index < $scope.mice.length; index++)
        {
            if ($scope.mice[index].list == mouseID)
            {
                mouseLineColor = $scope.mice[index].color;
                break;
            }
        }
        //console.log(index);
        for(var i = 0; i < miceON.length; i++)
        {
            if (mouseID == miceON[i])
            {
                vectorChart[miceON[i]] = new vectormap(mouseID, newDataset, {
                    lineColor: mouseColors[mouseLineColor],
                    mouseIndex: index,
                    rows: $scope.gridRows,
                    cols: $scope.gridColumns
                });
                
                vectorGridResize = vectorChart[miceON[i]].getHandler();
                window.addEventListener('resize', vectorGridResize, true);
            }
        }
    };
    
    // DISPLAY HEAT MAP
    $scope.showHeatMap = function showHeatMap() {
        
        //console.log("Loading heatmap...");
        
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
        
        //console.log("Toggling " + mouseID);
        
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
                //console.log("Deleting from vectorChart: " + mouseID);
                var vectorGridResize = vectorChart[mouseID].getHandler();
                window.removeEventListener('resize', vectorGridResize, true);
                $scope.clearVectorMap(mouseID);
                delete vectorChart[mouseID];
            }
            
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
    $(".vectorToggle").bootstrapSwitch('state', false);
    $(".vectorToggle").bootstrapSwitch('labelWidth', document.getElementById("optionpanel").clientWidth - vectorToggleWidthOffset);
    $(".vectorToggle").on('switchChange.bootstrapSwitch', function(e, state) { 
        $scope.vectorstate = state;
        
        //console.log("Toggling Vector Maps " + (state ? "on..." : "off..."));
        
        // if any mouse toggles are on
        if (miceON.length > 0)
        {
            //loop thru and clear all vector map divs
            for (var i = 0; i < miceON.length; i++)
            {
                if ($scope.vectorstate) // TURN ON VECTOR MAPS
                {
                    $scope.showVectorMap(miceON[i]);
                }
                else // TURN OFF VECTOR MAPS
                {
                    //console.log("Deleting from vectorChart: " + miceON[i]);
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
        $scope.subjectMap = [];
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
        $scope.popup_hide("processingPopUp");
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
       socket.emit('getSubjectMap');
    });
    
    socket.on('showSubjectMap', function(subjects){
       // console.log("Showing subjects ...");
        for(var item in subjects){
            var thisItem = {};
            thisItem["subject"] = subjects[item][0];
            thisItem["label"] = subjects[item][1];
            $scope.subjectMap.push(thisItem);
            $scope.$apply();
        }
        //$scope.subjectMap = subjects;
        //console.log(subjects.length);
        //$scope.numberOfSubjects = subjects.length;
        //console.log($scope.subjectMap);
        $scope.popup_show("subjectsPopUp");
    });
    
    $scope.finalizeSubjectLabels = function finalizeSubjectLabels(){
        $scope.popup_hide("subjectsPopUp");
        socket.emit('getSetName');
        $scope.popup_show("finalizeUpload");
    };
    
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
            //console.log("Duplicate file name.");
            document.getElementById('completeUpload').setAttribute("disabled","true");
        }
        else{
            document.getElementById('completeUpload').removeAttribute("disabled");
        }
    };
        
    $scope.checkLabels = function checkLabels(){
        document.getElementById('setSubjectLabels').removeAttribute("disabled");
        for(var item in $scope.subjectMap){
            if($scope.subjectMap[item].label==""){
                document.getElementById('setSubjectLabels').setAttribute("disabled", "true");
            }
        }
    };
    
    $scope.confirmGridDef = function confirmGridDef(){
        $scope.popup_hide("defineGridPopUp");
        socket.emit('getSubjectMap');
    };
    
    $scope.dontFinalize = function dontFinalize(){
        $scope.popup_hide("finalizeUpload");
        socket.emit("clearUpload");
    };
    
    $scope.completeUpload = function completeUpload(){
        $scope.popup_hide("finalizeUpload");
        $scope.popup_show("processingPopUp")
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
        finalOutput.push($scope.subjectMap);
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
        $scope.tempName = $scope.selection;
        socket.emit('viewHeatData', $scope.selection);
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
        for (var i = 0; i < $scope.rowsInt; i++){
            for(var j = 0; j < $scope.colsInt; j++){
                locMap.push($scope.locationMap[i][j]);
            }
        }
        
        finalOutput.push(locMap);
        finalOutput.push($scope.displayName);
        finalOutput.push($scope.subjectMap);
        socket.emit('finishUpdate', finalOutput);
        
        $scope.datasets = [];
        socket.emit('getDatasetNames');
        
        document.querySelector('#placeholder').style.display="none"; //hides the placeholder div
        $('.collapse').collapse("show");
        socket.emit('viewHeatData', $scope.tempName);
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
            for(var item in $scope.subjectMap){
                if($scope.subjectMap[item].label==""){
                    failed=true;
                }
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
       $scope.$apply();
       socket.emit("loadSubMap", $scope.displayName);
    });
    
    socket.on('setLoadedSubMap', function(grid){
        $scope.subjectMap = [];
        
        for (var line in grid) {
            if (grid.hasOwnProperty(line)) {
                var thisItem = {};
                thisItem["subject"] = line;
                thisItem["label"] = grid[line];
                $scope.subjectMap.push(thisItem);
            }
        }
        $scope.$apply();
        
        // fix width of popup
        var editDiv = document.getElementById("editPopupID");
        editDiv.className = "panel loginbox popupdiv edit";
        if ($scope.colsInt <= 5) {
            editDiv.className += " editPopupFive";
        }
        else if($scope.colsInt == 6) {
            editDiv.className += " editPopupSix";
        }
        else if($scope.colsInt == 7) {
            editDiv.className += " editPopupSeven";
        }
        else if($scope.colsInt == 8) {
            editDiv.className += " editPopupEight";
        }
        
        $scope.popup_show("editPopUp");
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
    
    socket.on('returnViewHeatData', function(heatData){
        $scope.heatData = [];
        $scope.displayName = "";
        $scope.displayName = heatData[0];
        for(var key in heatData[1]){
            for(var innerkey in heatData[1][key]){
                var thisLine = [];
                thisLine["subject"] = key;
                thisLine["location"] = innerkey;
                thisLine["time"] = heatData[1][key][innerkey];
                $scope.heatData.push(thisLine);
            }
        }
        socket.emit('viewVectorData', $scope.tempName);
    });
    
    socket.on('returnViewVectorData', function(vectorData){
        $scope.vectorData = [];
        for (var key in vectorData){
            for(var x = 0; x < vectorData[key].length; x++){
                var thisLine = [];
                thisLine["subject"] = key;
                thisLine["location"] = vectorData[key][x][0];
                thisLine["time"] = vectorData[key][x][1];
                $scope.vectorData.push(thisLine);
            }
        }
        $scope.$apply();
    });
    
    
    socket.on('returnSetData', function(setData){
        $scope.heatData = [];
        
        $scope.displayName = "";
        
        $scope.displayName = setData[0];
        
        
        
        
        
        
        
        
        
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
        //console.log('Connected');
        socket.emit('getUsers');
    });
    
    socket.on('returnUsers', function(users) {
       //console.log('Retrieving Users...');
       
       $scope.users = [];
       for (var user in users)
       {
           $scope.users.push(users[user]);
           $scope.$apply();
       }
       
       //console.log($scope.users);
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
            //console.log("changing password for " + $scope.passName);
            
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
        //console.log("Deleting " + $scope.deleteName + "...");
        socket.emit('deleteUser', $scope.deleteName);
        $scope.popup_hide("deleteUserPopup");
    };
    
    // MESSAGE BOX
    socket.on('loadMessageBox', function(message) {
       // console.log(message);
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