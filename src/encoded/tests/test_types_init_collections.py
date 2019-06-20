import pytest
pytestmark = [pytest.mark.setone, pytest.mark.working, pytest.mark.schema]


@pytest.fixture
def genomic_region_w_onlyendloc(testapp, lab, award):
    item = {
        "genome_assembly": "dm6",
        "end_coordinate": 3,
        'award': award['@id'],
        'lab': lab['@id']
    }
    return testapp.post_json('/genomic_region', item).json['@graph'][0]


@pytest.fixture
def dt4genomic_regions(genomic_region_w_onlyendloc, some_genomic_region, basic_genomic_region,
                       vague_genomic_region, vague_genomic_region_w_desc):
    return {
        'dm6': genomic_region_w_onlyendloc,
        'GRCh38:1:17-544': some_genomic_region,
        'GRCh38': basic_genomic_region,
        'GRCm38:5': vague_genomic_region,
        'gene X enhancer': vague_genomic_region_w_desc
    }


@pytest.fixture
def targets(target_w_desc, target_w_region, target_w_genes):
    return {'target_w_desc': target_w_desc,
            'target_w_region': target_w_region,
            'target_w_genes': target_w_genes
            }


def test_calculated_target_summaries(testapp, targets):
    for name in targets:
        summary = targets[name]['target_summary']
        if name == 'target_w_genes':
            assert summary == 'Gene:eeny,meeny'
        if name == 'target_w_regions' in targets:
            assert summary == 'GRCh38:X:1-3'
        if name == 'target_w_desc':
            assert summary == 'no target'


@pytest.fixture
def protocol_data(lab, award):
    return {
        'lab': lab['@id'],
        'award': award['@id'],
        'protocol_type': 'Experimental protocol',
        'description': 'Test Protocol'
    }


@pytest.fixture
def protocol_w_attach(testapp, protocol_data, attachment):
    protocol_data['attachment'] = attachment
    return testapp.post_json('/protocol', protocol_data).json['@graph'][0]


def test_document_display_title_w_attachment(testapp, protocol_data, attachment):
    protocol_data['attachment'] = attachment
    del(protocol_data['protocol_type'])
    res = testapp.post_json('/document', protocol_data).json['@graph'][0]
    assert res.get('display_title') == 'red-dot.png'


def test_document_display_title_wo_attachment(testapp, protocol_data):
    from datetime import datetime
    del(protocol_data['protocol_type'])
    res = testapp.post_json('/document', protocol_data).json['@graph'][0]
    assert res.get('display_title') == 'Document from ' + str(datetime.now())[:10]


def test_organism_display_title_standard_scientific_name(testapp, human_data):
    res = testapp.post_json('/organism', human_data).json['@graph'][0]
    assert res.get('display_title') == 'H. sapiens'


def test_organism_display_title_three_part_scientific_name(testapp, human_data):
    human_data['scientific_name'] = 'Drosophila pseudoobscura pseudoobscura'
    res = testapp.post_json('/organism', human_data).json['@graph'][0]
    assert res.get('display_title') == 'D. pseudoobscura pseudoobscura'


def test_organism_display_title_one_part_scientific_name(testapp, human_data):
    human_data['scientific_name'] = 'george'
    res = testapp.post_json('/organism', human_data).json['@graph'][0]
    assert res.get('display_title') == 'george'


def test_organism_display_title_no_scientific_name(testapp, human_data):
    del(human_data['scientific_name'])
    res = testapp.post_json('/organism', human_data).json['@graph'][0]
    assert res.get('display_title') == 'human'


def test_protocol_display_title_w_attachment(testapp, protocol_data, attachment):
    res = testapp.post_json('/protocol', protocol_data).json['@graph'][0]
    assert res.get('display_title').startswith('Experimental protocol')
    patched = testapp.patch_json(res['@id'], {'attachment': attachment}).json['@graph'][0]
    assert patched.get('display_title') == 'red-dot.png'


def test_protocol_display_title_w_title(testapp, protocol_data, attachment):
    protocol_data['attachment'] = attachment
    res = testapp.post_json('/protocol', protocol_data).json['@graph'][0]
    assert res.get('display_title') == 'red-dot.png'
    patched = testapp.patch_json(res['@id'], {'title': 'The best method'}).json['@graph'][0]
    assert patched.get('display_title') == 'The best method'


def test_protocol_display_title_wo_attachment(testapp, protocol_data):
    from datetime import datetime
    protocol = testapp.post_json('/protocol', protocol_data).json['@graph'][0]
    assert protocol['display_title'] == 'Experimental protocol from ' + str(datetime.now())[:10]


def test_protocol_other_display_title_wo_attachment(testapp, protocol_data):
    from datetime import datetime
    protocol_data['protocol_type'] = 'Other'
    protocol = testapp.post_json('/protocol', protocol_data).json['@graph'][0]
    assert protocol['display_title'] == 'Protocol from ' + str(datetime.now())[:10]


