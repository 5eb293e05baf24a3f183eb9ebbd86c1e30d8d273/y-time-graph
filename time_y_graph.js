if (location.search == '') {
	location.assign("?time_resolution_in_seconds=1");
}

var DATA_SOURCE_URL = 'https://crest.eveonline.com/dust/server/';
var DATA_KEY = 'userCount';

// Y repsents PCU.
var Y_MAX = 15000;

var TRACKING_CIRCLE_RADIUS = 4;

var US_EASTERN_TIME_OFFSET = -5;

var GRAPH_WIDTH_BUFFER = 5;

var GRAPH_WIDTH_INCREASE_DELTA = 60;

var SELECTED_TIME_LINK_HIGHLIGHT_CLASS = 'disabled';

var CANVAS_H, CANVAS_W, SECS_PER_PIXEL, Y_VALUE_PER_PIXEL, STARTING_TIME, PAPER;

function updateGraph() {
	$.getJSON(DATA_SOURCE_URL, function(data) {
		var raw_y;
		$.each(data, function(key, val) {
			if (key == DATA_KEY) {
				raw_y = val;
				return false;
			}			
		});
		draw_path(raw_y);
	}).error(function(){ 
		draw_path(0); // Fail sliently if server is down.
	}); 
}

function increase_graph_width_if_necessary(current_max_x) {
	var graph_current_width = parseInt($('svg').attr('width'));
	if ((graph_current_width - current_max_x) <= GRAPH_WIDTH_BUFFER) {
		$('svg').attr('width', graph_current_width + GRAPH_WIDTH_INCREASE_DELTA);
	}
}

function draw_path(raw_y) {
	var last_x = get_last_x();
	
	increase_graph_width_if_necessary(last_x);
	
	// Draw a new data line.
	var data_line = PAPER.path("M" + last_x + " " + get_last_y() + "L" + (last_x + 1) + " " + y_coordinate(raw_y));	
	$(data_line.node).attr("class", "data-line");
	// Draw a fill line.
	var fill_line = PAPER.path("M" + (last_x + 1) + " " + y_coordinate(raw_y) + "V" + y_coordinate(0));	
	$(fill_line.node).attr("class", "fill-line");
}

function get_last_y() {
	var path = $("path.data-line").last();
	if (path.length == 0) return y_coordinate(0);
	else return get_xy_in_path(path, 'y2');
}

function get_last_x() {
	var path = $("path.data-line").last();
	if (path.length == 0) return 0;
	else return get_xy_in_path(path, 'x2');
}

function y_coordinate(raw_y) {
	return Math.round(CANVAS_H - (raw_y / Y_VALUE_PER_PIXEL));
}

function get_path(x_coordinate) {
	return $("path.data-line[d^=M" + x_coordinate + "]");
}

function get_xy_in_path(path, choice) {
	var reg_sub_group_index;
	if (choice == 'x1') 
		reg_sub_group_index = 1;
	else if (choice == 'y1')
		reg_sub_group_index = 2;
	else if (choice == 'x2')
		reg_sub_group_index = 3;
	else if (choice == 'y2')
		reg_sub_group_index = 4;
		
	var str = path.attr('d');
	var regexp = /^M(\d+),(\d+)L(\d+),(\d+)$/;
	var matches_array = str.match(regexp);
	
	return parseInt(matches_array[reg_sub_group_index]);
}

function convert_y_to_raw_y(y_coordinate) {
	return Math.round((CANVAS_H - y_coordinate) * Y_VALUE_PER_PIXEL);
}

function convert_x_to_time(x_coordinate) {
	var seconds_passed = x_coordinate * SECS_PER_PIXEL;
	// GMT time
	return new Date(STARTING_TIME.getTime() + seconds_passed * 1000 + (STARTING_TIME.getTimezoneOffset() * 60000));
}

function show_raw_on_page_at_x(x_coordinate) {
	var path = get_path(x_coordinate);
	if (path.length != 0) {
		var y_coordinate = get_xy_in_path(path, 'y1');
		display_tracking_circle(x_coordinate, y_coordinate);
		display_data(convert_x_to_time(x_coordinate), convert_y_to_raw_y(y_coordinate));
	}
}

function display_tracking_circle(x_coordinate, y_coordinate) {
	$('circle').remove();
	PAPER.circle(x_coordinate, y_coordinate, TRACKING_CIRCLE_RADIUS);
}

function display_data(x_data, y_data) {
	$("#pcu").text(y_data);
	
	var time_strs = get_time_str_in_different_timezones(x_data);
	var option_html;
	for (var i = 0; i < time_strs.length; i++) {
		$("#time option").eq(i).text(time_strs[i]);
	}
}

function get_time_str_in_different_timezones(gmt_time) {
	var shanghai_str = format_datetime(gmt_time, 8) + " Shanghai Time"
	var london_str = format_datetime(gmt_time, 0) + " London Time"
	var us_eastern_str = format_datetime(gmt_time, US_EASTERN_TIME_OFFSET) + " US Eastern Time"
	var us_pacific_str = format_datetime(gmt_time, US_EASTERN_TIME_OFFSET - 3) + " US Pacific Time"
	
	var times =[shanghai_str, london_str, us_eastern_str, us_pacific_str];
	return times;
}

function format_datetime(gmt, hour_offsets) {
	var time = new Date(gmt);
	time.setHours(gmt.getHours() + hour_offsets);
	return ("0" + time.getHours()).slice(-2) + ":" + ("0" + time.getMinutes()).slice(-2) + ":" + ("0" + time.getSeconds()).slice(-2) + " " + (time.getMonth() + 1) + "/" + time.getDate() + "/" + time.getFullYear();
}

function highlight_selected_time_link() {
	$(".nav a[href='?time_resolution_in_seconds=" + SECS_PER_PIXEL + "']").parent().addClass(SELECTED_TIME_LINK_HIGHLIGHT_CLASS);
}


$(window).load(function() {
	CANVAS_H = Math.round((innerHeight - $('header').innerHeight()) * 0.97);
	Y_VALUE_PER_PIXEL = Y_MAX / CANVAS_H;
	STARTING_TIME = new Date();
	
	// Read the time resolution from the [num] in '?time_resolution_in_seconds=[num]'
	SECS_PER_PIXEL = location.search.match(/time_resolution_in_seconds=(\d+)/)[1];

	highlight_selected_time_link();
	
	// Show a maximum of 365-day data.
	//CANVAS_W = 60 * 60 * 24 * 365 / SECS_PER_PIXEL;

	PAPER = Raphael("graph_container", innerWidth, CANVAS_H);
	
	updateGraph();
	setInterval(updateGraph, SECS_PER_PIXEL * 1000);
	
	$("svg").mousemove(function(event) {
		show_raw_on_page_at_x(event.pageX + $("#graph_container").scrollLeft());
	});

});
