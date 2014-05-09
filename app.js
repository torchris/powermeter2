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
var app = express();
var server = require('http').createServer(app);

//Initialize Mongoose with Tingo
var db = mongoose.connect('tingodb://readingsdb');

//Set up some global variables
var usage;
var temp;
var readings;
var tempDigiX;
var DigiXAvailable;

//Set environment variables for defaults
process.env.SAMPLES = '50';
console.log('Samples = ' + process.env.SAMPLES);
process.env.REFRESHINT = '180';
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
    DigiTemp: Number
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
    setInterval(function() {
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
	}, (process.env.REFRESHINT * 1000));
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
		uri: "http://192.168.1.7:3010/temp"
	}, function(error, response, body) {
		if (error) {
			//If there is an error or the DigiX is unreachable, set the value to an error.
			console.log("Error: DigiX not available");
			tempDigiX = 19.99;
            DigiXAvailable = "FALSE";
            console.log("DigiX status: " + DigiXAvailable);
		}
		else if (!error && response.statusCode == 200) {
			var n = body.search("TEMP:");
			tempDigiX = body.substr((n + 6), 5);
			tempDigiX = tempDigiX.trim();
			console.log("Current temp reading on DigiX: " + tempDigiX);
            DigiXAvailable = "TRUE";
            console.log("DigiX status: " + DigiXAvailable);
		}
	});
	var readingInfo = new Readings({
		temp2: temp,
		usage2: usage,
        DigiTemp: tempDigiX
	});
	readingInfo.save(function(err, readingInfo) {
		if (err) return console.error(err);
		console.dir(readingInfo);
	});

}

//run the above function
setInterval(getData, (process.env.REFRESHINT * 1000));

server.listen(app.get('port'), function() {
	console.log('Express server listening on port ' + app.get('port'));
});