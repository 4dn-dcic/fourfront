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
        Note that the type mappings are specified in EMBED_MAPPER and that 'compound' embeds are
        specified verbosely ie: bio_feature embeds an ontology_term
    """

    # Note that these match item_type field in the type definition!
    BIO_FEATURE = 'bio_feature'
    MODIFICATION = 'modification'
    TREATMENT = 'treatment'
    ONTOLOGY_TERM = 'ontology_term'
    PROTOCOL = 'protocol'
    GENE = 'gene'
    GENOMIC_REGION = 'genomic_region'
    IMAGING_PATH = 'imaging_path'

    EMBED_MAPPER = {
        BIO_FEATURE: [
            'feature_type.term_id',
            'feature_type.term_name',
            'feature_type.preferred_name',
            'preferred_label',
            'cellular_structure',
            'organism_name',
            'relevant_genes.geneid',
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
            'target_of_mod.relevant_genes.geneid',
            'target_of_mod.relevant_genes.preferred_symbol',
            'target_of_mod.feature_mods',
            'target_of_mod.genome_location.genome_assembly',
            'target_of_mod.genome_location.location_description',
            'target_of_mod.genome_location.start_coordinate',
            'target_of_mod.genome_location.end_coordinate',
            'target_of_mod.genome_location.chromosome',
        ],
        TREATMENT: [
            'treatment_type',
            'chemical',
            'biological_agent',
            'constructs.name',
            'duration',
            'duration_units',
            'concentration',
            'concentration_units',
            'temperature',
            'target.feature_type.term_id',
            'target.feature_type.term_name',
            'target.feature_type.preferred_name',
            'target.preferred_label',
            'target.cellular_structure',
            'target.organism_name',
            'target.relevant_genes.geneid',
            'target.relevant_genes.preferred_symbol',
            'target.feature_mods',
            'target.genome_location.genome_assembly',
            'target.genome_location.location_description',
            'target.genome_location.start_coordinate',
            'target.genome_location.end_coordinate',
            'target.genome_location.chromosome',
        ],
        ONTOLOGY_TERM: [
            'term_id',
            'term_name',
            'term_url',
            'preferred_name',
        ],
        PROTOCOL: [
            'protocol_type',
            'title',
            'attachment',
            'date_created',
        ],
        GENE: [
            'geneid',
            'preferred_symbol'
        ],
        GENOMIC_REGION: [
            'genome_assembly',
            'location_description',
            'start_coordinate',
            'end_coordinate',
            'chromosome'
        ],
        IMAGING_PATH: [
            # requires also target (BioFeature linkTo)
            'other_probes',
            'labeled_probe',
            'primary_antibodies.antibody_name',
            'primary_antibodies.antibody_product_no',
            'secondary_antibody.antibody_name',
            'secondary_antibody.antibody_product_no',
            'override_display_title'
        ],

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

    @classmethod
    def embed_for_type(cls, *, base_path, t, additional_embeds: list):
        """ Embeds the defaults for the given type, plus any additional embeds.
            NOTE: additional_embeds are not validated against the schema!

        :param base_path: path to linkTo
        :param t: type to embed
        :param additional_embeds: fields other than those needed for default linkTo to be embedded.
        :return: list of embeds
        """
        if not isinstance(additional_embeds, list):
            raise DependencyEmbedderError('Invalid type for additional embeds! Gave: %s, of type %s' %
                                          (additional_embeds, type(additional_embeds)))
        return cls.embed_defaults_for_type(base_path=base_path, t=t) + ['.'.join([base_path, e])
                                                                        for e in additional_embeds]
