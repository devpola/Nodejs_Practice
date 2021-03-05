var express = require('express');
var parseurl = require('parseurl');
var session = require('express-session');

var app = express();

app.use(session({
    secret: 'keyboard cat', //session을 임의로 변조하는 것을 방지하기 위한 sign값
    resave: false,          //세션을 언제나 저장할지(변경되지 않아도) 정하는 값
    saveUninitialized: true //uninitialized 세션이란, 새로 생겼지만 변경되지 않은 세션을 의미.
}));

app.use(function(req, res, next){
    if(!req.session.views){
        req.session.views = {};
    }
    //get the url pathname
    var pathname = parseurl(req).pathname;

    //count the views
    req.session.views[pathname] = (req.session.views[pathname] || 0) + 1;

    next();
});

app.get('/foo', function(req, res, next){
    res.end('you viewed this page ' + req.session.views['/foo'] + ' times');
});

app.get('/bar', function(req, res, next){
    res.end('you viewed this page ' + req.session.views['/bar'] + ' times');
})

app.listen(3000, () => {
    console.log('app is running on port 3000');
});