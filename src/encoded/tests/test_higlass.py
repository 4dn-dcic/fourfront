import pytest
pytestmark = pytest.mark.working

# Test HiGlass config view endpoints on fourfront.

# TODO stub/mock this function: get_higlass_tileset_info_from_file(new_file):

def test_higlass_noop(testapp):
    """ Test the python endpoint exists
    Given a viewconf and no experiments, the viewconf should remain unchanged.
    """

    # Get the Higlass Viewconf that will be edited.
    # Get the JSON.

    # Patch a request, passing in the current viewconf with no additional data.
    #response = testapp.patch_json(f'/higlass-viewconf{}')
    #target = res.json

    # Get the new json.
    # The viewconfig of both old and new files should be unchanged.
    pass

def test_add_bigwig_higlass(testapp):
    """ Given a viewconf with an mcool file, the viewconf should add a bigwig on top.
    """

    # Get the Higlass Viewconf that will be edited.
    # Get a bigwig file to add.

    # Patch a request, trying to add the bigwig to the existing viewconf.

    # Get the new json.

    # Make sure the bigwig has been added above the mcool file.
    pass

def test_add_bigwig_to_bigwig(testapp):
    """ Given a viewconf with a bigwig file, the viewconf should add a bigwig on top.
    """

    # Get the Higlass Viewconf that will be edited.
    # Get a bigwig file to add.

    # Patch a request, trying to add the bigwig to the existing viewconf.

    # Get the new json.

    # Make sure the bigwigs are stacked atop each other.
    pass

def test_add_mcool_to_mcool(testapp):
    """ Given a viewconf with a mcool file, the viewconf should add anohter mcool on the side.
    """

    # Get the Higlass Viewconf that will be edited.
    # Get a mcool file to add.

    # Patch a request, trying to add the mcool with a different genome assembly to the existing viewconf.
    # It should fail.

    # Patch a request, trying to add the mcool with the same genome assembly to the existing viewconf.

    # Get the new json.

    # Make sure the mcool displays are next to each other.
    pass

def test_add_multiple_mcool_one_at_a_time(testapp):
    """ Make sure you can add multiple mcool displays together, up to six.
    Eventually we'll see a 3 x 2 grid.
    """

    # Get the Higlass viewconf with an mcool display.
    # Add another mcool file.

    # Add the third mcool file. It should be to the right of the first.

    # Add the fourth mcool file. It should be underneath the second.

    # Add the fifth mcool file. It should be to the right of the fourth.

    # Add the sixth mcool file. It should be underneath the fifth.

    # Try to add a seventh mcool file. It should fail because there are six already.
    pass

def test_add_multiple_mcool_at_once(testapp):
    """ Make sure you can add multiple mcool displays together, up to six.
    Eventually we'll see a 3 x 2 grid.
    """

    # Get the Higlass viewconf with an mcool display.

    # Try to add 2 mcool files. Confirm there are now 3 mcool files.

    # Try to add 4 files. Only 3 should be added. There should be a warning stating only 3 were added.
    pass

def test_add_bigwig_to_multiple_mcool(testapp):
    """ With at least 2 mcool displays, try to add a bigwig.
    The bigwig should be atop the mcool displays.
    """
    # Get the Higlass viewconf with an mcool display.
    # Add another mcool file.

    # Add a bigwig file.
    # The bigwig file should be above the mcool displays.
    pass

def test_add_mcool_to_blank(testapp):
    """ Create a viewconf without any files.
    Make sure you can add multiple files to it.
    """

    # Create a blank viewconf.

    # Add 2 mcool files to the test app.

    # Confirm there are 2 files.
    pass
