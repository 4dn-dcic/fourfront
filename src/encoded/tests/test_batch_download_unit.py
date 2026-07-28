"""ES-free unit tests for batch_download hardening.

Covers the CSV/TSV formula-injection neutralization (CWE-1236) added to the
manifest / report streaming paths in src/encoded/batch_download.py.
"""

import pytest

from ..batch_download import (
    neutralize_formula_injection,
    lookup_column_value,
    FORMULA_INJECTION_LEAD_CHARS,
)


pytestmark = [pytest.mark.working, pytest.mark.unit]


@pytest.mark.parametrize('lead', list(FORMULA_INJECTION_LEAD_CHARS))
def test_neutralize_prefixes_leading_formula_chars(lead):
    payload = lead + 'cmd|"/C calc"!A0'
    neutralized = neutralize_formula_injection(payload)
    assert neutralized == "'" + payload
    # A spreadsheet now sees a leading single quote, not a formula trigger.
    assert neutralized[0] == "'"
    assert neutralized[1] == lead


def test_lead_chars_are_the_documented_set():
    # Guardrail: the neutralized set matches the CWE-1236 trigger characters.
    assert FORMULA_INJECTION_LEAD_CHARS == ('=', '+', '-', '@')


@pytest.mark.parametrize('value', [
    'ENCSR000AAL',            # ordinary accession
    'RNA-seq',                # hyphen in the middle is fine
    'K562 cells',
    'released',
    '4DN',
    'https://example.org/x',
    'N/A',
    '0.42',
    '',                       # empty string is untouched
])
def test_safe_values_untouched(value):
    assert neutralize_formula_injection(value) == value


@pytest.mark.parametrize('value', [None, 0, 42, 3.14, ['=x'], {'a': 1}, True])
def test_non_string_values_untouched(value):
    assert neutralize_formula_injection(value) is value


def test_only_leading_char_matters():
    # Trigger chars later in the string are not a spreadsheet injection risk and
    # must be left alone to preserve data fidelity.
    assert neutralize_formula_injection('a=b+c') == 'a=b+c'
    assert neutralize_formula_injection('lab@example.org') == 'lab@example.org'


def test_double_neutralization_is_idempotent_on_already_quoted():
    # A value that already starts with a single quote is not a trigger char, so
    # it is left as-is (no double quoting).
    assert neutralize_formula_injection("'=already") == "'=already"


# --- report.tsv column extraction (output-parity of the bounded-field path) ---
# report_download now restricts the ES _source to exactly the column paths it
# renders. lookup_column_value is the function that reads those paths out of each
# embedded item, so these tests lock in that nested-column extraction behavior
# (unchanged by the field-bounding edit) and demonstrate it composes with the
# formula-injection neutralization applied to each rendered cell.

def test_lookup_column_value_nested_path():
    item = {
        'lab': {'display_title': 'Some Lab', '@id': '/labs/some-lab/'},
        'award': {'project': '4DN'},
    }
    assert lookup_column_value(item, 'lab.display_title') == 'Some Lab'
    assert lookup_column_value(item, 'award.project') == '4DN'


def test_lookup_column_value_object_yields_at_id():
    # A terminal embedded object is rendered as its @id.
    item = {'lab': {'display_title': 'Some Lab', '@id': '/labs/some-lab/'}}
    assert lookup_column_value(item, 'lab') == '/labs/some-lab/'


def test_lookup_column_value_list_dedup_join():
    # Array traversal is flattened, de-duplicated (order-preserving) and comma-joined.
    item = {'files': [
        {'file_format': {'display_title': 'fastq'}},
        {'file_format': {'display_title': 'pairs'}},
        {'file_format': {'display_title': 'fastq'}},  # duplicate collapses
    ]}
    assert lookup_column_value(item, 'files.file_format.display_title') == 'fastq,pairs'


def test_lookup_column_value_missing_path_is_empty():
    assert lookup_column_value({'a': {'b': 1}}, 'a.c') == ''
    assert lookup_column_value({}, 'x') == ''


def test_report_cell_pipeline_neutralizes_nested_malicious_value():
    # Simulate what report_download's generate_rows does per cell: extract via
    # lookup_column_value, then neutralize. A malicious nested display_title must
    # be rendered inert.
    item = {'lab': {'display_title': '=HYPERLINK("http://evil","clickme")'}}
    raw = lookup_column_value(item, 'lab.display_title')
    assert raw.startswith('=')
    assert neutralize_formula_injection(raw) == "'" + raw
