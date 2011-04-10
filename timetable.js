(function($){


	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// DateUtil ここから
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var DateUtil = function(){};

	DateUtil.be2char = function(dateChar){
		if(dateChar.toString().length == 1){
			return "0" + dateChar;
		}else{
			return dateChar;
		}
	}

	DateUtil.compareDates = function(date1, compWay, date2){
		
		var d1 = date1.getTime();
		var d2 = date2.getTime();
		
		switch(compWay){
			case 'greaterthan':
				if(d1 > d2){
					return true;
				}else{
					return false;
				}
				break;
			case 'lessthan':
				if(d1 < d2){
					return true;
				}else{
					return false;
				}
				break;
			case 'greaterThanOrEqual':
				if(d1 >= d2){
					return true;
				}else{
					return false;
				}
				break;
			case 'lessThanOrEqual':
				if(d1 <= d2){
					return true;
				}else{
					return false;
				}
				break;
			case 'equal':
				if(d1 == d2){
					return true;
				}else{
					return false;
				}
				break;
			default:
				throw comway + " isn't incorrect for compway";
				break;
		}
	}
	
	DateUtil.getDaysLength = function(date1, date2){
		var d1 = date1.getTime();
		var d2 = date2.getTime();
		var daysLength = (d2 - d1) / 1000 / 60 / 60 / 24 + 1;
		//console.log("DateUtil.getDaysLength : " + daysLength);
		return daysLength;
	}
	
	DateUtil.plusDay = function(date, plus){
		var ret = new Date();
		ret.setTime(date.getTime() + plus * 24 * 60 * 60 * 1000);
		return ret;
	}
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// DateUtil ここまで
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


	var canvas;
	var context;
	var opt;
	
	$.fn.timetable = function(options){

		var options =$.extend({
			startDate : new Date(),
			endDate : new Date(),
			startTime : 9,
			endTime : 18,
			resources : [{"rscID":"000","rscName":"dummy"}]
		},options);

		if(!DateUtil.compareDates(options.startDate, "lessThanOrEqual",options.endDate)){
				throw "startDate isn't lessThanOrEqual endDate";
		}

		return this.each(function() {
			console.log("selectedDateRangeStart : " + options.startDate.toLocaleString());
			console.log("selectedDateRangeEnd : " + options.endDate.toLocaleString());
			console.log("resources length : " + options.resources.length);
			opt = options;

			$(this).append($('<canvas>').addClass('timetable'));
			canvas = $(this).children('canvas.timetable').get(0);
			if( !canvas || !canvas.getContext) return false;
			context = canvas.getContext('2d');
			setBaseSize();
			invalidDisplayList();
			canvas.onmousemove = mouseMoveListner;
			canvas.onmousedown = mouseDownListner;
			canvas.onmouseup = mouseUpListner;
		});
	};

	var rowCnt;
	var colCnt;

	var resourceNameRowHeight = 30
	var daysNameRowHeight = 30;
	var firstColWidth = 50;
	
	var rowHeight;
	var colWidth;
	var lastRowHeight;
	var lastColWidth;

	var mouseX = 0;
	var mouseY = 0;

	var highlightCellIdx;
	var highlightCellPos;
	
	var mousedownedCellIdx;
	var dragging = false;
	
	var daysCnt;
	var rscCnt;

	//~~~~~~~~~~~~~~~~~~~~~~~~
	// Class ここから
	//~~~~~~~~~~~~~~~~~~~~~~~~

	var Point = function(x, y){
		this.x = x;
		this.y = y;
	}

	//~~~~~~~~~~~~~~~~~~~~~~~~
	// Class ここまで
	//~~~~~~~~~~~~~~~~~~~~~~~~


	function setUp(){
		$(this).append($('<canvas>').addClass('timetable'));
		canvas = $(this).children('canvas.timetable').get(0);
		if( !canvas || !canvas.getContext) return false;
		context = canvas.getContext('2d');
		setBaseSize();
		invalidDisplayList();
	}

	function mouseMoveListner(event){
		var rect = event.target.getBoundingClientRect();
		mouseX = event.pageX - rect.left;
		mouseY = event.pageY- rect.top;
		invalidDisplayList();
	}

	function mouseDownListner(event){
		var rect = event.target.getBoundingClientRect();
		mouseX = event.pageX - rect.left;
		mouseY = event.pageY- rect.top;
		mousedownedCellIdx = getCellIndex(mouseX, mouseY);
		console.log("mousedownedCellIdx : " + mousedownedCellIdx.x + "," + mousedownedCellIdx.y);
		dragging = true;
		invalidDisplayList();
		//console.log("mouseDown");
	}

	function mouseUpListner(event){
		if(dragging){
			dragging = false;
		}
	}

	$(window).resize(function(){
		setBaseSize();
		invalidDisplayList();
	});
	
	function setBaseSize(){
		$("#maintable").width($(this).width());
		$("#maintable").height($(this).height());
		$("#sideTd").width(400);
		$("#sideTd").height($("#maintable").height());
		$("#timetableTd").width($("#maintable").width() - 400);
		$("#timetableTd").height($("#maintable").height());
		canvas.width = $("#timetableTd").width();
		canvas.height = $("#timetableTd").height();
	}

	function invalidDisplayList(){
		updateDisplayList(5, 5, canvas.width-10, canvas.height-10);
	}

	function updateDisplayList(x, y, width, height) {
		rowCnt = (opt.endTime - opt.startTime) * 4 + 2;

		daysCnt = DateUtil.getDaysLength(opt.startDate, opt.endDate);
		rscCnt = opt.resources.length;
		colCnt = daysCnt * rscCnt;

		//console.log("rowCont : " + rowCnt + ", colCnt : " + colCnt);
		
		rowHeight = (height - resourceNameRowHeight - daysNameRowHeight) / (rowCnt - 2);
		colWidth = (width - firstColWidth) / colCnt;
		
		lastRowHeight = height - resourceNameRowHeight - daysNameRowHeight - rowHeight * (rowCnt - 3);
		lastColWidth = width - firstColWidth - colWidth * (colCnt - 1);
		
		drawLines(x, y, width - x, height - y);
		drawHighLight();
	}

	function drawLines(x, y, width, height) {
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.beginPath();
		context.strokeStyle = 'rgba(51, 51, 51, 1.0)'; //#333333
		context.rect(x, y, width, height);
		context.stroke();
		context.closePath();
		drawColLines(x, y, width, height);
		drawRowLines(x, y, width, height);
	}

	function drawColLines(x, y, width, height) {
		//alert("drawColLines");
		for(var c = 0; c < colCnt; c++) {
			context.beginPath();
			context.font = "14px 'ＭＳ Ｐゴシック'";
			if(c === 0) {
				context.strokeStyle = 'rgba(51, 51, 51, 1.0)'; //#333333
				context.moveTo(firstColWidth, y);
				context.lineTo(firstColWidth, height + y);
				
				var dateTxt = (opt.startDate.getMonth() + 1) + "/" + opt.startDate.getDate();
				context.textAlign = "center";
				context.fillStyle = 'rgba(00, 00, 00, 1.0)';
				context.fillText(dateTxt, firstColWidth + colWidth * rscCnt / 2, daysNameRowHeight - 3);

				var rscTxt = opt.resources[0].rscName;
				context.textAlign = "center";
				context.fillStyle = 'rgba(00, 00, 00, 1.0)';
				context.fillText(rscTxt, firstColWidth + colWidth / 2, daysNameRowHeight + resourceNameRowHeight - 3);

			} else {
			
				var rscTxt = opt.resources[c % rscCnt].rscName;
				context.textAlign = "center";
				context.fillStyle = 'rgba(00, 00, 00, 1.0)';
				context.fillText(rscTxt, firstColWidth + colWidth * c + colWidth / 2, daysNameRowHeight + resourceNameRowHeight - 3);
			
				if( c % rscCnt === 0) {
					context.strokeStyle = 'rgba(51, 51, 51, 1.0)'; //#333333
					context.moveTo(firstColWidth + colWidth * c, y);
					context.lineTo(firstColWidth + colWidth * c, height + y);
					
					var currentDate = DateUtil.plusDay(opt.startDate, c / rscCnt);
					var dateTxt = (currentDate.getMonth() + 1) + "/" + currentDate.getDate();
					context.textAlign = "center";
					context.fillStyle = 'rgba(00, 00, 00, 1.0)';
					context.fillText(dateTxt, firstColWidth + colWidth * c + colWidth * rscCnt / 2, daysNameRowHeight - 3);
				} else {
					context.strokeStyle = 'rgba(187, 187, 187, 1.0)'; //#AAAAAA
					context.moveTo(firstColWidth + colWidth * c, daysNameRowHeight);
					context.lineTo(firstColWidth + colWidth * c, height + y);
				}
			}
			context.stroke();
			context.closePath();
		}
	}

	function drawRowLines(x, y, width, height) {
		nowTime = opt.startTime;
		for(var r=0; r<rowCnt-1; r++) {
			context.beginPath();
			context.font = "14px 'ＭＳ Ｐゴシック'";
			if(r === 0) {
				context.strokeStyle = 'rgba(51, 51, 51, 1.0)'; //#333333
				context.moveTo(firstColWidth, daysNameRowHeight);
				context.lineTo(width + x, daysNameRowHeight);
			} else if(r === 1) {
				context.strokeStyle = 'rgba(51, 51, 51, 1.0)'; //#333333
				context.moveTo(x, daysNameRowHeight + resourceNameRowHeight);
				context.lineTo(width + x, daysNameRowHeight + resourceNameRowHeight);
				context.textAlign = "end";
				context.fillStyle = 'rgba(00, 00, 00, 1.0)';
				context.fillText(DateUtil.be2char(opt.startTime) + ":00", firstColWidth - 2, daysNameRowHeight + resourceNameRowHeight + 15);
			} else {
				if( ( r - 1 ) % 4 === 0 ){
					context.strokeStyle = 'rgba(51, 51, 51, 1.0)'; //#333333
					context.moveTo(x, daysNameRowHeight + resourceNameRowHeight + rowHeight * (r - 1));
					context.textAlign = "end";
					nowTime += 1;
					context.fillText(DateUtil.be2char(nowTime) + ":00", firstColWidth - 2, daysNameRowHeight + resourceNameRowHeight + rowHeight * (r - 1) + 15);
				} else {
					context.strokeStyle = 'rgba(153, 153, 153, 1.0)'; //#999999
					context.moveTo(firstColWidth, daysNameRowHeight + resourceNameRowHeight + rowHeight * (r - 1));
				}
				context.lineTo(width + x, daysNameRowHeight + resourceNameRowHeight + rowHeight * (r - 1));
			}
			context.stroke();
			context.closePath();
		}
	}
	
	function getCellIndex(mouseX, mouseY){
		var hix = Math.floor((mouseX - firstColWidth) / colWidth);
		var hiy = Math.floor((mouseY - daysNameRowHeight - resourceNameRowHeight) / rowHeight);
		var ret = new Point(hix, hiy);
		return ret;
	}

	function setHighLightCellIndex(mouseX, mouseY){
		highlightCellIdx = getCellIndex(mouseX, mouseY);
	}

	function setHighLightCellPosition(indexX, indexY){
		var hpx = firstColWidth + colWidth * indexX;
		var hpy = daysNameRowHeight + resourceNameRowHeight + rowHeight * indexY;
		highlightCellPos = new Point(hpx, hpy);
	}

	function drawHighLight(){

		var hlW;
		var hlH;

		if(dragging) {
			var isOutofTimetable = false;
			var nowCellIndex = getCellIndex(mouseX, mouseY);
			
			//はみ出しチェック
			if(mouseX < firstColWidth || mouseY < daysNameRowHeight + resourceNameRowHeight) isOutofTimetable = true;
			if(nowCellIndex.x > colCnt - 1) isOutofTimetable = true;
			if(nowCellIndex.y > rowCnt - 3) isOutofTimetable = true;
			
			var hlix = mousedownedCellIdx.x;
			var hliy = Math.min(nowCellIndex.y, mousedownedCellIdx.y);
			var cellCnt = Math.abs(nowCellIndex.y - mousedownedCellIdx.y);
			
			setHighLightCellPosition(hlix, hliy);
			hlW = colWidth;
			hlH = rowHeight * (cellCnt + 1);
			
		} else {
			if(mouseX < firstColWidth || mouseY < daysNameRowHeight + resourceNameRowHeight) return;
			
			setHighLightCellIndex(mouseX, mouseY);
			setHighLightCellPosition(highlightCellIdx.x, highlightCellIdx.y);
	
			//はみ出しチェック
			if(highlightCellIdx.x > colCnt - 1) return;
			if(highlightCellIdx.y > rowCnt - 3) return;
	
			hlW = colWidth;
			hlH = rowHeight;
	
			if(highlightCellIdx.x == colCnt - 1){
				//console.log("currentCell is on lastCol");
				hlW = lastColWidth;
			}
	
			if(highlightCellIdx.y == rowCnt - 3){
				//console.log("currentCell is on lastRow");
				hlH = lastRowHeight;
			}
		}

		context.fillStyle = 'rgba(255, 00, 00, 0.7)';
		context.fillRect(highlightCellPos.x, highlightCellPos.y, hlW, hlH);

	}
	
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// PUBLIC METHOD
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	
	jQuery.fn.changeDateRange = function(startDate, endDate) {
		if(startDate != null) opt.startDate = startDate;
		if(endDate != null) opt.endDate = endDate;
		invalidDisplayList();
	};
	
	jQuery.fn.changeResources = function(newResources) {
		opt.resources = newResources;
		invalidDisplayList();
	}

	jQuery.fn.changeTimeRange = function(startTime, endTime) {
		if(startTime != null) opt.startTime = startTime
		if(endTime != null) opt.endTime = endTime
		invalidDisplayList();
	};
	

})(jQuery);