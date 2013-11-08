Node Listener
=============

A HTTP Server that listens out for one or more Arduino's over serial communications.

It serves a static HTML page that uses Socket.IO to communicate back to the server without needing page refreshes. The static page displays the readings from the Arduino's sensors (passed in JSON format) in tabular and charted formats.

Designed to run on multiple platforms as long as node-serialport can be compiled and the appropriate serial port(s) identified.

Issues
------


Ideas
-----

* Calculate elapsed time between updates
	* If elapsed time too long, restart the serial connection
* Save the data
	* Absolute Max/Min
	* Daily Max/Min
	* Replay the data on connect from browser
* Email on:
	* Battery low
	* Nothing from Ard after n min
	* Temp low/high
* Email commands in
* Add comments e.g. note where sensor is, notes

	* from web interface
* Multiple sensors
	* each in separate server
	* master server?
* Add to Arduino code
	* Inbound commands
		* Speed up/slow down readings
	* Id for the Arduino (so can use mutiple)
	* SLEEP to reduce battery/power consumption
		* Will this work with bluetooth?
	* Alternate wireless types
		* 2.4GHz
		* 433MHz

Libraries Used (*=std node)
---------------------------

1.  supervisor - Keeps things running
2.  serialport - Talk to Arduino(s)
3.  socket.io - Pi<->Browser, no page refresh needed
4.  express - HTTP server
5.  jade - HTML templating
6.  localStorage - store data in a file
7.  json-storage - extends localStorage
8.  underscore - JS Utility functions
9.  mailparser - Understand the structure of an email
10. imap - Recieve email from GMail (using secure connect)
11. nodemailer - Send email via GMail (using secure connect)
12. winston - advanced logging
13. moment - time fns - http://momentjs.com/docs/
14. child_process* - enable exec of cmd line app, capture output

Structure - server.js
---------------------

* Autostart on reboot
	* /etc/rc.local -> /home/pi/node/NodeListener1/start.sh

Structure - server.js
---------------------

1. Setup
    1. Create HTTP(s) server
    2. Create Socket connection
    3. Create Serial Port connection(s)

2. On Serial Port recieve
	1. Get timestamp
	1. Get Pi Temp & pass to Socket
	2. Pass data to Socket
	3. Parse data as JSON
		1. Add timestamp
		2. Save to raw data
		3. Check for new max/min
		4. Is this a new day?
			1. Yes
				1. Create new saved day
				2. Update with new max/min
			2. No
				1. Check for new max/min
		5. Save the day

3. On Socket Connect
	1. Check for saved data - if available, send to socket
	2. Set up listners for arduino and PiTemp


Arduino Data
------------
{
	loopcount
	time (ms since start, will reset after around 70d)
	humidity (%)
	temperature (oC)
	battery (V)
	dewPoint (oC)*
	light
	motion
	uid (ID of arduino)*
	timestamp (UNIX time of reciept of this loop)*
	loopTime (sec since last loop)*
	timeStr (as timestamp but in text format)
}
* = Set by Node.js not by Arduino

Pi Data
-------
PiTemp (oC, temperature of Pi CPU)
