var socket = io.connect();

$(document).ready(function() {
	console.log('Doc loaded');
	$('#submitBtn').click(function() {
		var sampleInput = document.getElementById("dataSampleInput").value;
		console.log(sampleInput);
		var refreshInput = document.getElementById("refreshTimeInput").value;
		console.log(refreshInput);
		socket.emit('sampleInput', sampleInput);
		socket.emit('refreshInput', refreshInput);
	});

	socket.on('sampleSetting', function(serverSampleSetting) {
		console.log('Received new sample rate ' + serverSampleSetting);
		$('#dataSampleInput').val(serverSampleSetting);
	});
    
	socket.on('refreshSetting', function(serverRefreshSetting) {
		console.log('Received new refresh rate ' + serverRefreshSetting);
		$('#refreshTimeInput').val(serverRefreshSetting);
	});
    
    socket.on('digiXStatus', function(digiXStatusData) {
		console.log('DigiX Status received: ' + digiXStatusData);
        if (digiXStatusData == "FALSE"){
            $('#DigiStatus').text('Offline');
            $('#DigiStatus').css('color', 'red');
            } else {
            console.log("DigiX online");
            $('#DigiStatus').text('Online');
            $('#DigiStatus').css('color', 'green');
            }
	});    
    
    socket.on('digiXRem1Status', function(digiXRem1StatusData) {
    	console.log('Remote 1 Status received: ' + digiXRem1StatusData);
        if (digiXRem1StatusData == "FALSE"){
            $('#DigiRem1Status').text('Offline');
            $('#DigiRem1Status').css('color', 'red');
            } else {
            console.log("DigiX online");
            $('#DigiRem1Status').text('Online');
            $('#DigiRem1Status').css('color', 'green');
            }
	}); 
 
     socket.on('digiXRem2Status', function(digiXRem2StatusData) {
        console.log('Remote 2 Status received: ' + digiXRem2StatusData);
        if (digiXRem2StatusData == "FALSE"){
            $('#DigiRem2Status').text('Offline');
            $('#DigiRem2Status').css('color', 'red');
            } else {
            console.log("DigiX online");
            $('#DigiRem2Status').text('Online');
            $('#DigiRem2Status').css('color', 'green');
            }
	}); 
 
    

	socket.on('readingsData', function(readingsData) {
		console.log("Server Connected");
		$('#logger').text('Online');
		$('#logger').css('color', 'green');
		console.log('refresh rate set to:  ' + document.getElementById("refreshTimeInput").value);
		console.log(readingsData);
		var temp_data = [];
		var usage_data = [];
        var digiTemp_data = [];
        var digiRemote1temp_data = [];
        var digiRemote2temp_data = [];        
		var dateTime = new Date(readingsData[0].time);
		$('#currTime').html(dateTime);
		$('#currTemp').html(readingsData[0].temp2);
		$('#currUsage').html(readingsData[0].usage2);
        $('#currDigiX').html(readingsData[0].DigiTemp);
        $('#currDigiXRem1Temp').html(readingsData[0].DigiXRem1Temp);
        $('#currDigiXRem2Temp').html(readingsData[0].DigiXRem2Temp);        
		console.log('length of readingData = ' + readingsData.length);
		for (var i = 0; i < readingsData.length; i++) {
			temp_data.push([new Date(readingsData[i].time), readingsData[i].temp2]);
			usage_data.push([new Date(readingsData[i].time), readingsData[i].usage2]);
            digiTemp_data.push([new Date(readingsData[i].time), readingsData[i].DigiTemp]);
            digiRemote1temp_data.push([new Date(readingsData[i].time), readingsData[i].DigiXRem1Temp]);
            digiRemote2temp_data.push([new Date(readingsData[i].time), readingsData[i].DigiXRem2Temp]);
		}
		$.plot($("#placeholder"), [{
			label: "Temperature (C)",
            data: temp_data
		}, {
			label: "Power Usage (KW)",
			data: usage_data,
			yaxis: 2
		}, {
			label: "DigiX Temp (C)",
			data: digiTemp_data,
			yaxis: 1
		}, {
            label: "DigiX Remote 1 temp (C)",
			data: digiRemote1temp_data,
			yaxis: 1
		}, {
            label: "DigiX Remote 2 temp (C)",
            data: digiRemote2temp_data,
			yaxis: 1
		}], {
			xaxes: [{
				mode: "time",
				timeformat: "%H:%M",
				timezone: "browser"
			}],
            series: {
				lines: {
					show: true
				}
			},
        yaxes: [{}, {
				position: "right"
			}],
        legend: {
        noColumns: 3,
        container: $("#legendholder")
    }
		});
		socket.on('disconnect', function() {
			// visually disconnect
			$('#logger').text('Offline');
			$('#logger').css('color', 'red');
            $('#DigiStatus').text('Offline');
            $('#DigiStatus').css('color', 'red');
		});
	});

    
});