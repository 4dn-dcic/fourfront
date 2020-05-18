from ..deploy_beanstalk import parse


SAMPLE_COMMIT = '''commit bc061fc755015162741eec71f1a71ea6c3fdb786
Author: j1z0 <jeremy_johnson@hms.harvard.edu>
Date:   Thu Sep 22 22:23:54 2016 -0400

    we need .aws for both master and production
'''


def test_parse_git_commit():
    author = "j1z0 <jeremy_johnson@hms.harvard.edu>"
    msg = "we need .aws for both master and production"
    expected = "%s - %s" % (author, msg)
    actual = parse(SAMPLE_COMMIT)

    assert actual == expected
