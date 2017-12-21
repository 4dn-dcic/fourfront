'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox, Collapse } from 'react-bootstrap';
import _ from 'underscore';
import { FacetList } from './FacetList';
import { expFxn, Filters, console, isServerSide, analytics, object, Schemas } from './../../util';
import { requestAnimationFrame } from './../../viz/utilities';



/**
 * Label to show at top left of Name block.
 */
export class StackedBlockNameLabel extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.copyAccessionButton = this.copyAccessionButton.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.state = {
            'mounted' : false
        };
    }

    componentDidMount(){
        this.setState({ mounted : true });
    }

    copyAccessionButton(){
        if (!this.props.accession) return null;
        if (!this.state.mounted || isServerSide() || !document || !document.createElement || !document.execCommand) return null;

        function copy(){
            var textArea = document.createElement('textarea');
            textArea.style.top = '-100px';
            textArea.style.left = '-100px';
            textArea.style.position = 'absolute';
            textArea.style.width = '5px';
            textArea.style.height = '5px';
            textArea.style.padding = 0;
            textArea.style.border = 'none';
            textArea.style.outline = 'none';
            textArea.style.boxShadow = 'none';

            // Avoid flash of white box if rendered for any reason.
            textArea.style.background = 'transparent';
            textArea.value = this.props.accession;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                var successful = document.execCommand('copy');
                var msg = successful ? 'successful' : 'unsuccessful';
                console.log('Copying text command was ' + msg);
                this.flashEffect();
                analytics.event('StackedTable', 'Copy', {
                    'eventLabel' : 'Accession',
                    'name' : this.props.accession
                });
            } catch (err) {
                console.error('Oops, unable to copy');
                analytics.event('StackedTable', 'ERROR', {
                    'eventLabel' : 'Unable to copy accession',
                    'name' : this.props.accession
                });
            }
        }

        return (
            <i className="icon icon-fw icon-copy" title="Copy to clipboard" onClick={copy.bind(this)} />
        );
    }

    flashEffect(){
        if (!this.refs || !this.refs.subtitle) return null;
        this.refs.subtitle.style.transform = 'scale3d(1.2, 1.2, 1.2) translate3d(10%, 0, 0)';
        setTimeout(()=>{
            this.refs.subtitle.style.transform = '';
        }, 100);
    }

    render(){

        var { title, subtitle, accession, inline, className } = this.props;

        function titleElement(){
            return React.createElement(
                inline ? 'span' : 'div',
                { className : "label-title" },
                title
            );
        }

        function subtitleElement(){
            if (!accession && !subtitle) return null;
            return React.createElement(
                inline ? 'span' : 'div',
                {
                    className : "ext" + (accession ? ' is-accession' : ''),
                    ref : 'subtitle'
                },
                <span>
                    { accession || subtitle } { this.copyAccessionButton() }
                </span>
            );
        }

        var fullClassName = "label-ext-info";
        if (typeof className === 'string') fullClassName += ' ' + className;
        if (subtitle !== null) fullClassName += ' has-subtitle';

        return (
            <div className={fullClassName} ref="labelContainerElement">
                { titleElement() }
                { subtitleElement.call(this) }
            </div>
        );
    }

}

/**
 * Name element to be put inside of StackedBlocks as the first child.
 */
export class StackedBlockName extends React.Component {

    static Label = StackedBlockNameLabel
    
    static propTypes = {
        'columnClass' : PropTypes.string,
        'colWidthStyles' : PropTypes.object,
        'label' : PropTypes.shape({
            title : PropTypes.node,
            subtitle : PropTypes.node,
            subtitleVisible : PropTypes.bool
        }),
        'style' : PropTypes.object,
        'visible' : PropTypes.bool, // ? forgot
        'verticalAlign' : PropTypes.string // CSS vertical-align property. Change alignment/positioning if wanted.
        
    }

    static defaultProps = {
        visible : true
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.getColumnWidthStyle = this.getColumnWidthStyle.bind(this);
        this.adjustedChildren = this.adjustedChildren.bind(this);
    }

    getColumnWidthStyle(){
        if (this.props.colWidthStyles && typeof this.props.colWidthStyles[this.props.columnClass] !== 'undefined'){
            return this.props.colWidthStyles[this.props.columnClass];
        }

        if (
            this.props.expTable &&
            this.props.expTable.state &&
            Array.isArray(this.props.expTable.state.columnWidths)
        ){
            var colWidthIndex = _.findIndex(this.props.expTable.columnHeaders(), { 'columnClass' : this.props.columnClass });
            if (colWidthIndex > -1) return { 'width' : this.props.expTable.state.columnWidths[colWidthIndex] };
        }

        return null;
    }

