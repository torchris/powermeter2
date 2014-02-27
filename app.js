
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var tungus = require('tungus');
var Engine = require('tingodb');
var mongoose = require('mongoose');
var request = require("request");
var db = mongoose.connect('tingodb://readingsdb');
var usage;
var temp;
var readings;

process.env['SAMPLES'] = '15';

mongoose.connect('tingodb://readingsdb', function (err){
    if (!err) {
        console.log('connected to databse');
    } else {
        throw err;
    }
});

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var ReadingsSchema = new Schema({
  time: { type : Date, default: Date.now },
  usage2: Number,
  temp2: Number
});

var Readings = mongoose.model('Readings', ReadingsSchema);

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
        setTimeout(getData,120000);
        }});
}

getData();

var app = express();

// all environments
app.set('port', process.env.PORT || 3008);
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

app.post('/', function(req, res){
    process.env['SAMPLES'] = req.param("samples");
    console.log(process.env.SAMPLES);
    });

app.get('/', function(req, res){
  Readings.find({}, {}, { sort: { 'time' : -1}, limit: process.env.SAMPLES }, function(err, readings) {
    if (err) return console.error(err);
      res.render('index', 
        { title: 'Power Usage',
          sampleNum: process.env.SAMPLES,
          readings: readings
              });
           }
          );
       }
    );

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
