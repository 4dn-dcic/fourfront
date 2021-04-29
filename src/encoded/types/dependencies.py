""" Implements some convenience logic for specifying item embedding dependencies.
    In the context of invalidation scope, it is imperative that we embed all fields used in
    default embeds (display_title). The hope is DependencyEmbedder will make it easy to do so, allowing
    one to specify the dependencies in only one place and call the method in others.
"""


def _build_embed_mapper_embedded(base_path, t, additions=None):
    if additions:
        return embed_for_type(base_path=base_path, t=t, additional_embeds=additions)
    return DependencyEmbedder.embed_defaults_for_type(base_path=base_path, t=t)


class DependencyEmbedderError(Exception):
    pass


class DependencyEmbedder:
    """ Utility class intended to be used to produce the embedded list necessary for a general default embed
        of a given type. This class is intended to be used by calling the `embed_defaults_for_type` method.
        Note that the type mappings are specified in EMBED_MAPPER and that top level properties have None value
        while linked embeds can be specified by adding the type as the value - if non-default fields need to be
        embedded in the EMBED_MAPPER they must be fully specified separately and if you want to build an embed
        list that include additional non-default properties use `embed_for_type` and use `additional_embeds` parameter
    """

    # Note that these match item_type field in the type definition!
    ANTIBODY = 'antibody'
    BIO_FEATURE = 'bio_feature'
    MODIFICATION = 'modification'
    TREATMENT = 'treatment'
    ONTOLOGY_TERM = 'ontology_term'
    PROTOCOL = 'protocol'
    GENE = 'gene'
    GENOMIC_REGION = 'genomic_region'
    IMAGING_PATH = 'imaging_path'
    ANTIBODY = 'antibody'

    EMBED_MAPPER = {
        ANTIBODY: {
            'antibody_name': None,
            'antibody_product_no': None,
            'antibody_vendor.title': None,
        },
        BIO_FEATURE: {
            'preferred_label': None,
            'cellular_structure': None,
            'organism_name': None,
            'feature_mods': None,
            'feature_type': ONTOLOGY_TERM,
            'relevant_genes': GENE,
            'genome_location': GENOMIC_REGION,
        },
        MODIFICATION: {
            'modification_type': None,
            'genomic_change': None,
            'override_modification_name': None,
            'target_of_mod': BIO_FEATURE,
        },
        TREATMENT: {
            'treatment_type': None,
            'chemical': None,
            'biological_agent': None,
            'constructs.name': None,
            'duration': None,
            'duration_units': None,
            'concentration': None,
            'concentration_units': None,
            'temperature': None,
            'target': BIO_FEATURE
        },
        ONTOLOGY_TERM: {
            'term_id': None,
            'term_name': None,
            'term_url': None,
            'preferred_name': None,
        },
        PROTOCOL: {
            'protocol_type': None,
            'title': None,
            'attachment': None,
            'date_created': None,
        },
        GENE: {
            'geneid': None,
            'preferred_symbol': None,
        },
        GENOMIC_REGION: {
            'genome_assembly': None,
            'location_description': None,
            'start_coordinate': None,
            'end_coordinate': None,
            'chromosome': None,
        },
        IMAGING_PATH: {
            'other_probes': None,
            'labeled_probe': None,
            'primary_antibodies': ANTIBODY,
            'secondary_antibody': ANTIBODY,
            'override_display_title': None,
            'target': BIO_FEATURE,
        },

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
        embed_list = []
        for ef, ev in cls.EMBED_MAPPER[t].items():
            if not ev:
                embed_list.append('.'.join([base_path, ef]))
            else:
                embed_list.extend(['.'.join([base_path, e]) for e in _build_embed_mapper_embedded(ef, ev)])
        return embed_list

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
