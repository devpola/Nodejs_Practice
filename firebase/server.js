const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
var cookieParser = require('cookie-parser');
var fs = require('fs');

//Cloud Firestore 초기화
var admin = require("firebase-admin");
var serviceAccount = require("../wsc-solutionchallenge-firebase-adminsdk-68gi6-f4eb7752e7.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

//Create our initial store
//테스트 참여자 수
db.collection("test").doc("user").set({ count: 0 });
//before, after test의 점수 분포
db.collection("test").doc("score").set({
    b0: 0, b1: 0, b2: 0, b3: 0,
    a0: 0, a1: 0, a2: 0, a3: 0,
    increase: 0
});


//middleware
app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.use(cookieParser());
app.use(express.static(__dirname + '/public'));

//set socket communication
io.on("connection", (socket) => {
    console.log("connected!!!");
});

//main page
app.get('/', function(req, res, next){
     //before test 여부 및 점수 체크하는 cookie 생성
     res.cookie('before', "none");
     res.json(result);
    fs.readFile('public/index.html', (error, data) => {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(data);
    });
});

//before test 제출 (POST)
app.post('/before', function(req, res, next){
    //이미 before, after test 모두 제출한 경우
    if(req.cookies.before === "done")
        io.emit('alreadyAll',"hello");

    //before test를 제출할 수 있는 경우(처음 제출하는 경우)
    else if(req.cookies.before === "none"){
        //답안지 받아옴(json으로 받아오면 될 듯!)
        var ans = [
            req.body.answer1, req.body.answer2, req.body.answer3
        ];
        var solution = ["정답","정답","정답"];
        //채점
        var result = 0;
        for(var i=0; i<3; i++){
            if(ans[i] === solution[i])
                result++;
        }
        console.log(result);

        //'before' cookie 채첨된 값으로 생성
        res.cookie('before', result);
        io.sockets.emit('completeBefore');
        res.json(result);
    }
 
    //이미 before test를 제출한 경우
    else
        io.sockets.emit('alreadyBefore');
})

//after test 제출 (POST)
app.post('/after', function(req, res, next){
    //이미 before, after test 모두 제출한 경우
    if(req.cookies.before === "done")
        io.sockets.emit('alreadyAll');

    //before test를 제출안하고 after test 제출하려고 하는 경우
    else if(req.cookies.before === "none")
        io.sockets.emit('goBefore');

    //after test를 제출할 수 있는 경우
    else{
        //답안지 받아옴
        var ans = [
            req.body.answer1, req.body.answer2, req.body.answer3
        ];
        var solution = ["정답","정답","정답"];

        //채점
        var result = 0;
        for(var i=0; i<3; i++){
            if(ans[i] === solution[i])
                result++;
        }
        //before, after test 점수 저장
        var beforeScore = req.cookies.before;
        var afterScore = result;
        console.log(beforeScore);
        console.log(afterScore);

        //before, after test 모두 제출했으므로, bofore cookie "done"으로 갱신
        res.cookie('before', "done");
        res.json(result);

        //update db test user count(1씩 증가)
        const userRef = db.collection("test").doc("user");
        userRef.update({
            count: admin.firestore.FieldValue.increment(1)
        });

        //점수분포 및 상승 여부 update
        updateScore(beforeScore, afterScore);

        //chart에 반영할 data 읽어오기
        getData();
    }
})
//점수분포 및 상승 여부 update
function updateScore(beforeScore, afterScore){
    //점수 분포 update
    const scoreIncrease = db.collection("test").doc("score");
    
    if(beforeScore == 0)
        scoreIncrease.update({ b0: admin.firestore.FieldValue.increment(1) });
    else if(beforeScore == 1)
        scoreIncrease.update({ b1: admin.firestore.FieldValue.increment(1) }); 
    else if(beforeScore == 2)
        scoreIncrease.update({ b2: admin.firestore.FieldValue.increment(1) });
    else if(beforeScore == 3)
        scoreIncrease.update({ b3: admin.firestore.FieldValue.increment(1) });

    if(afterScore == 0)
        scoreIncrease.update({ a0: admin.firestore.FieldValue.increment(1) });
    else if(afterScore == 1)
        scoreIncrease.update({ a1: admin.firestore.FieldValue.increment(1) }); 
    else if(afterScore == 2)
        scoreIncrease.update({ a2: admin.firestore.FieldValue.increment(1) });
    else if(afterScore == 3)
        scoreIncrease.update({ a3: admin.firestore.FieldValue.increment(1) });
   
    //점수의 상승이 있었을 때만 1씩 증가
    if(afterScore - beforeScore > 0){
        scoreIncrease.update({
            increase: admin.firestore.FieldValue.increment(1)
        });
    }
}

//user count data 읽어오기
async function getUserCount(){
    const userRef = db.collection("test").doc("user");
    const userDoc = await userRef.get();
    return userDoc.data();
}

//score count data 읽어오기
async function getScore(){
    const scoreRef = db.collection("test").doc("score");
    const scoreDoc = await scoreRef.get();
    return scoreDoc.data();
}

async function getData(){
    const userCount = await getUserCount();
    const score = await getScore();
    console.log(userCount);
    console.log(score);
    io.sockets.emit('completeAfter',{Count:userCount, Score:score});
}

server.listen(3000, () => {
    console.log("app is running on port 3000");
})

