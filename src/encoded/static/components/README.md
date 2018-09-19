# Documentation for 4DN/Fourfront Front-End

The client/front-end for the [4DN Data Portal](https://data.4dnucleome.org) functions as a single-page application (SPA) and is written entirely in React. The back-end EC2 servers run a Node.js subprocess, and if the requested content-type is HTML -- as should be the case for every single web browser -- the API response is passed through this Node.js subprocess which in turn renders the API response using React server-side rendering and then returns it as the server response.

The front-end browser environment then re-uses the server-side-rendered markup and mounts/initializes React over it. The server-side render cannot differ from the front-end render, so some features -- namely any which require access to the browser API (`window`, `document`, etc.) or a viewport -- cannot be used until the app or relevant component has been mounted. This mostly affects things with calculated dimensions, e.g. width that is a function of browser viewport width, as well as localized date times. An "invariant error" will occur if any properties or attributes differ between server-side and client-side render (pre-`compoonentDidMount`).

## Structure

`App.js` and its `App` component is the structural root of the front-end application. From there, the app branches out into several layout components.
A registry is used to determine which 'page view' to use for a given URI/endpoint/response according to the `@type` for the response.

The `App` component is wrapped by a Redux store as well.

## Generating this documentation

To generate this documentation locally, with NPM, node, and all dependencies installed, run this from root directory: `./node_modules/.bin/esdoc`.
This should generate this documentation into `/docs/javascript-reference/` folder.

## Future

New features are added, old ones are cleaned up. Certain components which were written in a rush ought to be re-factored, simplified, and/or redesigned to large extents. On the horizon is the refactoring of `AboveTableControls` which is a confusing mish-mash of very similar variable names. Furthermore, AboveTableControls are not quite responsive and maybe depend too much on the React-Bootstrap components (?).