    adjustedChildren(){
        return React.Children.map(this.props.children, (c)=>{

            var addedProps = {};
            if (c && c.props && typeof c.props.className === 'string' && c.props.className.indexOf('name-title') === -1){
                addedProps.className = c.props.className + ' name-title';
            }

            if (c && c.type && typeof c.type === 'function'){
                // Is component, not element.
                addedProps.stackDepth = this.props.stackDepth;
                if (this.props.colWidthStyles && !c.props.colWidthStyles){
                    addedProps.colWidthStyles = this.props.colWidthStyles;
                }
                if (this.props.experimentSetType && !c.props.experimentSetType){
                    addedProps.experimentSetType = this.props.experimentSetType;
                }
                if (this.props.experimentSetAccession && !c.props.experimentSetAccession){
                    addedProps.experimentSetAccession = this.props.experimentSetAccession;
                }
                if (this.props.nonFileHeaderCols && !c.props.nonFileHeaderCols){
                    addedProps.nonFileHeaderCols = this.props.nonFileHeaderCols;
                }
                if (this.props.selectedFiles && !c.props.selectedFiles){
                    addedProps.selectedFiles = this.props.selectedFiles;
                }
                if (this.props.columnHeaders && !c.props.columnHeaders){
                    addedProps.columnHeaders = this.props.columnHeaders;
                }
                if (this.props.handleFileCheckboxChange && !c.props.handleFileCheckboxChange){
                    addedProps.handleFileCheckboxChange = this.props.handleFileCheckboxChange;
                }
            }
            
            if (_.keys(addedProps).length > 0){
                return React.cloneElement(c, addedProps, c.props.children);
            }

            return c;
        });
    }

    render(){
        if (!this.props.visible) return null;
        var style = null;
        var colWidthStyle = this.getColumnWidthStyle();
        if (colWidthStyle){
            if (this.props.colStyle) style = _.extend(_.clone(colWidthStyle), this.props.colStyle);
            else style = _.clone(colWidthStyle);
        }
        if (this.props.relativePosition){
            if (style) style.position = 'relative';
            else style = { 'position' : 'relative' };
        }
        if (this.props.verticalAlign){
            if (style) style.verticalAlign = this.props.verticalAlign;
            else style = { 'verticalAlign' : this.props.verticalAlign };
        }
        if (this.props.style){
            if (style) style = _.extend({}, this.props.style, style);
            else style = _.clone(this.props.style);
        }
        return (
            <div className={"name col-" + this.props.columnClass} style={style}>
                { this.props.label ?
                    <StackedBlockName.Label {..._.extend({}, this.props.label, {
                        inline : false,
                        className : this.props.label.subtitleVisible === true ? 'subtitle-visible' : null
                    })} />
                    : null }
                { this.adjustedChildren() }
            </div>
        );
    }

}

/**
 * Button to toggle collapse/visible of longer StacedkBlockLists. Used in StackedBlockLists.
 */
export class StackedBlockListViewMoreButton extends React.Component {
    
    static propTypes = {
        collapsibleChildren : PropTypes.array,
        collapsed : PropTypes.bool,
        handleCollapseToggle : PropTypes.func
        // + those from parent .List
    }

    constructor(props){
        super(props);
        this.shouldComponentUpdate = this.shouldComponentUpdate.bind(this);
        this.render = this.render.bind(this);
    }

    shouldComponentUpdate(nextProps){
        if (this.props.collapsed !== nextProps.collapsed) return true;
        if (this.props.currentlyCollapsing !== nextProps.currentlyCollapsing) return true;
        if (this.props.title !== nextProps.title) return true;
        if (this.props.showMoreExtTitle !== nextProps.showMoreExtTitle) return true;
        return false;
    }

    render(){

        if (this.props.collapsibleChildren.length === 0) return null;

        var collapsedMsg = this.props.collapsed &&
        (this.props.currentlyCollapsing ?
            (this.props.currentlyCollapsing === this.props.parentID ? false : true)
            :
            true
        );

        function collapseTitle(){
            var title;
            if (collapsedMsg){
                title = "Show " + this.props.collapsibleChildren.length + " More";
            } else {
                title = "Show Fewer";
            }
            if (this.props.title) title += ' ' + this.props.title;

            function extTitle(){
                if (!this.props.showMoreExtTitle || !collapsedMsg) return null;
                return <span className="ext text-400"> { this.props.showMoreExtTitle }</span>;
            }

            return <span>{ title }{ extTitle.call(this) }</span>;
        }

        return (
            <div className="view-more-button" onClick={this.props.handleCollapseToggle}>
                <i className={"icon icon-" + (collapsedMsg ? 'plus': 'minus')}></i>
                &nbsp; { collapseTitle.call(this) }
            </div>
        );
    }
}

/**
 * List which can be put inside a StackedBlock, after a StackedBlockName, and which holds other StackedBlocks.
 */
export class StackedBlockList extends React.Component {

    static ViewMoreButton = StackedBlockListViewMoreButton

    static propTypes = {
        title : PropTypes.string,
        showMoreExtTitle : PropTypes.string,
        collapseLimit : PropTypes.number,
        collapseShow : PropTypes.number,
        expTable : PropTypes.any,
        collapseLongLists : PropTypes.bool.isRequired
    }

    static defaultProps = {
        collapseLimit : 4,
        collapseShow : 3,
        //collapseLongLists : true
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.adjustedChildren = this.adjustedChildren.bind(this);
        this.handleCollapseToggle = this.handleCollapseToggle.bind(this);
        if (this.props.collapseLongLists && Array.isArray(this.props.children) && this.props.children.length > this.props.collapseLimit){
            this.state = { 'collapsed' : true };
        }
    }

