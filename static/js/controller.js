/*global angular*/
/*global heatmap*/
var HeatmapApp = angular.module('HeatmapApp', []);

HeatmapApp.controller('HeatmapController', function($scope){
   
    var socket = io.connect('https://' + document.domain + ':' + location.port + '/heatmap');
  
    // VARIABLES
    $scope.testdata = []; // heatmap data
    
    var sampleChart = null;

    $scope.datasets = [{'name': 'Select Data Set'}];    
    $scope.selection = $scope.datasets[0].name;
    
    $scope.mice = [{'list': 'Select Mouse'}]
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
        
        // GET SIZE OF GRID
        size = Object.keys(mapping).length - 1;
        
        // GET LIST OF MICE IN DATASET
        keys = Object.keys(heatData);

        $scope.mice = []
        $scope.mice.push({'list': 'Select Mouse'});
        
        for(var i in keys) {
            $scope.mice.push({'list': keys[i]});
        }
        
        // ADD MISSING RFIDs TO HEATDATA
        rfidlist = [];
        for(var i = 1; i <= size + 1; i++) {
            if(i < 10) {
                rfidlist.push("RFID0" + i);
            }
            else {
                rfidlist.push("RFID" + i);
            }
        }
        
        var getProperty = function (key, propertyName) {
            return heatData[key][propertyName];
        }
        
        for(var key = 0; key < Object.keys(keys).length; key++) {
            for(var r in rfidlist) {
                if (typeof getProperty(keys[key], rfidlist[r]) == 'undefined') {
                    heatData[keys[key]][rfidlist[r]] = 0;
                }
            }
        }
        
        // CONVERT MAPPING TO USABLE FORMAT
        newMap = [];
        for(var i in mapping) {
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
    }
});

