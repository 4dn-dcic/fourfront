#!/bin/bash


# --------------------------------------------------------------------------------------------------------------------------------
# Cypress Browser Tests
# Boots up bin/dev-servers & bin/pserve with development.ini, waits for indexing to complete, then runs Cypress tests.
# Exits with exit code of `npm run cypress:test-local-recorded`, the Cypress test command.
#
# Below:
#   (1) Boot up bin/dev-servers in seperate process
#   (2) Feed them into '3' handle
#   (3) Block further script 
#   (4) Read lines (& print) off of '3' until see ...'experiment_seq (phase 2)'... and stop blocking, allowing script to continue
#       to boot up bin/pserve
#   (5) Repeat for bin/pserve command (using '4' handle) until detect indexing has completed.
# Possible ToDos:
#   (a) Change 'string to detect' (currently 2nd occurence of 'experiment_seq (phase 2)') if queuing changes any strings. If possible, have bin/dev-servers reliably print "ElasticSearch is Ready" to stdout.
#   (b) For PyTest tests, add command-line bool arg/fixture for "skip bootup of server fixtures" (passed in to postgresql_server,
#       elasticsearch_server, wsgi_server, ...) re-use these servers to decrease test time(s).
#   (c) Potentially use something like this for a logged-in-user token, though should be able to do within cypress itself:
#       CYPRESS_JWT_TOKEN=$(bin/py -c \"from base64 import b64decode; import jwt, json; print(  jwt.encode({'email':'<SOME_EMAIL>','email_verified':True,'aud':'$Auth0Client'}, b64decode('$Auth0Secret', '-_'), algorithm='HS256').decode('utf-8')  ) \")
#
# --------------------------------------------------------------------------------------------------------------------------------


exec 3< <(bin/dev-servers development.ini --app-name app --clear --init --load 2>&1)
db_server_pid=$!
count_exp_seq_seen=0
while read line; do
    case "$line" in
    *'experiment_seq (phase 2)'*)
        echo $line
        count_exp_seq_seen=$((count_exp_seq_seen+1))
        if [[ "$count_exp_seq_seen" -gt 1 ]]; then
        echo; echo
        echo "We've loaded all the testdatas. Starting webserver..."
        echo
        break
        fi
        ;;
    *)
        echo $line
        ;;
    esac
done <&3
sleep 5
exec 4< <(bin/py bin/pserve development.ini 2>&1)
web_server_pid=$!
while read line; do
    case "$line" in
    *"'indexing_finished'"*)
        echo $line; echo; echo
        echo "Databases & Webserver Ready; Test Data Loaded & Indexed. Starting Cypress Tests..."
        echo
        break
        ;;
    *)
        echo $line
        ;;
    esac
done <&4
sleep 30
npm run cypress:test-local-recorded
cypress_run_exit_code=$?
kill $web_server_pid
kill $db_server_pid
exit $cypress_run_exit_code
