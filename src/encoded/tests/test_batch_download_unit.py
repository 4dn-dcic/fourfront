"""ES-free unit tests for batch_download hardening.

Covers the CSV/TSV formula-injection neutralization (CWE-1236) added to the
manifest / report streaming paths in src/encoded/batch_download.py.
"""

import csv
import io

import pytest

from ..batch_download import (
    FORMULA_INJECTION_CONTROL_LEAD_CHARS,
    FORMULA_INJECTION_LEAD_CHARS,
    format_row,
    neutralize_formula_injection,
    lookup_column_value,
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
    assert FORMULA_INJECTION_CONTROL_LEAD_CHARS == ('\t', '\r', '\n')


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


def test_formula_chars_after_content_are_untouched():
    assert neutralize_formula_injection('a=b+c') == 'a=b+c'
    assert neutralize_formula_injection('lab@example.org') == 'lab@example.org'


@pytest.mark.parametrize('value', [
    ' =1+1',
    '\t=1+1',
    '\r\n@SUM(A1:A2)',
    '\v\f-2+2',
    '\x00\x7f+cmd',
])
def test_whitespace_and_control_prefixes_cannot_hide_formula(value):
    assert neutralize_formula_injection(value) == "'" + value


@pytest.mark.parametrize('value', ['\tplain', '\rplain', '\nplain'])
def test_dangerous_leading_controls_are_always_neutralized(value):
    assert neutralize_formula_injection(value) == "'" + value


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


def _parse_tsv_row(encoded_row):
    return next(
        csv.reader(io.StringIO(encoded_row.decode('utf-8')), delimiter='\t')
    )


@pytest.mark.parametrize('value', [
    'safe\t=1+1',
    'safe\r\n@SUM(A1:A2)',
    'contains "quotes"',
])
def test_format_row_quotes_delimiters_newlines_and_quotes(value):
    encoded = format_row(['fixed', neutralize_formula_injection(value), 'tail'])
    assert _parse_tsv_row(encoded) == ['fixed', value, 'tail']


def test_nested_and_missing_cells_preserve_column_parity():
    item = {
        'lab': {'display_title': '\t=HYPERLINK("https://evil")'},
    }
    paths = ['lab.display_title', 'award.project', 'missing']
    values = [
        neutralize_formula_injection(lookup_column_value(item, path))
        for path in paths
    ]

    parsed = _parse_tsv_row(format_row(values))

    assert len(parsed) == len(paths)
    assert parsed == [
        "'\t=HYPERLINK(\"https://evil\")",
        '',
        '',
    ]
