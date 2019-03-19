import pytest
from encoded.types.gene import (
    fetch_gene_info_from_ncbi,
    get_gene_info_from_response_text,
    map_ncbi2schema,
)
pytestmark = [pytest.mark.working, pytest.mark.schema]


def test_get_gene_info_from_response_text_good_response():
    resp = ('<?xml version="1.0" encoding="utf-8"?>\n'
            '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" '
            '"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n'
            '<pre>tax_id\tOrg_name\tGeneID\tCurrentID\tStatus\tSymbol\tAliases\t'
            'description\tother_designations\tmap_location\tchromosome\t'
            'genomic_nucleotide_accession.version\tstart_position_on_the_genomic_accession\t'
            'end_position_on_the_genomic_accession\torientation\texon_count\tOMIM\t\n'
            '9606\tHomo sapiens\t10664\t0\tlive\tCTCF\tMRD21\tCCCTC-binding factor\t'
            'transcriptional repressor CTCF|11 zinc finger transcriptional repressor|'
            '11-zinc finger protein|CCCTC-binding factor (zinc finger protein)|'
            'CTCFL paralog\t16q22.1\t16\tNC_000016.10\t67562407\t67639185\tplus\t13\t604167\t</pre>')
    respdict = get_gene_info_from_response_text(resp)
    assert respdict.get('tax_id') == '9606'
    assert respdict.get('Aliases') == 'MRD21'
    assert respdict.get('orientation') == 'plus'
    assert respdict.get('OMIM') == '604167'


def test_get_gene_info_from_response_text_bad_pre():
    resp = ('<?xml version="1.0" encoding="utf-8"?>\n'
            '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" '
            '"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n'
            '<pre>tax_id\tOrg_name\tGeneID\tCurrentID\tStatus\tSymbol\tAliases\t'
            'description\tother_designations\tmap_location\tchromosome\t'
            'genomic_nucleotide_accession.version\tstart_position_on_the_genomic_accession\t'
            'end_position_on_the_genomic_accession\torientation\texon_count\tOMIM\t\n'
            '9606\tHomo sapiens\t10664\t0\tlive\tCTCF\tMRD21\tCCCTC-binding factor\t'
            'transcriptional repressor CTCF|11 zinc finger transcriptional repressor|'
            '11-zinc finger protein|CCCTC-binding factor (zinc finger protein)|'
            'CTCFL paralog\t16q22.1\t16\tNC_000016.10\t67562407\t67639185\tplus\t13\t604167\t</pr>')
    respdict = get_gene_info_from_response_text(resp)
    assert not respdict


def test_get_gene_info_from_response_text_error_from_ncbi():
    resp = ('<?xml version="1.0" encoding="utf-8"?>\n'
            '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" '
            '"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n'
            '<pre>tax_id\tOrg_name\tGeneID\tCurrentID\tStatus\tSymbol\tAliases\t'
            'description\tother_designations\tmap_location\tchromosome\t'
            'genomic_nucleotide_accession.version\tstart_position_on_the_genomic_accession\t'
            'end_position_on_the_genomic_accession\torientation\texon_count\tOMIM\t\n'
            ' Error occurred: cannot get document summary</pre>')
    respdict = get_gene_info_from_response_text(resp)
    assert not respdict


def test_get_gene_info_from_response_text_only_one_line():
    resp = ('<?xml version="1.0" encoding="utf-8"?>\n'
            '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" '
            '"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n'
            '<pre>tax_id\tOrg_name\tGeneID\tCurrentID\tStatus\tSymbol\tAliases\t'
            'description\tother_designations\tmap_location\tchromosome\t'
            'genomic_nucleotide_accession.version\tstart_position_on_the_genomic_accession\t'
            'end_position_on_the_genomic_accession\torientation\texon_count\tOMIM\t'
            ' Error occurred: cannot get document summary</pre>')
    respdict = get_gene_info_from_response_text(resp)
    assert not respdict


def test_get_gene_info_from_response_text_multiple_value_lines():
    resp = ('<?xml version="1.0" encoding="utf-8"?>\n'
            '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" '
            '"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n'
            '<pre>tax_id\tOrg_name\tGeneID\tCurrentID\tStatus\tSymbol\tAliases\t'
            'description\tother_designations\tmap_location\tchromosome\t'
            'genomic_nucleotide_accession.version\tstart_position_on_the_genomic_accession\t'
            'end_position_on_the_genomic_accession\torientation\texon_count\tOMIM\t\n'
            '9606\tHomo sapiens\t10664\t0\tlive\tCTCF\tMRD21\tCCCTC-binding factor\t'
            'transcriptional repressor CTCF|11 zinc finger transcriptional repressor|'
            '11-zinc finger protein|CCCTC-binding factor (zinc finger protein)|'
            'CTCFL paralog\t16q22.1\t16\tNC_000016.10\t67562407\t67639185\tplus\t13\t604167\t\n'
            ' Error occurred: cannot get document summary</pre>')
    respdict = get_gene_info_from_response_text(resp)
    assert not respdict


