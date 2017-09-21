
Creating & Editing Static Pages
===============================

All static pages content - unless hard-coded for the front-end (in case of custom interactivity, etc.) - exists in HTML or Markdown files in the repository. These are read and then cached into RAM, via a Python dict, on boot-up of webserver ( `bin/pserve development.ini` ). This caching means that after any change to either the static pages configuration or a static page content (file), the webserver must be restarted.

Configuration for which pages and routes are available & accessible is currently controlled by a JSON config file: _src/encoded/static/data/static_pages.json_. This file may be moved to _src/encoded/schemas_ eventually.

In the **static_pages.json** configuration file, there is a single property, _pages_, which contains objects that define page contents and are keyed by page route. A page object might be in this form, for example: 
```json
"help/submitting" : {
    "title" : "<page_title>",
    "directory" : "<absolute_from_repo_root_path_to_static_files>",
    "sections" : [
        {
            "filename" : "gettingStarted.html",
            "toc-title" : "Getting Started"
        },
        {
            "filename" : "metadatastructure1.html",
            "title" : "Metadata Structure"
        }
    ],
    "table-of-contents" : {
        "enabled" : true,
        "skip-depth" : 0,
        "header-depth"  : 4,
        "list-styles"   : ["decimal", "lower-alpha", "lower-roman"],
        "include-top-link" : false
    }
    
}
```

What the above configuration objects says, is for the back-end to enable a page route 'help/submitting', and at that route to return some JSON which has two sections - one with no title visible on page but with one in the table of contents ("Introduction"); and one with the same title for both table of contents and on page ("Metadata Structure"). If do not include "title" nor "toc-title", or have "title" set to null without a "toc-title", the section (& any children) will be excluded from the table of contents (but not the page). Page title is mandatory.

The section content will be the raw contents of the file located at `pages["help/submitting"]["directory"] + pages["help/submitting"]["sections"][i]["filename"]`. The entirety of the "table-of-contents" object is sent across to the front-end to be used as configuration options for the table of contents. If "enabled" is set to false in this configuration, the page rendered on front-end will have just a single wider pane with all the content in lieu of a Table of Contents.

If do not include "directory" property, it will default to `src/encoded/static/data/<section-route-name>`.

## No Content
At minimum, can set the value of a route key as `true`, e.g., `"help/submitting" : true`, instead of an object with sections and Table of Contents config as in example above. Doing this will deliver a relatively empty JSON object from the back-end for that route. It will have "content" sections in the ?format=JSON for any pages in directory default directory `src/encoded/static/data/<section-route-name>`, but as plaintext instead of objects with properties (incl. 'content'). Use this if are planning on doing all content presentation from the front-end, e.g. in case of the more custom/unique Home or Planned Submissions pages.

## HTML Content
For HTML files/filenames (filename with .html extension) defined in a "sections" list property of the route key's value object, no further parsing is performed for table of contents (aside from including top link, if `...["table-of-contents"]["include-top-link"] == true` & showing the table of contents if `...["enabled"] == true`). HTML content is simply inserted into sections of the page (under its section title, if any set), along with corresponding entries for the sections in Table of Contents. First-level ToC links navigate you in-page to top of section.

## Markdown Content
For any Markdown files (filename with .md extension), for each section of content (contents of file from 'filename'), the Table of Contents front-end script "looks" through the parsed Markdown content to gather next-decrement-level headers up until a header of same level as current ToC entry, and then dynamically generates links for those next-level headers in the Table of Conents which would navigate you in-page to that Markdown header.

This functionality may be controlled by `skip-depth` and `header-depth` properties in "table-of-contents" configuration. Only children headers as low as `header-depth` will be included in the ToC so that small headers may be excluded. By default, this is 6, as headers in HTML markup go as 'deep' as 6 (h1, h2, h3, h4, h5, h6). To only show section titles and no Markdown headers within the Table of Contents for a page, it should be enough to set `header-depth` to 0.

If `skip-depth` is greater than 0, starting with the section titles, the children of any header at depth x where x is smaller or greater than `skip-depth` get flattened and promoted upward to the first table of contents depth. For example, if `skip-depth` was set to 1, and our example configuration had Markdown content instead of HTML, section titles would be ignored in the Table of Contents and the titles from first-level Markdown headers ('h1' size) would become flattened and merged as if full page was one big Markdown file, with the first-level Markdown headers ('h1') acting as first-level ToC entries (instead of section titles). If `skip-depth` were to be 2, first-level Markdown headers ('h1') would be ignored as well and there would be one longer list of all second-level Markdown ('h2') headers in the Table of Contents, presented as first/section-level ToC entries.

## Text/String Content
Instead of having a "filename" property for a section, may exclude it and replace with "content" property, in which may contain plaintext or HTML. In such a case, the content will be treated the same as if it came from a .HTML file, with HTML content.

### Interactive React Component Placeholders (for front-end developers)

