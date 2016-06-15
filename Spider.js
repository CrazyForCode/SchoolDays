var cheerio = require('cheerio');
var request = require('request');
var url = require('url');
var iconv = require('iconv-lite');
var readlineSync = require('readline-sync');
var BufferHelper = require('bufferhelper');

var entryHost = 'jwxt.i.cqut.edu.cn';
var entryUrl = 'http://' + entryHost;

function Spider(cookie) {
    this.cookie = cookie;
}
    
// 获取 cookie 和 viewState
Spider.getCookies = function(callback) {
    request(entryUrl, function(err, res, body) {
        if (err) { return console.error(err) };
        var $ = cheerio.load(body);
        var viewState = $('input[name=__VIEWSTATE]').attr('value');
        var uri = res.client._httpMessage.path.toString();
        var cookie = uri.match(/\([a-z,A-Z,0-9]*\)/)[0];
        callback({
            token: cookie,
            viewState: viewState
        });
    });
}

// 登录
Spider.prototype.login = function(checkCode, viewState, callback) {
    this.checkCode = checkCode;
    request.post({
        url: entryUrl + '/' + this.cookie + '/Default2.aspx',
        form: {
            __VIEWSTATE: viewState,
            txtUserName: this.username,
            TextBox2: this.password,
            txtSecretCode: this.checkCode,
            Button1: "",
            lbLanguage: "",
            hidPdrs: "",
            hidsc: ""
        },
        followAllRedirects: true
    }, function(err, res, body) {
        if (err) {
            callback(err);
        } else if (res.statusCode == 200) {
            if (!res.client._httpMessage.path.match(/\/xs_main.aspx\?xh=/)){
                return callback('login failed.');
            }
            callback(null);
        } else {
            callback('failure')
        }
    });
}


// 获取课程成绩
Spider.prototype.getLessonsScores = function(year, term, callback) {
    console.log('getLessonsScores');

    var queryUrl = url.format({
        "protocol": "http",
        "host": entryHost,
        "pathname": this.cookie + "/xscjcx_dq.aspx",
        "query": {
            "xh": this.username,
            "gnmkdm": "N121607"
        }
    });
    request({
        url: queryUrl,
        encoding: null,
        headers:{
            Referer: url.format({
                    "protocol": "http",
                    "host": entryHost,
                    "pathname": this.cookie + "/xs_main.aspx",
                    "query": {
                        "xh": this.username,
                        "type": 1
                    }
            })
        }
    },function(err, res, body){
        if (err) { return console.error(err) };
        var $ = cheerio.load(resolveGB2312Html(body));
        var viewState = $('input[name=__VIEWSTATE]').attr('value');
        request.post({
            url: queryUrl,
            encoding: null,
            headers: {
                Referer: queryUrl
            },
            form: {
                __EVENTTARGET: '',
                __EVENTARGUMENT: '',
                __VIEWSTATE: viewState,
                ddlxn: '',
                ddlxq: '',
                btnCx: '',
            },
            followAllRedirects: true
        } , function(err, res, body){
            console.log('get scores data');
            if(err) { return console.error(err) }
            var $ = cheerio.load(resolveGB2312Html(body));
            var results = getScoresData($);
            callback({
                title: '学习成绩',
                type: "table",
                data: results
            });
        });
    });

    function getScoresData($) {
        var results = { thead: [], tbody: [] };
        $('table[class=datelist] tr').each(function (i, ele) {
            var $ele = cheerio.load(ele);
            var data = [ $ele('td').eq(0).text(), //学年
                $ele('td').eq(1).text(), //学期
                $ele('td').eq(3).text(), //课程名称
                $ele('td').eq(6).text(), //学分
                $ele('td').eq(11).text(), //成绩
            ];
            if (i == 0) {
                results.thead = data;
            } else {
                results.tbody.push(data);
            }
        });
        return results;
    }
}

