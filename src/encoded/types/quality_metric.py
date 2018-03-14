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
    ALLOW_SUBMITTER_ADD
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

    base_types = ['QualityMetric'] + Item.base_types
    item_type = 'quality_metric'
    schema = load_schema('encoded:schemas/quality_metric.json')
    embedded_list = ['award.project']


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

