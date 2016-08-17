/*******************
Contains the getting started entries used in home.js and gettingstarted.js
For each entry, define a title, author, data, and content. All should
be strings. Author and date are optional but will change the announcement subtitle
if omitted.
Please note, you must embed html objects (such as links) within the content manually
This can be done like so: <a href=\"YOUR PATH HERE\">YOUR TEXT HERE</a>
Escaping the in quotations with \ in the <a> tags is crucial. Please note that
html elements can ONLY be embedded in the content section.
*******************/
var gs_entries = module.exports = [
    {
        "title":"Quick start",
        "author":"DCIC Staff",
        "date":"July 27, 2016",
        "content":"Lorem ipsum dolor sit <a href=\"/biosamples/\">amet</a>, consectetur adipiscing elit. Vivamus tristique, nisl nec imperdiet commodo, magna lorem placerat mauris, eu semper odio ipsum eget lectus. In eu libero ante. Mauris consectetur est venenatis tortor gravida, vitae fringilla orci facilisis. Aenean ante libero, sollicitudin ac ipsum vel, hendrerit porttitor quam."
    },
    {
        "title":"How to use the portal",
        "author":"DCIC Staff",
        "date":"August 11, 2016",
        "content":"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus tristique, nisl nec imperdiet commodo, magna lorem placerat mauris, eu semper odio ipsum eget lectus. In eu libero ante. Mauris consectetur est venenatis tortor gravida, vitae fringilla orci facilisis. Aenean ante libero, sollicitudin ac ipsum vel, hendrerit porttitor quam."
    }
]
