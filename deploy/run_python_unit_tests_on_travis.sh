#!/bin/bash
pip show pytest
pip install pytest==2.9.1
pip show pytest
bin/test -v -v -m "working and not setone" --durations=40 --cov src/encoded
