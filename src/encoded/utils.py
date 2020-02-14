# utility functions

import datetime
import time


def compute_set_difference_one(s1, s2):
    """ Computes the set difference between s1 and s2 (ie: in s1 but not in s2)
        PRE: s1 and s2 differ by one element and thus their set
        difference is a single element

        :arg s1 (set(T)): super set
        :arg s2 (set(T)): subset
        :returns (T): the single differing element between s1 and s2.
        :raises: exception if more than on element is found
    """
    res = s1 - s2
    if len(res) > 1:
        raise RuntimeError('Got more than one result for set difference')
    return next(iter(res))


def find_other_in_pair(element, pair):
    """ Wrapper for compute_set_difference_one

        :arg element (T): item to look for in pair
        :arg pair (2-tuple of T): pair of things 'element' is in
        :returns (T): item in pair that is not element
        :raises: exception if types do not match or in compute_set_diferrence_one
    """
    return compute_set_difference_one(set(pair), {element})


def customized_delay_rerun(sleep_seconds=1):
    def parameterized_delay_rerun(*args):
        """ Rerun function for flaky """
        time.sleep(sleep_seconds)
        return True
    return parameterized_delay_rerun


delay_rerun = customized_delay_rerun(sleep_seconds=1)


def utc_today_str():
    return datetime.datetime.strftime(datetime.datetime.utcnow(), "%Y-%m-%d")
