"""The type file for the collection Quality Metric."""
from snovault import (
    abstract_collection,
    # calculated_property,
    collection,
    load_schema,
)
# from pyramid.security import Authenticated
from .base import (
    Item,
    ALLOW_SUBMITTER_ADD,
    # lab_award_attribution_embed_list
)

"""OVERALL QAULITY SCORE INFO
All QC objects come with a field 'overall_quality_status', which is by default set to 'PASS'
For some qc object we don't have a current protocol to judge the overall quality based on the
fields in the qc item.
When there is a way to make this assesment, add this algorithm as a function to the corresponding
qc class, and update the value. If you implement it for a class with existing items, you will need
to trigger the update with empty patches."""


@abstract_collection(
    name='quality-metrics',
    acl=ALLOW_SUBMITTER_ADD,
    properties={
        'title': 'Quality Metrics',
        'description': 'Listing of quality metrics',
    })
class QualityMetric(Item):
    """Quality metrics class."""
    item_type = 'quality_metric'
    base_types = ['QualityMetric'] + Item.base_types
    schema = load_schema('encoded:schemas/quality_metric.json')
    embedded_list = Item.embedded_list  # + lab_award_attribution_embed_list


@collection(
    name='quality-metrics-fastqc',
    properties={
        'title': 'FastQC Quality Metrics',
        'description': 'Listing of FastQC Quality Metrics',
    })
class QualityMetricFastqc(QualityMetric):
    """Subclass of quality matrics for fastq files."""

    item_type = 'quality_metric_fastqc'
    schema = load_schema('encoded:schemas/quality_metric_fastqc.json')
    embedded_list = QualityMetric.embedded_list


@collection(
    name='quality-metrics-bamcheck',
    properties={
        'title': 'Bam Check Quality Metrics',
        'description': 'Listing of Bam Check Quality Metrics'
    })
class QualityMetricBamcheck(QualityMetric):
    """Subclass of quality matrics for bam files."""

    item_type = 'quality_metric_bamcheck'
    schema = load_schema('encoded:schemas/quality_metric_bamcheck.json')
    embedded_list = QualityMetric.embedded_list

    def _update(self, properties, sheets=None):
        qc_val = properties.get('quickcheck', '')
        overall = ''
        if not properties.get('overall_quality_status'):
            overall = 'WARN'
        elif qc_val == 'OK':
            overall = 'PASS'
        else:
            overall = 'FAIL'
        # set name based on what is entered into title
        properties['overall_quality_status'] = overall
        super(QualityMetricBamcheck, self)._update(properties, sheets)


@collection(
    name='quality-metrics-workflowrun',
    properties={
        'title': 'QC Quality metrics for Workflow Run',
        'description': 'Listing of QC Quality Metrics for Workflow Run.',
    })
class QualityMetricWorkflowrun(QualityMetric):
    """Subclass of quality matrics for Workflow run"""
    item_type = 'quality_metric_workflowrun'
    schema = load_schema('encoded:schemas/quality_metric_workflowrun.json')
    embedded_list = QualityMetric.embedded_list
