import pytest
from ..utils import compute_set_difference_one, find_other_in_pair


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


def test_find_other_in_pair():
    """ Tests the wrapper for the above function """
    assert find_other_in_pair(1, [1, 2]) == 2
    assert find_other_in_pair(2, [1, 2]) == 1
    lst = [1, 2, 3]
    val = [1, 2]
    with pytest.raises(TypeError):
        find_other_in_pair(val, lst)  # val is 'not single valued'
    val = 1
    with pytest.raises(TypeError):
        find_other_in_pair(val, None)  # no pair to compare to
    with pytest.raises(RuntimeError):  # too many results
        find_other_in_pair(None, lst)
