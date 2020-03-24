import os
import pytest
import setup_eb


def test_setup_eb():

    assert isinstance(setup_eb.PACKAGE_NAME, str)
    assert os.path.exists(os.path.join(setup_eb.ROOT_DIR, "src", setup_eb.PACKAGE_NAME))

    assert isinstance(setup_eb.AUTHOR, str)
    assert 'dcic' in setup_eb.AUTHOR.lower()
    assert '@' not in setup_eb.AUTHOR

    assert isinstance(setup_eb.AUTHOR, str)
    assert '@' in setup_eb.AUTHOR_EMAIL

    assert isinstance(setup_eb.URL, str)
    assert 'http://' in setup_eb.URL

    assert isinstance(setup_eb.LICENSE, str)
    assert setup_eb.LICENSE

    assert isinstance(setup_eb.README, str)
    assert '\n' in setup_eb.README

    assert isinstance(setup_eb.CHANGES, str)
    assert '\n' in setup_eb.CHANGES

    assert isinstance(setup_eb.LONG_DESCRIPTION, str)
    assert setup_eb.README in setup_eb.LONG_DESCRIPTION
    assert setup_eb.CHANGES in setup_eb.LONG_DESCRIPTION

    assert isinstance(setup_eb.DESCRIPTION, str)
    assert 'dcic' in setup_eb.DESCRIPTION.lower()

    assert isinstance(setup_eb.INSTALL_REQUIRES, list)
    assert all(isinstance(requirement, str) for requirement in setup_eb.INSTALL_REQUIRES)

    assert isinstance(setup_eb.INSTALL_REQUIRES, list)
    assert all(isinstance(requirement, str) for requirement in setup_eb.INSTALL_REQUIRES)

    assert isinstance(setup_eb.VERSION, str)
    assert setup_eb.VERSION[0].isdigit()


if __name__ == '__main__':

    # Because this file is not part of the files pytest would find, it has to be run
    try:
        test_setup_eb()
        print("Testing of setup_eb.py SUCCEEDED.")
    except Exception as e:
        print("Testing of setup_eb.py FAILED:", str(e))
