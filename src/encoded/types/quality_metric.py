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
    lab_award_attribution_embed_list
)

"""OVERALL QAULITY SCORE INFO
All QC objects come with a field 'overall_quality_status', which is by default set to 'PASS'
For some qc object we don't have a current protocol to judge the overall quality based on the
fields in the qc item.
When there is a way to make this assesment, add this algorithm as a function to the corresponding
qc class, and update the value. If you implement it for a class with existing items, you will need
to trigger the update with empty patches."""


@collection(
    name='quality-metric-flags',
    properties={
        'title': 'Quality Metric Flags'
    })
class QualityMetricFlag(Item):
    """Quality Metrics Flag class."""

    item_type = 'quality_metric_flag'
    schema = load_schema('encoded:schemas/quality_metric_flag.json')
    embedded_list = ['award.project', 'quality_metrics.overall_quality_status']


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
    embedded_list = Item.embedded_list + lab_award_attribution_embed_list


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
    name='quality-metrics-bamqc',
    properties={
        'title': 'BamQC Quality Metrics',
        'description': 'Listing of BamQC Quality Metrics',
    })
class QualityMetricBamqc(QualityMetric):
    """Subclass of quality matrics for bam files."""

    item_type = 'quality_metric_bamqc'
    schema = load_schema('encoded:schemas/quality_metric_bamqc.json')
    embedded_list = QualityMetric.embedded_list


@collection(
    name='quality-metrics-pairsqc',
    properties={
        'title': 'PairsQC Quality Metrics',
        'description': 'Listing of PairsQC Quality Metrics',
    })
class QualityMetricPairsqc(QualityMetric):
    """Subclass of quality matrics for pairs files."""

    item_type = 'quality_metric_pairsqc'
    schema = load_schema('encoded:schemas/quality_metric_pairsqc.json')
    embedded_list = QualityMetric.embedded_list


@collection(
    name='quality-metrics-dedupqc-repliseq',
    properties={
        'title': 'Dedup QC Quality Metrics for Repli-seq',
        'description': 'Listing of Dedup QC Quality Metrics for Repli-seq',
    })
class QualityMetricDedupqcRepliseq(QualityMetric):
    """Subclass of quality matrics for repli-seq dedup."""

    item_type = 'quality_metric_dedupqc_repliseq'
    schema = load_schema('encoded:schemas/quality_metric_dedupqc_repliseq.json')
    embedded_list = QualityMetric.embedded_list


@collection(
    name='quality-metrics-chipseq',
    properties={
        'title': 'QC Quality Metrics for ChIP-seq',
        'description': 'Listing of QC Quality Metrics for ChIP-seq',
    })
class QualityMetricChipseq(QualityMetric):
    """Subclass of quality matrics for chip-seq"""

    item_type = 'quality_metric_chipseq'
    schema = load_schema('encoded:schemas/quality_metric_chipseq.json')
    embedded_list = QualityMetric.embedded_list


@collection(
    name='quality-metrics-atacseq',
    properties={
        'title': 'QC Quality Metrics for ATAC-seq',
        'description': 'Listing of QC Quality Metrics for ATAC-seq',
    })
class QualityMetricAtacseq(QualityMetric):
    """Subclass of quality matrics for atac-seq"""

    item_type = 'quality_metric_atacseq'
    schema = load_schema('encoded:schemas/quality_metric_atacseq.json')
    embedded_list = QualityMetric.embedded_list


@collection(
    name='quality-metrics-rnaseq',
    properties={
        'title': 'QC Quality Metrics for RNA-seq',
        'description': 'Listing of QC Quality Metrics for RNA-seq',
    })
class QualityMetricRnaseq(QualityMetric):
    """Subclass of quality matrics for rna-seq"""

    item_type = 'quality_metric_rnaseq'
    schema = load_schema('encoded:schemas/quality_metric_rnaseq.json')
    embedded_list = QualityMetric.embedded_list


@collection(
    name='quality-metrics-rnaseq-madqc',
    properties={
        'title': 'QC Quality Metrics for RNA-seq MAD QC (reproducibility QC)',
        'description': 'Listing of QC Quality Metrics for RNA-seq MAD QC',
    })
class QualityMetricRnaseqMadqc(QualityMetric):
    """Subclass of quality matrics for rna-seq MAD QC"""

    item_type = 'quality_metric_rnaseq_madqc'
    schema = load_schema('encoded:schemas/quality_metric_rnaseq_madqc.json')
    embedded_list = QualityMetric.embedded_list


@collection(
    name='quality-metrics-margi',
    properties={
        'title': 'QC Quality metrics for MARGI',
        'description': 'Listing of QC Quality Metrics for MARGI.',
    })
class QualityMetricMargi(QualityMetric):
    """Subclass of quality matrics for MARGI"""
    item_type = 'quality_metric_margi'
    schema = load_schema('encoded:schemas/quality_metric_margi.json')
    embedded_list = QualityMetric.embedded_list


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


@collection(
    name='quality-metrics-qclist',
    properties={
        'title': 'QC Quality metrics for QC List',
        'description': 'Listing of QC Quality Metrics for QC List.',
    })
class QualityMetricQclist(QualityMetric):
    """Subclass of quality matrics for QCList"""
    item_type = 'quality_metric_qclist'
    schema = load_schema('encoded:schemas/quality_metric_qclist.json')
    embedded_list = QualityMetric.embedded_list