    adjustedChildren(){
        return React.Children.map(this.props.children, (c)=>{

            //console.log('LIST_CHILD', c, typeof c)

            //if (c.type.displayName !== 'StackedBlock') return c; // Only add props to StackedBlocks
            var addedProps = {};

            addedProps.stackDepth = this.props.stackDepth + 1;

            if (this.props.parentIDList && !c.props.parentIDList){
                addedProps.parentIDList = this.props.parentIDList;
            }
            if (this.props.currentlyCollapsing && !c.props.currentlyCollapsing){
                addedProps.currentlyCollapsing = this.props.currentlyCollapsing;
            }
            if (this.props.expTable && !c.props.expTable){
                addedProps.expTable = this.props.expTable;
            }
            if (this.props.colWidthStyles && !c.props.colWidthStyles){
                addedProps.colWidthStyles = this.props.colWidthStyles;
            }
            if (this.props.experimentSetType && !c.props.experimentSetType){
                addedProps.experimentSetType = this.props.experimentSetType;
            }
            if (this.props.experimentSetAccession && !c.props.experimentSetAccession){
                addedProps.experimentSetAccession = this.props.experimentSetAccession;
            }
            if (this.props.nonFileHeaderCols && !c.props.nonFileHeaderCols){
                addedProps.nonFileHeaderCols = this.props.nonFileHeaderCols;
            }
            if (this.props.selectedFiles && !c.props.selectedFiles){
                addedProps.selectedFiles = this.props.selectedFiles;
            }
            if (this.props.columnHeaders && !c.props.columnHeaders){
                addedProps.columnHeaders = this.props.columnHeaders;
            }
            if (this.props.handleFileCheckboxChange && !c.props.handleFileCheckboxChange){
                addedProps.handleFileCheckboxChange = this.props.handleFileCheckboxChange;
            }
            if (typeof this.props.collapseLongLists === 'boolean' && typeof c.props.collapseLongLists !== 'boolean'){
                addedProps.collapseLongLists = this.props.collapseLongLists;
            }
            if (_.keys(addedProps).length > 0){
                return React.cloneElement(c, addedProps, c.props.children);
            }
            return c;
        });
    }

    handleCollapseToggle(){
        if (this.props.expTable && this.props.expTable.state && !this.props.expTable.state.collapsing){
            this.props.expTable.setState({
                'collapsing' : this.props.rootList ? 'root' :
                    this.props.parentID || this.props.className || true
            }, ()=>{
                this.setState({ 'collapsed' : !this.state.collapsed });
            });
        } else this.setState({ 'collapsed' : !this.state.collapsed });
    }

    render(){
        var children = this.adjustedChildren();

        var className = "s-block-list " + (this.props.className || '') + (' stack-depth-' + this.props.stackDepth);
        var timeout = 350; // Default
        if (!this.props.collapseLongLists || !Array.isArray(children) || children.length <= this.props.collapseLimit) {
            // Don't have enough items for collapsible element, return plain list.
            return <div className={className}>{ children }</div>;
        }

        var collapsibleChildren = children.slice(this.props.collapseShow);
        if (collapsibleChildren.length > 18) {
            className += ' transition-slow';
            timeout = 1000;
        } else if (collapsibleChildren.length > 9) {
            className += ' transition-med';
            timeout = 500;
        }

        var transitionFinish = function(){
            if (this.props.expTable && this.props.expTable.state){
                this.props.expTable.setState({ 'collapsing' : false });
            }
        }.bind(this);

        return (
            <div className={className} data-count-collapsed={collapsibleChildren.length}>
                { children.slice(0, this.props.collapseShow) }
                <Collapse in={!this.state.collapsed} timeout={timeout} onExited={transitionFinish} onEntered={transitionFinish}>
                    <div className="collapsible-s-block-ext">{ collapsibleChildren }</div>
                </Collapse>
                <StackedBlockListViewMoreButton
                    collapsibleChildren={collapsibleChildren}
                    collapsed={this.state.collapsed}
                    handleCollapseToggle={this.handleCollapseToggle}
                    {...this.props}
                />
            </div>
        );
    }

}

export class StackedBlock extends React.Component {

    static Name = StackedBlockName

