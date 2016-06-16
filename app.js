var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser')

var Spider = require('./Spider.js');

var app = express();
config = require('./config.js');

app.set('view engine', 'ejs');

// BodyParser middleware
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());
app.use(cookieParser());

// Static file
app.use(express.static('public'));


var schools = require('./dat/schools.json');
var explainations  = require('./dat/explainations.json');


/*===================================
=            Page router            =
===================================*/

app.get('/', function(req, res) {
	Spider.getCookies(function(data) {
		res.cookie('token', data.token);
		res.cookie('viewState', data.viewState);
		res.render('index', {
			title : config.website.title,
			schools : schools,
			explainations : explainations
		});
	})
});

/*=====  End of Page router  ======*/

/*===================================
=            RESTful API            =
===================================*/

app.post('/login', function(req, res) {
	var spider = new Spider(req.cookies.token);
	var body = req.body;
	spider.username = body.username;
	spider.password = body.password;
	spider.login(body.checkCode, req.cookies.viewState, function(error) {
    	res.cookie('username', spider.username);
    	res.json({
    		status: (error ? 'failure' : 'success')
    	})
	});
});

app.post('/spider', function(req, res) {
	var spider = new Spider(req.cookies.token);
	spider.username = req.cookies.username
	spider.getCollegeExaminationScores("", "", function(examScores) {
		spider.getRankExaminationScores(function(rankScores) {
			spider.getExaminationInfo(function(examInfo) {
				res.render('content', {
					examScores: examScores,
					rankScores: rankScores,
					examInfo  : examInfo
				});
			});
		});
	});
});

/*=====  End of RESTful API  ======*/


app.listen(config.app.port, config.app.url, function() {
	console.log("app run in " + config.app.url + ":" + config.app.port);
});
