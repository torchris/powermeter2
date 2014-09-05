//Load Dependencies
var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var tungus = require('tungus');
var Engine = require('tingodb');
var mongoose = require('mongoose');
var request = require("request");
var NanoTimer = require('nanotimer');
var app = express();
var server = require('http').createServer(app);
var timerGetData = new NanoTimer();
var timerSendSockets = new NanoTimer();

//Initialize Mongoose with Tingo
var db = mongoose.connect('tingodb://readingsdb');

//Set up some global variables
var usage;
var temp;
var readings;
var tempDigiX;
var DigiXAvailable, DigiXRemote1Temp, DigiXRemote2Temp, DigiXRemote1Available, DigiXRemote2Available;

//Set environment variables for defaults
process.env.SAMPLES = '50';
console.log('Samples = ' + process.env.SAMPLES);
process.env.REFRESHINT = '90';
console.log('Refresh = ' + process.env.REFRESHINT);

//Mongoose connects to database
mongoose.connect('tingodb://readingsdb', function(err) {
	if (!err) {
		console.log('connected to databse');
	}
	else {
		throw err;
	}
});

//Set up schema for database
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var ReadingsSchema = new Schema({
	time: {
		type: Date,
	default:
		Date.now
	},
	usage2: Number,
	temp2: Number,
    DigiTemp: Number,
    DigiXRem1Temp: Number,
    DigiXRem2Temp: Number
});

var Readings = mongoose.model('Readings', ReadingsSchema);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

var io = require('socket.io').listen(server);
app.set('port', process.env.PORT || 3008);
io.set('log level', 2);

// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}

//This serves up the page and renders the variables into the Jade template engine.
app.get('/', function(req, res) {
	res.render('index', {
		title: 'Power Usage and Indoor Outdoor Temperature',
		refreshRate: process.env.REFRESHINT,
		sampleNum: process.env.SAMPLES
	});
});

io.sockets.on('connection', function(socket) {
    console.log('A new user connected!');
    Readings.find({}, {}, {
    sort: {
        'time': -1
	},
			limit: process.env.SAMPLES
}, function(err, readings) {
			socket.broadcast.emit('readingsData', readings);
			console.log(process.env.SAMPLES + ' readings sent over');
            console.log('DigiX Status sent over socket = ' + DigiXAvailable);
            socket.broadcast.emit('digiXStatus', DigiXAvailable);
		});
        timerSendSockets.setInterval(function(){
    		Readings.find({}, {}, {
			sort: {
				'time': -1
			},
			limit: process.env.SAMPLES
		}, function(err, readings) {
			socket.broadcast.emit('readingsData', readings);
			console.log(process.env.SAMPLES + ' readings sent over');
            console.log('DigiX Status sent over socket = ' + DigiXAvailable);
            socket.broadcast.emit('digiXStatus', DigiXAvailable);
            console.log('Remote 1 status sent over socket = ' + DigiXRemote1Available);
            socket.broadcast.emit('digiXRem1Status', DigiXRemote1Available);
            console.log('Remote 2 status sent over socket = ' + DigiXRemote2Available);
            socket.broadcast.emit('digiXRem2Status', DigiXRemote2Available);
		});
        console.log('Interval inside sockets set to: ' + process.env.REFRESHINT); 
    	}, '', process.env.REFRESHINT + 's', function(err){
        if(err) {
        console.log('This fucked up!');
        }
        });
	socket.on('sampleInput', function(sampleInputSetting) {
		console.log('setting data = ' + sampleInputSetting);
		process.env.SAMPLES = sampleInputSetting;
		socket.broadcast.emit('sampleSetting', sampleInputSetting);
		console.log('Sending sample rate back out');
	});
	socket.on('refreshInput', function(refreshInputSetting) {
		console.log('setting data = ' + refreshInputSetting);
		process.env.REFRESHINT = refreshInputSetting;
		socket.broadcast.emit('refreshSetting', refreshInputSetting);
		console.log('Sending refresh rate back out');
		Readings.find({}, {}, {
			sort: {
				'time': -1
			},
			limit: process.env.SAMPLES
		}, function(err, readings) {
			socket.broadcast.emit('readingsData', readings);
			socket.emit('readingsData', readings);
		});
	});
   
});

function getData() {
    request({
    uri: "http://192.168.1.33/pcmconfig.htm"
	}, function(error, response, body) {
		if (!error && response.statusCode == 200) {
			var n = body.search("Present Demand");
			usage = body.substr((n + 44), 5);
			usage = usage.trim();
			console.log("Power Usage from PowerCost" + usage);
			var n2 = body.search("Sensor Temp");
			temp = body.substr((n2 + 40), 3);
			temp = temp.trim();
			temp = temp - 2;
			console.log("Temp from PowerCost:" + temp);
		}
	});
	request({
		uri: "http://192.168.1.6:3010/temp"
	}, function(error, response, body) {
		if (error) {
			//If there is an error or the DigiX is unreachable, set the value to an error.
			console.log("Error: DigiX not available");
//			tempDigiX = 19.99;
            DigiXAvailable = "FALSE";
            DigiXRemote1Available = "FALSE";
            DigiXRemote2Available = "FALSE";            
            console.log("DigiX status: " + DigiXAvailable);
		}
		else if (!error && response.statusCode == 200) {
			var n = body.search("DIGIXTEMP:");
			tempDigiX = body.substr((n + 11), 5);
			tempDigiX = tempDigiX.trim();
			console.log("Current temp reading on DigiX: " + tempDigiX);
            DigiXAvailable = "TRUE";
            console.log("DigiX status: " + DigiXAvailable);
            var r1 = body.search("REM1TEMP:");
            DigiXRemote1Temp = body.substr((r1 +10), 5);
            DigiXRemote1Temp = DigiXRemote1Temp.trim();
            console.log("Remote 1 temp: " + DigiXRemote1Temp);
            if (DigiXRemote1Temp == "OFFLI") {
                DigiXRemote1Available = "FALSE";
                console.log("DigiX Remote 1 Offline");
            } else {
                 DigiXRemote1Available = "TRUE";
                console.log("DigiX Remote 1 Online");               
            }
            var r2 = body.search("REM2TEMP:");
            DigiXRemote2Temp = body.substr((r2 +10), 5);
            DigiXRemote2Temp = DigiXRemote2Temp.trim();
            console.log("Remote 2 temp: " + DigiXRemote2Temp);
                        if (DigiXRemote2Temp == "OFFLI") {
                DigiXRemote2Available = "FALSE";
                console.log("DigiX Remote 2 Offline");
            } else {
                 DigiXRemote2Available = "TRUE";
                console.log("DigiX Remote 1 Online");               
            }
            
		}
	});
	var readingInfo = new Readings({
		temp2: temp,
		usage2: usage,
        DigiTemp: tempDigiX,
        DigiXRem1Temp: DigiXRemote1Temp,
        DigiXRem2Temp: DigiXRemote2Temp
	});
	readingInfo.save(function(err, readingInfo) {
		if (err) return console.error(err);
		console.dir(readingInfo);
	});
}

//run the above function

timerGetData.setInterval(getData, '', process.env.REFRESHINT + 's', function(err){
    if(err) {
        console.log('This fucked up!');
    }
});

server.listen(app.get('port'), function() {
	console.log('Express server listening on port ' + app.get('port'));
});