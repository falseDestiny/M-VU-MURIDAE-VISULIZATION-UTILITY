/*
Vectormap-JS

Sean Walsh
*/

function vectormap(canvasId, dataset, options) {
    
    "use strict";
    
    // create options object if none passed in
    if (typeof options == 'undefined')
    {
        options = {};
    }
    
    // Check options against default option set
    options = checkVectorDefaults(options);
    
    // Get Canvas element
    var myCanvas = document.getElementById(canvasId);
    
    var grid = new VectorGrid();
    var vectorArray = [];
    var waitTime = 1000;
    
    /*
    Example Dataset:
        var dataset = [
            {
                ‘x’: 0, 
                ‘y’: 0, 
                ‘value’: 0
            }, 
            {
                ‘x’: 1, 
                ‘y’: 1, 
                ‘value’: 849
            }
        ];
    */
    
    // LOOP THROUGH DATASET (to 2nd to last point)
    for(var point = 0; point < dataset.length - 1; point++)
    {
        vectorArray.push({'x': dataset[point].x, 'y': dataset[point].y, 'x2': dataset[point + 1].x, 'y2': dataset[point + 1].y});
    }
    
    options.vectorArray = vectorArray;
    
    grid.render(myCanvas, options);
    
    var handler = function() {
        grid.render(myCanvas, options);
    };
    
    this.getHandler = function() {
        return handler;
    };
    
    // add window listener to resize grid as window resizes
    // window.addEventListener('resize', handler, true);
}

/* Checks for missing options - if found, adds in default values */
function checkVectorDefaults(options) {
    
    "use strict";
    
    // DEFAULT OPTIONS
    var properties = ["rows", "cols", "border", "gutterHeight", "gutterWidth", "lineColor", "mouseIndex"];
    
    var getProperty = function(propertyName)
    {
        return options[propertyName]
    };
    
    for (var property in properties)
    {
        if (typeof getProperty(properties[property]) == 'undefined')
        {
            // DEFAULT VALUES
            switch (properties[property])
            {
                case "rows":
                    options.rows = 7;
                    break;
                case "cols":
                    options.cols = 4;
                    break;
                case "border":
                    options.border = 10;
                    break;
                case "gutterHeight":
                    options.gutterHeight = 5;
                    break;
                case "gutterWidth":
                    options.gutterWidth = 5;
                    break;
                case "lineColor":
                    options.lineColor = "#000";
                    break;
                case "mouseIndex":
                    options.mouseIndex = 0;
                    break;
            }
        }
    }
    
    return options;
}

function VectorGrid() {
    
    "use strict";
    
    this.render = function (canvas, options)
    {
        var ctx = canvas.getContext('2d');
        ctx.translate(0.5, 0.5);
        
        var gridSize = this.setGrid(canvas);
        this.drawGrid(ctx, gridSize, options);
    };
    
    this.setGrid = function (canvas)
    {
        canvas.width = 0;
        canvas.height = 0;
        
        // canvas.parentNode.style.height = document.getElementById("canvasContainer").clientWidth + "px";
        canvas.width = document.getElementById("canvasContainer").clientWidth;
        canvas.height = canvas.clientWidth;
        
        return {width: canvas.width, height: canvas.height};
    };
    
    this.drawGrid = function (ctx, gridSize, options)
    {
        var x = options.border, y = options.border;
        
        var maxWidth = gridSize.width - (2 * x);
        var maxHeight = gridSize.height - (2 * y);
        
        var boxWidth = ((maxWidth + options.gutterWidth) / options.cols);
        var boxHeight = ((maxHeight + options.gutterHeight) / options.rows);
        
        var centerPointX = 0;
        var centerPointY = 0;
        var centerPointX2 = 0;
        var centerPointY2 = 0;
        
        // draw the grid
        ctx.strokeStyle = options.lineColor;
        
        // calculate offset
        var offset_x = 0;
        var offset_y = 0;
        
        var offsetamount = 0;
        if (window.innerWidth < 800)
        {
            ctx.lineWidth = 2;
            offsetamount = 5;
        }
        else if(window.innerWidth < 1200)
        {
            ctx.lineWidth = 3;
            offsetamount = 10;
        }
        else
        {
            ctx.lineWidth = 4;
            offsetamount = 20;
        }
        
        switch (options.mouseIndex) {
            case 0:
                offset_x = -offsetamount;
                offset_y = -offsetamount;
                break;
            case 1:
                offset_y = -(offsetamount + (offsetamount / 2));
                break;
            case 2:
                offset_x = offsetamount;
                offset_y = -(offsetamount + offsetamount);
                break;
            case 3:
                offset_x = -(offsetamount + (offsetamount / 2));
                break;
            case 4:
                offset_x = (offsetamount / 2);
                offset_y = -(offsetamount / 2);
                break;
            case 5:
                offset_x = -(offsetamount + offsetamount);
                offset_y = offsetamount;
                break;
            case 6:
                offset_x = -(offsetamount / 2);
                offset_y = offsetamount + (offsetamount / 2);
                break;
            case 7:
                offset_x = offsetamount + (offsetamount / 2);
                offset_y = offsetamount / 2;
                break;
        }
        
        ctx.beginPath();
        for (var i = 0; i < options.vectorArray.length; i++)
        {
            centerPointX = x + (boxWidth * options.vectorArray[i].y) + (boxWidth / 2);
            centerPointY = y + (boxHeight * options.vectorArray[i].x) + (boxHeight / 2);
            centerPointX2 = x + (boxWidth * options.vectorArray[i].y2) + (boxWidth / 2);
            centerPointY2 = y + (boxHeight * options.vectorArray[i].x2) + (boxHeight / 2);
            
            ctx.moveTo(centerPointX + offset_x, centerPointY + offset_y);
            ctx.lineTo(centerPointX2 + offset_x, centerPointY2 + offset_y);
        }
        ctx.stroke();
        
    };
}

if (typeof module !== 'undefined') {
    module.exports = vectormap;
}