"""The type file for the collection Quality Metric."""
from snovault import (
    abstract_collection,
    calculated_property,
    collection,
    load_schema,
)
# from pyramid.security import Authenticated
from .base import (
    Item,
    ALLOW_SUBMITTER_ADD,
    lab_award_attribution_embed_list
)

QC_SUMMARY_SCHEMA = {
    "type": "array",
    "title": "Quality Metric Summary",
    "description": "Selected Quality Metrics for Summary",
    "exclude_from": ["submit4dn", "FFedit-create"],
    "items": {
            "title": "Selected Quality Metric",
            "type": "object",
            "required": ["title", "value", "numberType"],
            "additionalProperties": False,
            "properties": {
                "title": {
                    "type": "string",
                    "title": "Title",
                    "description": "Title of the Quality Metric",
                },
                "title_tooltip": {
                    "type": "string",
                    "title": "Tooltip Title",
                    "description": "tooltip for the quality metric title to be displayed upon mouseover"
                },
                "value": {
                    "type": "string",
                    "title": "Value",
                    "description": "value of the quality metric as a string"
                },
                "tooltip": {
                    "type": "string",
                    "title": "Tooltip",
                    "description": "tooltip for the quality metric to be displayed upon mouseover"
                },
                "numberType": {
                    "type": "string",
                    "title": "Type",
                    "description": "type of the quality metric",
                    "enum": ["string", "integer", "float", "percent"]
                }
            }
    }
}

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

    @calculated_property(schema=QC_SUMMARY_SCHEMA)
    def quality_metric_summary(self, request):
        return


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
    
    @calculated_property(schema=QC_SUMMARY_SCHEMA)
    def quality_metric_summary(self, request):
        return


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

    @calculated_property(schema=QC_SUMMARY_SCHEMA)
    def quality_metric_summary(self, request):
        qc = self.properties
        qc_summary = []
        
        if 'Total Reads' not in qc:
            return

        def total_number_of_reads_per_type(qc):
            unmapped = 0
            multimapped = 0
            duplicates = 0
            walks = 0

            for key in qc.keys():
                if "N" in key or "X" in key:
                    unmapped = unmapped + qc.get(key)
                elif "M" in key and key != "NM":
                    multimapped = multimapped + qc.get(key)
                elif "DD" in key:
                    duplicates = qc.get(key)
                elif "WW" in key:
                    walks = qc.get(key)

            return unmapped, multimapped, duplicates, walks

        unmapped_reads, multi_reads, duplicates, walks = total_number_of_reads_per_type(
            qc)

        def percent_of_reads(numVal):
            '''convert to percentage of Total reads in bam file'''
            return round((int(numVal) / int(qc.get('Total Reads'))) * 100 * 1000) / 1000

        def million(numVal):
            return str(round(int(numVal) / 10000) / 100) + "m"

        def tooltip(numVal):
            return "Percent of total reads (=%s)" % million(int(numVal))

        qc_summary.append({"title": "Total Reads",
                           "value": str(qc.get("Total Reads")),
                           "numberType": "integer"})
        qc_summary.append({"title": "Unmapped Reads",
                           "value": str(percent_of_reads(unmapped_reads)),
                           "tooltip": tooltip(unmapped_reads),
                           "numberType": "percent"})
        qc_summary.append({"title": "Multimapped Reads",
                           "value": str(percent_of_reads(multi_reads)),
                           "tooltip": tooltip(multi_reads),
                           "numberType": "percent"})
        qc_summary.append({"title": "Duplicate Reads",
                           "value": str(percent_of_reads(duplicates)),
                           "tooltip": tooltip(duplicates),
                           "numberType": "percent"})
        qc_summary.append({"title": "Walks",
                           "value": str(percent_of_reads(walks)),
                           "tooltip": tooltip(walks),
                           "numberType": "percent"})
        qc_summary.append({"title": "Minor Contigs",
                           "value": str(percent_of_reads(qc.get("Minor Contigs"))),
                           "tooltip": tooltip(qc.get("Minor Contigs")),
                           "numberType": "percent"})

        return qc_summary           


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

    @calculated_property(schema=QC_SUMMARY_SCHEMA)
    def quality_metric_summary(self, request):
        qc = self.properties
        qc_summary = []
        
        if 'Total reads' not in qc:
            return

        def percent(numVal):
            '''convert to percentage of Total reads'''
            return round((numVal / qc.get('Total reads')) * 100 * 1000) / 1000

        def million(numVal):
            return str(round(numVal / 10000) / 100) + "m"

        def tooltip(numVal):
            return "Percent of total reads (=%s)" % million(numVal)

        qc_summary.append({"title": "Filtered Reads",
                           "value": str(qc.get("Total reads")),
                           "numberType": "integer"})
        qc_summary.append({"title": "Cis reads (>20kb)",
                           "value": str(percent(qc.get("Cis reads (>20kb)"))),
                           "tooltip": tooltip(qc.get("Cis reads (>20kb)")),
                           "numberType": "percent"})
        qc_summary.append({"title": "Short cis reads",
                           "value": str(percent(qc.get("Short cis reads (<20kb)"))),
                           "tooltip": tooltip(qc.get("Short cis reads (<20kb)")),
                           "numberType": "percent"})
        qc_summary.append({"title": "Trans Reads",
                           "value": str(percent(qc.get("Trans reads"))),
                           "tooltip": tooltip(qc.get("Trans reads")),
                           "numberType": "percent"})

        return qc_summary


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

    @calculated_property(schema=QC_SUMMARY_SCHEMA)
    def quality_metric_summary(self, request):
        return


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

    @calculated_property(schema=QC_SUMMARY_SCHEMA)
    def quality_metric_summary(self, request):
        return get_chipseq_atacseq_qc_summary(self.properties, 'QualityMetricChipseq')


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

    @calculated_property(schema=QC_SUMMARY_SCHEMA)
    def quality_metric_summary(self, request):
        return get_chipseq_atacseq_qc_summary(self.properties, 'QualityMetricAtacseq')


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

    @calculated_property(schema=QC_SUMMARY_SCHEMA)
    def quality_metric_summary(self, request):
        qc = self.properties
        qc_summary = []

        if 'star_log_qc' in qc:
            uniquely_mapped = qc.get(
                'star_log_qc')['Uniquely mapped reads number']
            multi_mapped = qc.get(
                'star_log_qc')['Number of reads mapped to multiple loci']
            total_mapped = int(uniquely_mapped) + int(multi_mapped)
            qc_summary.append({"title": "Total mapped reads (genome)",
                               "value": str(total_mapped),
                               "numberType": "integer"})
            qc_summary.append({"title": "Total uniquely mapped reads (genome)",
                               "value": str(uniquely_mapped),
                               "numberType": "integer"})
        elif 'gene_type_count' in qc:
            qc_summary.append({"title": "Reads mapped to protein-coding genes",
                               "value": str(qc.get('gene_type_count')['protein_coding']),
                               "numberType": "integer"})
            qc_summary.append({"title": "Reads mapped to rRNA",
                               "value": str(qc.get('gene_type_count')['rRNA']),
                               "numberType": "integer"})

        return qc_summary if qc_summary else None


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

    @calculated_property(schema=QC_SUMMARY_SCHEMA)
    def quality_metric_summary(self, request):
        return


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

    @calculated_property(schema=QC_SUMMARY_SCHEMA)
    def quality_metric_summary(self, request):
        qc = self.properties
        qc_summary = []

        if 'Total number of interactions' not in qc:
            return

        def percent_interactions(numVal):
            '''convert to percentage of Total interactions in combined pairs'''
            return round((int(numVal) / int(qc.get('Total number of interactions'))) * 100 * 1000) / 1000

        def million(numVal):
            return str(round(int(numVal) / 10000) / 100) + "m"

        def tooltip(numVal):
            return "Percent of total interactions (=%s)" % million(int(numVal))

        qc_summary.append({"title": "Filtered Reads",
                           "value": str(qc.get("Total number of interactions")),
                           "numberType": "integer"})
        qc_summary.append({"title": "Cis reads (>%s)" % qc.get("Type"),
                           "value": str(percent_interactions(qc.get("Distal"))),
                           "tooltip": tooltip(qc.get("Distal")),
                           "numberType": "percent"})
        qc_summary.append({"title": "Short cis reads",
                           "value": str(percent_interactions(qc.get("Proximal"))),
                           "tooltip": tooltip(qc.get("Proximal")),
                           "numberType": "percent"})
        qc_summary.append({"title": "Trans Reads",
                           "value": str(percent_interactions(qc.get("Inter-chromosome interactions"))),
                           "tooltip": tooltip(qc.get("Inter-chromosome interactions")),
                           "numberType": "percent"})

        return qc_summary


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

    @calculated_property(schema=QC_SUMMARY_SCHEMA)
    def quality_metric_summary(self, request):
        return


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
    embedded_list = QualityMetric.embedded_list + [
        'qc_list.value.quality_metric_summary.*'
    ]

    @calculated_property(schema=QC_SUMMARY_SCHEMA)
    def quality_metric_summary(self, request):
        qc_list = self.properties.get('qc_list')
        qc_summary = []
        if qc_list:
            for qc_item in qc_list:
                qc_obj = request.embed(qc_item['value'], '@@object')
                if 'quality_metric_summary' in qc_obj:
                    for qcs_item in qc_obj['quality_metric_summary']:
                        qc_summary.append(qcs_item)            
        
        return qc_summary if qc_summary else None


