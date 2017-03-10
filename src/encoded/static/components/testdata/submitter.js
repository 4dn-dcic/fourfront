/* Old
module.exports = {
    "@id": "/users/0abbd494-b852-433c-b360-93996f679dae/",
    "@type": ["User", "Item"],
    "id": "0abbd494-b852-433c-b360-93996f679dae",
    "lab": "/labs/thomas-gingeras/",
    "title": "Ad Est",
    "email" : "4dndcic@gmail.com",
    "first_name" : "Ad",
    "last_name" : "Est",
    "access_keys" : []
};
*/

module.exports = {
    "lab": {
        "awards": [
            {
                "name": "Test-NOT-4DN",
                "title": "Other TEST",
                "status": "current",
                "project": "External",
                "description": "A test non 4DN award - for testing permissions and access to various items",
                "date_created": "2017-03-10T04:24:51.317379+00:00",
                "viewing_group": "Not 4DN",
                "schema_version": "1",
                "@id": "/awards/Test-NOT-4DN/",
                "@type": ["Award", "Item"],
                "uuid": "b0b9c607-f8b4-4f02-93f4-9895b461444b",
                "display_title": "Other TEST",
                "link_id": "~awards~Test-NOT-4DN~"
            }
        ], 
        "display_title": "NOT 4DN test lab",
        "link_id": "~labs~test-not-4dn-lab~"
    },
    "email": "4dndcic@gmail.com",
    "groups": ["submitter"],
    "status": "current",
    "timezone": "US/Pacific",
    "job_title": "Submitter",
    "last_name": "Submitter",
    "first_name": "Submitter",
    "submits_for": [

    ],
    "date_created": "2017-03-10T04:25:03.705122+00:00",
    "schema_version": "1",
    "@id": "/users/986b362f-4eb6-4a9c-8173-3ab267307e3c/",
    "@type": ["User", "Item"],
    "uuid": "986b362f-4eb6-4a9c-8173-3ab267307e3c",
    "display_title": "Submitter Submitter",
    "link_id": "~users~986b362f-4eb6-4a9c-8173-3ab267307e3c~",
    "title": "Submitter Submitter",
    "@context": "/terms/",
    "actions": [
        {
            "name": "create",
            "title": "Create",
            "profile": "/profiles/User.json",
            "href": "/users/986b362f-4eb6-4a9c-8173-3ab267307e3c/#!create"
        },
        {
            "name": "edit",
            "title": "Edit",
            "profile": "/profiles/User.json",
            "href": "/users/986b362f-4eb6-4a9c-8173-3ab267307e3c/#!edit"
        }
    ],
    "audit": {},
    "access_keys": []
};