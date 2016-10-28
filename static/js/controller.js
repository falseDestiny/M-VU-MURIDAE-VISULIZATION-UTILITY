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
    
    socket.on('mouseData', function(mouseheatdata) {
        console.log('Loading Map...');
        
        $scope.testdata = JSON.parse(mouseheatdata);
        
        sampleChart = null;
        sampleChart = new heatmap('testmap', $scope.testdata.mouse1, {
            stroke: true,
            radius: 15,
            rows: 7 // 6 rows of data + top row for food square
        });
    });
});
