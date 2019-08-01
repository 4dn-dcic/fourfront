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
class QualityMetricBamCheck(QualityMetric):
    """Subclass of quality matrics for bam files."""

    item_type = 'quality_metric_bamcheck'
    schema = load_schema('encoded:schemas/quality_metric_bamcheck.json')
    embedded_list = QualityMetric.embedded_list


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
