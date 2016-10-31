/*global angular*/
/*global heatmap*/
var HeatmapApp = angular.module('HeatmapApp', []);

HeatmapApp.controller('HeatmapController', function($scope){
   
    var socket = io.connect('https://' + document.domain + ':' + location.port + '/heatmap');
  
    $scope.testdata = []; // heatmap data
    
    var sampleChart = null;
    
    socket.on('connect', function(){
        console.log('Connected');
    });
    
    $scope.grabData = function grabData(){
        console.log('Grabbing Data');
        
        socket.emit('getMouseData');
    };
    
    socket.on('mouseData', function(data) {
        console.log('Loading Map...');
        
        var mouseHeatData = data.heatdata;
        var mouse = data.mouseId;
        
        $scope.testdata = JSON.parse(mouseHeatData);
        
        var mouseData = $scope.testdata[mouse];
        
        var arr = Object.keys(mouseData.mapping).map(function(k) { return mouseData.mapping[k] });
        
        var newarr = [];
        
        for (var i in arr)
        {
            if (mouseData.dataset.hasOwnProperty(arr[i]))
            {
                newarr.push(mouseData.dataset[arr[i]]);
            }
            else
            {
                newarr.push(-1);
            }
        }
        
        console.log(newarr);
        
        sampleChart = null;
        sampleChart = new heatmap('heatmap', newarr, {
            stroke: true,
            radius: 15
        });
    });
    
    socket.on('testUpload', function(){
        console.log('I made it.');
    });
});
