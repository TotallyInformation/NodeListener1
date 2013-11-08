/* Listen for output from an Arduino on serial port
 * and echo to a web page via sockets
 */

// ---------- SETUP ---------- //
var socketPort = 3700; // also the port for http
var serialPort1 = '/dev/rfcomm0'; //'COM5';

// Include required libraries
// - misc -
var   exec   = require('child_process').exec
    , moment = require('moment');
//var storage = require('node-persist');
// underscore
var _ = require('underscore');
// - email -
// - persistant store -
// localStorage json-storage
// - http -
var express = require("express");
var app = express();
// - serial -
var serialport = require("serialport");
var SerialPort = serialport.SerialPort; // localize object constructor
// - logging -
var winston = require('winston');

// -- Set vars --
var prevTime = {}; // Records the timestamp of the loop, 1 entry for each Ard.

// Better logging (Levels=debug,info,warn,error)
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {'level': 'debug', 'silent': false, 'colorize': true, 'timestamp': false});

// create the HTTP server to deliver static pages only from the static folder
app.use(
    express.static(__dirname + '/static')
);

// Create a socket server
var io = require('socket.io').listen(app.listen(socketPort)); //app.listen(socketPort);
winston.info("Listening on port " + socketPort);

// initialise data store
//storage.initSync();

// Generic function to connect to a serial port
// The serial port object must be created separately and passed as the 1st param
// The 2nd param is informational only & used for logging
var connectArd = function(mySp, myPort) {
    winston.debug('Connecting Ard1' + _.identity(mySp));

    (mySp).open(function () {
        winston.info('Opening Serial Port ' + myPort);

        (mySp).on('data', fnOnData );

        /*
            (mySp).on('close', function(){
                winston.warn('Serial Port ' + myPort + ' CLOSED');
            });

            (mySp).on('error', function (err) {
                winston.error("sp error: ", err);
            });
        */
    });

}; // ---- End of function connectArd ----

// Called from serial port listener
// Might be called from several serial port listeners
// so code in here needs to handle that (mainly the prevTime loop variable)
var fnOnData = function ( data ) {

    // Get the temp of the Pi & emit
    exec('cat /sys/class/thermal/thermal_zone0/temp',
        function(err, stdout, stderr) {
            var PiTemp = parseInt(stdout, 10)/1000;
            winston.debug('PiTemp', PiTemp.toFixed(2) );
            if (err)  winston.debug(err);
            if (stderr)  winston.debug(err);
            io.emit('PiTemp', PiTemp.toFixed(2) );
            if (PiTemp > 60) exec('sudo /sbin/shutdown -hP now');
        }
    );

    // Attempt to parse the incoming message as JSON
    var obj = {};
    try {
        obj = JSON.parse( data );
    } catch (err) {
        // Invalid JSON, dump the data to the msg var
        obj["msg"] = data;
        obj["err"] = err;
    }

    // We need a unique id for the Arduino being read
    // If the data doesn't include this, make it up
    if (!obj.uid) obj["uid"] = "A0001";
    // Fix any missing items
    if (!obj.light) obj["light"] = "";
    if (!obj.motion) obj["motion"] = "";
    if (!obj.loopcount) obj["loopcount"] = "";
    if (!obj.humidity) obj["humidity"] = "";
    if (!obj.temperature) obj["temperature"] = "";
    if (!obj.battery) obj["battery"] = "";

    // record current realtime
    var nowTime = moment(); //new Date();
    // Do we have a previous time to compare against?
    if (!prevTime[obj.uid]) prevTime[obj.uid] = nowTime.valueOf();

    // Add timestamps
    obj["timeStamp"] = nowTime.valueOf();
    obj["loopTime"] = ((obj.timeStamp - prevTime[obj.uid]) / 1000).toFixed(3);
    obj["timeStr"] = nowTime.format("YYYY-MM-DD HH:mm:ss"); // ('en-GB', {weekday: "short", year: "numeric", month: "short", day: "numeric"});

    // Calculate the Dew Point in degrees Celcius
    var Tc = obj.temperature, RH = obj.humidity;
    obj["dewPoint"] = (243.04*(Math.log(RH/100)+((17.625*Tc)/(243.04+Tc)))/(17.625-Math.log(RH/100)-((17.625*Tc)/(243.04+Tc)))).toFixed(1);
    //243.04*(LN(RH/100)+((17.625*T)/(243.04+T)))/(17.625-LN(RH/100)-((17.625*T)/(243.04+T))) 
    //http://andrew.rsmas.miami.edu/bmcnoldy/Humidity.html

    // Save raw data
    //storage.setItem(nowTime.valueOf(),obj);
    //winston.info( "Store Length: ", storage.length().toString() );

    // Log it
    winston.debug(JSON.stringify(obj));

    // Send data to Socket.IO
    // NOTE: We are expecting data in JSON format
    //io.emit('arduino', JSON.stringify(obj) );
    io.emit('arduino', obj );

    // Save current time (for this uid in case we want to process several)
    prevTime[obj.uid] = obj.timeStamp;

}; // --- End of fnOnData --- //

// If we haven't recieved input after 2 minutes,
// restart the server (assumes that the server restarts automatically
// this just exits)
var checkSerial = function () {
    var nowTime = new Date(); //moment(); //
    if ( (nowTime - prevTime.A0001) > 2*60000 ) {
        winston.warn("Restarting server after 2 min inactivity on %s", serialPort1 );
        process.exit(1);
    }
};

// Set up the serial port
var sp1 = new SerialPort(serialPort1, {
    parser: serialport.parsers.readline("\r\n"),
    //parser: serialport.parsers.raw,
    baudrate: 9600,
    // defaults for Arduino serial communication
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowControl: false
}, false); // object container for the first serial port

connectArd(sp1, serialPort1);

// Set timer to see if any of the serial ports have failed
setInterval(checkSerial, 60000);

// Start a socket connection to/from the browser
io.set('log level', 0); // socket IO debug off
io.sockets.on('connection', function (socket) {
    // On start, emit some data
    socket.emit('msg', { msg: 'Starting' });
    // Listen for an event from the browser
    socket.on('browserMsg', function (data) {
        winston.debug("Msg From Browser: ", data);
        sp1.write(data);
    });
    // Listen for arduino data from the serial listener
    io.on('arduino', function (data) {
        //winston.debug('Socket Data: ' + data);
        // Send it to the browser
        socket.emit('arduino', { ardData: data });
    });
    // Listen for an update on Pi temp reading - pass to browser
    io.on('PiTemp', function (data) {
        // Send it to the browser
        socket.emit('PiTemp', { PiTemp : data });
    });
});
io.sockets.on('disconnect', function() {
    winston.warn('Socket Disconnected');
});



// Writing to the serial port:
//  sp.write("OMG IT WORKS\r");
// https://github.com/voodootikigod/node-serialport
