# Higlass Visualization endpoint
This document explains the end to end behavior of the visualization endpoint.

##API Call

Make a POST request to `add_files_to_higlass_viewconf/`. The fourfront server will return the viewconf used to create 
Higlass Items.

###Payload
####`higlass_viewconfig`
A base viewconf to add the files to.
If not provided or null, the server uses a default "blank" viewconf.
####`files`
A list of file accessions. Each file will be added to the viewconf.
####`height`
Expected height for all of the tracks. If not provided, the default height is 600 pixels.
####`firstViewLocationAndZoom`
An array of 3 numbers. These correspond to the coordinates of the first view, as well as its zoom level.

The first 2 numbers indicate the center of the highlighted data, while the final number notes how zoomed in the view is.

The zoom level relies on d3 library's implementation, so if you want to experiment with it, find some already existing viewconfs and edit the location locks.

If not provided, the view will point at the center of the domain, with the zoom level covering the entire domain range.

####`remove_unneeded_tracks`
If there are no 2D Higlass tracks (for example, no mcool files,) and this to true, all of the left side tracks will be removed.
By default, this is false.

#### Example payload
```javascript
{
"files": ["4DNFIWG6CQQA", "4DNFIZJB62D1", "4DNFIWQJFZHS", "4DNFI9UM7MDC", "4DNFIZMTKWDI", "4DNFIC624FKJ"]
}
```

Creates a new viewconf. All of the files are checked to make sure they have the same genome assembly. Here's a sample output.

```javascript
{
  "success": true,
  "errors": "",
  "new_viewconfig": {
    <truncated>
  },
  "new_genome_assembly": "GRCh38"
}
```
</details>

You still need to POST or PATCH the `new_viewconf` object to `higlass-view-configs/` to create/edit a Higlass item.

### Viewconf limits
#### 1D tracks only
- Gene annotation files are always first, chromsizes files are always last
- Otherwise, each track is added to the top in order they are listed.
- There are no left side tracks (unless the view had a 2D track before. Use `remove_unneeded_tracks` in that case.)

#### Single 2D track
- The 1D tracks on top will be mirrored on the left side.
- Only 1 2D track in a given view. It will be in the center of the viewconf.
- A chromsizes grid is added on top of the 2D track.

#### Multiple 2D tracks
- Only 1 2D track per view.
- Adding another will copy the first view, replacing the track.
- All views are "locked" so scrolling or zooming one view will scroll/zoom the others.
- No more than 6 views per viewconf. If there are more than 2, the view will create a second row to add the third view.

### Errors and Issues
#### All files must have a uuid, higlass_uid and genome assembly
The POST still returns a 200 status, but the `errors` field will be non-empty and `success` will be false.
#### Make sure all of files have the same genome assembly
If the files have mismatched genome assemblies, you'll get an error.

```javascript
{
  "success": false,
  "errors": "Files have multiple genome assemblies: GRCh38: 4DNFIWG6CQQA, 4DNFIZJB62D1; GRCm38: 4DNFIU37KWB1, 4DNFIU37KWB1, 4DNFIU37KWB1, 4DNFIU37KWB1, 4DNFIU37KWB1, 4DNFIU37KWB1",
  "new_viewconfig": null,
  "new_genome_assembly": null
}
```
