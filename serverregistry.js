
function getOption(opts, param, def) {
    var result = opts[param]
    if (!result) {
        result = def
    }

    return result
}


var nopt = require("nopt")

var knownOpts = {
    "port": [Number]
    , "zoo": [String]
}

var shortHands = {
    "p": ["--port"]
    , "zk": ["--zoo"]
}

var opts = nopt(knownOpts, shortHands, process.argv, 2)

port = getOption(opts, "port", 80)
zkAddress = getOption(opts, "zoo", "localhost:2181")


var ZooKeeper = require("zookeeper")

var zk = new ZooKeeper({
    connect: zkAddress
    , timeout: 2000
    , debug_level: ZooKeeper.ZOO_LOG_LEVEL_WARNING
    , host_order_deterministic: false
})

var flow = require('flow')
var http = require('http')

var steps = flow.define(
	function () {
		
		zk.connect(this)
	},
	
	function (err) {
		if (err) {
			// handle
		}

		http.createServer(function (req, res) {
		  res.writeHead(200, {'Content-Type': 'text/text'});
		  res.end('\n\nHello World on port ' + port + '\n\n');
		}).listen(port);

		var config = {"host" : "localhost", "port" : port}

		zk.a_create ( "/loadb/server", JSON.stringify(config), ZooKeeper.ZOO_SEQUENCE | ZooKeeper.ZOO_EPHEMERAL, this)
	},
	
	function(rc, err, stat) {
		console.log("rs "  + rc + " err " + err + " stat "  + stat)
		
		if (rc == 0) {
			console.log("Registered at ZK")
		} else {
			console.log("fail")
		}
	}
)

steps()