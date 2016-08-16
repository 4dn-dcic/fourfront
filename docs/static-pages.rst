========================
Overview of new static page system
========================

The old "blocks" system of encode has been replaced with a much lighter static
page rendering system, which does not allow browser editing of pages. To
accompany this change, the page type was removed entirely. An example of such
a new static page is home.js, which renders the homepage. With this change,
(and any subsequent static page addition/change) there are two other files
that must be modified.

First, app.js must be changed to account for the new routing. This can be done
by adding a case for the location of the new static page within the code that
sets this.state.content for the App.

Second, any inserts into the static pages must be defined within /static/data/.
The homepage, for example, uses two files within this directory:
announcements_data and getting_started_data. The js objects defined within these
files are used to build the individual entries in the "Announcements" and
"Getting started" sections of the homepage. For these examples, to add an extra
entry, all one must do is add another entry to the appropriate file. For these
files, entries include an title, author, date, and content. As described in the
documentation on those pages, html syntax may be used within the content section

A list of all static pages:
- home.js
- announcements.js
- gettingstarted.js
- about.js
