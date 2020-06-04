

<div key="someRandomKey">
    <h3>Basic Usage</h3>
    <p>
        Use JSX component in body of static section of filetype that has a filetype of jsx. Show results of any search URL.
        For all search tables, it is imperative to supply at least the following 3 <code>props</code>, with which a minimal search table can be embedded:
    </p>

    <ul>
        <li key="0"><code>searchHref="/search/?type=Item..."</code> - This is the initial search URL, including URL query parameters, to search.</li>
        <li key="1"><code>{'schemas={schemas}'}</code> - This should always be <code>{'schemas={schemas}'}</code>, it means to use/pass-in in-code variable <code>schemas</code>, which contains definitions for facets, columns, property titles, and so forth by Item Type.</li>
        <li key="1"><code>{'session={session}'}</code> - This should always be <code>{'session={session}'}</code>, it means to use/pass-in in-code variable <code>session</code>, which is a boolean informing whether end-user is logged in, change of which triggers results refresh.</li>
        <li key="2"><code>{'key="anyRandomTextString"'}</code> - This should always be set to any random string value, it tells React to avoid completely initiating a new instance of this component on extraneous changes, e.g. browser window width. This may be excluded if your component is within a parent/root JSX element that has a <code>key</code> prop, such as this static section.</li>
    </ul>

    <hr className="mt-2"/>

    <h3>FacetList Configuration</h3>

    <h4 className="mt-2">No FacetList<br/><span className="text-400"><em><small>tldr:</small></em> <code>{"facets={null}"}</code></span></h4>

    <p>
        FacetList configuration is done via the <code>facets</code> prop.
        You can completely exclude a FacetList by passing in <code>null</code> as the value for the <code>facets</code> prop of EmbeddSearchTable.
        Passing in <code>null</code> is different than not defining <code>facets</code> at all, which has a differing effect.
    </p>

    <pre className="border rounded px-3 py-2">{'<EmbeddedItemSearchTable\n    searchHref="/search/?type=Item"\n    schemas={schemas}\n    session={session}\n    facets={null}\n/>'}</pre>

    <p>This generates the following table:</p>

    <EmbeddedItemSearchTable
        searchHref="/search/?type=Item"
        schemas={schemas}
        session={session}
        facets={null}
    />

    <h4 className="mt-4">Default Facets (from Schemas)<br/><span className="text-400">with optional exclusions</span></h4>

    <p>
        By not supplying a value for <code>facets</code>, leaving it undefined, will instruct the code to use the default Facets that are defined in schemas
        for the current Item type being searched. In many cases, will want to use the default facets for the Item type, but perhaps <em>remove</em> a few
        of them, such as facet for <code>type</code> field. This can be accomplished using the optional <code>hideFacets</code> prop, which if not provided will default
        to <code>["type", "validation_errors.name"]</code>. If you are defining the <code>searchHref</code> prop to (pre-)filter the results in some way aside from just <code>type</code>,
        you would also want to hide the facet that allows people to remove/cancel that filtration. Code example and result is below.
    </p>

    <pre className="border rounded px-3 py-2">{'<EmbeddedItemSearchTable\n    searchHref="/search/?type=File&file_format.file_format=fastq&status=released&award.project=4DN&file_type=reads"\n    schemas={schemas}\n    session={session}\n    hideFacets={["type", "validation_errors.name", "status", "file_format.file_format", "award.project", "file_type"]}\n/>'}</pre>

    <EmbeddedItemSearchTable
        searchHref="/search/?type=File&file_format.file_format=fastq&status=released&award.project=4DN&file_type=reads"
        schemas={schemas}
        session={session}
        hideFacets={["type", "validation_errors.name", "status", "file_format.file_format", "award.project", "file_type"]}
    />

    <h4 className="mt-4">(TODO) Custom Facets<br/><span className="text-400">NOT YET FUNCTIONAL</span></h4>

    <p>
        (In the future) You can also define and pass in your own complete facets object into the <code>facets</code> prop. It should be in the same form as the contents of <code>facets</code> property
        in the search response JSON (array).
    </p>

    <h5>Current issue & To-Do</h5>
    <p>
        The <code>facets</code> to pass in via the prop <b>must</b> currently also contain terms and term counts, which is... impossible to provide ahead of time.
        For custom facets to work, we must be able to pass in these facets TO the backend endpoint. We can perhaps migrate to POST requests for EmbeddedSearchView in
        mid-term future to allow for this and other features.
    </p>

    <h3>Columns Configuration</h3>

    <p>
        Overall this is very similar to FacetList configuration. There is a prop <code>columns</code> to which may provide an object of columns to completely customize
        or exclude it (or pass null) to default to the columns in schemas. Like the <code>hideFacets</code> prop, there is also a <code>hideColumns</code> prop which can be used to reduce the in-schema columns
        down.
    </p>

    <h4>Default Columns<br/><span className="text-400">with optional exclusions</span></h4>

    <pre className="border rounded px-3 py-2">{'<EmbeddedItemSearchTable\n    searchHref="/search/?type=File&file_format.file_format=fastq&status=released&award.project=4DN&file_type=reads"\n    schemas={schemas}\n    session={session}\n    columns={null} // excluding this would result in same effect (unlike with facets where null has special meaning)\n    facets={null} // null hides FacetList explictly.\n    hideColumns={[\n        "track_and_facet_info.experiment_type",\n        "track_and_facet_info.dataset",\n        "track_and_facet_info.assay_info",\n        "file_type",\n        "file_format.file_format"\n    ]}\n/>'}</pre>

    <EmbeddedItemSearchTable
        searchHref="/search/?type=File&file_format.file_format=fastq&status=released&award.project=4DN&file_type=reads"
        schemas={schemas}
        session={session}
        columns={null} // excluding this would result in same effect (unlike with facets where null has special meaning)
        facets={null} // null hides FacetList explictly.
        hideColumns={[
            "track_and_facet_info.experiment_type",
            "track_and_facet_info.dataset",
            "track_and_facet_info.assay_info",
            "file_type",
            "file_format.file_format"
        ]}
    />

<h4>Custom Columns</h4>

<pre className="border rounded px-3 py-2">{'<EmbeddedItemSearchTable\n    searchHref="/search/?type=File&file_format.file_format=fastq&status=released&award.project=4DN&file_type=reads"\n    schemas={schemas}\n    session={session}\n    facets={null} // null hides FacetList explictly.\n    columns={{\n        "display_title": {\n            "title": "Title"\n        },\n        "lab.display_title": {\n            "title": "Lab"\n        },\n        "track_and_facet_info.experiment_type" : {\n            "title" : "Experiment Type",\n            "description" : "Type of experiment to which this file belongs"\n        }\n    }}\n/>'}</pre>

<EmbeddedItemSearchTable
    searchHref="/search/?type=File&file_format.file_format=fastq&status=released&award.project=4DN&file_type=reads"
    schemas={schemas}
    session={session}
    facets={null}
    columns={{
        "display_title": {
            "title": "Title"
        },
        "lab.display_title": {
            "title": "Lab"
        },
        "track_and_facet_info.experiment_type" : {
            "title" : "Experiment Type",
            "description" : "Type of experiment to which this file belongs"
        }
    }}
/>

</div>

