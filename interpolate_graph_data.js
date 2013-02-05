function get_path(x_coordinate) {
	return $('path[d^="M' + x_coordinate + '"]');
}

function get_y_in_path(path) {
	var str = path.attr('d');
	var regexp = /^M\d+,(\d+)/;
	var matches_array = str.match(regexp);
	
	return matches_array[1];
}

function convert_y_value_to_pcu(y) {
	return (CANVAS_H - y) * NUM_PPL_PER_PIXEL_ON_Y;
}

function convert_x_value_to_time(x) {
	var seconds_passed = x * NUM_SECS_PER_PIXEL_ON_X;
	return new Date(starting_time.getTime() + seconds_passed * 1000);
}

var starting_time = new Date();

$("svg").mousemove(function(event) {
	var path = get_path(event.pageX);
	var y_value = get_y_in_path(path);
	var pcu = convert_y_value_to_pcu(y_value);
	var time = convert_x_value_to_time(event.pageX);
	$("span").html("pcu: " + pcu + "<br />" + "time: " + time);
});