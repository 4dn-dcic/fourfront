module.exports = {
    "@id": "/help/user-guide/data-organization",
    "content": [
        {
            "name" : "help.user-guide.data-organization.gettingStarted",
            "title": null,
            "content": "The 4DN Data Portal will be the primary access point to the omics and imaging data, analysis tools, and integrative models \ngenerated and utilized by the 4DN Network. \nAs of September 2016, <b>the portal is currently only open to beta-testers within the network for data submission</b> for \nHi-C and Hi-C-variant experiments. \nFurther developments in the metadata models and portal front-end are under way. \nThe portal will be made accessible to the 4DN Network and scientific community at large over the next months.<br>\n<br>\n\nIf you would like submit data to the portal, please contact \n<a href=\"mailto:4DN.DCIC.support@hms-dbmi.atlassian.net\" target=\"_blank\">the data wranglers</a> to get data submitter accounts. \nAlso, please skim through the <a href=\"#metadata-structure\">metadata structure</a> and \n<a href=\"#data-submission\">data submission</a> sections below. \nWe also have a <a href=\"#rest-api\">RESTful API</a> that can be utilized for data submission. \nWe can set up a webex call to discuss the details and the most convenient approach for your existing system.",
            "filetype": "html"
        },
        {
            "name" : "metadataStructure1",
            "title": "Metadata Structure",
            "content": "The DCIC, with input from different 4DN Network Working groups, has defined a metadata structure to describe biological \nsamples, experimental methods, data files, analysis steps, and other pertinent data. \nThe framework for the the metadata structure is based on the work of \n<a href=\"https://www.encodeproject.org/help/getting-started/#organization\" target=\"_blank\">ENCODE DCC</a>.<br>\n<br>\n\nThe metadata is organized as objects that are related with each other. \nAn overview of the major objects is provided in the following slides.",
            "filetype": "html"
        },
        {
            "name" : "help.user-guide.data-organization.carousel-place-holder",
            "title": null,
            "content": "placeholder: <SlideCarousel />",
            "filetype": "carousel-place-holder"
        },
        {
            "name" : "metadataStructure2",
            "title": null,
            "content": "In our database, the objects are stored in the <a href=\"http://www.json.org/\">JavaScript Object Notation format</a>. \nThe schemas for the different object types are described in <a href=\\\"http://json-ld.org/\">JSON-LD format</a> \nand can be found <a href=\"https://github.com/hms-dbmi/fourfront/tree/master/src/encoded/schemas\">here</a>. \nA documentation of the metadata schema is also available as a google doc \n<a href=\"https://docs.google.com/document/d/15tuYHENH_xOvtlvToFJZMzm5BgYFjjKJ0-vSP7ODOG0/edit?usp=sharing\">here</a>.",
            "filetype": "html"
        },
        {
            "name" : "help.user-guide.data-organization.submissionXLS",
            "title": "Data Submission via Spreadsheet",
            "content": "We provide data submission forms as excel workbooks that are flattened versions of the metadata schemas, but only \ncontaining fields that actually can/should be submitted. \nWe also provide software tools that handle the interaction with our REST API to generate these forms and push the\ncontent of the forms to our database. \nDocumentation of the data submission process using these forms can be found \n<a href=\"https://docs.google.com/document/d/1Xh4GxapJxWXCbCaSqKwUd9a2wTiXmfQByzP0P8q5rnE/edit\">here</a>.",
            "filetype": "html"
        },
        {
            "name" : "help.user-guide.data-organization.restAPI",
            "title": "REST API",
            "content": "For both meta/data submission and retrival, you can also access our database directly via the REST-API. \nData objects exchanged with the server conform to the standard JavaScript Object Notation (JSON) format. \nDocumentation on the REST API will be available soon. Our implementation is practically the same as the one developed \nby the <a href=\"https://www.encodeproject.org/help/rest-api/\">ENCODE DCC</a>. \nPlease contact us if you would like to directly interact with the REST API instead of the excel workbooks for data \nsubmission and we can guide    you.",
            "filetype": "html"
        }
    ],
    "@type": [
        "HelpUser-guideGetting-startedPage",
        "HelpUser-guidePage",
        "HelpPage",
        "StaticPage",
        "Portal"
    ],
    "title": "Getting Started",
    "display_title": "Getting Started",
    "notification": "success",
    "@context": "/help/user-guide/data-organization"
};
