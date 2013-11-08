var exec    = require('child_process').exec;

exec('cat /sys/class/thermal/thermal_zone0/temp',
    function(err, stdout, stderr) {
        console.log("Thermal", (parseInt(stdout)/1000).toFixed(2) );
    }
);
