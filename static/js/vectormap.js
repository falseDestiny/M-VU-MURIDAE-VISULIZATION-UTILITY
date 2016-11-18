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
    window.addEventListener('resize', function() { grid.render(myCanvas, options); }, true);
}

/* Checks for missing options - if found, adds in default values */
function checkVectorDefaults(options) {
    
    "use strict";
    
    // DEFAULT OPTIONS
    var properties = [];
    
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
                case "":
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
        
        if (window.innerWidth > 1200)
        {
            canvas.width = canvas.parentNode.clientWidth;
            // canvas.parentNode.style.height = canvas.width + "px";
            canvas.height = canvas.clientWidth;
        }
        else
        {
            canvas.width = canvas.parentNode.clientWidth;
            // canvas.parentNode.style.height = canvas.width + "px";
            canvas.height = canvas.clientWidth;
        }
        
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
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#000000';
        
        ctx.beginPath();
        for (var i = 0; i < options.vectorArray.length; i++)
        {
            centerPointX = x + (boxWidth * options.vectorArray[i].y) + (boxWidth / 2);
            centerPointY = y + (boxHeight * options.vectorArray[i].x) + (boxHeight / 2);
            centerPointX2 = x + (boxWidth * options.vectorArray[i].y2) + (boxWidth / 2);
            centerPointY2 = y + (boxHeight * options.vectorArray[i].x2) + (boxHeight / 2);
            
            ctx.moveTo(centerPointX, centerPointY);
            ctx.lineTo(centerPointX2, centerPointY2);
        }
        ctx.stroke();
        
    };
}

if (typeof module !== 'undefined') {
    module.exports = vectormap;
}