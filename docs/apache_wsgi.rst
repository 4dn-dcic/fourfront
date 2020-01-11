# previously, mpm_prefork was used by default:
# LoadModule mpm_prefork_module modules/mod_mpm_prefork.so

# load to get directives when on `/server-info`
LoadModule info_module modules/mod_info.so
<Location "/server-info">
    SetHandler server-info
</Location>

# change to mpm_event. Similar to mpm_worker
# https://modwsgi.readthedocs.io/en/develop/user-guides/processes-and-threading.html#the-unix-worker-mpm
LoadModule mpm_event_module modules/mod_mpm_event.so
ServerLimit 6
StartServers 3
ThreadsPerChild 25
MaxRequestWorkers 150
MaxSpareThreads 100
MinSpareThreads 50
MaxConnectionsPerChild 5000
Timeout 75
KeepAlive On
# KeepAliveTimeout changed from 75 to 15
KeepAliveTimeout 15
MaxKeepAliveRequests 1000