def get_chipseq_atacseq_qc_summary(quality_metric, qc_type):
    
    def round2(numVal):
        return round(numVal * 100) / 100
    
    qc_summary = []

    if 'overlap_reproducibility_qc' in quality_metric:
        if 'idr_reproducibility_qc' in quality_metric:
            qc_method = 'idr'
        else:
            qc_method = 'overlap'

        opt_set = quality_metric.get(
            qc_method + "_reproducibility_qc")["opt_set"]
        qc_summary.append({"title": "Optimal Peaks",
                           "value": str(quality_metric.get(qc_method + "_reproducibility_qc")["N_opt"]),
                           "numberType": "integer"})
        qc_summary.append({"title": "Rescue Ratio",
                           "tooltip": "Ratio of number of peaks (Nt) relative to peak calling based" +
                           " on psuedoreplicates (Np) [max(Np,Nt) / min (Np,Nt)]",
                           "value": str(round2(quality_metric.get(qc_method + "_reproducibility_qc")["rescue_ratio"])),
                           "numberType": "float"})
        qc_summary.append({"title": "Self Consistency Ratio",
                           "tooltip": "Ratio of number of peaks in two replicates [max(N1,N2) / min (N1,N2)]",
                           "value": str(round2(quality_metric.get(qc_method + "_reproducibility_qc")["self_consistency_ratio"])),
                           "numberType": "float"})
        qc_summary.append({"title": "Fraction of Reads in Peaks",
                           "value": str(round2(quality_metric.get(qc_method + "_frip_qc")[opt_set]["FRiP"])),
                           "numberType": "float"})
    elif 'flagstat_qc' in quality_metric or 'ctl_flagstat_qc' in quality_metric:
        pref = ''
        if 'ctl_flagstat_qc' in quality_metric:
            pref = 'ctl_'

        # mitochondrial rate (only for ATAC-seq)
        if qc_type == 'QualityMetricAtacseq':
            total = quality_metric.get(
                pref + "dup_qc")[0]["paired_reads"] + quality_metric.get(pref + "dup_qc")[0]["unpaired_reads"]
            nonmito = quality_metric.get(
                pref + "pbc_qc")[0]["total_read_pairs"]
            mito_rate = round2((1 - (float(nonmito) / float(total))) * 100)
            qc_summary.append({"title": "Percent mitochondrial reads",
                               "value": str(mito_rate),
                               "numberType": "percent"})
        qc_summary.append({"title": "Nonredundant Read Fraction (NRF)",
                           "value": str(round2(quality_metric.get(pref + "pbc_qc")[0]["NRF"])),
                           "tooltip": "distinct non-mito read pairs / total non-mito read pairs",
                           "numberType": "float"})
        qc_summary.append({"title": "PCR Bottleneck Coefficient (PBC)",
                           "value": str(round2(quality_metric.get(pref + "pbc_qc")[0]["PBC1"])),
                           "tooltip": "one-read non-mito read pairs / distinct non-mito read pairs",
                           "numberType": "float"})
        final_reads = quality_metric.get(
            pref + "nodup_flagstat_qc")[0]["read1"]  # PE
        if not final_reads:
            final_reads = quality_metric.get(
                pref + "nodup_flagstat_qc")[0]["total"]  # SE
        qc_summary.append({"title": "Filtered & Deduped Reads",
                           "value": str(final_reads),
                           "numberType": "integer"})

    return qc_summary if qc_summary else None
