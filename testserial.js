// Node.js - Arduino Robot Listner
// Run with supervisor for ease

// Set up the serial port
var serialport = require("serialport");
var SerialPort = serialport.SerialPort; // localize object constructor
var portName = '/dev/rfcomm0'; //'/dev/ttyAMA0';

serialport.list(function (err, ports) {
    console.log("1", ports);
  ports.forEach(function(port) {
    console.log(port.comName);
    console.log(port.pnpId);
    console.log(port.manufacturer);
  });
  console.log("2");
});

// Set up the serial port
var sp = new SerialPort(portName, {
    parser: serialport.parsers.readline("\r\n"),
    //parser: serialport.parsers.raw,
    baudrate: 9600,
    // defaults for Arduino serial communication
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowControl: false
});

// Create a serial port listener
sp.on('open', function() {
    console.log('Serial Port ' + portName + ' Opened');
    // When data is on the serial port...
    sp.on('data', function (data) { // call back when data is received
        console.log(data);
    });
});

sp.on('close', function(){
    console.log('ARDUINO PORT CLOSED');
    //process.exit();
    //reconnectArd();
});

sp.on('error', function (err) {
    console.error("sp error: ", err);
    //process.exit();
    //reconnectArd();
});

// Writing to the serial port:
//  serialPort.write("OMG IT WORKS\r");
// https://github.com/voodootikigod/node-serialport
