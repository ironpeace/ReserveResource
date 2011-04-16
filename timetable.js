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
		
		var dd1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
		var dd2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
		
		var d1 = dd1.getTime();
		var d2 = dd2.getTime();
		
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
				//console.log("d1 : " + d1 + ", d2 : " + d2);
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
	
	DateUtil.getDatefromString = function(dateString){
		var ds = dateString.split("/");
		var ret = new Date(ds[0], parseFloat(ds[1])-1, ds[2]);
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
			resources : [{"rscID":"000","rscName":"dummy"}],
			reserves : [
							{
								"reserveId":"1",
								"reserverId":"PIT00123",
								"reserverName":"山田太郎",
								"dept":"SI開発1部",
								"date":"2011/4/15",
								"startTimeHour":"10",
								"startTimeMin":"30",
								"endTimeHour":"11",
								"endTimeMin":"0",
								"resourceId":"001",
								"resourceName":"トルネード１",
								"purpose":"部内定例" 
							},{
								"reserveId":"2",
								"reserverId":"PIT00456",
								"reserverName":"佐藤二朗",
								"dept":"SI開発2部",
								"date":"2011/4/16",
								"startTimeHour":"12",
								"startTimeMin":"15",
								"endTimeHour":"15",
								"endTimeMin":"45",
								"resourceId":"002",
								"resourceName":"トルネード２",
								"purpose":"チーム内定例" 
							},{
								"reserveId":"3",
								"reserverId":"PIT00789",
								"reserverName":"鈴木三郎",
								"dept":"SI開発3部",
								"date":"2011/4/17",
								"startTimeHour":"17",
								"startTimeMin":"0",
								"endTimeHour":"23",
								"endTimeMin":"0",
								"resourceId":"003",
								"resourceName":"トルネード３",
								"purpose":"障害対応" 
							}
						]
		},options);

		if(!DateUtil.compareDates(options.startDate, "lessThanOrEqual",options.endDate)){
				throw "startDate isn't lessThanOrEqual endDate";
		}

		return this.each(function() {
			console.log("selectedDateRangeStart : " + options.startDate.toLocaleString());
			console.log("selectedDateRangeEnd : " + options.endDate.toLocaleString());
			console.log("resources length : " + options.resources.length);
			console.log("reserves length : " + options.reserves.length);
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
	var currentMouseIdx;

	var highlightCellIdx;
	var highlightCellPos;
	var highlightCellSize;
	var highlightCellCnt;
	
	var mousedownedCellIdx = null;
	
	var daysCnt;
	var rscCnt;
	
	var reserveBoxes = new Array();
	var selectedReserveBox;
	var dragBox;
	var dragBoxDistance;

	var resizingReserveId;
	var resizingReserveBox;

	var timeSelectedEventHandler = function(event){}
	var reserveMovedEventHandler = function(event){}
	var reserveResizedEventHandler = function(event){}

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

	var ReserveBox = function(x, y, cellCount, reserve){
		this.x = x;
		this.y = y;
		this.cellCount = cellCount;
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
		currentMouseIdx = getCellIndex(mouseX, mouseY);
		invalidDisplayList();
	}

	function mouseDownListner(event){
		var rect = event.target.getBoundingClientRect();
		mouseX = event.pageX - rect.left;
		mouseY = event.pageY- rect.top;
		mousedownedCellIdx = getCellIndex(mouseX, mouseY);
		
		var rbSelected = false;
		var rbl = reserveBoxes.length;
		for(var i=0; i<rbl; i++){
			var rb = reserveBoxes[i];
			if(isMouseOver(rb)){
				selectedReserveBox = rb;
				if(isMouseOverResizeCorner(rb)){
					resizingReserveId = rb.reserve.reserveId;
				}else{
					dragBox = new ReserveBox(rb.x, rb.y, rb.cellCount, rb.reserve);
					dragBoxDistance = mousedownedCellIdx.y - dragBox.y;
				}
				rbSelected = true;
				break;
			}
		}
		if(!rbSelected) selectedReserveBox = null;
		
		invalidDisplayList();
	}

	function mouseUpListner(event){
		if(mousedownedCellIdx){
			setHighlightCellSize();
			var newReserve = getReserve(highlightCellIdx.x, Math.min(mousedownedCellIdx.y, highlightCellIdx.y), highlightCellCnt);
			if(!selectedReserveBox){
				//dispatch timeSelected Event
				var timeSelectedEvent = new Event("timeSelected", newReserve);
				timeSelectedEventHandler(timeSelectedEvent);
			}
			mousedownedCellIdx = null;
		}
		
		if(dragBox){
			//dispatch reserveMovedEvent
			var movedReserve = getReserve(dragBox.x, dragBox.y, dragBox.cellCount);
			movedReserve.reserveId = dragBox.reserve.reserveId;
			movedReserve.reserverId = dragBox.reserve.reserverId;
			movedReserve.reserverName = dragBox.reserve.reserverName;
			movedReserve.dept = dragBox.reserve.dept;
			movedReserve.purpose = dragBox.reserve.purpose;
			var reserveMovedEvent = new Event("reserveMoved", movedReserve);
			reserveMovedEventHandler(reserveMovedEvent);
		
			dragBox = null;
		}
		
		if(resizingReserveBox){
			//dispatch reserveResizedEvent
			var resizedReserve = getReserve(resizingReserveBox.x, resizingReserveBox.y, resizingReserveBox.cellCount - 1);
			resizedReserve.reserveId = resizingReserveBox.reserve.reserveId;
			resizedReserve.reserverId = resizingReserveBox.reserve.reserverId;
			resizedReserve.reserverName = resizingReserveBox.reserve.reserverName;
			resizedReserve.dept = resizingReserveBox.reserve.dept;
			resizedReserve.purpose = resizingReserveBox.reserve.purpose;
			var reserveResizedEvent = new Event("reserveResized", resizedReserve);
			reserveResizedEventHandler(reserveResizedEvent);
			
			resizingReserveBox = null;
			resizingReserveId = null;
		}
		
		invalidDisplayList();
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

		rowHeight = (height - resourceNameRowHeight - daysNameRowHeight) / (rowCnt - 2);
		colWidth = (width - firstColWidth) / colCnt;
		
		lastRowHeight = height - resourceNameRowHeight - daysNameRowHeight - rowHeight * (rowCnt - 3);
		lastColWidth = width - firstColWidth - colWidth * (colCnt - 1);
		
		drawLines(x, y, width - x, height - y);
		drawHighLight();
		drawReserveBoxes();
	}

	function drawLines(x, y, width, height) {
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.beginPath();
		context.shadowBlur = 0;
		context.shadowOffsetX = 0;
		context.shadowOffsetY = 0;
		context.strokeStyle = 'rgba(51, 51, 51, 1.0)'; //#333333
		context.rect(x, y, width, height);
		context.stroke();
		context.closePath();
		drawColLines(x, y, width, height);
		drawRowLines(x, y, width, height);
	}

	function drawColLines(x, y, width, height) {
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
		
		//drag中ならハイライト描画しない
		if(dragBox) return;
		
		//resize中ならハイライト描画しない
		if(resizingReserveId) return;
		
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

	function getCellPosition(indexX, indexY){
		var hpx = firstColWidth + colWidth * indexX;
		var hpy = daysNameRowHeight + resourceNameRowHeight + rowHeight * indexY;
		var ret = new Point(hpx, hpy);
		return ret;
	}

	function setHighLightCellPosition(indexX, indexY){
		highlightCellPos = getCellPosition(indexX, indexY);
	}

	function setHighlightCellSize(){
		setHighLightCellIndex(mouseX, mouseY);

		if(mousedownedCellIdx) {
			var isOutofTimetable = false;
			var hlix = mousedownedCellIdx.x;
			var hliy = Math.min(highlightCellIdx.y, mousedownedCellIdx.y);
			highlightCellCnt = Math.abs(highlightCellIdx.y - mousedownedCellIdx.y);
			
			setHighLightCellPosition(hlix, hliy);
			highlightCellSize = new Point(colWidth, rowHeight * (highlightCellCnt + 1));
		} else {
			setHighLightCellPosition(highlightCellIdx.x, highlightCellIdx.y);
			highlightCellSize = new Point(colWidth, rowHeight);
		}
	}
	
	function isOutTimeTable(){
		if(highlightCellIdx.x < 0) return true;
		if(highlightCellIdx.y < 0) return true;
		if(highlightCellIdx.x > colCnt - 1) return true;
		if(highlightCellIdx.y > rowCnt - 3) return true;
		return false;
	}
	
	function getReserve(reserveX, reserveY, cellCount){
		var dateIdx = Math.floor(reserveX / opt.resources.length);
		var date = DateUtil.plusDay(opt.startDate, dateIdx);
		
		var rscIdx = reserveX % opt.resources.length;
		var rscId = opt.resources[rscIdx].rscID;
		var rscName = opt.resources[rscIdx].rscName;
		
		var starttimeHour = opt.startTime + Math.floor(reserveY / 4);
		var starttimeMin = reserveY % 4 * 15;
		
		var endY = reserveY + cellCount + 1;
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

	function drawReserveBoxes(){
		reserveBoxes = new Array();
		var rl = opt.reserves.length;
		for(var i=0; i<rl; i++){
			var rb = getReserveBox(opt.reserves[i]);
			if(rb){
				reserveBoxes.push(rb);
				
				if(rb.reserve.reserveId == resizingReserveId){
					console.log("rb.reserve.id : " + rb.reserve.reserveId);
					console.log("resizingReserveId : " + resizingReserveId);
					if(selectedReserveBox.y <= currentMouseIdx.y){
						rb.cellCount = currentMouseIdx.y - selectedReserveBox.y + 1;
					}else{
						rb.cellCount = selectedReserveBox.y - currentMouseIdx.y;
						rb.y = currentMouseIdx.y;
					}
					resizingReserveBox = rb;
				}
				
				drawReserveBox(rb);
			}
		}
		
		if(dragBox){
			dragBox.y = highlightCellIdx.y - dragBoxDistance;
			dragBox.x = highlightCellIdx.x;
			drawReserveBox(dragBox);
			return;
		}
	}
	
	function drawReserveBox(reserveBox){
		var bp = getCellPosition(reserveBox.x, reserveBox.y);
		var hght = reserveBox.cellCount * rowHeight;

		if(isMouseOver(reserveBox)){
			context.fillStyle = 'rgba(00, 00, 255, 1.0)';
		}else{
			context.fillStyle = 'rgba(00, 00, 255, 0.7)';
		}

		context.shadowBlur = 10;
		context.shadowColor = "#000000";
		context.shadowOffsetX = 3;
		context.shadowOffsetY = 3;
		context.fillRect(bp.x, bp.y, colWidth, hght);

		context.shadowBlur = 0;
		context.shadowOffsetX = 0;
		context.shadowOffsetY = 0;
		context.fillStyle = 'rgba(255, 255, 255, 1.0)';
		context.textAlign = "start";
		context.font = "15px 'ＭＳ Ｐゴシック'";
		context.fillText(reserveBox.reserve.reserverName, bp.x + 5, bp.y + 15, colWidth);
	}
	
	function getReserveBox(reserve){
	
		// y 座標の決定 ~~~~~~~~~~~~~~~~~~~~~~~~　ここから
		var box_y = (reserve.startTimeHour - opt.startTime) * 4 + reserve.startTimeMin / 15;
		
		// タイムテーブルを上にはみ出しているなら、y をゼロにする。
		box_y = Math.max(box_y, 0);
		
		//タイムテーブルの縦のセル数の数
		var allCellCnt = (opt.endTime - opt.startTime) * 4;
		
		// タイムテーブルの下に頭からはみ出しているなら、null をリターンする。
		if(box_y >= allCellCnt){
			return null;
		}

		var cellCnt = (reserve.endTimeHour - opt.startTime) * 4 + reserve.endTimeMin / 15 - box_y;
		
		// ボックスが上にいくつはみだしているか
		var ov = box_y + cellCnt - allCellCnt;
		
		//上にはみ出しているなら、その分削る。
		if(ov > 0){
			cellCnt = cellCnt - ov;
		}

		// y 座標の決定 ~~~~~~~~~~~~~~~~~~~~~~~~　ここまで
		// x 座標の決定 ~~~~~~~~~~~~~~~~~~~~~~~~　ここから

		var ri = 99;
		var rl=opt.resources.length;
		for(var i = 0; i < rl; i++){
			if(opt.resources[i].rscID == reserve.resourceId){
				ri = i;
				break;
			}
		}
		
		// 今表示選択されているリソースに関する予約でなければnullを返す。
		if(ri == 99) return null;

		var di = 99;
		var rd = DateUtil.getDatefromString(reserve.date);
		var sd = opt.startDate;
		var ed = opt.endDate;

		//まずは選択日付内に含まれた予約かどうかをチェック
		if(DateUtil.compareDates(sd,"lessThanOrEqual",rd) && DateUtil.compareDates(rd,"lessThanOrEqual",ed)){
			var td = sd;
			var i = 0;
			while(DateUtil.compareDates(td,"lessThanOrEqual",ed)){
				if(DateUtil.compareDates(td,"equal",rd)){
					di = i;
					break;
				}else{
					i++;
					td = DateUtil.plusDay(td,1);
				}
			}
			//念のためチェック
			if(di == 99) throw "unreachable";
			
			var box_x = di + ri;
			
			// x 座標の決定 ~~~~~~~~~~~~~~~~~~~~~~~~　ここまで
			
			var ret = new ReserveBox(box_x, box_y, cellCnt, reserve);
			return ret;
		}else{
			// 今表示選択されてる日付の予約でなければnullを返す。
			return null;
		}
	}
	
	function isMouseOver(reserveBox){
		if(reserveBox.x == highlightCellIdx.x){
			if(reserveBox.y <= highlightCellIdx.y && highlightCellIdx.y <= reserveBox.y + reserveBox.cellCount){
				return true;
			}else{
				return false;
			}
		}else{
			return false;
		}
	}
	
	function isMouseOverResizeCorner(reserveBox){
		//そもそもマウスダウンしていない状態ならばfalse
		if(!mousedownedCellIdx) return false;

		var cornerSize = rowHeight * 2;

		var cp = getCellPosition(reserveBox.x, reserveBox.y);
		var rbRightSide = cp.x + colWidth;
		var rbBottom = cp.y + rowHeight * reserveBox.cellCount;
		
		if(rbRightSide - cornerSize < mouseX && mouseX < rbRightSide && 
			rbBottom - cornerSize < mouseY && mouseY < rbBottom){
			return true;
		}else{
			return false;
		}
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
			case "reserveMoved":
				reserveMovedEventHandler = eventhandler;
				break;
			case "reserveResized":
				reserveResizedEventHandler = eventhandler;
				break;
			default:
				throw "invalid eventname : " + eventname;
				break;
		}
	}

})(jQuery);