// 获取等级考试成绩
Spider.prototype.getRankScores = function(callback) {
    var scoresUrl = url.format({
        "protocol": "http",
        "host": entryHost,
        "pathname": this.cookie + "/xsdjkscx.aspx",
        "query": {
            "xh": this.username,
            "gnmkdm": "N121605"
        }
    });
    request({
        url: scoresUrl,
        encoding: null,
        headers: {
            Referer: url.format({
                "protocol": "http",
                "host": entryHost,
                "pathname": this.cookie + "/xs_main.aspx",
                "query": {
                    "xh": this.username,
                    "type": 1
                }
            })
        }
    }, function(err, res, body){
        if (err) { return console.error(err) };
        var $ = cheerio.load(resolveGB2312Html(body));
        var results = getScoresData($);
        callback({
            title: '等级考试成绩查询',
            type: "table",
            data: results
        });
    })

    function getScoresData($) {
        var results = { thead: [], tbody: [] };
        $('table[class=datelist] tr').each(function(i, ele) {
            var $ele = cheerio.load(ele);
            var data = [$ele('td').eq(0).text(), //学年
                $ele('td').eq(1).text(), //学期
                $ele('td').eq(2).text(), //等级考试名称
                $ele('td').eq(3).text(), //准考证号
                $ele('td').eq(4).text(), //考试日期
                $ele('td').eq(5).text(), //成绩
            ];
            if (i == 0) {
                results.thead = data;
            } else {
                results.tbody.push(data);
            }
        });
        return results;
    }
}

Spider.prototype.getStatistics = function(callback) {
    console.log('getStatistics');
    var results = {
        unfinishedLessionsScores: {},
        creditStatistics: {}
    }

    var queryUrl = url.format({
        "protocol": "http",
        "host": entryHost,
        "pathname": this.cookie + "/xscjcx.aspx",
        "query": {
            "xh": this.username,
            "gnmkdm": "N121604"
        }
    });
    request({
        url: queryUrl,
        encoding: null,
        headers: {
            Referer: url.format({
                "protocol": "http",
                "host": entryHost,
                "pathname": this.cookie + "/xs_main.aspx",
                "query": {
                    "xh": this.username,
                    "type": 1
                }
            })
        }
    },function(err, res, body){
        if (err) { return console.error(err) };
        var $ = cheerio.load(resolveGB2312Html(body));
        var viewState = $('input[name=__VIEWSTATE]').attr('value');
        results.unfinishedLessionsScores = {
            title: '至今仍未完成的课程',
            type: "table",
            data: getUnfinishedLessionsScoresData($)
        }
        request.post({
            url: queryUrl,
            encoding: null,
            headers: {
                Referer: queryUrl
            },
            form: {
                __EVENTTARGET: '',
                __EVENTARGUMENT: '',
                __VIEWSTATE: viewState,
                hidLanguage: '',
                Button1: '%B3%C9%BC%A8%CD%B3%BC%C6',
                ddlxn: '',
                ddlxq: '',
                btnCx: '',
            }
        } , function(err, res, body){
            if(err) { return console.error(err) }
            var $ = cheerio.load(resolveGB2312Html(body));
            results.creditStatistics = getTotalCreditStatistics($);
            callback(results);
        });
    });

    function getUnfinishedLessionsScoresData($) {
        var results = { thead: [], tbody: [] };
        $('table[class=datelist] tr').each(function(i, ele) {
            var $ele = cheerio.load(ele);
            var data = [$ele('td').eq(1).text(), //课程名称
                $ele('td').eq(3).text(), //学分
                $ele('td').eq(4).text(), //最高成绩
            ];
            if (i == 0) {
                results.thead = data;
            } else {
                results.tbody.push(data);
            }
        });
        return results;
    }
    function getTotalCreditStatistics($) {
        var results = {
            title: '学分统计',
            total: '',
            data: { thead: [], tbody: [] },

        }
        results.total = $('#xftj b').html();

        $('#Datagrid2 tr').each(function(i, ele) {
            var $ele = cheerio.load(ele);
            var data = [$ele('td').eq(0).text(), //课程性质
                $ele('td').eq(1).text(), //学分要求
                $ele('td').eq(2).text(), //获取学分
                $ele('td').eq(3).text(), //未通过学分
                $ele('td').eq(4).text(), //还需学分
            ];
            if (i == 0) {
                results.data.thead = data;
            } else {
                results.data.tbody.push(data);
            }
        });
        return results;
    }
}

/**
 * BG2312
 * @author: DoliaWu
 *
 */
function resolveGB2312Html(buffer) {
    var bufferHelper = new BufferHelper();
    bufferHelper.concat(buffer);
    return iconv.decode(bufferHelper.toBuffer(), 'gb2312').toString();//字符转码
}

module.exports = Spider;
