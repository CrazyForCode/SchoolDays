$('.ui.accordion').accordion();
$('.ui.dropdown').dropdown();

var loginForm = $('#login-form');

loginForm.form({
	on: 'blur',
	inline: true,
    fields: {
      	username: {
	        identifier  : 'username',
	        rules: [{
	        	type   : 'empty',
	            prompt : '请输入学号'
	        },{
	        	type   : 'number',
	            prompt : '请输入数字'
	        }]
      	},
      	password: {
	        identifier  : 'password',
	        rules: [{
	            type   : 'empty',
	            prompt : '请输入密码'
	        }]
      	},
      	checkcode: {
	        identifier  : 'check-code',
	        rules: [{
	            type   : 'empty',
	            prompt : '请输入验证码'
	        }]
      	},
    }
});

function login() {
	if (loginForm.form('is valid')) {
		loginForm.addClass("loading");
		var scl = $('#school')
		var usr = $('#username')
		var pwd = $('#password')
		var code = $('#check-code')

		$.post("/login", {
			school: scl.val(),
			username: usr.val(),
			password: pwd.val(),
			checkCode: code.val()
		}, function(data, status) {
			loginForm.removeClass("loading");
			if (data.status == "success") {
				console.log('login successfully.');
				$('#login-panel').transition('fade down', {
					onComplete: loading
				});
			} else {
				code.val('');
				getCheckCode();
				loginForm.transition('shake');
			}
		})
	}
	function loading() {
		$('#spidering').transition('fade', {
			onComplete: spidering
		});
	}
	function spidering() {
		$.post("/spider", {}, function(data, status) {
			$('#content').html(data);
			$('#spidering').transition('fade', {
				onComplete: show
			});
		});
	}
	function show() {
		$('#content').transition('fade up');
	}
}

function getCheckCode() {
	var cookie = $.cookie('token');
	$('#check-code-image').attr('src', '/checkCode?time=' + new Date().getTime());
}
getCheckCode();