(function($){
    
    $.fn.timetable = function(opts){
	var container = this.eq(0);
	if(!container){
	    console.log("Invalid selector!");
	    return false;
	}
	
        opts = $.extend({size: 300}, opts);
	setUp.call(container,opts);
	return this;
    };

    var DateUtil = function(){};
    DateUtil.be2char = function(dateChar){
	if(dateChar.toString().length == 1){
	    return "0" + dateChar;
	}else{
	    return dateChar;
	}
    }
    
    var canvas;
    var context;
    
    var rowCnt;
    var colCnt;
    
    var startTime = 9;
    var endTime = 18;
    var rowTime = 0;
    
    var resourceNameRowHeight = 20;
    var daysNameRowHeight = 20;
    var firstColWidth = 50;
    
    var mouseX = 0;
    var mouseY = 0;
    
    var Point = function(x, y){
	this.x = x;
	this.y = y;
    }

    var highlightCellIdx;
    var highlightCellPos;
        
    function setUp(opts){
		$(this).append($('<canvas>').addClass('timetable'));
		canvas = $(this).children('canvas.timetable').get(0);
		if( !canvas || !canvas.getContext) return false;
		context = canvas.getContext('2d');
		invalidDisplayList();

		canvas.onmousemove = mouseMoveListner;
    }
    
    function mouseMoveListner(event){
        var rect = event.target.getBoundingClientRect();
        mouseX = event.pageX - rect.left;
        mouseY = event.pageY- rect.top;
        invalidDisplayList();
    }
    
    $(window).resize(function(){
	    // this は <body />
	    invalidDisplayList();
	});
    
    function invalidDisplayList(){
        $("#main").width($(this).width() - 250);
        $("#main").height($(this).height());
        $("#main").x = 250;
        canvas.width = $("#main").width();
        canvas.height = $("#main").height();
        updateDisplayList(5, 5, canvas.width-10, canvas.height-10);
    }
    
    function updateDisplayList(x, y, width, height){
        //alert("updateDisplayList");

        rowCnt = (endTime - startTime) * 4 + 2;
        colCnt = 6;
        
        rowHeight = (height - resourceNameRowHeight - daysNameRowHeight) / (rowCnt - 2);
        colWidth = (width - firstColWidth) / (colCnt - 1);
        
        drawLines(x, y, width, height);
        
        //debug
        //context.fillText("x : " + mouseX + ", y : " + mouseY, 100, 100);

        drawHighLight();
    }
    
    function drawLines(x, y, width, height){
        context.clearRect();
        context.beginPath();
        context.rect(x, y, width, height);
        context.stroke();
        context.closePath();
        
        drawColLines(x, y, width, height);
        
        drawRowLines(x, y, width, height);
    }
    
    function drawColLines(x, y, width, height){
        //alert("drawColLines");
        for(var c=0; c<colCnt-1; c++){
	    //alert("c : " + c);
	    if(c === 0){
		//alert("if(c === 0)");
		context.beginPath();
		context.moveTo(firstColWidth, y);
		context.lineTo(firstColWidth, height + y);
		context.stroke();
		context.closePath();
	    }else{
		context.beginPath();
		context.moveTo(firstColWidth + colWidth * c, y);
		context.lineTo(firstColWidth + colWidth * c, height + y);
		context.stroke();
		context.closePath();
	    }
	}
    }
    
    function drawRowLines(x, y, width, height){
	nowTime = startTime;
        for(var r=0; r<rowCnt-1; r++){
	    context.beginPath();
	    if(r === 0){
		context.moveTo(firstColWidth, daysNameRowHeight);
		context.lineTo(width + x, daysNameRowHeight);
	    }else if(r === 1){
		context.moveTo(x, daysNameRowHeight + resourceNameRowHeight);
		context.lineTo(width + x, daysNameRowHeight + resourceNameRowHeight);

		context.textAlign = "end";
		context.fillText(DateUtil.be2char(startTime) + ":00", firstColWidth - 2, daysNameRowHeight + resourceNameRowHeight + 10);
	    }else{
		if( ( r - 1 ) % 4 === 0 ){
		    context.strokeStyle = "#333333";
		    context.moveTo(x, daysNameRowHeight + resourceNameRowHeight + rowHeight * (r - 1));

		    context.textAlign = "end";
		    nowTime += 1;
		    context.fillText(DateUtil.be2char(nowTime) + ":00", firstColWidth - 2, daysNameRowHeight + resourceNameRowHeight + rowHeight * (r - 1) + 10);
		}
                else{
		    context.strokeStyle = "#999999";
		    context.moveTo(firstColWidth, daysNameRowHeight + resourceNameRowHeight + rowHeight * (r - 1));
		}
		context.lineTo(width + x, daysNameRowHeight + resourceNameRowHeight + rowHeight * (r - 1));
	    }
	    context.stroke();
	    context.closePath();
	}
    }
    
    function setHighLightCellIndex(mouseX, mouseY){
	var hix = Math.floor((mouseX - firstColWidth) / colWidth);
	var hiy = Math.floor((mouseY - daysNameRowHeight - resourceNameRowHeight) / rowHeight);
	highlightCellIdx = new Point(hix, hiy);
    }
    
    function setHighLightCellPosition(indexX, indexY){
	var hpx = firstColWidth + colWidth * indexX;
	var hpy = daysNameRowHeight + resourceNameRowHeight + rowHeight * indexY;
	highlightCellPos = new Point(hpx, hpy);
    }
    
    function drawHighLight(){

	if(mouseX < firstColWidth || mouseY < daysNameRowHeight + resourceNameRowHeight) return;

	context.fillText(mouseX + " , " +  mouseY, 100, 100);

	setHighLightCellIndex(mouseX, mouseY);
	setHighLightCellPosition(highlightCellIdx.x, highlightCellIdx.y);
	
	context.beginPath();
	context.fillStyle = 'rgba(255, 00, 00, 0.7)';
	context.fillRect(highlightCellPos.x, highlightCellPos.y, colWidth, rowHeight);
    }
    
})(jQuery);