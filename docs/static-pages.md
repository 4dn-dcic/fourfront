
Creating & Editing Static Pages
===============================

Most static pages content - unless hard-coded for the front-end (in case of custom interactivity, etc.) - exists in HTML or Markdown files in the repository, in an S3 bucket, or in-line within an insert. Contents of a page is an array of linkTo StaticSection items loaded in the same way as other Items, and exists in the "content" property on the Page Item. The "name" property of the Page Item becomes the static page's path where it may be viewed.


In the `/src/encoded/tests/data/[..]/page.json` file, an insert defining the page available at "help/submitting/getting-started" might be in this form:
```json
[...
{
    "title" : "Getting Started with Submissions",
    "name" : "help/submitter-guide/getting-started",
    "content" : [
        "help.submitter-guide.getting-started.introduction",
        "help.submitter-guide.getting-started.metadata-structure"
    ],
    "table-of-contents" : {
        "enabled" : true,
        "header-depth"  : 4
    }
    
}
...]
```

Notice the "content" property, which links to StaticSection Items which might look like the following in `/src/encoded/tests/data/[..]/static_section.json` inserts:
```json
[...
{
    "name" : "help.submitter-guide.getting-started.introduction",
    "body" : "To get started, ...",
    "toc-title" : "Introduction",
    "options" : {
        "filetype" : "md"
    }
}, {
    "name" : "help.submitter-guide.getting-started.metadata-structure",
    "file" : "/docs/public/metadata-submission/metadatastructure1.html",
    "title" : "Metadata Structure"
},
...]
```

What the above configuration objects says, is for the back-end to enable a page route "help/submitter-guide/getting-started", and at that route to return some JSON which has two sections - one with no title visible on page but with one in the table of contents ("Introduction"); and one with the same title visible for both table of contents and on page ("Metadata Structure"). If do not include "title" nor "toc-title", or have "title" set to null without a "toc-title", the section (& any children) will be excluded from the table of contents (but not the page). A Page title is mandatory (but not StaticSection title).

**Importantly** -- if _two or more_ StaticSections have titles or toc-titles defined on a page, then __ALL__ section titles for that page will be visible in the table of contents, even if they do not exist, as otherwise header depths within different sections cannot properly/automatically align. If e.g. have a page with 3 sections, and two of them have titles, then the third section (without a title) will get an auto-generated title based off of its name (dashes replaced with spaces and capitalized) to be shown in the Table of Contents.

The section content will be the raw contents of the file located at `file` property (which maybe a remote location). The entirety of the "table-of-contents" object is sent across to the front-end to be used as configuration options for the table of contents. If "enabled" is set to false in this configuration, the page rendered on front-end will have just a single wider pane with all the content in lieu of a Table of Contents.

Section content is parsed based on the optional `options.filetype` field, which defaults to plain HTML. If a file is used as source of content (whether in repo or S3 bucket), this `options.filetype` is unnecessary as it is obtained from the file ending.

## HTML Content

**Is excluded from Table of Contents except for Section title (if any).**

For HTML content (filename with .html extension or `object.filetype` not filled or set to 'HTML'), no further parsing is performed for table of contents (aside from showing the table of contents if `PageItem["table-of-contents"]["enabled"] == true`). HTML content is simply inserted into sections of the page (under its section title, if any set), along with corresponding entries for the sections in Table of Contents. First-level ToC links navigate you in-page to top of section. Headers within the HTML content do not currently get parsed and added to Table of Contents (though this can be implemented at some point).

## Markdown Content
For any Markdown content (filename with .md extension object.filetype set to 'md'), for each section of content (contents of file from 'filename'), the Table of Contents front-end script "looks" through the parsed Markdown content to gather next-decrement-level headers up until a header of same level as current ToC entry, and then dynamically generates links for those next-level headers in the Table of Conents which would navigate you in-page to that Markdown header.

This functionality may be controlled by the `header-depth` field in "table-of-contents" configuration. Only children headers as low as `header-depth` will be included in the ToC so that small headers may be excluded. By default, this is 6, as headers in HTML markup go as 'deep' as 6 (h1, h2, h3, h4, h5, h6). To only show section titles and no Markdown headers within the Table of Contents for a page, it should be enough to set `header-depth` to 0 or 1.


## Text/String Content
For a section, can also define `file` to refer to a .txt file or have a plain-text `body` field (`object.filetype` == "txt"). It will be treated more or less like plain HTML but be slightly better implemented and safer for use on front-end.

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


# Best Practices

