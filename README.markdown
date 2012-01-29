

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