@pytest.fixture
def google_analytics_tracking_data():
    return {
        "status": "released",
        "tracking_type": "google_analytics",
        "google_analytics": {
            "reports": {
                "views_by_experiment_set": [
                    {
                        "ga:productCategoryLevel2": "ExperimentSetReplicate",
                        "ga:productName": "4DNESKSPBI9A",
                        "ga:productListClicks": 1,
                        "ga:productListViews": 21,
                        "ga:productSku": "4DNESKSPBI9A",
                        "ga:productDetailViews": 4,
                        "ga:productBrand": "Chuck Murry, UW"
                    }
                ],
                "fields_faceted": [
                    {
                        "ga:users": 12,
                        "ga:totalEvents": 19,
                        "ga:sessions": 13,
                        "ga:dimension3": "experiments_in_set.experiment_type.display_title"
                    },
                    {
                        "ga:users": 13,
                        "ga:totalEvents": 16,
                        "ga:sessions": 15,
                        "ga:dimension3": "experiments_in_set.biosample.biosource.individual.organism.name"
                    }
                ],
                "views_by_file": [
                    {
                        "ga:productCategoryLevel2": "FileProcessed",
                        "ga:productName": "4DNFIC2XS1Y3.mcool",
                        "ga:productListClicks": 0,
                        "ga:productListViews": 0,
                        "ga:productSku": "4DNFIC2XS1Y3",
                        "ga:productDetailViews": 1,
                        "ga:productBrand": "Erez Lieberman Aiden, BCM"
                    }
                ]
            },
            "for_date": "2019-05-09",
            "date_increment": "daily"}
    }


@pytest.fixture
def google_analytics(testapp, google_analytics_tracking_data):
    return testapp.post_json('/tracking_item', google_analytics_tracking_data).json['@graph'][0]


@pytest.fixture
def download_tracking_item_data():
    return {
        "status": "released",
        "tracking_type": "download_tracking",
        "download_tracking": {
            "geo_country": "NL",
            "geo_city": "Utrecht, Provincie Utrecht",
            "request_path": "/files-processed/4DNFI6BTR1IC/@@download/4DNFI6BTR1IC.pairs.gz.px2",
            "user_uuid": "anonymous",
            "user_agent": "Wget/1.17.1 (linux-gnu)",
            "remote_ip": "192.87.138.11",
            "file_format": "pairs_px2",
            "filename": "4DNFI6BTR1IC.pairs.gz.px2",
            "experiment_type": "in situ Hi-C"
        }
    }


@pytest.fixture
def download_tracking(testapp, download_tracking_item_data):
    return testapp.post_json('/tracking_item', download_tracking_item_data).json['@graph'][0]


@pytest.fixture
def jupyterhub_session_tracking_data():
    return {
        "status": "in review by lab",
        "tracking_type": "jupyterhub_session",
        "jupyterhub_session": {
            "date_initialized": "2019-05-09T05:11:56.389876+00:00",
            "date_culled": "2019-05-09T06:21:54.726782+00:00",
            "user_uuid": "e0beacd7-225f-4fa8-81fb-a1856603e204"
        },
        "uuid": "ff4575d4-67b4-458f-8b1c-b3fcb3690ce9",
    }


@pytest.fixture
def jupyterhub_session(testapp, jupyterhub_session_tracking_data):
    return testapp.post_json('/tracking_item', jupyterhub_session_tracking_data).json['@graph'][0]


def test_tracking_item_display_title_google_analytic(google_analytics):
    assert google_analytics.get('display_title') == 'Google Analytics for 2019-05-09'


def test_tracking_item_display_title_download(download_tracking):
    from datetime import datetime
    assert download_tracking.get('display_title') == 'Download Tracking Item from ' + str(datetime.now())[:10]


def test_tracking_item_display_title_other(jupyterhub_session):
    from datetime import datetime
    assert jupyterhub_session.get('display_title') == 'Tracking Item from ' + str(datetime.now())[:10]


@pytest.fixture
def vendor_data(lab, award):
    return {"title": "WorTHington Biochemical", 'lab': lab['@id'], 'award': award['@id']}


def test_vendor_update_name_no_caps(testapp, vendor_data):
    res = testapp.post_json('/vendor', vendor_data, status=201)
    assert res.json['@graph'][0]['name'] == "worthington-biochemical"


def test_vendor_update_name_no_punctuation_or_space(testapp, vendor_data):
    vendor_data['title'] = "Eeny, = Meeny!  # -miny?"
    res = testapp.post_json('/vendor', vendor_data, status=201)
    assert res.json['@graph'][0]['name'] == "eeny-meeny-miny"


def test_vendor_name_updates_on_patch(testapp, vendor_data):
    res = testapp.post_json('/vendor', vendor_data, status=201)
    assert res.json['@graph'][0]['name'] == "worthington-biochemical"
    res = testapp.patch_json(res.json['@graph'][0]['@id'], {'title': 'WaHoo'}, status=200)
    assert res.json['@graph'][0]['name'] == "wahoo"


@pytest.fixture
def vendor_data_alias(lab, award):
    return {
        'title': 'Wrong Alias Biochemical',
        'lab': lab['@id'],
        'award': award['@id'],
        'aliases': ['my_lab:this_is_correct_one',
                    'my_lab:this/is_wrong',
                    'my_lab:this\is_wrong_too']}


def test_vendor_alias_wrong_format(testapp, vendor_data_alias):
    res = testapp.post_json('/vendor', vendor_data_alias, status=422)
    response = res.json
    print(res.json)
    assert response['status'] == 'error'
    assert response['code'] == 422
    problematic_aliases = 0
    for an_error in response['errors']:
        if an_error['name'].startswith('Schema: aliases'):
            problematic_aliases += 1
    assert problematic_aliases == 2


def test_genomic_region_display_title(testapp, dt4genomic_regions):
    for dt, region in dt4genomic_regions.items():
        assert region.get('display_title') == dt


def test_image_unique_key(registry, image_data):
    from encoded.types.image import Image
    uuid = "0afb6080-1c08-11e4-8c21-0800200c9a44"
    image = Image.create(registry, uuid, image_data)
    keys = image.unique_keys(image.properties)
    assert 'red-dot.png' in keys['image:filename']