- DO split Pages into multiple StaticSections with proper title for each, if possible, rather than having Page that has just one big long Markdown section/file.
   - This will allow each section to be re-used in other places & apply permissions to each section.
   - If there is only one or less sections with a title (e.g. could have multiple sections all with no titles or just one big long section), then the `##` (h2) headers get promoted as if they were Section headers in TableOfContents. However, styling within the page itself will remain as Markdown h2 header (not section header). H1 (`#`) headers are reserved for Page titles and are not currently supported within (our parsing of) Markdown.
   - If have *2+* static sections with titles, all sections and their titles — even if nonexistent — will be displayed in TableOfContents. If there’s a section for which title doesn’t exist, title will default to (JS version of) `" ".join([ word.capitalize() for word in section.link.split("-") ])` where `section.link` is last bit of StaticSection name (e.g. “path.to.section.lorem-ipsum-1” => “Lorem Ipsum 1”).
- If are going to edit Pages/Sections through Fourfront UI (rather than using a Markdown/text editor & then adding to inserts) — then is a good idea to keep inserts up-to-date in order to make local development + testing simpler as well as provide an extra source of backups.
  - Our primary mission isn’t to maintain/support a custom content management system so having a concrete outside-of-db representation of static pages I think is desireable.
  - There is now a command called `bin/export-data` which can be used to export Page and StaticSection inserts into JSON files. Examples:
    ```bash
    bin/export-data "https://data.4dnucleome.org/search/?type=Page&limit=all" -u ACCESS_KEY_ID -p ACCESS_KEY_SECRET > new_page_inserts_file.json
    bin/export-data "https://data.4dnucleome.org/search/?type=StaticSection&limit=all" -u ACCESS_KEY_ID -p ACCESS_KEY_SECRET > new_static_section_inserts_file.json
    ```

# Permissions

### TODO

Currently may set a `status` of "draft", "published", or "deleted" for any Page or StaticSection and permissions will work accordingly.

# StaticSections Above Search Results

### TODO


## **BELOW SYSINFOS APPROACH WILL BE DEPRECATED SOON BUT FOR NOW STILL FUNCTIONAL**


## Static Section Header `@type` Mapping

Currently this can be dynamically updated via the `SysInfo` Item : `/sysinfos/search-header-mappings/`

The Item `/sysinfos/search-header-mappings/` must exist in database for any static content to appear. Else will get nothing in area above search results. SysInfo cannot be inserted via deploy and must be POSTed in.

Do this on any instances we want mappings: https://gyazo.com/de6758e68ca898101218ad3d95687569 , with "mapping" taking the correct form (PATCHing subsequently after creation for updates).

Again, the name of the sysinfo object **MUST** be **`search-header-mappings`**

**POST** to `<host>/sysinfo/` :
```json
{
  "name" : "search-header-mappings",
  "title" : "Search Header Mapping",
  "description": "Mapping of Static search result header URIs to Item @type",
  "mapping" : {
      "WorkflowRun" : "/static-sections/search-info-header.WorkflowRun",
      "Workflow" : "/static-sections/search-info-header.Workflow"
  }
}
```

**PATCH** to `<host>/sysinfo/search-header-mappings`:
```json
{
  "mapping" : {
      "WorkflowRun" : "/static-sections/search-info-header.WorkflowRun",
      "Workflow" : "/static-sections/search-info-header.Workflow",
      "FileSetMicroscopeQc" : "/static-sections/search-info-header.FileSetMicroscopeQc"
  }
}
```

The "value" in the 'mapping' dictionary/object is the @id or link to a StaticSection Item.
Here these static sections are referenced by their name (rather than UUID).
In order to allow such a link to your StaticSection, ensure the 'name' of it doesn't have any slashes (`/`) or hashes (`#`).
For example, in the case above the names are `search-info-header.WorkflowRun`, `search-info-header.Workflow`, & `search-info-header.FileSetMicroscopeQc`. 


## **Simplification & Future** <- THIS WILL SUPERCEDE SYSINFOS MAPPING

If we like this structure of having a static page or block for (almost) each `@type`, we could simplify greatly by getting rid of the Sysinfo Item & just having search.py look-up if any page w/ name `’/search-info-header/’ + @type` exists and then including its contents into a ‘search_header_content’ property as part of search results/response JSON.

# Auto-Generated Help Dropdown Menu

Pages have an optional `children` field which holds an array of other Pages (as linkTos). Routes of child pages **MUST** extend the parent route. For example, page with `name` ==  "help/submitter-guide" must have children with `name`s in the form of "help/submitter-guide/something". The (sub-)children of the top level "help" page are automatically added to the top Help menu dropdown.