var express = require('express');
var router = express.Router();

var Spider = require('../Spider.js');

var schools = require('../dat/schools.json');
var explainations  = require('../dat/explainations.json');

/*===================================
=            Page router            =
===================================*/

router.get('/', function(req, res) {
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

module.exports = router;
