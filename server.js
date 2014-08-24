/*************************************
 //
 // dss-realtime app
 //
 **************************************/

var express = require('express'), http = require('http'), connect = require('connect'), bodyParser = require('body-parser'), session = require('express-session'), cookieParser = require('cookie-parser'), cookie_reader = require('cookie'), io = require('socket.io');

var app = express();
var sessionStore = new connect.session.MemoryStore();
var SITE_SECRET = 'I am not wearing any pants';
var SITE_KEY = 'express.sid';
app.use(bodyParser());
app.use(cookieParser(SITE_SECRET));
app.use(session({
    store: sessionStore,
    key: SITE_KEY,
    secret: SITE_SECRET
}));

var port = app.get('port') || 8001;

var server = http.createServer(app);
server.listen(port, function () {
    console.log("Express server listening on port " + port);
});

/**
 * Socket.io
 */
var sio = io.listen(server);
var sessions = {};
var clients = {};
sio.use(function ioSession(socket, next) {
    // create the fake req that cookieParser will expect
    var req = {
        "headers": {
            "cookie": socket.request.headers.cookie
        }
    };


    next();
});

sio.set('authorization', function (data, accept) {
    //create fake req object to pass to cookie parser
    if (data.headers.cookie) {
        data.cookie = cookie_reader.parse(data.headers.cookie);
        return accept(null, true);
    }
    return accept('error', false);
});

sio.sockets.on('connection', function (socket) {
    var hs = socket.handshake;

    var cookie = cookie_reader.parse(socket.handshake.headers.cookie);

    console.log('A socket with sessionID ' + cookie['sessionid'] + ' connected.');
    sessions[cookie['sessionid']] = socket.id;
    clients[socket.id] = socket;

    socket.on('disconnect', function () {
        delete clients[socket.id]; // remove the client from the array
    });

});

/**
 * Web Server
 */
app.use(express.static(__dirname + '/public'));

//set the view engine
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.get("/", function (req, res) {
    res.render('index', {});
});

app.post("/notification", function (req, res) {
    if (sessions[req.body.sessionid]) {
        console.log("Data is: " + req.body.message);
        clients[sessions[req.body.sessionid]].emit('notification', req.body);
        res.send(req.body);
    }else{
        console.log("Session with key " + req.body.sessionid + "not found");
        res.status(410).end();
    }
});