    static List = StackedBlockList

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.adjustedChildren = this.adjustedChildren.bind(this);
        this.childIDList = new Set();
    }

    adjustedChildren(){
        return React.Children.map(this.props.children, (c) => {
            if (c === null) return null;
            var addedProps = {};

            addedProps.stackDepth = this.props.stackDepth;

            if (!c.props.columnClass && this.props.columnClass) addedProps.columnClass = this.props.columnClass;
            if (!c.props.colWidthStyles && this.props.colWidthStyles) addedProps.colWidthStyles = this.props.colWidthStyles;
            if (!c.props.label && this.props.label) addedProps.label = this.props.label;
            if (!c.props.expTable && this.props.expTable) addedProps.expTable = this.props.expTable;
            if (!c.props.experimentSetType && this.props.experimentSetType) addedProps.experimentSetType = this.props.experimentSetType;
            if (!c.props.currentlyCollapsing && this.props.currentlyCollapsing) addedProps.currentlyCollapsing = this.props.currentlyCollapsing;

            if (this.props.selectedFiles && !c.props.selectedFiles){
                addedProps.selectedFiles = this.props.selectedFiles;
            }
            if (this.props.experimentSetAccession && !c.props.experimentSetAccession){
                addedProps.experimentSetAccession = this.props.experimentSetAccession;
            }
            if (this.props.nonFileHeaderCols && !c.props.nonFileHeaderCols){
                addedProps.nonFileHeaderCols = this.props.nonFileHeaderCols;
            }
            if (this.props.columnHeaders && !c.props.columnHeaders){
                addedProps.columnHeaders = this.props.columnHeaders;
            }
            if (this.props.handleFileCheckboxChange && !c.props.handleFileCheckboxChange){
                addedProps.handleFileCheckboxChange = this.props.handleFileCheckboxChange;
            }
            if (typeof this.props.collapseLongLists === 'boolean' && typeof c.props.collapseLongLists !== 'boolean'){
                addedProps.collapseLongLists = this.props.collapseLongLists;
            }

            if (c.props.children){
                // Grab & save child s-block ids (one level deep)
                React.Children.forEach(c.props.children, (cc)=>{
                    if (cc.props && typeof cc.props.id === 'string'){
                        this.childIDList.add(cc.props.id);
                    }
                });
            }
            if (this.props.id){
                // Pass down (and include self in) parent s-block ids to child elements.
                if (this.props.parentIDList){
                    addedProps.parentIDList = new Set(this.props.parentIDList);
                } else {
                    addedProps.parentIDList = new Set();
                }
                addedProps.parentIDList.add(this.props.id);
                addedProps.parentID = this.props.id;
            }
            if (Object.keys(addedProps).length > 0){
                return React.cloneElement(c, addedProps, c.props.children);
            } else return c;
        });
    }

    render(){
        var className = this.props.columnClass ? this.props.columnClass + ' ' : '';
        className += "s-block"  + (' stack-depth-' + this.props.stackDepth);
        if (this.props.hideNameOnHover) className += ' hide-name-on-block-hover';
        if (this.props.keepLabelOnHover) className += ' keep-label-on-name-hover';
        if (typeof this.props.stripe !== 'undefined' && this.props.stripe !== null){
            if (this.props.stripe === true || this.props.stripe === 'even') className += ' even';
            else className += ' odd';
        }
        if (this.props.currentlyCollapsing){
            className += ' s-block-list-collapsing collapsing-' + this.props.currentlyCollapsing;
            if (
                this.props.currentlyCollapsing === this.props.id ||
                this.props.currentlyCollapsing === 'root' ||
                ((this.props.parentIDList instanceof Set) && this.props.parentIDList.has(this.props.currentlyCollapsing)) ||
                ((this.childIDList instanceof Set) && this.childIDList.has(this.props.currentlyCollapsing))
            ) className += ' collapsing-child';
        }
        if (typeof this.props.className === 'string') className += ' ' + this.props.className;
        return (
            <div className={className}>
                { this.adjustedChildren() }
            </div>
        );
    }

}





export class FilePairBlock extends React.Component {
    
    static accessionTriplesFromProps(props){
        var accessionTriples;
        try {
            accessionTriples = expFxn.filesToAccessionTriples(props.files, true);
        } catch (e){
            accessionTriples = _.map(props.files, (fileObj)=>{
                return [ props.experimentSetAccession || null, (props.experiment || {}).accession || null, fileObj.accession || null ].join('~');
            });
        }
        return accessionTriples;
    }

    static propTypes = {
        'selectedFiles' : PropTypes.object,
        'handleFileCheckboxChange' : PropTypes.func,
        'files' : PropTypes.array
    }

    constructor(props){
        super(props);
        this.isChecked = this.isChecked.bind(this);
        this.renderFileEntryBlock = this.renderFileEntryBlock.bind(this);
        this.renderCheckBox = this.renderCheckBox.bind(this);
        this.nameColumn = this.nameColumn.bind(this);
        this.render = this.render.bind(this);
    }

    isChecked(accessionTriples){
        if (!accessionTriples){
            accessionTriples = FilePairBlock.accessionTriplesFromProps(this.props);
        }
        if (!Array.isArray(this.props.files) || !this.props.selectedFiles || !this.props.files[0].accession) return null;
        if (this.props.files.length === 0) return false;
        for (var i = 0; i < this.props.files.length; i++){
            if (typeof this.props.selectedFiles[accessionTriples[i]] === 'undefined') return false;
        }
        return true;
    }

    renderFileEntryBlock(file,i){
        return (
            <FileEntryBlock
                key={object.atIdFromObject(file)}
                file={file}
                columnHeaders={this.props.columnHeaders}
                handleFileCheckboxChange={this.props.handleFileCheckboxChange}
                nonFileHeaderCols={this.props.nonFileHeaderCols}
                selectedFiles={this.props.selectedFiles}
                className={null}
                isSingleItem={this.props.files.length < 2 ? true : false}
                pairParent={this}
                type="paired-end"
                colWidthStyles={this.props.colWidthStyles}
                experiment={this.props.experiment}
                experimentSetAccession={this.props.experimentSetAccession}
            />
        );
    }

