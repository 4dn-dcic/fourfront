/*******************
Contains the announcements used in home.js and announcements.js
For each announcement, define a title, author, data, and content. All should
be strings. Author and date are optional but will change the announcement subtitle
if omitted.
Please note, you must embed html objects (such as links) within the content manually
This can be done like so: <a href=\"YOUR PATH HERE\">YOUR TEXT HERE</a>
Escaping the in quotations with \ in the <a> tags is crucial. Please note that
html elements can ONLY be embedded in the content section.
*******************/
export const announcements = [
    {
        "title":"The 4D Nucleome Perspective is Published",
        "author":"DCIC Staff",
        "date":"9/13/2017",
        "content":"The 4D Nucleome Project perspective paper is online in <a href=\"http://www.nature.com/nature/journal/v549/n7671/full/nature23884.html?foxtrotcallback=true\" target=\"_blank\"><em>Nature</em></a> today. If you use any <a href=\"/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&award.project=4DN\">4DN data</a>, please cite this paper. A more extensive data release and use policy will be available soon."
    },
    {
        "title":"Reference Repli-seq Data Released",
        "author":"DCIC Staff",
        "date":"9/05/2017",
        "content":"Part of the goals of 4DN involves generating reference data sets for selected cell types to study how different experiment types complement each other in our understanding of nucleome dynamics. Today, 4DN released <a href='/browse/?type=ExperimentSetReplicate&experiments_in_set.experiment_type=repliseq'>reference Repli-seq data</a> for the selected Tiered cell lines."
    },
    {
        "title":"First 4DN Experiments Released",
        "author":"DCIC Staff",
        "date":"06/30/2017",
        "content":"The first <a href='/browse/?type=ExperimentSetReplicate&accession=4DNES2M5JIGV&accession=4DNESYUYFD6H&accession=4DNESTAPSPUC&accession=4DNES4GSP9S4&accession=4DNESJ1VX52C&accession=4DNESJIYRA44&accession=4DNESI2UKI7P&accession=4DNESHGL976U&accession=4DNESE3ICNE1&accession=4DNESVKLYDOH'>4DN Funded Hi-C experiments</a> have been released to public on the portal."
    },
    {
        "title":"Ontology Utilization Updated",
        "author":"DCIC Staff",
        "date":"4/26/2017",
        "content":"<a href='/search/?type=OntologyTerm'>Ontology Terms</a> from OBI, Uberon, and EFO are now represented on our database. Ontology terms can be internally used to describe cell lines and tissues. We will implement ontology utilization for other appropriate fields in the coming months."
    },
    {
        "title":"Data Submission Open (Beta)",
        "author":"DCIC Staff",
        "date":"9/19/2016",
        "content":"The 4DN Data Portal is open for beta-testers for data submission for Hi-C and related experiments."
    }
];
