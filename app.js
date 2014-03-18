
/**
 * Module dependencies.
 */


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

//Initialize Mongoose with Tingo
var db = mongoose.connect('tingodb://readingsdb');

//Set up some global variables
var usage;
var temp;
var readings;

//Set environment variables for defaults
process.env['SAMPLES'] = '5';
process.env['REFRESHINT'] = '120';


//Mongoose connects to database
mongoose.connect('tingodb://readingsdb', function (err){
    if (!err) {
        console.log('connected to databse');
    } else {
        throw err;
    }
});

//Set up schema for database
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var ReadingsSchema = new Schema({
  time: { type : Date, default: Date.now },
    usage2: Number,
    temp2: Number
    });

var Readings = mongoose.model('Readings', ReadingsSchema);

//Do the simple screen scrape and pop the results into the database.
//Rinse and repeat according to the environment variable for refresh rate
function getData (){
    request({uri: "http://192.168.1.33/pcmconfig.htm"}, function (error, response, body){
        if (!error && response.statusCode == 200) {
            var n = body.search("Present Demand");
           usage = body.substr((n+44),5);
           usage = usage.trim();
           console.log(usage);
           var n2 = body.search("Sensor Temp");
           temp = body.substr((n2+40),3);
           temp = temp.trim();
           temp = temp - 2;
           console.log(temp);
           var readingInfo = new Readings({
               temp2: temp,
               usage2: usage
            });
        readingInfo.save(function(err, readingInfo){
              if (err) return console.error(err);
            console.dir(readingInfo);
            });
        setTimeout(getData,(process.env.REFRESHINT * 1000));
    }});
}

//run the above function
getData();

//Below are all set by default in Express
var app = express();

// all environments
//app.set('port', process.env.PORT || 3008);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

//When the Submit button is pressed, it runs this function and re-renders the page
app.post('/', function(req, res){
    process.env['SAMPLES'] = req.param("samples");
    process.env['REFRESHINT'] = req.param("interval");
    console.log('Samples is set to:  ' + process.env.SAMPLES);
    console.log('Refresh is set to:  ' + process.env.REFRESHINT);    
      Readings.find({}, {}, { sort: { 'time' : -1}, limit: process.env.SAMPLES }, function(err, readings) {
    if (err) return console.error(err);
      res.render('index', 
        { title: 'Power Usage and Temp from PowerCost Monitor',
          refreshRate: process.env.REFRESHINT,
          sampleNum: process.env.SAMPLES,
          readings: readings
              });
           }
          );
       });

//This serves up the page and renders the variables into the Jade template engine.
app.get('/', function(req, res){
      res.render('index', 
        { title: 'Power Usage and Temp from PowerCost Monitor',
          refreshRate: process.env.REFRESHINT,
          sampleNum: process.env.SAMPLES
              });
           }
          );


var server = app.listen(3008);
var io = require('socket.io').listen(server);

io.sockets.on('connection', function (socket) {
    console.log('A new user connected!');
        setInterval(function(){
            Readings.find({}, {}, { sort: { 'time' : -1}, limit: process.env.SAMPLES }, function(err, readings) {
                socket.emit('readingsData', readings);
                console.log (readings);
            });
        }, process.env.REFRESHINT * 1000);
    });

//Start up the server!
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