    renderCheckBox(){
        var accessionTriples = FilePairBlock.accessionTriplesFromProps(this.props);
        var checked = this.isChecked();
        if (checked === null) return null;

        return (
            <Checkbox
                validationState='warning'
                checked={checked}
                name="file-checkbox"
                id={'checkbox-for-' + accessionTriples.join('_')}
                className='exp-table-checkbox'
                data-select-files={accessionTriples}
                onChange={this.props.handleFileCheckboxChange.bind(
                    this.props.handleFileCheckboxChange,
                    accessionTriples,
                    this.props.files
                )}
            />
        );
    }

    nameColumn(){
        if (this.props.colVisible === false) return null;
        var label = null;
        if (typeof this.props.label === 'string'){
            label = <StackedBlock.Name.Label title="Pair" subtitle={this.props.label} />;
        } else if (typeof this.props.label === 'object' && this.props.label){
            label = <StackedBlock.Name.Label {...this.props.label} />;
        }
        return (
            <div className="name col-file-pair" style={this.props.colWidthStyles ? _.clone(this.props.colWidthStyles['file-pair']) : null}>
                { label }
                <div className="name-title">
                    { this.renderCheckBox() }
                    { this.props.name }
                </div>
            </div>
        );
    }

    render(){
        return (
            <div className="s-block file-pair keep-label-on-name-hover">
                { this.nameColumn() }
                <div className="files s-block-list">
                    { Array.isArray(this.props.files) ?
                        this.props.files.map(this.renderFileEntryBlock)
                        :
                        <FileEntryBlock
                            file={null}
                            columnHeaders={ this.props.columnHeaders }
                            colWidthStyles={this.props.colWidthStyles}
                            experiment={this.props.experiment}
                            experimentSetAccession={this.props.experimentSetAccession}
                        />
                    }
                </div>
            </div>
        );
    }
}

const fileEntryBlockMixins = {

    isChecked : function(){
        if (!this.props.file || !this.props.file.accession || !this.props.selectedFiles) return null;
        var accessionTriple = FileEntryBlock.accessionTripleFromProps(this.props);
        return this.props.selectedFiles[accessionTriple];
    },

    renderCheckBox : function(){
        if (!this.props.file) return null; // No file to select.
        if (this.props.pairParent) return null; // Part of pair -- FilePairBlock has own checkbox.
        if (this.props.excludeCheckbox) return null;

        var accessionTriple = FileEntryBlock.accessionTripleFromProps(this.props);

        var checked = this.isChecked();
        if (checked === null) return null; // No checked state.
        return (
            <Checkbox
                validationState='warning'
                checked={checked}
                name="file-checkbox"
                id={'checkbox-for-' + accessionTriple}
                className='file-entry-table-checkbox'
                data-select-files={[accessionTriple]}
                onChange={this.props.handleFileCheckboxChange.bind(
                    this.props.handleFileCheckboxChange,
                    accessionTriple,
                    this.props.file
                )}
            />
        );
    }

};

export class FileEntryBlockPairColumn extends React.Component {

    constructor(props){
        super(props);
        this.isChecked = fileEntryBlockMixins.isChecked.bind(this);
        this.renderCheckBox = fileEntryBlockMixins.renderCheckBox.bind(this);
    }
    
    render(){
        var tableHasFilePairColumn = _.pluck(this.props.columnHeaders || [], 'title').indexOf('File Pair') > -1;
        return (
            <StackedBlock
                {...this.props}
                label={{ 'title' : 'File' }}
                hideNameOnHover={false}
                keepLabelOnHover={!tableHasFilePairColumn}
                columnClass={this.props.columnClass || 'file-pair'}
            >
                { tableHasFilePairColumn ? <StackedBlockName>{ this.renderCheckBox() }</StackedBlockName> : null }
                <StackedBlockList title="Files" className="files">
                    <FileEntryBlock
                        file={this.props.file}
                        experiment={this.props.experiment}
                        isSingleItem={this.props.isSingleItem}
                        excludeCheckbox={tableHasFilePairColumn}
                        label={tableHasFilePairColumn ? null : FileEntryBlock.defaultProps.label}
                    />
                </StackedBlockList>
            </StackedBlock>
        );
    }

}

export class FileEntryBlock extends React.Component {

    static accessionTripleFromProps(props){
        var accessionTriple;
        try {
            accessionTriple = expFxn.fileToAccessionTriple(props.file, true);
        } catch (e){
            accessionTriple =  [ props.experimentSetAccession || null, props.experimentAccession || (props.experiment || {}).accession || null, (props.file || {}).accession || null ].join('~');
        }
        return accessionTriple;
    }

    static propTypes = {
        'selectedFiles' : PropTypes.object,
        'handleFileCheckboxChange' : PropTypes.func,
        'excludeCheckbox' : PropTypes.bool
    }

