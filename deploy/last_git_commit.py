#!/usr/bin/python
from parse import parse
import sys, zlib

raw_commit = sys.stdin.buffer.read()

commit = zlib.decompress(raw_commit).decode('utf-8').split('\x00')[1]
(headers, body) = commit.split('\n\n')

for line in headers.splitlines():
    # `{:S}` is a type identifier meaning 'non-whitespace', so that
    # the fields will be captured successfully.
    p = parse('author {name} <{email:S}> {time:S} {tz:S}', line)
    if (p):
        print("Author: {} <{}>\n".format(p['name'], p['email']))
        print(body)
        break
