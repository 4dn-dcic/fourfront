import pytest
from encoded.util import compute_set_difference_one


pytestmark = pytest.mark.working


def test_compute_set_difference_one():
    """ Tests that our set difference utility function behaves correctly under various cases """
    s1 = {1, 2, 3, 4}
    s2 = {1, 2, 3}
    assert compute_set_difference_one(s1, s2) == 4
    s1 = {1, 2, 3, 4}
    s2 = {1, 2, 3, 4}
    with pytest.raises(StopIteration):
        compute_set_difference_one(s1, s2)
    with pytest.raises(StopIteration):
        compute_set_difference_one(s2, s1)
    s1 = {1, 2, 3, 4, 5, 6}
    s2 = {1, 2, 3, 4}
    with pytest.raises(RuntimeError):
        compute_set_difference_one(s1, s2)
    with pytest.raises(StopIteration):
        compute_set_difference_one(s2, s1)
    s1 = {1, 2}
    s2 = {1}
    assert compute_set_difference_one(s1, s2) == 2