    static defaultProps = {
        'excludeCheckbox' : false,
        'label' : {
            'title' : 'File',
            'subtitle' : null
        },
        'hideNameOnHover' : false,
        'keepLabelOnHover' : true
    }

    constructor(props){
        super(props);
        this.isChecked = fileEntryBlockMixins.isChecked.bind(this);
        this.filledFileRow = this.filledFileRow.bind(this);
        this.renderCheckBox = fileEntryBlockMixins.renderCheckBox.bind(this);
        this.renderName = this.renderName.bind(this);
        this.render = this.render.bind(this);
    }

    fileTypeSummary(file = this.props.file){
        var summary = file.file_type_detailed || ((file.file_type && file.file_format && (file.file_type + ' (' + file.file_format + ')')) || file.file_type) || file.file_format || '-' ;
        // Remove 'other' because it just takes up horizontal space.
        if (summary.slice(0, 6).toLowerCase() === 'other '){
            return summary.slice(7).slice(0, -1);
        }
        return summary;
    }

    filledFileRow (file = this.props.file){

        var row = [];
        var cols = _.filter(this.props.columnHeaders, (col)=>{
            if (col.columnClass === 'file-detail') return true;
            return false;
            //if (this.props.nonFileHeaderCols.indexOf(col.columnClass) > -1) return false;
            //return true;
        });
        var baseClassName = (this.props.className || '') + " col-file-detail item";
        
        for (var i = 0; i < cols.length; i++){

            var col = cols[i];
            var className = baseClassName + ' col-' + col.columnClass + ' detail-col-' + i;
            var title = col.valueTitle || col.title;
            var baseStyle = this.props.colWidthStyles ? this.props.colWidthStyles[col.field || col.columnClass || 'file-detail'] : null;

            if (!file || !object.atIdFromObject(file)) {
                row.push(<div key={"file-detail-empty-" + i} className={className} style={baseStyle}></div>);
                continue;
            }

            if (title === 'File Type'){
                row.push(<div key="file-type" className={className} style={baseStyle}>{ this.fileTypeSummary() }</div>);
                continue;
            }

            if (typeof col.field === 'string'){
                var val = object.getNestedProperty(file, col.field);
                row.push(
                    <div key={col.field} className={className} style={baseStyle}>
                        { Schemas.Term.toName(col.field, val) || '-' }
                    </div>
                );
                continue;
            }

            if (title === 'File Info'){ // AKA Paired Info
                if (typeof file.paired_end !== 'undefined') {
                    row.push(<div key="file-info" className={className} style={baseStyle}>Paired end {file.paired_end}</div>);
                } else if (file.file_format === 'fastq' || file.file_format === 'fasta') {
                    row.push(<div key="file-info" className={className} style={baseStyle}>Unpaired</div>);
                } else {
                    row.push(<div key="file-info" className={className} style={baseStyle}></div>);
                }
                continue;
            }
        }
        return row;
    }

    renderName(){

        var file = this.props.file;

        function titleString(){
            if (!file) return 'No Files';
            return file.accession || file.uuid || object.atIdFromObject(file) || (file.error && <em>{ file.error }</em>) || 'N/A';
        }

        function title(){
            if (!file || !object.atIdFromObject(file)) return <div className="name-title">{ titleString.call(this) }</div>;
            return (
                <a className="name-title mono-text" href={ object.atIdFromObject(file) || '#' }>
                    { titleString.call(this) }
                </a>
            );
        }

        function label(){
            if (!file) return null;

            var commonProperties = {
                'title'     : this.props.label && this.props.label.title,
                'inline'    : false,
                'className' : 'col-file',
                'subtitle'  : this.props.label && this.props.label.subtitle
            };

            if (this.props.label) {
                return <StackedBlock.Name.Label {..._.extend(commonProperties, this.props.label)} />;
            } else if (this.props.type === 'sequence-replicate') {
                return <StackedBlock.Name.Label {..._.extend(commonProperties, this.props.label, { 'subtitle' : (this.props.sequenceNum ? 'Seq Replicate ' + this.props.sequenceNum : null) })} />;
            } else if (this.props.type === 'paired-end') {
                return <StackedBlock.Name.Label {...commonProperties} />;
                //return RawFilesStackedTable.StackedBlock.Name.renderBlockLabel(_.extend({}, commonProperties, {
                //    //subtitle : this.props.file.paired_end ? 'Paired End ' + this.props.file.paired_end : null,
                //}));
            }

            if (Array.isArray(this.props.columnHeaders)) {
                var headerTitles = _.pluck(this.props.columnHeaders, 'title');
                if (
                    (file.file_type || file.file_format) &&
                    _.intersection(headerTitles,['File Type', 'File Format']).length === 0
                ){
                    return <StackedBlock.Name.Label {...commonProperties } subtitle={file.file_type || file.file_format} />;
                }
                if (
                    file.instrument &&
                    _.intersection(headerTitles,['Instrument', 'File Instrument']).length === 0
                ){
                    return <StackedBlock.Name.Label {...commonProperties} subtitle={file.instrument} />;
                }
            }

            return <StackedBlock.Name.Label {...commonProperties} />;
        }

        return (
            <div
                className={"name col-file" + (this.props.file && this.props.file.accession ? ' mono-text' : '')}
                style={this.props.colWidthStyles ? this.props.colWidthStyles.file : null}
            >
                { label.call(this) }
                { this.renderCheckBox() }
                { title.call(this) }
            </div>
        );
    }

