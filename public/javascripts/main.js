$(document).ready(function() {
	if (window.console) console.log("Hey, I'm executing here!");
    var readings;
	var temp_data = [];
	var usage_data = [];
	var reading_data = !{
		JSON.stringify(readings)
	};
	for (var i = 0; i < 15; i++)
	temp_data.push([new Date(reading_data[i].time), reading_data[i].temp2]);
	for (var i = 0; i < 15; i++)
	usage_data.push([new Date(reading_data[i].time), reading_data[i].usage2]);
	$.plot($("#placeholder"), [{
		label: "Temperature (C)",
		data: temp_data
	}, {
		label: "Power Usage (KW)",
		data: usage_data
	}], {
		xaxis: {
			mode: "time",
			timeformat: "%H:%M",
			timezone: "browser"
		}
	});
});