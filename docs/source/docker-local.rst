FF-Docker (Local)
=================

With Docker, it is possible to run a local deployment of FF without installing any system level
dependencies other than Docker. A few important notes on this setup.

* Although the build dependency layer is cached, it still takes around 4 minutes to rebuild the front-end for each image. This limitation is tolerable considering the local deployment now identically matches the execution runtime of production.
* This setup only works when users have sourced AWS Keys in the main account (to connect to the shared ES cluster).
* IMPORTANT: Do not upload the local deployment container image to any registry.


Installing Docker
^^^^^^^^^^^^^^^^^

Install Docker with (OSX assumed)::

    $ brew install docker


Configuring FF Docker
^^^^^^^^^^^^^^^^^^^^^

Use the ``prepare-docker`` command to configure ``docker-compose.yml`` and ``docker-development.ini``::

    poetry run prepare-docker -h
    usage: prepare-docker [-h] [--data-set {prod,test,local,deploy}]
                      [--load-inserts] [--run-tests]
                      [--s3-encrypt-key-id S3_ENCRYPT_KEY_ID]

    Prepare docker files

    optional arguments:
    -h, --help            show this help message and exit
    --data-set {prod,test,local,deploy}
                        the data set to use (default: local)
    --load-inserts        if supplied, causes inserts to be loaded (default: not
                        loaded)
    --run-tests           if supplied, causes tests to be run in container
                        (default: not tested)
    --s3-encrypt-key-id S3_ENCRYPT_KEY_ID
                        an encrypt key id (default: the empty string)

Building FF Docker
^^^^^^^^^^^^^^^^^^


There are two new Make targets that should be sufficient for normal use. To build the image locally, ensure your AWS keys are sourced and run::

    $ make build-docker-local  # runs docker-compose build
    $ make build-docker-local-clean  # runs a no-cache build, regenerating all layers
    $ make deploy-docker-local  # runs docker-compose up
    $ make deploy-docker-local-daemon  # runs services in background

The build will take around 10 minutes the first time but will speed up dramatically after due to layer caching. In general, the rate limiting step for rebuilding is the front-end build (unless you are also updating dependencies, which will slow down the build further). Although this may seem like a drawback, the key benefit is that what you are running in Docker is essentially identical to that which is orchestrated on ECS in production. This should reduce our reliance/need for test environments.

Accessing FF Docker at Runtime
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^


To access the running container::

    $ docker ps   # will show running containers
    $ docker exec -it <container_id_prefix> bash


Alternative Configuration with Local ElasticSearch
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

ElasticSearch is too compute intensive to virtualize on most machines. For this reason we use the FF test ES cluster for this deployment instead of spinning up an ES cluster in Docker. It is possible however to modify ``docker-compose.yml`` to spinup a local Elasticsearch. If your machine can handle this it is the ideal setup, but typically things are just too slow for it to be viable (YMMV).


Common Issues
^^^^^^^^^^^^^

Some notable issues that you may encounter include:

    * The NPM build may fail/hang - this can happen when Docker does not have enough resources. Try upping the amount CPU/RAM you are allocating to Docker.
    * Nginx install fails to locate GPG key - this happens when the Docker internal cache has run out of space and needs to be cleaned - see documentation on `docker prune <https://docs.docker.com/config/pruning/.>`_.


Docker Command Cheatsheet
^^^^^^^^^^^^^^^^^^^^^^^^^

Below is a small list of useful Docker commands for advanced users::

    $ docker-compose build  # will trigger a build of the local cluster (see make build-docker-local)
    $ docker-compose build --no-cache  # will trigger a fresh build of the entire cluster (see make build-docker-local-clean)
    $ docker-compose down  # will stop cluster (can also ctrl-c)
    $ docker-compose down --volumes  # will remove cluster volumes as well
    $ docker-compose up  # will start cluster and log all output to console (see make deploy-docker-local)
    $ docker-compose up -d  # will start cluster in background using existing containers (see make deploy-docker-local-daemon)
    $ docker-compose up -d -V --build  # trigger a rebuild/recreation of cluster containers
    $ docker system prune  # will cleanup ALL unused Docker components - BE CAREFUL WITH THIS