    render(){
        var sBlockClassName = "s-block file";
        if (this.props.hideNameOnHover) sBlockClassName += ' hide-name-on-block-hover';
        if (this.props.keepLabelOnHover) sBlockClassName += ' keep-label-on-name-hover';
        if (this.props.isSingleItem) sBlockClassName += ' single-item';
        if (typeof this.props.stripe !== 'undefined' && this.props.stripe !== null){
            if (this.props.stripe === true || this.props.stripe === 'even') sBlockClassName += ' even';
            else sBlockClassName += ' odd';
        }
        return (
            <div className={sBlockClassName}>
                { this.renderName() }
                { this.filledFileRow() }
            </div>
        );
    }
}




/**
 * To be used within Experiments Set View/Page, or
 * within a collapsible row on the browse page.
 *
 * Shows experiments only, not experiment sets.
 *
 * Allows either table component itself to control state of "selectedFiles"
 * or for a parentController (passed in as a prop) to take over management
 * of "selectedFiles" Set and "checked", for integration with other pages/UI.
 */


export class StackedBlockTable extends React.Component {

    static StackedBlock = StackedBlock

    static defaultHeaders = [];

    static propTypes = {
        'columnHeaders' : PropTypes.arrayOf(PropTypes.shape({
            'columnClass' : PropTypes.string.isRequired,
            'className' : PropTypes.string,
            'title' : PropTypes.string.isRequired,
            'visibleTitle' : PropTypes.oneOfType([PropTypes.string, PropTypes.element, PropTypes.func]),
            'initialWidth' : PropTypes.number.isRequired
        })),
        'children' : PropTypes.arrayOf(PropTypes.element)
    };

    static defaultProps = {
        'columnHeaders' : [
            { columnClass: 'biosample',     className: 'text-left',     title: 'Biosample',     initialWidth: 115   },
            { columnClass: 'experiment',    className: 'text-left',     title: 'Experiment',    initialWidth: 145   },
            { columnClass: 'file-pair',                                 title: 'File Pair',     initialWidth: 40,   visibleTitle : <i className="icon icon-download"></i> },
            { columnClass: 'file',                                      title: 'File',          initialWidth: 125   }
        ],
        'width': null,
        'nonFileHeaderCols' : ['biosample', 'experiment', 'file-pair', 'file'],
        'defaultInitialColumnWidth' : 120,
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.getColumnWidths = this.getColumnWidths.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);
        this.adjustedChildren = this.adjustedChildren.bind(this);
        this.colWidthStyles = this.colWidthStyles.bind(this);
        this.handleFileCheckboxChange = this.handleFileCheckboxChange.bind(this);


