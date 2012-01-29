function getOption(opts, param, def) {
    var result = opts[param]
    if (!result) {
        result = def
    }

    return result
}

function diff (before, after, onAdded, onRemoved) {
	var added = []
	var removed = before.slice() // copy array
	for (var i=0; i < after.length; i++) {
		
		var match = undefined
		
		for (var j=0; j < removed.length; j++) {
			
			if (after[i] == removed[j]) {
				match = j
				break
			}
			
		}
		
		if (match == undefined) {
			added.push(after[i])
		} else {
			removed.splice(match, 1)
		}
		
		
	}
	
	
	for (var i=0; i < added.length; i++) {
		onAdded(added[i])
	}
	
	for (var i=0; i < removed.length; i++) {
		onRemoved(removed[i])
	}
	
}

process.title = "loadb"

var winston = require('winston');

function ConfigurationHandler (onConfigurationAdded, onConfigurationRemoved) {
	this.ids = []
	this.onConfigurationAdded = onConfigurationAdded
	this.onConfigurationRemoved = onConfigurationRemoved
}

ConfigurationHandler.prototype.handleChildren = function(ids, retrieveConfig) {
	var oldIds = this.ids 
	var onConfigurationAdded = this.onConfigurationAdded
	var onConfigurationRemoved = this.onConfigurationRemoved
	
	diff(oldIds, ids, 
		function (id) {
			retrieveConfig(id, function (data) {
				onConfigurationAdded(id, data)
			})
		},
		onConfigurationRemoved)
		
	this.ids = ids
	
}

function ZkClient (address, handler) {
	winston.info("Going to connect to the ZooKeeper '" + zkAddress + "'")
	var ZooKeeper = require("zookeeper")
	
	this.zk = new ZooKeeper({
	    connect: zkAddress
	    , timeout: 200000
	    , debug_level: ZooKeeper.ZOO_LOG_LEVEL_WARNING
	    , host_order_deterministic: false
	})
	
	this.handler = handler
	
}

ZkClient.prototype.start = function() {
	var zk = this.zk
	var handler = this.handler
	
	zk.connect(function (err) {
		if(err) throw err;
		
		loadConfig = function (path, callback) {
			winston.debug("Loading config from '" + path + "'")
			zk.a_get(path, function(type, state, path) {}, function(rc, error, stat, data) {
				if (rc == 0) {
					callback(JSON.parse(data))
				}
			})
		}

		childrenCallback = function (rc, err, children) {
			winston.debug("Children '" + children + "'")
			
			handler.handleChildren(children, function (id, callback) {
				loadConfig("/loadb/" + id, callback)
			})
		}
		
		watch = function (type, state, path) {
			winston.debug("znode at path '" + path + "' changed")

			zk.aw_get_children("/loadb", watch, childrenCallback)
		}

	    
		winston.info("ZooKeeper session established, id='" + zk.client_id + "'")
		
		zk.aw_get_children("/loadb", watch, childrenCallback)
		
	})
	
};

var httpProxy = require("http-proxy")
function LoadBalancer (port) {
	this.port = port
	this.servers = {}
	this.ids = []
	
}

LoadBalancer.prototype.addServer = function(id, serv) {
	this.servers[id] = serv
	this.ids.push(id)
}

LoadBalancer.prototype.removeServer = function(id) {
	winston.info("removed " + id)
	var matched = false
	for (var i=0; i < this.ids.length; i++) {
		if (this.ids[i] == id) {
			this.ids.splice(i, 1)
			matched = true
			break
		}
	}
	if (matched) {
		delete this.servers[id]
	} else {
		// todo handle error
	}
}

LoadBalancer.prototype.serve = function () {
	var self = this
	var server = httpProxy.createServer(function (req, res, proxy) {
		if (self.ids.length == 0) {
			winston.debug("No servers")
			
			res.writeHead(404, {'Content-Type': 'text/text'});
		  	res.end('\n\nNo servers registered to be proxied \n\n');
		  
			return
		}
		
		winston.debug("--------")
		for (k in self.servers) {
			var v = self.servers[k]
			var str = v["host"] + ":" + v["port"]
			winston.debug("server '" + k + "' : '" + str + "'")
		}
		winston.debug("--------")
		
		var id = self.ids.shift();

		var target = self.servers[id]
		
		winston.debug("proxying host '" + target["host"] + "' port '" + target["port"] + "'")

		proxy.proxyRequest(req, res, target);

		self.ids.push(id);

	})
	
	server.listen(this.port)
	
}


winston.info("---- welcome to loadb ---")

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

var lb = new LoadBalancer(port)

var config = new ConfigurationHandler(function (id, data) {
	winston.debug("Added new configuration with id '" + id +"' and data '" + JSON.stringify(data) + "'")
	
	lb.addServer(id, data)
},
function (id) {
	winston.info("removed configuration with id '%s'", id)
	
	lb.removeServer(id)
}
)

new ZkClient(zkAddress, config).start()
lb.serve()
