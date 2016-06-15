var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser')



var app = express();
config = require('./config.js');

app.set('view engine', 'ejs');

var indexRoute = require('./routes/index');
var apiRoute = require('./routes/api');

// BodyParser middleware
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());
app.use(cookieParser());

// Static file
app.use(express.static('public'));

// Routes
app.use('/', indexRoute);
app.use('/', apiRoute);
app.use(function(req, res, next){
	res.status(404);
	res.send('404');
});


app.listen(config.app.port, config.app.url, function() {
	console.log("app run in " + config.app.url + ":" + config.app.port);
});
