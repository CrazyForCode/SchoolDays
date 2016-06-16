var cheerio = require('cheerio');
var request = require('request').defaults({jar: true});
var url = require('url');
var iconv = require('iconv-lite');
var readlineSync = require('readline-sync');
var BufferHelper = require('bufferhelper');
var fs = require('fs');


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
            RadioButtonList1: "%D1%A7%C9%FA",
            Button1: "",
            lbLanguage: "",
            hidPdrs: "",
            hidsc: ""
        },
        followAllRedirects: true
    }, function(err, res, body) {
        console.log(res.statusCode);
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
Spider.prototype.getCollegeExaminationScores = function(year, term, callback) {
    console.log('getCollegeExaminationScores');

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
        console.log(results);
        return results;
    }
}

// 获取等级考试成绩
Spider.prototype.getRankExaminationScores = function(callback) {
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
            title: '等级考试程序查询',
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

Spider.prototype.getExaminationInfo = function(callback) {
    request({
        url: 'http://kw.cqut.edu.cn/',
    }, function(err, res, body) {
        var dwrId;
        var window = { dwr : { _ : [{ handleCallback: function(a1, a2, a3) { dwrId = a3; } }] } };
        var formData = 'callCount=1\n\
c0-scriptName=__System\n\
c0-methodName=generateId\n\
c0-id=0\nbatchId=0\n\
instanceId=0\n\
page=%2Flogin.jsp\n\
scriptSessionId=\n\
windowName=\n';
  // console.log(formData)
        request.post({
            url: 'http://kw.cqut.edu.cn/dwr/call/plaincall/__System.generateId.dwr',
            form: formData
        }, function(err, res, body) {
            eval(body);
            // console.log(jar.getCookieString('http://kw.cqut.edu.cn'));
            // console.log(jar.getCookieString('http://kw.cqut.edu.cn').match(/^.*$/));
            // console.log(dwrId);
            var formData = "callCount=1\n\
windowName=c0-param0\n\
c0-scriptName=MyService\n\
c0-methodName=findMapByStudentExamQuery\n\
c0-id=0\n\
c0-e1=string:examStuDetaileID\n\
c0-e2=string:KCMC\n\
c0-e3=string:courseName\n\
c0-e4=string:startTime\n\
c0-e5=string:stopTime\n\
c0-e6=string:examClassRoomID\n\
c0-e7=string:examClassRoomNum\n\
c0-e8=string:LH\n\
c0-e9=string:semesterID\n\
c0-e10=string:XH\n\
c0-e11=string:XM\n\
c0-e12=string:campusCode\n\
c0-param0=array:[reference:c0-e1,reference:c0-e2,reference:c0-e3,reference:c0-e4,reference:c0-e5,reference:c0-e6,reference:c0-e7,reference:c0-e8,reference:c0-e9,reference:c0-e10,reference:c0-e11,reference:c0-e12]\n\
c0-param1=string:semesterID%3D'20150827161917445'%20and%20xh%3D'" + "11403080338" + "'%20and%20isPublish%3D1\n\
c0-param2=boolean:false\n\
c0-param3=string:startTime\n\
c0-param4=string:asc\n\
batchId=2\n\
instanceId=0\n\
page=%2FstudentExamQueryQuickManager.jsp%3FstudentOrTeacherID%3D11403080338\n\
scriptSessionId=" + dwrId + "/" + "6Q5poll-*0cRtF8ka\n\
";
            request({
                method: 'POST',
                url: 'http://kw.cqut.edu.cn/dwr/call/plaincall/MyService.findMapByStudentExamQuery.dwr',
                form: formData
            }, function(err, res, body) {
                var result;
                window.dwr._[0].handleCallback = function(a1, a2, a3) { result = a3; }
                eval(body);
                function fmt(a) {return a < 10 ? '0' + a : a}
                var final = result.map(function(exam) {
                    exam.time = exam.startTime.getFullYear() + '-'
                    + fmt(exam.startTime.getMonth()) + '-'
                    + fmt(exam.startTime.getDay()) +' (' + fmt(exam.startTime.getHours()) + ':' + fmt(exam.startTime.getMinutes()) + ' - '
                    + fmt(exam.stopTime.getHours()) + ':' + fmt(exam.stopTime.getMinutes()) + ')'
                    return exam;
                });
                console.log(final);
                callback(final);
            });
        });
    });
}

Spider.prototype.getUnfinishedLessions = function() {

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
