/*
Heatmap-JS

Sean Walsh

required libraries: 
    RainbowVis-JS - released under Eclipse Public License - v 1.0
  
*/

var Rainbow = require('rainbowvis.js');

function heatmap(canvasId, dataset, options) {
    
    "use strict";
    
    // create color gradient
    var color = new Rainbow();
    
    // create options object if none passed in
    if (typeof options == 'undefined')
    {
        options = {};
    }
    
    // add color data to options object
    options.colorSet = {
        color: color,
        arr: dataset
    };
    
    // Check Options against default option set
    console.log("HI 1");
    options = checkDefaults(options);
    console.log(options);
    console.log("HI 2");
    // set colors
    color.setSpectrum(options.colors.low, options.colors.high);
    color.setNumberRange(0, getMaxValue(dataset));
    
    // get canvas element
    var myCanvas = document.getElementById(canvasId);
    
    // create Grid and render it to screen
    var grid = new Grid();
    grid.render(myCanvas, options);
    
    // add window listener to resize grid as window resizes
    window.addEventListener('resize', function() { grid.render(myCanvas, options); }, true);
}

/* Checks for missing options - if found, adds in default values */
function checkDefaults(options)
{
    "use strict";
    console.log("HI THERE");
    // DEFAULT OPTIONS
    var properties = ["rows", "cols", "border", "gutterWidth", "gutterHeight", "colors", "radius", "stroke"];
    
    var getProperty = function (propertyName)
    {
        return options[propertyName];
    };
    
    for (var property in properties)
    {
        console.log("PROP: " + properties[property]);
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
                case "gutterWidth":
                    options.gutterWidth = 5;
                    break;
                case "gutterHeight":
                    options.gutterHeight = 5;
                    break;
                case "colors":
                    console.log("TEST");
                    options.colors = {low: "blue", high: "red"};
                    break;
                case "radius":
                    options.radius = 10;
                    break;
                case "stroke":
                    options.stroke = true;
                    break;
            }
        }
    }
    
    return options;
}

/* get max value from array */
function getMaxValue(arr)
{
    "use strict";
    
    var maxValue = 0;
    
    for (var i = 0; i < arr.length; i++)
    {
        if(maxValue <= arr[i])
        {
            maxValue = arr[i];
        }
    }
    
    return maxValue;
}

function Grid()
{
    "use strict";
    
    this.render = function (canvas, options)
    {
        var ctx = canvas.getContext('2d');
        
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
            canvas.parentNode.style.height = canvas.width + "px";
            canvas.height = canvas.parentNode.clientHeight;
        }
        else
        {
            canvas.width = canvas.parentNode.clientWidth;
            canvas.parentNode.style.height = canvas.width + "px";
            canvas.height = canvas.parentNode.clientHeight;
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
        
        // draw the grid
        var i, j, stroke;
        
        var boxes = 0;
        var maxBoxes = options.rows * options.cols;
        
        if (maxBoxes > options.colorSet.arr.length)
        {
            maxBoxes = options.colorSet.arr.length - 1;
        }
        
        drawgrid:
        for (i = 0; i < options.rows; i++) 
        {
            for (j = 0; j < options.cols; j++)
            {
                if (options.colorSet.arr[boxes] == -1) // empty space box
                {
                    ctx.fillStyle = "#ffffff";
                    stroke = false;
                }
                else if (options.colorSet.arr[boxes] == 0) // no value box
                {
                    ctx.fillStyle = "#ffffff";
                    stroke = true;
                }
                else
                {
                    this.setColors(ctx, boxes, options.colorSet);
                    stroke = options.stroke;
                }
                boxes += 1;

                this.drawRoundedRect(
                    ctx,  
                    x + (j * boxWidth ),
                    y + (i * boxHeight), 
                    boxWidth - options.gutterWidth, 
                    boxHeight - options.gutterHeight, 
                    options.radius, 
                    true, 
                    stroke
                );
                if (boxes > options.colorSet.arr.length) { break drawgrid; } // break out of loops when out of boxes
            }
        }
        
    };
    
    this.drawRoundedRect = function (ctx, x, y, width, height, radius, fill, stroke)
    {
        if (typeof stroke == 'undefined') 
        {
          stroke = true;
        }
        if (typeof radius === 'undefined') 
        {
          radius = 5;
        }
        if (typeof radius === 'number') 
        {
          radius = {tl: radius, tr: radius, br: radius, bl: radius};
        } 
        else 
        {
          var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
          for (var side in defaultRadius) 
          {
            radius[side] = radius[side] || defaultRadius[side];
          }
        }
        ctx.beginPath();
        ctx.moveTo(x + radius.tl, y);
        ctx.lineTo(x + width - radius.tr, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
        ctx.lineTo(x + width, y + height - radius.br);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
        ctx.lineTo(x + radius.bl, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
        ctx.lineTo(x, y + radius.tl);
        ctx.quadraticCurveTo(x, y, x + radius.tl, y);
        ctx.closePath();
        if (fill) 
        {
          ctx.fill();
        }
        if (stroke) 
        {
          ctx.stroke();
        }
    };
    
    this.setColors = function (ctx, curBox, colorSet)
    {
        return ctx.fillStyle = "#" + colorSet.color.colorAt(colorSet.arr[curBox]);
    };
}

if (typeof module !== 'undefined') {
  module.exports = heatmap;
}
