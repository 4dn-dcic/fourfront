import sys
import tempfile; tempfile.tempdir = '/tmp'
import pytest


if __name__ == '__main__':
    sys.exit(pytest.main())
