<div key="someRandomKey">
    <h3>Basic Usage</h3>
    <p>
        <code>HiGlassEmbeddedInstance</code> is a JSX component for embedding HiGlass View Config items into a static section
        that has a filetype of jsx. For all HiGlass embedded instances, it is imperative to supply at least 2 props, <code>uuid</code> and <code>key</code>.
    </p>
    <ul>
        <li key="0"><code>{'uuid="00000000-1111-00..."'}</code> - required - This is the uuid of HiGlass View Config item.</li>
        <li key="1"><code>{'key="anyRandomTextString"'}</code> - required - This should always be set to any random string value, it tells React to avoid completely initiating a new instance of this component on extraneous changes, e.g. browser window width. This may be excluded if your component is within a parent/root JSX element that has a <code>key</code> prop, such as this static section.</li>
        <li key="2"><code>{'headerElement="any header tag e.g. h1, h2 ..."'}</code> - headerElement is optional, you can completely exclude it by not defining <code>headerElement</code> prop at all. Default value is <code>h3</code>, other possible/recommended values are <code>h1</code>, <code>h2</code>, <code>h3</code>, <code>h4</code>, <code>h5</code> or <code>h6</code>.</li>
    </ul>
    <h3>Examples</h3>
    <p><code>HiGlassEmbeddedInstance</code> grabs <code>title</code>, <code>description</code> and <code>collapsible</code> fields from HiGlass View Config item. If HiGlass View Config item is collapsible then HiGlassEmbeddedInstance renders it in a collapsible panel and the opposite is also true.</p>
    <h4 className="mt-3">1. Non-collapsible</h4>
    <pre className="border rounded px-3 py-2">{'<HiGlassEmbeddedInstance uuid="00000000-1111-0000-1111-000000000001" key="higlass-instance-1"/>'}</pre>
    <p>This generates the following display:</p>
    <HiGlassEmbeddedInstance uuid="00000000-1111-0000-1111-000000000001" key="higlass-instance-1" />
    <h4 className="mt-3">2. Collapsible</h4>
    <pre className="border rounded px-3 py-2">{'<HiGlassEmbeddedInstance uuid="00000000-1111-0000-1111-000000000003" key="higlass-instance-2"/>'}</pre>
    <p>This generates the following display:</p>
    <HiGlassEmbeddedInstance uuid="00000000-1111-0000-1111-000000000003" key="higlass-instance-2" />
    <h4 className="mt-3">3. Multiple Instances with Custom headerElement prop</h4>
    <p>Multiple HiGlassEmbeddedInstances can be embedded along with custom HTML markup:</p>
    <pre className="border rounded px-3 py-2">
        {'<p>Insert any text here e.g. Below are the insulation scores and boundary calls produced by different members of the 4DN Network, along with the results produced by DCIC.</p>'}
        {'<HiGlassEmbeddedInstance uuid="00000000-1111-0000-1111-000000000003" headerElement="h4" key="higlass-instance-3"/>'}
        {'<HiGlassEmbeddedInstance uuid="00000000-1111-0000-1111-000000000001" headerElement="h2" key="higlass-instance-4"/>'}
    </pre>
    <p>This generates the following display:</p>
    <p>Insert any text here e.g. Below are the insulation scores and boundary calls produced by different members of the 4DN Network, along with the results produced by DCIC.</p>
    <HiGlassEmbeddedInstance uuid="00000000-1111-0000-1111-000000000003" headerElement="h4" key="higlass-instance-3" />
    <HiGlassEmbeddedInstance uuid="00000000-1111-0000-1111-000000000001" headerElement="h2" key="higlass-instance-4" />
</div>