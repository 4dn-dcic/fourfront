import pytest
pytestmark = [pytest.mark.working, pytest.mark.schema]


# data from test/datafixtures
def test_calculated_target_summaries(testapp, targets):
    for name in targets:
        summary = targets[name]['target_summary']
        short = targets[name]['target_summary_short']
        if name == 'target_w_genes':
            assert summary == 'eeny and meeny'
            assert short == 'eeny and meeny'
        if name == 'target_w_region' in targets:
            assert summary == 'GRCh38:X:1-3'
            assert short == 'no target'
        if name == 'target_w_desc':
            assert summary == 'no target'
            assert short == "I'm a region"
