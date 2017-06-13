'use strict';

import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';




// Use the href to determine if this is the experiment setType selected.
// If multiple selected (i.e. forced url), use the first
function typeSelected(href) {
    var title;
    var splitHref = href.split(/[?\&]+/);
    for(var i=0; i < splitHref.length; i++){
        var hrefKey = splitHref[i].split("=");
        if(hrefKey.length === 2 && hrefKey[0]==="experimentset_type"){
            title = hrefKey[1].replace(/\+/g,' ');
            break;
        }
    }
    if(title){
        return title;
    }else{
        return "replicates"; // default to replicates
    }
}

/*
// find all used file formats in the given context graph
function findFormats(graph) {
    var formats = [];
    var stringified = JSON.stringify(graph);
    var split = stringified.split(/[,}{]+/);
    for (var i=0; i<split.length; i++){
        var trySplit = split[i].split(':');
        if (trySplit.length === 2 && trySplit[0].replace(/"/g, '') === "file_format" && !_.contains(formats, trySplit[1].replace(/"/g, ''))){
            formats.push(trySplit[1].replace(/"/g, ''));
        }
    }
    return formats;
}
*/
/*
function findFiles(fileFormats) {
    var checkboxes = document.getElementsByName('file-checkbox');
    var fileStats = {};
    fileStats['checked'] = new Set();
    fileStats['formats'] = {};
    fileStats['uuids'] = new Set();
    var i;
    for(i=0; i<checkboxes.length; i++){
        // ID in form checked (boolean), passed (boolean), format, uuid
        var splitID = checkboxes[i].id.split('~');
        // check to see if file has already been found
        if(fileStats['uuids'].has(splitID[3])){
            continue;
        }else{
            fileStats['uuids'].add(splitID[3]);
            if(splitID[1] === "true" && fileStats['formats'][splitID[2]]){
                fileStats['formats'][splitID[2]].add(splitID[3]);
            }else if(splitID[1] === "true"){
                fileStats['formats'][splitID[2]] = new Set();
                fileStats['formats'][splitID[2]].add(splitID[3]);
            }
            if(splitID[0] === "true"){
                fileStats['checked'].add(splitID[3]);
            }
        }
    }
    for(i=0; i<fileFormats.length; i++){
        if(!fileStats['formats'][fileFormats[i]]){
            fileStats['formats'][fileFormats[i]] = new Set();
        }
    }
    return fileStats;
}
*/

//Dropdown facet for experimentset_type
/*
export const DropdownFacet = createReactClass({
    getDefaultProps: function() {
        return {width: 'inherit'};
    },

    getInitialState: function(){
        return{
            toggled: false
        };
    },

    handleToggle: function(){
        this.setState({toggled: !this.state.toggled});
    },

    render: function() {
        var facet = this.props.facet;
        var title = facet['title'];
        var field = facet['field'];
        var total = facet['total'];
        var terms = facet['terms'];
        var typeTitle = typeSelected(this.props.searchBase);
        var dropdownTitle = <span><span>{typeTitle}</span>{this.state.toggled ? <span className="pull-right"># sets</span> : <span></span>}</span>;
        return (
            <div style={{width: this.props.width}}>
                <h5>{title}</h5>
                <DropdownButton open={this.state.toggled} title={dropdownTitle} id={`dropdown-experimentset_type`} onToggle={this.handleToggle}>
                    {terms.map(function (term, i) {
                        return(
                            <Term {...this.props} key={i} term={term} total={total} typeTitle={typeTitle}/>
                        );
                    }.bind(this))}
                </DropdownButton>
            </div>
        );
    }
});
*/




// var FileButton = React.createClass({

//     getInitialState: function(){
//         return{
//             selected: true
//         };
//     },

//     handleToggle: function(){
//         this.setState({
//             selected: !this.state.selected
//         });
//         this.props.fxn(this.props.format, this.state.selected);
//     },

//     render: function(){
//         var selected = this.state.selected ? "success" : "default";
//         return(
//             <Button className="expset-selector-button" bsStyle={selected} bsSize="xsmall" onClick={this.handleToggle}>{this.props.format} ({this.props.count})</Button>
//         );
//     }
// });



//var ControlsAndResults = React.createClass({

    // TODO: ADJUST THIS!!! SELECTED FILES ARE NO LONGER GUARANTEED TO BE IN DOM!!!!!
    // They are now in ExperimentSetRows state. We need to grab state.selectedFiles from each.
    // We may in future store selectedFiles completely in Redux store or localStorage to allow a 'shopping cart' -like experience.

    //getInitialState: function(){
    //    var initStats = {};
    //    initStats['checked'] = new Set();
    //    initStats['formats'] = {};
    //    initStats['uuids'] = new Set();
    //    var defaultFormats = new Set();
    //    for(var i=0; i<this.props.fileFormats.length; i++){
    //        defaultFormats.add(this.props.fileFormats[i]);
    //    }
    //    return{
    //        fileStats: initStats,
    //        filesToFind: defaultFormats
    //    }
    //},

    //componentDidMount: function(){
    //    var currStats = findFiles(this.props.fileFormats);
    //    this.setState({
    //        fileStats: currStats
    //    });
    //    // update after initiating
    //    this.forceUpdate();
    //},

    //componentDidUpdate: function(nextProps, nextState){
    //    if (nextProps.expSetFilters !== this.props.expSetFilters || nextProps.context !== this.props.context){
    //        // reset file filters when changing set type
    //        var currStats = findFiles(this.props.fileFormats);
    //        if(this.state.fileStats.formats !== currStats.formats){
    //            this.setState({
    //                fileStats: currStats
    //            });
    //        }
    //    }
    //},

    /** 
     * DEPRECATED (probably), get current selected files sets via this.getSelectedFiles(), keyed by experiment set @id. 
     * Use _.flatten(_.values(this.getSelectedFiles())) to get single array of selected files, maybe also wrapped in a _.uniq() if files might be shared between expsets.
     */
    //downloadFiles: function(e){
    //    e.preventDefault();
    //    var currStats = findFiles(this.props.fileFormats);
    //    var checkedFiles = currStats['checked'] ? currStats['checked'] : new Set();
    //    console.log('____DOWNLOAD THESE ' + checkedFiles.size + ' FILES____');
    //    console.log(checkedFiles);
    //},

    /** DEPRECATED */
    //selectFiles: function(format, selected){
    //    var newSet = this.state.filesToFind;
    //    if(newSet.has(format) && selected){
    //        newSet.delete(format);
    //    }else if(!selected){
    //        newSet.add(format);
    //    }
    //    this.setState({
    //        filesToFind: newSet
    //    });
    //},

//});
