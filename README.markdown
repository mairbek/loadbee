
Loadbee
=======

*Loadbee* is a simple http load balancer based on top of *node.js* that is integrated with coordination server (*Apache ZooKeeper*).

Such integration allows to register/unregister servers to be proxied by load balancer dynamically. 

How does it work?
-----------------

As precondition *Apache ZooKeeper* must be started and *znode* with path */loadb* should be present.

To start the server *node loadb.js -p 9000 -zk localhost:2181* should be executed. This will start server on port *9000*.

Next it will start working as an reverse http proxy and performing the load balancing according to the configuration stored in *ZooKeeper*.


Registering new server to be proxied is as simple as adding a *znode* in *ZooKeeper*. Unregister requires removal of *znode*. 

> Note: create ephemeral *znodes* to notify *loadb* if a server went down.


Try it
--------------

Clone repo

    git clone git://github.com/mairbek/loadbee.git

Start zookeeper

    zkServer.sh start

Install dependencies

    npm install

Run load balancer

    node loadb.js -p 9000

Try http request

    curl -i localhost:9000

See it returns 404 response

    No servers registered to be proxied  

Run sample servers

    node serverregistry.js -p 8000

    node serverregistry.js -p 8001


Try http request

    curl -i localhost:9000

See it returns 200 response

    HTTP/1.1 200 OK
    content-type: text/text
    connection: close
    transfer-encoding: chunked
    
    
    Hello World on port 8000
