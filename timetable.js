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
	var highlightCellSize;
	var highlightCellCnt;
	
	var mousedownedCellIdx = null;
	
	var daysCnt;
	var rscCnt;

	var timeSelectedEventHandler = function(event){}

	//~~~~~~~~~~~~~~~~~~~~~~~~
	// Class ここから
	//~~~~~~~~~~~~~~~~~~~~~~~~

	var Point = function(x, y){
		this.x = x;
		this.y = y;
	}
	
	var Reserve = function( reserveId, 
							reserverId, 
							reserverName, 
							dept,
							date, 
							startTimeHour,
							startTimeMin,
							endTimeHour,
							endTimeMin,
							resourceId,
							resourceName,
							purpose 
							) {
		this.reserveId = reserveId; 
		this.reserverId = reserverId;
		this.reserverName = reserverName;
		this.dept = dept;
		this.date = date;
		this.startTimeHour = startTimeHour;
		this.startTimeMin = startTimeMin;
		this.endTimeHour = endTimeHour;
		this.endTimeMin = endTimeMin;
		this.resourceId = resourceId;
		this.resourceName = resourceName;
		this.purpose = purpose;
	}
	
	var Event = function(eventName, reserve){
		this.eventName = eventName;
		this.reserve = reserve;
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
		invalidDisplayList();
		//console.log("mouseDown");
	}

	function mouseUpListner(event){
		if(mousedownedCellIdx){

			setHighlightCellSize();
			var reserve = getReserve();
			
			//dispatch timeSelected Event
			var timeSelectedEvent = new Event("timeSelected", reserve);
			timeSelectedEventHandler(timeSelectedEvent);
			mousedownedCellIdx = null;
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

	function drawHighLight() {
		setHighlightCellSize();
		
		//はみ出しチェック
		if(isOutTimeTable()) return;
		
		context.fillStyle = 'rgba(255, 00, 00, 0.7)';
		context.fillRect(highlightCellPos.x, highlightCellPos.y, highlightCellSize.x, highlightCellSize.y);
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

	function setHighlightCellSize(){
		setHighLightCellIndex(mouseX, mouseY);

		if(mousedownedCellIdx) {
			var isOutofTimetable = false;
			var nowCellIndex = getCellIndex(mouseX, mouseY);
			var hlix = mousedownedCellIdx.x;
			var hliy = Math.min(nowCellIndex.y, mousedownedCellIdx.y);
			highlightCellCnt = Math.abs(nowCellIndex.y - mousedownedCellIdx.y);
			
			setHighLightCellPosition(hlix, hliy);
			highlightCellSize = new Point(colWidth, rowHeight * (highlightCellCnt + 1));
		} else {
			setHighLightCellPosition(highlightCellIdx.x, highlightCellIdx.y);
			highlightCellSize = new Point(colWidth, rowHeight);
		}
	}
	
	function isOutTimeTable(){
		//console.log("highlightCellIdx : x " + highlightCellIdx.x + " , y " + highlightCellIdx.y);
		if(highlightCellIdx.x < 0) return true;
		if(highlightCellIdx.y < 0) return true;
		if(highlightCellIdx.x > colCnt - 1) return true;
		if(highlightCellIdx.y > rowCnt - 3) return true;
		return false;
	}
	
	function getReserve(){
		var dateIdx = Math.floor(highlightCellIdx.x / opt.resources.length);
		var date = DateUtil.plusDay(opt.startDate, dateIdx);
		
		var rscIdx = highlightCellIdx.x % opt.resources.length;
		var rscId = opt.resources[rscIdx].rscID;
		var rscName = opt.resources[rscIdx].rscName;
		
		var starttimeHour = opt.startTime + Math.floor(highlightCellIdx.y / 4);
		var starttimeMin = highlightCellIdx.y % 4 * 15;
		
		var endY = highlightCellIdx.y + highlightCellCnt + 1;
		var endtimeHour = opt.startTime + Math.floor(endY / 4);
		var endtimeMin = endY % 4 * 15;

		var ret = new Reserve( "reserveId", 
							"reserverId", 
							"reserverName", 
							"dept",
							date, 
							starttimeHour,
							starttimeMin,
							endtimeHour,
							endtimeMin,
							rscId,
							rscName,
							"purpose" );
		return ret;
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
	
	jQuery.fn.addEventListner = function(eventname, eventhandler) {
		switch(eventname){
			case "timeSelected":
				timeSelectedEventHandler = eventhandler;
				break;
			default:
				throw "invalid eventname : " + eventname;
				break;
		}
	}

})(jQuery);