        this.cache = {
            oddExpRow : true
        };
        var initialState = {
            columnWidths : null, // set on componentDidMount via updateColumnWidths
            mounted : false
        };
        this.state = initialState;
    }

    componentDidMount(){
        requestAnimationFrame(()=>{
            this.setState({ 'mounted' : true });
        });
    }

    componentWillUnmount(){
        delete this.lastColumnWidths;
        delete this.cache.origColumnWidths;
    }
    
    totalColumnsWidth(origColumnWidths = this.cache.origColumnWidths){
        return _.reduce(origColumnWidths, function(m,v){ return m + v; }, 0);
    }

    getOriginalColumnWidths(){
        var origColumnWidths;
        if (!this.cache.origColumnWidths){
            origColumnWidths = _.map(this.props.columnHeaders, (c) => c.initialWidth || this.props.defaultInitialColumnWidth );
            this.cache.origColumnWidths = origColumnWidths;
        } else {
            origColumnWidths = this.cache.origColumnWidths;
        }
        return origColumnWidths;
    }

    getColumnWidths(){
        if (
            typeof this.props.width !== 'number' && (
                !this.refs.header || (this.refs.header && this.refs.header.clientWidth === 0)
            )
        ){
            return this.getOriginalColumnWidths();
        }

        var origColumnWidths = this.getOriginalColumnWidths();

        var availableWidth = this.props.width || this.refs.header.offsetWidth || 960; // 960 = fallback for tests
        var totalOrigColsWidth = this.totalColumnsWidth(origColumnWidths);//_.reduce(origColumnWidths, function(m,v){ return m + v; }, 0);

        if (totalOrigColsWidth > availableWidth){
            return origColumnWidths;
        }

        var scale = (availableWidth / totalOrigColsWidth) || 1;
        var newColWidths = origColumnWidths.map(function(c){
            return Math.floor(c * scale);
        });

        // Adjust first column by few px to fit perfectly.
        var totalNewColsWidth = _.reduce(newColWidths, function(m,v){ return m + v; }, 0);
        var remainder = availableWidth - totalNewColsWidth;
        newColWidths[0] += Math.floor(remainder - 0.5);

        return newColWidths;
    }

    colWidthStyles(columnWidths = this.state.columnWidths, columnHeaders){
        if (!columnHeaders) columnHeaders = this.props.columnHeaders;
        var colWidthStyles = _.object(
            _.map(
                _.map(columnHeaders, function(col){ return col.field || col.columnClass; }),
                function(cn){ return [cn, null]; }
            )
        ); // Returns { 'experiment' : null , 'biosample' : null, ... }

        if (Array.isArray(columnWidths)){
            _.keys(colWidthStyles).forEach((cn) => {
                colWidthStyles[cn] = {
                    width : columnWidths[_.findIndex(columnHeaders, function(col){ return (col.field || col.columnClass) === cn; })]
                };
            });
        }

        return colWidthStyles;
    }

    /**
     * If we have a SelectedFilesController up the parent/ancestor chain that feeds us selectFile, selectedFiles, and unselectFile, this is the handler to use for checkbox stacked blocks.
     * 
     * @param {string|string[]} uuid - String or list of strings (File Item UUID)
     * @param {Object|Object[]} fileObj - File Item JSON
     * @returns {void} - Nothing.
     */
    handleFileCheckboxChange(accessionTripleString, fileObj){
        if (!this.props.selectedFiles || !this.props.selectFile || !this.props.unselectFile) return null;

        var willSelect;
        var isMultiples;

        if (Array.isArray(accessionTripleString)){
            isMultiples = true;
            willSelect = (typeof this.props.selectedFiles[accessionTripleString[0]] === 'undefined');
        } else {
            isMultiples = false;
            willSelect = (typeof this.props.selectedFiles[accessionTripleString] === 'undefined');
        }

        if (willSelect){
            if (isMultiples){
                this.props.selectFile(_.zip(accessionTripleString, fileObj));
            } else {
                this.props.selectFile(accessionTripleString, fileObj);
            }
        } else {
            this.props.unselectFile(accessionTripleString);
        }
    }

    adjustedChildren(){
        return React.Children.map(this.props.children, (c)=>{
            //if (c.type.displayName !== 'StackedBlock') return c; // Only add props to StackedBlocks
            var addedProps = {};

            // REQUIRED & PASSED DOWN
            addedProps.handleFileCheckboxChange = this.handleFileCheckboxChange;
            addedProps.colWidthStyles = this.colWidthStyles(this.lastColumnWidths || this.getColumnWidths());
            addedProps.currentlyCollapsing = this.state.collapsing;
            addedProps.expTable = this;
            addedProps.stackDepth = 0;

            if (this.props.selectedFiles && !c.props.selectedFiles){
                addedProps.selectedFiles = this.props.selectedFiles;
            }
            if (this.props.columnHeaders && !c.props.columnHeaders){
                addedProps.columnHeaders = this.props.columnHeaders;
            }
            if (this.props.experimentSetAccession && !c.props.experimentSetAccession){
                addedProps.experimentSetAccession = this.props.experimentSetAccession;
            }
            if (this.props.nonFileHeaderCols && !c.props.nonFileHeaderCols){
                addedProps.nonFileHeaderCols = this.props.nonFileHeaderCols;
            }
            if (typeof this.props.collapseLongLists === 'boolean' && typeof c.props.collapseLongLists !== 'boolean'){
                addedProps.collapseLongLists = this.props.collapseLongLists;
            }
            
            if (Object.keys(addedProps).length > 0){
                return React.cloneElement(c, addedProps, c.props.children);
            }
            return c;
        });
    }

    render(){
        
        // Cache for each render.
        var minTotalWidth = Math.max(this.props.width || 0, this.totalColumnsWidth(this.getOriginalColumnWidths()));
        this.lastColumnWidths = this.getColumnWidths();

        var renderHeaderItem = function(h, i, arr){
            if (h.visible === false) return null;
            var visibleTitle = typeof h.visibleTitle !== 'undefined' ? h.visibleTitle : h.title;
            if (typeof visibleTitle === 'function') visibleTitle = visibleTitle(this.props);
            var style = null;
            if (Array.isArray(this.lastColumnWidths) && this.lastColumnWidths.length === arr.length){
                style = { 'width' : this.lastColumnWidths[i] || h.initialWidth };
            }
            return (
                <div className={"heading-block col-" + h.columnClass + (h.className ? ' ' + h.className : '')} key={'header-' + i} style={style} data-column-class={h.columnClass}>
                    { visibleTitle }
                </div>
            );
        }.bind(this);

        return (
            <div
                className={"stacked-block-table" + (this.state.mounted ? ' mounted' : '') + (this.props.fadeIn ? ' fade-in' : '') + (typeof this.props.className === 'string' ? ' ' + this.props.className : '')}
                style={{ minWidth : minTotalWidth }}
            >
                {
                    !this.props.children ?
                    <h6 className="text-center text-400"><em>No Results</em></h6>
                    :
                    <div className="headers expset-headers" ref="header">
                        { this.props.columnHeaders.map(renderHeaderItem) }
                    </div>
                }

                {
                    this.props.children ?
                    <div className="body clearfix">
                        { this.adjustedChildren() }
                    </div> : null
                }

            </div>
        );
    }




}
