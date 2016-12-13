/*********
Contains the static text used for homepage, help pages, and other misc. locations
*********/

var statics = {

    "description" : 
        `The 4D Nucleome Network aims to understand the principles behind the three-dimensional organization of the nucleus in
        space and time (the 4th dimension) and the role nuclear organization plays in gene expression and cellular function.
        The Network will utilize existing omics and imaging technologies as well as develop new ones to generate data and create
        resources to enable the study of the 4D Nucleome. 
        More information about the 4D Nucleome program can be obtained at the <a href=\"http://www.4dnucleome.org/\">4DN portal</a>
        and the <a href=\"https://commonfund.nih.gov/4Dnucleome/index\">NIH program</a> website, which also lists the
        <a href=\"https://commonfund.nih.gov/4Dnucleome/FundedResearch\">funded research centers</a>.<br>
        <br>
        
        The 4DN Data Portal will be the primary access point to the omics and imaging data, analysis tools, and integrative models
        generated and utilized by the 4DN Network. As of September 2016, <b>the portal is currently only open to beta-testers 
        within the network for data submission</b> for Hi-C and Hi-C-variant experiments. 
        Further developments in the metadata models and portal front-end are under way. 
        The portal will be made accessible to the 4DN Network and scientific community at large over the next months.<br>
        <br>

        Please note that the data currently publicly accessible at the portal are from prior published work and are included for 
        testing purposes. 
        Please refer to the original publications and GEO accessions if you use these data.`,

    "links" : 
        `<a href=\"http://www.4dnucleome.org/\">Main Portal</a><br>
        <a href=\"http://dcic.4dnucleome.org/\">DCIC</a><br>
        <a href=\"https://commonfund.nih.gov/4Dnucleome/index\">Common Fund</a><br>
        <a href=\"https://commonfund.nih.gov/4Dnucleome/FundedResearch\">Centers and Labs</a>`,

    "gettingStarted" : 
        `The 4DN Data Portal will be the primary access point to the omics and imaging data, analysis tools, and integrative models 
        generated and utilized by the 4DN Network. 
        As of September 2016, <b>the portal is currently only open to beta-testers within the network for data submission</b> for 
        Hi-C and Hi-C-variant experiments. 
        Further developments in the metadata models and portal front-end are under way. 
        The portal will be made accessible to the 4DN Network and scientific community at large over the next months.<br>
        <br>
        
        If you would like submit data to the portal, please contact 
        <a href=\"mailto:4DN.DCIC.support@hms-dbmi.atlassian.net\">the data wranglers</a> to get data submitter accounts. 
        Also, please skim through the <a href=\"#metadata-structure\">metadata structure</a> and 
        <a href=\"#data-submission\">data submission</a> sections below. 
        We also have a <a href=\"#rest-api\">RESTful API</a> that can be utilized for data submission. 
        We can set up a webex call to discuss the details and the most convenient approach for your existing system.`,

    "metadataStructure1" : 
        `The DCIC, with input from different 4DN Network Working groups, has defined a metadata structure to describe biological 
        samples, experimental methods, data files, analysis steps, and other pertinent data. 
        The framework for the the metadata structure is based on the work of 
        <a href=\"https://www.encodeproject.org/help/getting-started/#organization\">ENCODE DCC</a>.<br>
        <br>
        
        The metadata is organized as objects that are related with each other. 
        An overview of the major objects is provided in the following slides.`,

    "metadataStructure2" : 
        `In our database, the objects are stored in the <a href=\"http://www.json.org/\">JavaScript Object Notation format</a>. 
        The schemas for the different object types are described in <a href=\"http://json-ld.org/\">JSON-LD format</a> 
        and can be found <a href=\"https://github.com/hms-dbmi/fourfront/tree/master/src/encoded/schemas\">here</a>. 
        A documentation of the metadata schema is also available as a google doc 
        <a href=\"https://docs.google.com/document/d/15tuYHENH_xOvtlvToFJZMzm5BgYFjjKJ0-vSP7ODOG0/edit?usp=sharing\">here</a>.`,

    "submissionXLS" : 
        `We provide data submission forms as excel workbooks that are flattened versions of the metadata schemas, but only 
        containing fields that actually can/should be submitted. 
        We also provide software tools that handle the interaction with our REST API to generate these forms and push the
        content of the forms to our database. 
        Documentation of the data submission process using these forms can be found 
        <a href=\"https://docs.google.com/document/d/1Xh4GxapJxWXCbCaSqKwUd9a2wTiXmfQByzP0P8q5rnE/edit\">here</a>.`,

    "restAPI" : 
        `For both meta/data submission and retrival, you can also access our database directly via the REST-API. 
        Data objects exchanged with the server conform to the standard JavaScript Object Notation (JSON) format. 
        Documentation on the REST API will be available soon. Our implementation is practically the same as the one developed 
        by the <a href=\"https://www.encodeproject.org/help/rest-api/\">ENCODE DCC</a>. 
        Please contact us if you would like to directly interact with the REST API instead of the excel workbooks for data 
        submission and we can guide you.`,

    "dcic" : 
        `The 4DN data portal is developed and managed by the <a href=\"http://dcic.4dnucleome.org/\">4D Nucleome Data Coordination and Integration Center</a>. 
        DCIC staff responsible for the data portal include:<br>
        <br>

        <strong>Peter J Park</strong> &nbsp;-&nbsp; Principal Investigator<br>
        <strong>Nils Gehlenborg</strong> &nbsp;-&nbsp; Co-Investigator<br>
        <strong>Burak H Alver</strong> &nbsp;-&nbsp; Scientific Project Manager<br>
        <br>
        
        <strong>Jeremy Johnson</strong> &nbsp;-&nbsp; Lead Software Developer<br>
        <strong>Carl Vitzthum</strong> &nbsp;-&nbsp; Scientific Programmer<br>
        <strong>Alex Balashov</strong> &nbsp;-&nbsp; Front-end Developer<br>
        <br>
        
        <strong>Andy Schroeder</strong> &nbsp;-&nbsp; Senior Data Curator<br>
        <strong>Koray Kirli</strong> &nbsp;-&nbsp; Data Curator<br>
        <br>

        Please address all questions and comments to <a href=\"mailto:burak_alver@hms.harvard.edu\">Burak Alver</a>.`,
    
    /** 
     * Possibility for future (?), if change containing element in UI to
     * <div> instead of <p> & change minor CSS e,g.: 
     * table.text-left > tbody > tr > td {text-align:left}
     */

    /*
    "aboutDCIC" : `
        <p>The 4DN data portal is developed and managed by the <a href=\"http://dcic.4dnucleome.org/\">4D Nucleome Data Coordination and Integration Center</a>. 
        DCIC staff responsible for the data portal include:</p>

        <table class="text-left">
            <tr><td>Peter J Park</td><td><i>Principal Investigator</i></td></tr>
            <tr><td>Nils Gehlenborg</td><td><i>Co-Investigator</i></td></tr>
            <tr><td>Burak H Alver</td><td><i>Scientific Project Manager</i></td></tr>

            <tr><td>Jeremy Johnson</td><td><i>Lead Software Developer</i></td></tr>
            <tr><td>Carl Vitzthum</td><td><i>Scientific Programmer</i></td></tr>
            
            <tr><td>Andy Schroeder</td><td><i>Senior Data Curator</i></td></tr>
            <tr><td>Koray Kirli</td><td><i>Data Curator</i></td></tr>
        </table>

        <br>
        <p>Please address all questions and comments to <a href=\"mailto:burak_alver@hms.harvard.edu\">Burak Alver</a>.</p>,
    */

    "acknowledgements" : 
        `The software and metadata infrastructure for the 4DN Data Portal are based on work by the 
        <a href=\"https://www.encodeproject.org/help/contacts/\">ENCODE DCC team at Stanford University</a> led by
        J. Michael Cherry, Ben Hitz, and Cricket Sloan. 
        We gratefully acknowledge the work they have shared <a href=\"https://github.com/ENCODE-DCC\">open source</a>
        as well as the guidance they have provided for our implementation.`,

    "funding" : 
        `The 4D Nucleome Data Coordination and Integration Center is supported by the U01 Grant CA200059 from the NIH Common Fund.`

};

// Clear out whitespace.
Object.getOwnPropertyNames(statics).forEach(function(key){
    // newlines & spaces -> single space | spaces around html linebreak incl. linebreak -> linebreak | spaces at start -> nothing
    statics[key] = statics[key].replace(/[\r\n(\s+)]+/g," ").replace(/((\s+)<br>(\s+))/g, "<br>").replace(/(^\s+)/g,'');
});

module.exports = statics;