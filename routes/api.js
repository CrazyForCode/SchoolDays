var express = require('express');
var router = express.Router();

var Spider = require('../Spider.js');

/*===================================
=            RESTful API            =
===================================*/

router.post('/login', function(req, res) {
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

router.post('/spider', function(req, res) {
	var spider = new Spider(req.cookies.token);
	spider.username = req.cookies.username

	spider.getLessonsScores("", "", function(finishedLessonsScores) {
		spider.getRankScores(function(rankScores) {
			spider.getStatistics(function(data) {
				res.render('content', {
					scores: {
						finished: finishedLessonsScores,
						rank: rankScores,
						unfinished: data.unfinishedLessionsScores
					},
					credit: data.creditStatistics
				});
			});
		});
	});
});

/*=====  End of RESTful API  ======*/

module.exports = router;