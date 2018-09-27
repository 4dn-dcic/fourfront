# Documentation for 4DN/Fourfront Front-End


### This is a living document. Edit it as needed.

---

## Overview

The client/front-end for the [4DN Data Portal](https://data.4dnucleome.org) functions as a single-page application (SPA) and is written entirely in [ReactJS](https://reactjs.org/). This includes the output/rendering of the `<head>` document HTML element<sup>1</sup>.

<small>
<sup>1.</sup> <a href="https://github.com/facebook/react/pull/2311#issuecomment-58743271">Rendering 'head' element is against React best practices as of 2014</a> -- a long-term to-do includes refactoring this aspect of our front-end.
</small>

## Server-Side Rendering

The back-end system uses a [subprocess](https://docs.python.org/3/library/subprocess.html), which launches and runs [NodeJS](https://nodejs.org/en/) , to use React Server-Side Rendering to output a plaintext HTML source code, which is then streamed to end-user's browser. React, as part of the [babel](https://babeljs.io/)-compiled JS bundle, is then loaded through a `<script>` tag (defined in aforementioned HTML source code) and initalized to ["hydrate"](https://reactjs.org/docs/react-dom.html#hydrate) over (re-use) the server-side-rendered markup and make it interactive.

The NodeJS sub-process is started as a Pyramid ["tween"](https://docs.pylonsproject.org/projects/pyramid/en/latest/glossary.html#term-tween), which is run "be-_tween_" Pyramid generating the final JSON from endpoint and it being output delivered to the network/browser via the EC2 [WSGI](https://en.wikipedia.org/wiki/Web_Server_Gateway_Interface). This tween is activated as part of a collection of tweens imported or defined in `/src/encoded/renderers.py` _unless_ the request has `Accept: application/json` defined in its request header, or a similar condition (such as `?format=json` present as URI param).

A re-usable chunk of code for this "tween" and WSGI middleware is defined in the [subprocess_middleware](https://github.com/4dn-dcic/subprocess_middleware) and [subprocess-middleware-node](https://github.com/4dn-dcic/subprocess-middleware-node) repositories. These repositories' primary function is to take a root level 'React server-side render function' (defined in this repository), pipe the the JSON response to it, grab the outputted plaintext/utf-8-encoded HTML source code, and stream it to the browser in an optimized manner.

The front-end browser environment, after receiving the HTML response, then loads the compiled javascript bundle (via a `<script src="...bundle.js" async>` tag, in the HTML response/source), initializes and re-uses the server-side-rendered markup and hydrates/mounts React over it.

### Considerations

The server-side render cannot differ from the front-end render, so some features -- namely any which require access to the browser API (`window`, `document`, etc.) or a viewport -- cannot be used until the app or relevant component has been [mounted](https://reactjs.org/docs/react-component.html#componentdidmount). This mostly affects things with calculated dimensions, e.g. an element's width, or chart dimension, that is a function/product of browser viewport width; localized date times; etc. An "invariant error" will occur if any properties or attributes differ between server-side and client-side render (pre-`compoonentDidMount`)<sup>2</sup>.

<small>
<sup>2.</sup> As of React 16, "invariant" errors are less likely to be thrown because React version 16 introduced a <a href="https://hackernoon.com/whats-new-with-server-side-rendering-in-react-16-9b0d78585d67#4e11">less strict diffing algorithm</a> for when mounting/hydrating over server-side-rendered HTML.
</small>

## React Component Structure

`App.js` and its primary `App` component is the structural root of the front-end application. From there, the app branches out into several layout components. The `App` component is wrapped by a Redux store as well <sup>3</sup>.
A registry is used to determine which 'page view' to use for a given URI/endpoint/response according to the `@type` for the response. The App component itself renders one primary component -- the `BodyElement`, which renders the `<body>` tag, and then branches out into multiple other component and elements.

### Direct Descendant Components/Elements

Some of the components that App/BodyElement renders (or branches out to) are 'ever-present' on each page and don't change or change minimally in response to navigation, this includes Components such as `NavigationBar`, `PageTitle`, `Footer`, `QuickInfoBar`, and `FacetCharts`, as well as some elements (e.g. most things inside the `<head>` tag). Some of these render/return `null` when on a page which does not require them - namely `QuickInfoBar` and `FacetCharts`. `FacetCharts` & `QuickInfoBar` are defined in the root level BodyElement instead of deeper in tree, e.g. `HomePage` + `BrowseView` components, because it must stay present when transitioning/navigating from one page to the other (Home <-> Browse); being present twice on two separate views would cause it to be dismounted and re-mounted.

`NavigationBar` & `QuickInfoBar` receive selected props/state from App + BodyElement and render their (lack of) visibility - as well as other visual states, data, etc. - in response to them.

### Per-Type Views

Selection of a custom view to show, for example selecting the `ExperimentSetView` component for when are on a page/url for an ExperimentSet Item, is done through a "registry" (a fancy dictionary/mapping) of the Item `@type` value to React view component. This registry is called `content_views` and is instantiated and stored as a global variable in `globals.js`. These views all receive the same collection of React `props` which are passed in from App and BodyElement components, and include almost all of App & BodyElement props and state. For each "ItemView" component, the continuation of the rendering tree differs based upon the purpose of the view - e.g. displaying a sub-class component instance of `DefaultItemView` for Item views which contain a similar layout, a completely custom view for AJAXing in data for and displaying various charts, etc.

### Data Controllers - 'Alternatives' to Redux Store

This approach makes slightly less sense to do now given that we try to utilize React [PureComponents](https://codeburst.io/when-to-use-component-or-purecomponent-a60cfad01a81) when possible and selectively pass props down rendering tree in order to minimize unnecessary re-renders, however is still used, useful, and will probably remain useful for many cases such as when a large amount or breadth of `state` data is only needed for one or few views or components and nowhere else. Separating "controllers" - which control, store, and manage data from "view" which primarily receive props and returns elements, can be most helpful for organizing code and separating out concerns/functionality into separate places.

 Good examples of this include the `SortController` component used as part of `BrowseView` and `SearchView`'s `SearchResultTable` -- it stores `state.sortColumn`, `state.sortReverse`, and passes them down as props to its child component (which should transitively keep passing it down to any other components that need that data -- e.g. the search result table headers) alongside callback function `sortBy` which updates those state properties and performs a navigation request to get to properly-sorted results.

The ultimate example of this is the `ChartDataController` and its synchronized `ChartDataController.Provider` components, where ChartDataController fetches, stores, and provides callback functions for syncing ElasticSearch-aggregated data from the `/bar_plot_aggregations` endpoint. The ES-agged data is in turn used in/for a _few_ important but random and not 'close-together-in-rendering-tree' places - the QuickInfoBar (to get total current-filtered-in count), the BarPlot chart (for bucketed counts to use for bars, bar sections), the "Select All Files" button (if counts match, all files are selected.).

<small>
<sup>3.</sup> The Redux store wraps the App component as a parent and could technically be considered the "root" "component" as well by some, though it does not have a render method.
</small>

## Generating this documentation

To generate this documentation locally, with NPM, node, and all dependencies installed, run this from root directory: `./node_modules/.bin/esdoc`.
This should generate this documentation into `/docs/javascript-reference/` folder.

We are currently working on improving configuration of the root-level .esdoc.json file so that we can have the [ESDoc Hosting Service (beta)](https://doc.esdoc.org/) generate and host these docs.

## Future

New features are added, old ones are cleaned up. Certain components which were written in a rush ought to be re-factored, simplified, and/or redesigned to large extents.