Sometimes, you may want to put some dynamic element onto a static page, but don't want entire static page to be defined on the front-end. The `/help` page is a perfect example, as the vast majority of the content is in Markdown files, but there is an interactive slideshow that exists halfway down the page. For this, we create a "Text/String Content" section ("content" property instead of "filename" property), and in the content, put in a "placeholder" string. In such cases you will almost always want to exclude "title" property or set it to null, so the interactive element doesn't appear in Table of Contents.

The placeholder string should look like this (displayed in context of section definition):

```json
... {
    "filename" : "carousel-place-holder",
    "content" : "placeholder: <SlideCarousel />"
}, ...
```

It will be the word "placeholder", followed by a colon, followed by any string you want -- though React JSX syntax is reccommended for clarity. On the front-end, in the view or template React component which handles that particular static page route, there must exist a function named *`replacePlaceHolder(placeholderString)`*. This function will accept the string after `placeholder:`, with spaces removed, and should return a valid JSX element. For clarity, it is suggested to have the placeholder string be the same as the React/JSX component output of that function for that string. Having replacePlaceHolder() allows us to avoid security risks inherent in calling 'eval(...)'.

# Permissions

You may define `effective_principals` per page route. To do this, add property `effective_principals` property to root level of path/page configuration as a *list* of system-identifiable principals.
Example: 
```json
"planned-submissions" : {
    "title" : "Planned Data Submission",
    "effective_principals" : ["system.Authenticated"],
    "sections"  : [ .... ]
},
```
Examples of effective_principals options include the following: 
- `system.Authenticated`
- `system.Everyone`
- `viewing_groups.4DN`
- `group.admin`
- `group.submitter`
- `lab.some-lab-uuid`
- `award.some-award-uuid`
- `submits_for.some-lab-uuid`
- `auth0.someone@gmail.com`
- `userid.some-users-identification-weqddw3`, etc.

# Adding Static Pages to Portal Navigation Menu/Bar

Assuming your page looks as you'd expect it to look at your current URL, you might want to add it to the top-menu navigation if not creating a link to it from some other more contextual place. To do this, open up file `src/encoded/static/components/app.js`, at the top of which should be a variable defined under the name of "_portal_", containing a Javascript Object. This defines what the navigation options in the top bar are and is very self-explanatory. Adjust it as needed. It looks like this:

(**TODO: FIGURE OUT IF 'id' AND 'sid' ARE NECESSARY & IF NOT, GET RID OF THEM.**)

```javascript
const portal = {
    portal_title: '4DN Data Portal',
    global_sections: [
        {
            id: 'browse',
            sid:'sBrowse',
            title: 'Browse',
            //url: '/browse/?type=ExperimentSetReplicate&experimentset_type=replicate&limit=all',
            url : function(currentUrlParts){
                if (!currentUrlParts) return '/browse/?type=ExperimentSetReplicate&experimentset_type=replicate'; // Default/fallback
                return Filters.filtersToHref(
                    store.getState().expSetFilters,
                    currentUrlParts.protocol + '//' + currentUrlParts.host + '/browse/'
                );
            },
            active : function(currentWindowPath){
                if (currentWindowPath && currentWindowPath.indexOf('/browse/') > -1) return true;
                return false;
            }
        },
        {id: 'help', sid:'sHelp', title: 'Help', children: [
            {id: 'gettingstarted', title: 'Getting started', url: '/help', children : [
                {id: 'metadatastructure', title: 'Metadata structure', url: '/help#metadata-structure'},
                {id: 'datasubmission', title: 'Data submission', url: '/help#data-submission'},
                {id: 'restapi', title: 'REST API', url: '/help#rest-api'},
            ]},
            {id: 'submitting-metadata', title: 'Submitting Metadata', url: '/help/submitting'},
            {id: 'about', title: 'About', url: '/about'}
        ]}
    ],
    user_section: [
            {id: 'login', title: 'Log in', url: '/'},
            {id: 'accountactions', title: 'Register', url: '/help'}
            // Remove context actions for now{id: 'contextactions', title: 'Actions', url: '/'}
    ]
};
```

For a menu entry (displayed as an object with 'title' property) for static pages, `url` should almost always be a URL endpoint for the static page you've created. If the `url` is a string, the NavBar will attempt to determine if the Menu item is active depending on the `url` path and if it matches the current window path. Alternatively, you may define a `active` function which would accept the currentWindowPath (current URL minus protocol & hostname) as a parameter and must return a boolean value that indicates if the Menu item is active at that path or not. This generally should not be needed unless have some back-end functionality (which wouldn't be a static page) that takes in URL query parameters and can vary in 'activeness' based on these query parameters. Or, in the case of menu item definition for /browse/ in example above, `url` is not a string.

Property `url` may also be a function, to generate a URL dynamically based on some global application state. This should never be needed for static pages, however is used for certain interactive pages such as /browse/, which requires extra URL parameters to navigate user to browse view containing the filters they may have selected previously.
