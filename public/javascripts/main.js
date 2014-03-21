var socket = io.connect();

$(document).ready(function() {
    console.log('Doc loaded');
    
    socket.on('readingsData', function(readingsData) {
        console.log("Socket Connected");
        console.log('refresh rate set to:  ' + document.getElementById("refreshTimeInput").value);
		console.log(readingsData);
		$('#submitBtn').click(function() {
			var sampleInput = document.getElementById("dataSampleInput").value;
			console.log(sampleInput);
			var refreshInput = document.getElementById("refreshTimeInput").value;
			console.log(refreshInput);
			socket.emit('sampleInput', sampleInput);
			socket.emit('refreshInput', refreshInput);
		});
		var temp_data = [];
		var usage_data = [];
		$('#currTime').html(readingsData[0].time);
		$('#currTemp').html(readingsData[0].temp2);
		$('#currUsage').html(readingsData[0].usage2);
		console.log('length of readingData = ' + readingsData.length);
		for (var i = 0; i < readingsData.length; i++) {
			temp_data.push([new Date(readingsData[i].time), readingsData[i].temp2]);
			usage_data.push([new Date(readingsData[i].time), readingsData[i].usage2]);
		}
		$.plot($("#placeholder"), [{
			label: "Temperature (C)",
			data: temp_data
		}, {
			label: "Power Usage (KW)",
			data: usage_data,
			yaxis: 2
		}], {
			xaxes: [{
				mode: "time",
				timeformat: "%H:%M",
				timezone: "browser"
			}],
			yaxes: [{}, {
				position: "right"
			}]
		});
	});
});