def test_fetch_gene_info_from_ncbi():
    geneid = '5885'  # human rad21
    # as of 2019-01-28
    syns = ['CDLS4', 'HR21', 'HRAD21', 'MCD1', 'MGS', 'NXP1', 'SCC1', 'hHR21']
    rad21 = {'Symbol': 'RAD21', 'tax_id': '9606', 'Status': 'live',
             'description': 'RAD21 cohesin complex component',
             'url': 'https://www.ncbi.nlm.nih.gov/gene/5885'}
    gene_info = fetch_gene_info_from_ncbi(geneid)
    for f, v in rad21.items():
        assert gene_info.get(f) == v
    aliases = gene_info.get('Aliases')
    for a in aliases:
        assert a in syns


class MockedResponse(object):
    def __init__(self, status, text):
        self.status_code = status
        self.text = text


def test_fetch_gene_info_from_ncbi_429_response(mocker):
    ''' mocking a bad ncbi response - because this sleeps it's slow'''
    geneid = '5885'  # human rad21
    with mocker.patch('encoded.types.gene.requests.get', side_effect=[MockedResponse(429, 'response')] * 5):
        result = fetch_gene_info_from_ncbi(geneid)
        assert not result


def test_fetch_gene_info_from_ncbi_200_bogus_response(mocker):
    ''' mocking a bad but 200 ncbi response'''
    geneid = '5885'  # human rad21
    with mocker.patch('encoded.types.gene.requests.get', return_value=MockedResponse(200, 'response')):
        result = fetch_gene_info_from_ncbi(geneid)
        assert not result


@pytest.fixture
def rad21_ncbi():
    return {'Symbol': 'RAD21', 'tax_id': '9606', 'Status': 'live',
            'description': 'RAD21 cohesin complex component',
            'url': 'https://www.ncbi.nlm.nih.gov/gene/5885',
            'chromosome': '8', 'genomic_nucleotide_accession.version': 'NC_000008.11',
            'Aliases': ['CDLS4', 'HR21', 'HRAD21', 'MCD1', 'MGS', 'NXP1', 'SCC1', 'hHR21']}


def test_map_ncbi2schema_all_present_plus_extra(rad21_ncbi):
    info = map_ncbi2schema(rad21_ncbi)
    assert len(info) == 6
    assert info.get('official_symbol') == rad21_ncbi.get('Symbol')
    assert info.get('organism') == rad21_ncbi.get('tax_id')
    assert info.get('fullname') == rad21_ncbi.get('description')
    assert info.get('url') == rad21_ncbi.get('url')
    assert len(info.get('synonyms')) == 8
    assert info.get('ncbi_entrez_status') == rad21_ncbi.get('Status')
    assert 'chromosome' not in info
    assert 'genomic_nucleotide_accession.version' not in info


def test_map_ncbi2schema_none_there():
    fake = {'A': 'RAD21', 'B': '9606', 'C': 'live',
            'D': 'RAD21 cohesin complex component'}

    info = map_ncbi2schema(fake)
    assert not info


def test_update_with_good_gene_id_post(testapp, human, rad21_ncbi, lab, award):
    geneid = '5885'  # human rad21
    # import pdb; pdb.set_trace()
    gene = testapp.post_json('/gene', {'geneid': geneid, 'lab': lab['@id'], 'award': award['@id']}).json['@graph'][0]
    assert gene.get('official_symbol') == rad21_ncbi.get('Symbol')
    assert gene.get('organism') == human.get('@id')
    assert gene.get('fullname') == rad21_ncbi.get('description')
    assert gene.get('url') == rad21_ncbi.get('url')
    assert len(gene.get('synonyms')) == 8
    assert gene.get('ncbi_entrez_status') == rad21_ncbi.get('Status')
    assert gene.get('preferred_symbol') == gene.get('official_symbol')


def test_update_post_with_preferred_symbol(testapp, human, rad21_ncbi, lab, award):
    geneid = '5885'  # human rad21
    gene = testapp.post_json('/gene', {'geneid': geneid, 'preferred_symbol': 'George', 'lab': lab['@id'], 'award': award['@id']}).json['@graph'][0]
    assert gene.get('official_symbol') == rad21_ncbi.get('Symbol')
    assert gene.get('preferred_symbol') == 'George'


def test_update_patch_with_preferred_symbol(testapp, human, rad21_ncbi, lab, award):
    geneid = '5885'  # human rad21
    gene = testapp.post_json('/gene', {'geneid': geneid, 'lab': lab['@id'], 'award': award['@id']}).json['@graph'][0]
    assert gene.get('official_symbol') == rad21_ncbi.get('Symbol')
    assert gene.get('preferred_symbol') == gene.get('official_symbol')
    upd = testapp.patch_json(gene['@id'], {'preferred_symbol': 'George'}).json['@graph'][0]
    assert upd.get('official_symbol') == rad21_ncbi.get('Symbol')
    assert upd.get('preferred_symbol') == 'George'


def test_update_post_with_bogus_geneid(testapp, lab, award):
    geneid = '999999999'
    missing_fields = ['official_symbol', 'preferred_symbol', 'ncbi_entrez_status',
                      'fullname', 'organism', 'url']
    gene = testapp.post_json('/gene', {'geneid': geneid, 'lab': lab['@id'], 'award': award['@id']}).json['@graph'][0]
    assert gene.get('geneid') == geneid
    assert 'lab' in gene
    assert 'award' in gene
    for mf in missing_fields:
        assert mf not in gene


def test_invalid_geneid(testapp, lab, award):
    geneid = '99999999999999'
    testapp.post_json('/gene', {'geneid': geneid, 'lab': lab['@id'], 'award': award['@id']}, status=422)
