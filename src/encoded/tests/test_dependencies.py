import pytest
from ..types.dependencies import DependencyEmbedder, DependencyEmbedderError


pytestmark = [pytest.mark.setone, pytest.mark.working]


class TestDependencyEmbedder:

    @pytest.mark.parametrize('base_path, t, expected', [
        ('treatment', 'treatment', [
            'treatment.treatment_type',
            'treatment.chemical',
            'treatment.biological_agent',
            'treatment.constructs.name',
            'treatment.duration',
            'treatment.duration_units',
            'treatment.concentration',
            'treatment.concentration_units',
            'treatment.temperature',
            'treatment.target.feature_type.term_id',
            'treatment.target.feature_type.term_name',
            'treatment.target.feature_type.preferred_name',
            'treatment.target.preferred_label',
            'treatment.target.cellular_structure',
            'treatment.target.organism_name',
            'treatment.target.relevant_genes.geneid',
            'treatment.target.relevant_genes.preferred_symbol',
            'treatment.target.feature_mods',
            'treatment.target.genome_location.genome_assembly',
            'treatment.target.genome_location.location_description',
            'treatment.target.genome_location.start_coordinate',
            'treatment.target.genome_location.end_coordinate',
            'treatment.target.genome_location.chromosome',
        ]),
        ('experiment_set.treatment', 'treatment', [
            'experiment_set.treatment.treatment_type',
            'experiment_set.treatment.chemical',
            'experiment_set.treatment.biological_agent',
            'experiment_set.treatment.constructs.name',
            'experiment_set.treatment.duration',
            'experiment_set.treatment.duration_units',
            'experiment_set.treatment.concentration',
            'experiment_set.treatment.concentration_units',
            'experiment_set.treatment.temperature',
            'experiment_set.treatment.target.feature_type.term_id',
            'experiment_set.treatment.target.feature_type.term_name',
            'experiment_set.treatment.target.feature_type.preferred_name',
            'experiment_set.treatment.target.preferred_label',
            'experiment_set.treatment.target.cellular_structure',
            'experiment_set.treatment.target.organism_name',
            'experiment_set.treatment.target.relevant_genes.geneid',
            'experiment_set.treatment.target.relevant_genes.preferred_symbol',
            'experiment_set.treatment.target.feature_mods',
            'experiment_set.treatment.target.genome_location.genome_assembly',
            'experiment_set.treatment.target.genome_location.location_description',
            'experiment_set.treatment.target.genome_location.start_coordinate',
            'experiment_set.treatment.target.genome_location.end_coordinate',
            'experiment_set.treatment.target.genome_location.chromosome',
        ])
    ])
    def test_dependency_embedder_basic(self, base_path, t, expected):
        embeds = DependencyEmbedder.embed_defaults_for_type(base_path=base_path, t=t)
        assert sorted(embeds) == sorted(expected)

    @pytest.mark.parametrize('t', [
        'definitely_does_not_exist',
        '',
        None,
        'biosample'
    ])
    def test_dependency_embedder_error(self, t):
        with pytest.raises(DependencyEmbedderError):
            DependencyEmbedder.embed_defaults_for_type(base_path='dummy-path', t=t)
        with pytest.raises(DependencyEmbedderError):
            DependencyEmbedder.embed_for_type(base_path='dummy-path', t=t, additional_embeds=[])

    @pytest.mark.parametrize('base_path,t,additional,expected', [
        ('genes', 'gene', [], [
            'genes.geneid',
            'genes.preferred_symbol',
        ]),
        ('genes', 'gene', ['description'], [
            'genes.geneid',
            'genes.preferred_symbol',
            'genes.description'
        ]),
        ('genes.most_severe_gene', 'gene', ['description', 'another_field'], [
            'genes.most_severe_gene.geneid',
            'genes.most_severe_gene.preferred_symbol',
            'genes.most_severe_gene.description',
            'genes.most_severe_gene.another_field'
        ])
    ])
    def test_dependency_embedder_additional_basic(self, base_path, t, additional, expected):
        embeds = DependencyEmbedder.embed_for_type(base_path=base_path, t=t, additional_embeds=additional)
        assert sorted(embeds) == sorted(expected)

    @pytest.mark.parametrize('additional', [
        'a string',
        5,
        None,
        object()
    ])
    def test_dependency_embedder_additional_error(self, additional):
        with pytest.raises(DependencyEmbedderError):
            DependencyEmbedder.embed_for_type(base_path='dummy-path', t='gene', additional_embeds=additional)  # noQA type hints working as intended
