""" Implements some convenience logic for specifying item embedding dependencies.
    In the context of invalidation scope, it is imperative that we embed all fields used in
    default embeds (display_title). The hope is DependencyEmbedder will make it easy to do so, allowing
    one to specify the dependencies in only one place and call the method in others.
"""


class DependencyEmbedderError(Exception):
    pass


class DependencyEmbedder:
    """ Utility class intended to be used to produce the embedded list necessary for a default embed
        of a given type. This class is intended to be used by calling the `embed_defaults_for_type` method.
        Note that the type mappings are specified in EMBED_MAPPER.
    """

    BIO_FEATURE = 'bio_feature'
    MODIFICATION = 'modification'
    TREATMENT = 'treatment'

    EMBED_MAPPER = {
        BIO_FEATURE: [
            'feature_type.term_id',
            'feature_type.term_name',
            'feature_type.preferred_name',
            'preferred_label',
            'cellular_structure',
            'organism_name',
            'relevant_genes.gene_id',
            'relevant_genes.preferred_symbol',
            'feature_mods',
            'genome_location.genome_assembly',
            'genome_location.location_description',
            'genome_location.start_coordinate',
            'genome_location.end_coordinate',
            'genome_location.chromosome',
        ],
        MODIFICATION: [
            'modification_type',
            'genomic_change',
            'override_modification_name',
            'target_of_mod.feature_type.term_id',
            'target_of_mod.feature_type.term_name',
            'target_of_mod.feature_type.preferred_name',
            'target_of_mod.preferred_label',
            'target_of_mod.cellular_structure',
            'target_of_mod.organism_name',
            'target_of_mod.relevant_genes.gene_id',
            'target_of_mod.relevant_genes.preferred_symbol',
            'target_of_mod.feature_mods',
            'target_of_mod.genome_location.genome_assembly',
            'target_of_mod.genome_location.location_description',
            'target_of_mod.genome_location.start_coordinate',
            'target_of_mod.genome_location.end_coordinate',
            'target_of_mod.genome_location.chromosome',
        ],
        TREATMENT: [
            'constructs.name',
            'target.feature_type.term_id',
            'target.feature_type.term_name',
            'target.feature_type.preferred_name',
            'target.preferred_label',
            'target.cellular_structure',
            'target.organism_name',
            'target.relevant_genes.gene_id',
            'target.relevant_genes.preferred_symbol',
            'target.feature_mods',
            'target.genome_location.genome_assembly',
            'target.genome_location.location_description',
            'target.genome_location.start_coordinate',
            'target.genome_location.end_coordinate',
            'target.genome_location.chromosome',
        ]
    }

    @classmethod
    def embed_defaults_for_type(cls, *, base_path, t):
        """ Embeds the fields necessary for a default embed of the given type and base_path

        :param base_path: path to linkTo
        :param t: item type this embed is for
        :return: list of embeds
        """
        if t not in cls.EMBED_MAPPER:
            raise DependencyEmbedderError('Type %s is not mapped! Types mapped: %s' % (t, cls.EMBED_MAPPER.keys()))
        return ['.'.join([base_path, e]) for e in cls.EMBED_MAPPER[t]]
