var express = require('express');
var cookieParser = require('cookie-parser');

var app = express();

app.use(cookieParser());

app.get('/', function(req, res, next){
    //cookie 생성
    res.cookie('mycookie', 'set cookie');
    res.cookie('hello', 0);
    res.end("hello");
})

app.get('/check', function(req, res, next){
    //생성된 cookie 읽기
    res.setHeader('Content-Type', 'text/html');
    res.write('<p>cookie value: ' + req.cookies + '</p>');
    res.end();
    console.log(req.cookies);
})

app.get('/change', function(req, res, next){
    //쿠키 값 변경
    res.cookie('mycookie', 'hello');
    res.end();
})

app.listen(3000, () => {
    console.log("app is running on 3000 port");
})