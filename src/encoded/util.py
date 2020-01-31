# utility functions


def compute_set_difference_one(s1, s2):
    """ Computes the set difference between s1 and s2 (ie: in s1 but not in s2)
        PRE: s1 and s2 differ by one element and thus their set
        difference is a single element

        :arg s1: super set
        :arg s2: subset
        :returns: the single differing element between s1 and s2.
        :raises: exception if more than on element is found
    """
    res = s1 - s2
    if len(res) > 1:
        raise RuntimeError('Got more than one result for set difference')
    return next(iter(res))