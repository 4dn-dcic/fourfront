'use strict';

var React = require('react');
var { Table, Checkbox, Collapse } = require('react-bootstrap');
var _ = require('underscore');
var FacetList = require('./facetlist'); // Only used for statics.
var { isServerSide, console } = require('./objectutils');

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

var ExperimentsTable = module.exports.ExperimentsTable = React.createClass({

    statics : {

        /* List of headers which are created/controlled by component (not customizable), by experimentset_type */
        builtInHeaders : function(expSetType = 'replicate'){
            switch (expSetType){
                case 'replicate' : 
                    return [
                        { className: 'biosample', title: 'Biosample Accession' },
                        { className: 'experiment', title: 'Experiment Accession' },
                        { className: 'file-pair', title: 'File Pair', visibleTitle : <i className="icon icon-download"></i> },
                        { className: 'file', title: 'File Accession' },
                    ];
                default: 
                    return [
                        { className: 'biosample', title: 'Biosample Accession' },
                        { className: 'experiment', title: 'Experiment Accession'},
                        { className: 'file', title: 'File Accession' },
                    ];
            }
            
        },

        /* Returns undefined if not set */
        initialColumnWidths : function(columnClassName = null, expSetType = 'replicate'){
            if (expSetType === 'replicate'){
                // ToDo put into schemas?
                var widthsByColumnClass = {
                    'biosample' : 115,
                    'experiment' : 145,
                    'file-pair' : 40,
                    'file' : 125,
                    'file-detail' : 125,
                    'default' : 120
                };
                // No columnClassName specified.
                if (columnClassName === null) return widthsByColumnClass;
                // columnClassName specified and set.
                else if (columnClassName !== null && _.contains(Object.keys(widthsByColumnClass), columnClassName)){
                    return widthsByColumnClass[columnClassName];
                }
                // columnClassName specified but width not configured.
                else return widthsByColumnClass.default;
            }
        },

        /** 
         * Calculate amount of experiments out of provided experiments which match currently-set filters.
         * Use only for front-end faceting, e.g. on Exp-Set View page where all experiments are provided,
         * NOT (eventually) for /browse/ page where faceting results will be controlled by back-end.
         */
        getPassedExperiments : function(
            allExperiments,
            filters = null, // aka expSetFilters (available in redux store)
            getIgnoredFiltersMethod = 'single-term',
            facets = null,  // Required if want to get ignored filters by missing facet(s).
            useSet = false  // Return as array instead of set.
        ){
            // TODO: If filters === null then filters = store.getState().expSetFilters ?
            if (Array.isArray(allExperiments[0].experiments_in_set)){
                // We got experiment sets, not experiments. Lets fix that (convert to arr of experiments).
                allExperiments = _.flatten(_.map(allExperiments, function(es){ return es.experiments_in_set; }), true);
            }
            if (typeof filters !== 'object' || !filters || Object.keys(filters).length === 0){
                if (useSet) return new Set(allExperiments);
                else return allExperiments;
            }
            var ignoredFilters = null;
            if (getIgnoredFiltersMethod === 'missing-facets') {
                if (Array.isArray(facets) && facets.length > 0) {
                    if (typeof facets[0].restrictions === 'undefined'){
                        // No restrictions added yet. TODO: Grab & include restrictions object.
                        facets = FacetList.adjustedFacets(facets);
                    }
                    ignoredFilters = FacetList.findIgnoredFiltersByMissingFacets(facets, filters);
                }
            } else if (getIgnoredFiltersMethod === 'single-term') {
                // Ignore filters if none in current experiment_set match it so that if coming from 
                // another page w/ filters enabled (i.e. browse) and deselect own 'static'/single term, it isn't empty.
                ignoredFilters = FacetList.findIgnoredFiltersByStaticTerms(allExperiments, filters);
            }
            if (useSet) return FacetList.siftExperiments(allExperiments, filters, ignoredFilters); // Set
            else return [...FacetList.siftExperiments(allExperiments, filters, ignoredFilters)]; // Convert to array
        },

        totalExperimentsCount : function(experimentArray = null){
            if (!experimentArray) return null;
            var experimentsCount = 0;
            var fileSet = new Set();
            for (var i = 0; i < experimentArray.length; i++){
                if (experimentArray[i].files && experimentArray[i].files.length > 0){
                    experimentsCount++; // Exclude empty experiments
                    for (var j = 0; j < experimentArray[i].files.length; j++){
                        if (!fileSet.has(experimentArray[i].files[j]['@id'])){
                            fileSet.add(experimentArray[i].files[j]['@id']);
                        }
                    }
                } else if (experimentArray[i].filesets && experimentArray[i].filesets.length > 0){
                    experimentsCount++;
                    for (var j = 0; j < experimentArray[i].filesets.length; j++){
                        for (var k = 0; k < experimentArray[i].filesets[j].files_in_set.length; k++){
                            if (!fileSet.has(experimentArray[i].filesets[j].files_in_set[k]['@id'])){
                                fileSet.add(experimentArray[i].filesets[j].files_in_set[k]['@id']);
                            }
                        }
                    }
                } else {
                    console.error("Couldn't find files for experiment - excluding from total count", experimentArray[i]);
                }
            }
            return {
                'experiments' : experimentsCount,
                'files' : fileSet.size
            };
        },

        visibleExperimentsCount : function(experimentArray){
            if (!Array.isArray(experimentArray)) return null;
            var fileKeys = Object.keys(fileDetailContainer.fileDetail);
            var experiments = new Set();
            var fileSet = new Set(fileKeys);

            for (var i = 0; i < fileKeys.length; i++){
                if (!experiments.has(fileDetailContainer.fileDetail[fileKeys[i]]['@id'])){
                    experiments.add(fileDetailContainer.fileDetail[fileKeys[i]]['@id']);
                }
                if (fileDetailContainer.fileDetail[fileKeys[i]].related && fileDetailContainer.fileDetail[fileKeys[i]].related.file){
                    if (!fileSet.has(fileDetailContainer.fileDetail[fileKeys[i]].related.file)){
                        fileSet.add(fileDetailContainer.fileDetail[fileKeys[i]].related.file);
                    }
                }
            }
            return {
                'experiments' : experiments.size,
                'files' : fileSet.size,
                'emptyExperiments' : fileDetailContainer.emptyExps.length
            };
        },

        visibleExperimentsCountDeprecated : function(fileDetailContainer){
            if (!fileDetailContainer) return null;
            var fileKeys = Object.keys(fileDetailContainer.fileDetail);
            var experiments = new Set();
            var fileSet = new Set(fileKeys);

            for (var i = 0; i < fileKeys.length; i++){
                if (!experiments.has(fileDetailContainer.fileDetail[fileKeys[i]]['@id'])){
                    experiments.add(fileDetailContainer.fileDetail[fileKeys[i]]['@id']);
                }
                if (fileDetailContainer.fileDetail[fileKeys[i]].related && fileDetailContainer.fileDetail[fileKeys[i]].related.file){
                    if (!fileSet.has(fileDetailContainer.fileDetail[fileKeys[i]].related.file)){
                        fileSet.add(fileDetailContainer.fileDetail[fileKeys[i]].related.file);
                    }
                }
            }
            return {
                'experiments' : experiments.size,
                'files' : fileSet.size,
                'emptyExperiments' : fileDetailContainer.emptyExps.length
            };
        },

        StackedBlock : React.createClass({

            statics : {

                Name : React.createClass({

                    statics : {

                        renderBlockLabel : function(title, subtitle = null, inline = false, className = null){

                            function titleElement(){
                                return React.createElement(
                                    inline ? 'span' : 'div',
                                    { className : "label-title" },
                                    title
                                );
                            }

                            function subtitleElement(){
                                if (!subtitle) return null;
                                return React.createElement(
                                    inline ? 'span' : 'div',
                                    { className : "ext" },
                                    subtitle
                                );
                            }

                            var fullClassName = "label-ext-info";
                            if (typeof className === 'string') fullClassName += ' ' + className;
                            if (subtitle !== null) fullClassName += ' has-subtitle';

                            return (
                                <div className={fullClassName}>
                                    { titleElement() }
                                    { subtitleElement() }
                                </div>
                            );
                        },
                    },

                    propTypes : {
                        columnClass : React.PropTypes.string,
                        colWidthStyles : React.PropTypes.object,
                        label : React.PropTypes.shape({
                            title : React.PropTypes.node,
                            subtitle : React.PropTypes.node,
                            subtitleVisible : React.PropTypes.bool
                        }),
                        visible : React.PropTypes.bool
                    },

                    getDefaultProps : function(){
                        return {
                            visible : true
                        }
                    },

                    shouldComponentUpdate : function(nextProps){
                        if (this.props.colWidthStyles !== nextProps.colWidthStyles) return true;
                        return false;
                    },

                    getColumnWidthStyle : function(){
                        if (this.props.colWidthStyles && typeof this.props.colWidthStyles[this.props.columnClass] !== 'undefined'){
                            return this.props.colWidthStyles[this.props.columnClass];
                        }

                        if (
                            this.props.expTable &&
                            this.props.expTable.state &&
                            Array.isArray(this.props.expTable.state.columnWidths)
                        ){
                            var colWidthIndex = _.findIndex(this.props.expTable.columnHeaders(), { 'className' : this.props.columnClass });
                            if (colWidthIndex > -1) return { 'width' : this.props.expTable.state.columnWidths[colWidthIndex] };
                        }

                        return null;
                    },

                    adjustedChildren : function(){
                        if (React.Children.count(this.props.children) > 1) return this.props.children;
                        return React.Children.map(this.props.children, function(c){
                            if (c && c.props && typeof c.props.className === 'string' && c.props.className.indexOf('name-title') === -1){
                                return React.cloneElement(c, { className : c.props.className + ' name-title' }, c.props.children);
                            }
                            return c;
                        });
                    },

                    render : function(){
                        if (!this.props.visible) return null;
                        var style = null;
                        var colWidthStyle = this.getColumnWidthStyle();
                        if (colWidthStyle){
                            if (this.props.colStyle) style = _.extend(_.clone(colWidthStyle), this.props.colStyle);
                            else style = colWidthStyle;
                        }
                        if (this.props.relativePosition){
                            if (style) style.position = 'relative';
                            else style = { 'position' : 'relative' };
                        }
                        return (
                            <div className={"name col-" + this.props.columnClass} style={style}>
                                { this.props.label ? 
                                    ExperimentsTable.StackedBlock.Name.renderBlockLabel(
                                        this.props.label.title,
                                        this.props.label.subtitle,
                                        false,
                                        this.props.label.subtitleVisible === true ? 'subtitle-visible' : null
                                    ) 
                                : null }
                                { this.adjustedChildren() }
                            </div>
                        );
                    }
                }),

                List : React.createClass({

                    statics : {
                        ViewMoreButton : React.createClass({

                            propTypes : {
                                collapsibleChildren : React.PropTypes.array,
                                collapsed : React.PropTypes.bool,
                                handleCollapseToggle : React.PropTypes.func
                                // + those from parent .List
                            },
                            
                            shouldComponentUpdate : function(nextProps){
                                if (this.props.collapsed !== nextProps.collapsed) return true;
                                if (this.props.currentlyCollapsing !== nextProps.currentlyCollapsing) return true;
                                if (this.props.title !== nextProps.title) return true;
                                if (this.props.showMoreExtTitle !== nextProps.showMoreExtTitle) return true;
                                return false;
                            },

                            render : function(){

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
                                        title = "Show Less";
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
                        })
                    },

                    propTypes : {
                        title : React.PropTypes.string,
                        showMoreExtTitle : React.PropTypes.string,
                        collapseLimit : React.PropTypes.number,
                        collapseShow : React.PropTypes.number,
                        expTable : React.PropTypes.any
                    },

                    getDefaultProps : function(){
                        return {
                            collapseLimit : 5,
                            collapseShow : 3
                        };
                    },

                    getInitialState : function(){
                        if (!Array.isArray(this.props.children) || this.props.children.length <= this.props.collapseLimit) return null;
                        return { 'collapsed' : true };
                    },

                    shouldComponentUpdate : function(nextProps, nextState){
                        if (this.props.currentlyCollapsing !== nextProps.currentlyCollapsing) return true;
                        if (this.props.colWidthStyles !== nextProps.colWidthStyles) return true;
                        if (this.state === null) return false;
                        if (this.state.collapsed !== nextState.collapsed) return true;
                        return false;
                    },

                    adjustedChildren : function(){
                        return React.Children.map(this.props.children, (c)=>{
                            //if (c.type.displayName !== 'StackedBlock') return c; // Only add props to StackedBlocks
                            var addedProps = {};
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
                            if (Object.keys(addedProps).length > 0){
                                return React.cloneElement(c, addedProps, c.props.children);
                            }
                            return c;
                        });
                    },

                    handleCollapseToggle : function(){
                        if (this.props.expTable && this.props.expTable.state && !this.props.expTable.state.collapsing){
                            this.props.expTable.setState({ 
                                'collapsing' : this.props.rootList ? 'root' :
                                    this.props.parentID || this.props.className || true 
                            }, ()=>{
                                this.setState({ 'collapsed' : !this.state.collapsed });
                            });
                        } else this.setState({ 'collapsed' : !this.state.collapsed });
                    },

                    render : function(){
                        var children = this.adjustedChildren();

                        var className = "s-block-list " + this.props.className;
                        var timeout = 350; // Default
                        if (!Array.isArray(children) || children.length <= this.props.collapseLimit) {
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
                                <ExperimentsTable.StackedBlock.List.ViewMoreButton
                                    collapsibleChildren={collapsibleChildren}
                                    collapsed={this.state.collapsed}
                                    handleCollapseToggle={this.handleCollapseToggle}
                                    {...this.props}
                                />
                            </div>
                        );
                    },

                }),

            },

            childIDList : null,

            getInitialState : function(){
                this.childIDList = new Set();
                return null;
            },

            adjustedChildren : function(){
                return React.Children.map(this.props.children, (c) => {
                    if (c === null) return null;
                    var addedProps = {};
                    if (!c.props.columnClass && this.props.columnClass) addedProps.columnClass = this.props.columnClass;
                    if (!c.props.colWidthStyles && this.props.colWidthStyles) addedProps.colWidthStyles = this.props.colWidthStyles;
                    if (!c.props.label && this.props.label) addedProps.label = this.props.label;
                    if (!c.props.expTable && this.props.expTable) addedProps.expTable = this.props.expTable;
                    if (!c.props.currentlyCollapsing && this.props.currentlyCollapsing) addedProps.currentlyCollapsing = this.props.currentlyCollapsing;

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
            },

            render : function(){
                var className = this.props.columnClass ? this.props.columnClass + ' ' : '';
                className += "s-block";
                if (this.props.hideNameOnHover) className += ' hide-name-on-block-hover';
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
                return (
                    <div className={className}>
                        { this.adjustedChildren() }
                    </div>
                );
            }
        }),

        funcs : {

            listEmptyExperiments : function(experiments){
                return _.filter(experiments, function(exp){
                    if (Array.isArray(exp.files) && exp.files.length > 0) return false;
                    else if (Array.isArray(exp.filesets) && exp.filesets.length > 0){
                        for (var i; i < exp.filesets.length; i++){
                            if (Array.isArray(exp.filesets[i].files_in_set) && exp.filesets[i].files_in_set.length > 0){
                                return false;
                            }
                        }
                        return true;
                    }
                    else return true;
                });
            },

            fileCountFromExperiments : function(experiments){
                return _.reduce(experiments.map(ExperimentsTable.funcs.fileCount), function(r,expFileCount,i){
                    return r + expFileCount;
                }, 0);
            },

            /* NOT SORTED */
            listAllUnpairedFiles : function(experiments){
                return _.filter(
                    _.flatten(
                        ExperimentsTable.funcs.findUnpairedFilesPerExperiment(experiments),
                        true
                    ),
                    function(file){ return typeof file !== 'undefined'; }
                );
            },

            /* NOT SORTED */
            listAllFilePairs : function(experiments){
                return (
                    _.flatten(
                        _.filter(
                            _.pluck(
                                ExperimentsTable.funcs.groupFilesByPairsForEachExperiment(experiments),
                                'file_pairs'
                            ),
                            function(file){ return typeof file !== 'undefined'; }
                        ),
                        true
                    )
                )
            },

            /** 
             *  Partial Funcs (probably don't use these unless composing a function)
             */

            combineWithReplicateNumbers : function(experimentsWithReplicateNums, fullExperimentData){
                if (!Array.isArray(experimentsWithReplicateNums)) return false;
                return _(experimentsWithReplicateNums).chain()
                    .map(function(r){ 
                        return {
                            'tec_rep_no' : r.tec_rep_no || null,
                            'bio_rep_no' : r.bio_rep_no || null,
                            '@id' : r.replicate_exp['@id']
                        };
                    })
                    .zip(fullExperimentData) // 'replicate_exps' and 'experiments_in_set' are delivered in same order from backend, so can .zip (linear) vs .map -> .findWhere  (nested loop).
                    .map(function(r){
                        r[1].biosample.bio_rep_no = r[0].bio_rep_no; // Copy over bio_rep_no to biosample to ensure sorting.
                        return _.extend(r[0], r[1]);
                    })
                    .value()
            },

            findUnpairedFiles : function(files_in_experiment){
                return _.reduce(files_in_experiment, function(unpairedFiles, file, files){
                    if (!Array.isArray(file.related_files) || typeof file.paired_end == 'undefined') {
                        unpairedFiles.push(file);
                    }
                    return unpairedFiles;
                }, []);
            },

            findUnpairedFilesPerExperiment : function(experiments){
                return experiments.map(function(exp){
                    if (Array.isArray(exp.files)){
                        return ExperimentsTable.funcs.findUnpairedFiles(exp.files);
                    } else if (
                        Array.isArray(exp.filesets) && 
                        exp.filesets.length > 0 && 
                        Array.isArray(exp.filesets[0].files_in_set)
                    ){
                        return ExperimentsTable.funcs.findUnpairedFiles(
                            _.flatten(
                                _.pluck(exp.filesets, 'files_in_set'),
                                true
                            )
                        );
                    }
                });
            },

            fileCount : function(experiment){
                if (Array.isArray(experiment.files)) return experiment.files.length;
                if (Array.isArray(experiment.filesets)) return _.reduce(experiment.filesets, function(r,fs){
                    return r + (fs.files_in_set || []).length;
                }, 0);
                return 0;
            },

            groupFilesByPairs : function(files_in_experiment){
                // Add 'file_pairs' property containing array of arrays of paired files to each experiment.
                return _(files_in_experiment).chain()
                    .sortBy(function(file){ return parseInt(file.paired_end) }) // Bring files w/ paired_end == 1 to top of list.
                    .reduce(function(pairsObj, file, files){
                        // Group via { 'file_paired_end_1_ID' : { '1' : file_paired_end_1, '2' : file_paired_end_2,...} }
                        if (parseInt(file.paired_end) === 1){
                            pairsObj[file['@id']] = { '1' : file };
                        } else if (Array.isArray(file.related_files)) {
                            _.each(file.related_files, function(related){
                                if (pairsObj[related.file]) {
                                    pairsObj[related.file][file.paired_end + ''] = file;
                                } else {
                                    file.unpaired = true; // Mark file as unpaired
                                }
                            });
                        } else {
                            file.unpaired = true; // Mark file as unpaired
                        }
                        return pairsObj;
                    }, { })
                    .values()
                    .map(function(filePairObj){
                        return _(filePairObj).chain()
                            .pairs()
                            .sortBy (function(fp){ return parseInt(fp[0]); })
                            .map    (function(fp){ return fp[1]; })
                            .value();
                    })
                    .value(); // [[file1,file2,file3,...],[file1,file2,file3,file4,...],...]
            },

            groupFilesByPairsForEachExperiment: function(experiments){
                return experiments.map(function(exp){
                    if (Array.isArray(exp.files)){
                        exp.file_pairs = ExperimentsTable.funcs.groupFilesByPairs(exp.files);
                    } else if (
                        Array.isArray(exp.filesets) && 
                        exp.filesets.length > 0 && 
                        Array.isArray(exp.filesets[0].files_in_set)
                    ){
                        exp.file_pairs = ExperimentsTable.funcs.groupFilesByPairs(
                            _.flatten(
                                _.pluck(exp.filesets, 'files_in_set'),
                                true
                            )
                        );
                    }
                    return exp;
                });
            },

            flattenFileSetsToFilesIfNoFilesOnExperiment : function(experiment){
                if (Array.isArray(experiment.files)) return experiment;
                if (!Array.isArray(experiment.filesets) || experiment.filesets.length === 0 || !Array.isArray(experiment.filesets[0].files_in_set)) return experiment;
                experiment.files = _.flatten(
                    _.pluck(experiment.filesets, 'files_in_set'),
                    true
                );
                return experiment;
            },

            flattenFileSetsToFilesIfNoFilesForEachExperiment : function(experiments){
                return experiments.map(ExperimentsTable.funcs.flattenFileSetsToFilesIfNoFilesOnExperiment);
            },

            groupExperimentsByBiosampleRepNo : function(experiments){
                return _(experiments).chain()
                    .groupBy(function(exp){
                        return exp.biosample.bio_rep_no;
                    })          // Creates { '1' : [expObjWBiosample1-1, expObjWBiosample1-2, ...], '2' : [expObjWBiosample2-1, expObjWBiosample2-2, ...], ... }
                    .pairs()    // Creates [['1', [expObjWBiosample1-1, expObjWBiosample1-2]], ['2', [expObjWBiosample2-1, expObjWBiosample2-2]], ...]
                    .sortBy(function(expSet){ return parseInt(expSet[0]); }) // Sort outer list (biosamples) by bio_rep_no
                    .map(function(expSet){ // Creates [[expObjWBiosample1-1, expObjWBiosample1-2], [expObjWBiosample2-1, expObjWBiosample2-2], ...]
                        return _.sortBy(expSet[1], 'tec_rep_no'); // Sort inner list (experiments) by tec_rep_no
                    })
                    .value();
            },

            groupExperimentsByBiosample : function(experiments){
                return _(experiments).chain()
                    .groupBy(function(exp){
                        return exp.biosample['@id'];
                    })
                    .pairs()
                    .sortBy(function(expSet){ return expSet[0]; }) // Sort outer list (biosamples) by biosample id
                    .map(function(expSet){ return expSet[1]; }) // Creates [[expObjWBiosample1-1, expObjWBiosample1-2], [expObjWBiosample2-1, expObjWBiosample2-2], ...]
                    .value();
            }

        }

    },

    propTypes : {
        columnHeaders : React.PropTypes.array,
        experimentArray : React.PropTypes.array,
        passExperiments : React.PropTypes.instanceOf(Set),
        expSetFilters : React.PropTypes.object,
        selectedFiles : React.PropTypes.instanceOf(Set),
        parentController : function(props, propName, componentName){
            // Custom validation
            if (props[propName] && 
                (!(props[propName].state.selectedFiles instanceof Set))
            ){
                return new Error('parentController must be a React Component passed in as "this", with "selectedFiles" (Set) and "checked" (bool) in its state.');
            } 
        },
        keepCounts : React.PropTypes.bool // Whether to run updateCachedCounts and store output in this.counts (get from instance if ref, etc.) 
    },

    getDefaultProps : function(){
        return {
            keepCounts : false,
            columnHeaders : [
                { className: 'biosample', title : 'Biosample Accession'},
                { className: 'experiment', title : 'Experiment Accession'},
                { className: 'file-detail', title : 'File Info'}
            ]
        };
    },

    cache : null,
    
    getInitialState: function() {
        this.cache = {
            origColumnWidths : null,
            staticColumnHeaders : null,
            customColumnHeaders : null
        };
        var initialState = {
            checked: true,
            columnWidths : null, // set on componentDidMount via updateColumnWidths
            mounted : false
        };
        if (!(
            this.props.parentController && 
            this.props.parentController.state && 
            this.props.parentController.state.selectedFiles
        )) initialState.selectedFiles = new Set();
        return initialState;
    },

    updateColumnWidths : function(){
        // Scale/expand width of columns to fit available width, if any.
        var origColumnWidths;
        if (!this.cache.origColumnWidths){
            origColumnWidths = _.map(this.refs.header.children, function(c){
                if ( // For tests/server-side
                    typeof c.offsetWidth !== 'number' ||
                    Number.isNaN(c.offsetWidth)
                ) return ExperimentsTable.initialColumnWidths(c.getAttribute('data-column-class'));
                return c.offsetWidth;
            });
            this.cache.origColumnWidths = origColumnWidths;
        } else {
            origColumnWidths = this.cache.origColumnWidths;
        }

        var availableWidth = this.refs.header.offsetWidth || 960, // 960 = fallback for tests
            totalOrigColsWidth = _.reduce(origColumnWidths, function(m,v){ return m + v }, 0);

        if (totalOrigColsWidth > availableWidth){
            this.setState({ columnWidths : null });
            return; // No room to scale up widths.
        };

        var scale = (availableWidth / totalOrigColsWidth) || 1;
        var newColWidths = origColumnWidths.map(function(c){
            return Math.floor(c * scale);
        });
        
        // Adjust first column by few px to fit perfectly.
        var totalNewColsWidth = _.reduce(newColWidths, function(m,v){ return m + v }, 0);
        var remainder = availableWidth - totalNewColsWidth;
        newColWidths[0] += Math.floor(remainder - 0.5);

        this.setState({ columnWidths : newColWidths });
    },

    componentDidMount : function(){
        this.throttledResizeHandler = _.throttle(this.updateColumnWidths, 300);

        if (!isServerSide()){
            window.addEventListener('resize', this.throttledResizeHandler);
            this.updateColumnWidths();
        }
        this.setState({ 'mounted' : true });
    },

    componentWillUnmount : function(){
        if (!isServerSide()){
            window.removeEventListener('resize', this.throttledResizeHandler);
        }
    },

    /* Built-in headers for props.experimentSetType, extended by any matching title from props.columnHeaders */
    staticColumnHeaders : function(){
        if (this.cache.staticColumnHeaders) return this.cache.staticColumnHeaders;
        this.cache.staticColumnHeaders = ExperimentsTable.builtInHeaders(this.props.experimentSetType).map((staticCol) => {
            return _.extend(_.clone(staticCol), _.findWhere(this.props.columnHeaders, { title : staticCol.title }) || {});
        });
        return this.cache.staticColumnHeaders;
    },

    /* Any non built-in (for experimentSetType) headers from props.columnHeaders */
    customColumnHeaders : function(){
        if (this.cache.customColumnHeaders) return this.cache.customColumnHeaders;
        this.cache.customColumnHeaders = this.props.columnHeaders.filter((col) => {
            return  !_.contains(_.pluck(ExperimentsTable.builtInHeaders(this.props.experimentSetType), 'title'), col.title);
        });
        return this.cache.customColumnHeaders;
    },

    /* Combined top row of headers */
    columnHeaders : function(){
        return this.staticColumnHeaders().concat(this.customColumnHeaders());
    },

    colWidthStyles : function(){

        var colWidthStyles = {
            'experiment' : null,
            'biosample' : null,
            'file-pair' : null,
            'file' : null,
            'file-detail' : null
        }

        if (Array.isArray(this.state.columnWidths)){
            Object.keys(colWidthStyles).forEach((cn) => {
                colWidthStyles[cn] = {
                    width : this.state.columnWidths[_.findIndex(this.columnHeaders(), { 'className' : cn })]
                }
            });
        }

        return colWidthStyles;
    },

    selectedFiles : function(){
        //if (this.props.selectedFiles) {
        //    return this.props.selectedFiles;
        if (this.props.parentController && this.props.parentController.state.selectedFiles){ 
            return this.props.parentController.state.selectedFiles;
        } else if (this.state.selectedFiles){
            return this.state.selectedFiles;
        }
        return null;
    },

    handleFileUpdate: function (uuid, add=true){
        
        var selectedFiles = this.selectedFiles(); 
        if (!selectedFiles) return null;

        if(add){
            if(!selectedFiles.has(uuid)){
                selectedFiles.add(uuid);
            }
        } else if (selectedFiles.has(uuid)) {
            selectedFiles.delete(uuid);
        }

        if (!this.props.parentController){
            // Set state on self if no parent controller
            this.setState({
                'selectedFiles': selectedFiles
            });
        } else {
            this.props.parentController.setState({
                'selectedFiles': selectedFiles
            });
        }
        
    },

    renderExperimentBlock : function(exp,i){
        this.cache.oddExpRow = !this.cache.oddExpRow;
        
        var contentsClassName = Array.isArray(exp.file_pairs) ? 'file-pairs' : 'files';

        return (
            <ExperimentsTable.StackedBlock 
                key={exp['@id']}
                hideNameOnHover={true}
                columnClass="experiment"
                label={{ 
                    title : 'Experiment',
                    subtitle : (
                        exp.tec_rep_no ? 'Tech Replicate ' + exp.tec_rep_no : 
                            exp.experiment_type ? exp.experiment_type : null
                    ),
                    subtitleVisible: true
                }}
                stripe={this.cache.oddExpRow}
                id={(exp.bio_rep_no && exp.tec_rep_no) ? 'exp-' + exp.bio_rep_no + '-' + exp.tec_rep_no : exp.accession || exp['@id']}
            >
                <ExperimentsTable.StackedBlock.Name relativePosition={ExperimentsTable.funcs.fileCount(exp) > 6}>
                    <a href={ exp['@id'] || '#' } className="name-title mono-text">{ exp.accession }</a>
                </ExperimentsTable.StackedBlock.Name>
                <ExperimentsTable.StackedBlock.List 
                    className={contentsClassName} 
                    title={contentsClassName === 'file-pairs' ? 'File Pairs' : 'Files'}
                >
                    { contentsClassName === 'file-pairs' ? /* File Pairs Exist */
                        exp.file_pairs.map((filePair,i) =>
                            <FilePairBlock
                                key={i}
                                selectedFiles={this.selectedFiles()}
                                files={filePair}
                                columnHeaders={this.customColumnHeaders()}
                                handleFileUpdate={this.handleFileUpdate}
                                label={ exp.file_pairs.length > 1 ?
                                    { title : "Pair " + (i + 1) } : { title : "Pair" } 
                                }
                            />
                        )
                        : /* No File Pairs, but files may exist */
                        <ExperimentsTable.StackedBlock
                            key={exp['@id']}
                            hideNameOnHover={false}
                            columnClass="file-pair"
                        >
                            { _.pluck(this.columnHeaders(), 'title').indexOf('File Pair') > -1 ?
                                <ExperimentsTable.StackedBlock.Name/>
                            : null }
                            <ExperimentsTable.StackedBlock.List title="Files" className="files">
                                { Array.isArray(exp.files) ?
                                    exp.files.map((file,i) =>
                                        <FileEntryBlock
                                            key={file['@id']}
                                            file={file}
                                            columnHeaders={this.customColumnHeaders()}
                                            handleFileUpdate={this.handleFileUpdate}
                                            selectedFiles={this.selectedFiles()}
                                            hideNameOnHover={true}
                                            isSingleItem={exp.files.length < 2 ? true : false}
                                        />
                                    )
                                    : /* No Files Exist */
                                    <FileEntryBlock
                                        file={null}
                                        columnHeaders={this.customColumnHeaders()}
                                    />
                                }
                            </ExperimentsTable.StackedBlock.List>
                        </ExperimentsTable.StackedBlock>
                    }
                </ExperimentsTable.StackedBlock.List>
            </ExperimentsTable.StackedBlock>
        );
    },

    renderBiosampleStackedBlockOfExperiments : function(expsWithBiosample,i){
        this.cache.oddExpRow = false; // Used & toggled by experiment stacked blocks for striping.
        return (
            <ExperimentsTable.StackedBlock
                columnClass="biosample"
                hideNameOnHover={true}
                key={expsWithBiosample[0].biosample['@id']}
                id={'bio-' + (expsWithBiosample[0].biosample.bio_rep_no || i + 1)}
                label={{
                    title : 'Biosample',
                    subtitle : expsWithBiosample[0].biosample.bio_rep_no ? 
                        'Bio Replicate ' + expsWithBiosample[0].biosample.bio_rep_no
                        :
                        expsWithBiosample[0].biosample.biosource_summary,
                    subtitleVisible : true
                }}
            >
                <ExperimentsTable.StackedBlock.Name
                    relativePosition={
                        expsWithBiosample.length > 3 || ExperimentsTable.funcs.fileCountFromExperiments(expsWithBiosample) > 6
                    }
                >
                    <a href={ expsWithBiosample[0].biosample['@id'] || '#' } className="name-title mono-text">
                        { expsWithBiosample[0].biosample.accession }
                    </a>
                </ExperimentsTable.StackedBlock.Name>
                <ExperimentsTable.StackedBlock.List
                    className="experiments"
                    title="Experiments"
                    children={expsWithBiosample.map(this.renderExperimentBlock)}
                    showMoreExtTitle={
                        expsWithBiosample.length > 5 ?
                            'with ' + (
                                _.all(expsWithBiosample.slice(3), function(exp){ 
                                    return exp.file_pairs !== 'undefined' 
                                }) ? /* Do we have filepairs for all exps? */
                                    _.flatten(_.pluck(expsWithBiosample.slice(3), 'file_pairs'), true).length +
                                    ' File Pairs'
                                    :
                                    ExperimentsTable.funcs.fileCountFromExperiments(expsWithBiosample.slice(3)) + 
                                    ' Files'
                            )
                            :
                            null
                    }
                />
                
            </ExperimentsTable.StackedBlock>
        );
    },

    /**
     * Here we render nested divs for a 'table' of experiments with shared elements spanning multiple rows,
     * e.g. an experiment block's height is the combined height of its containing file rows, biosample height
     * is combined height of its containing experiment rows (experiments that share that biosample).
     *  ___________________________________________________
     * |                         File   File Detail Columns|
     * |             Experiment ___________________________|
     * |                         File   File Detail Columns|
     * | Biosample  _______________________________________|
     * |                         File   File Detail Columns|
     * |             Experiment ___________________________|
     * |                         File   File Detail Columns|
     * |___________________________________________________|
     * 
     * Much of styling/layouting is defined in CSS.
     */
    renderRootStackedBlockListOfBiosamplesWithExperiments : function(experimentsGroupedByBiosample){
        return (
            <ExperimentsTable.StackedBlock.List
                className="biosamples"
                title="Biosamples"
                children={experimentsGroupedByBiosample.map(this.renderBiosampleStackedBlockOfExperiments)}
                rootList={true}
                expTable={this}
                currentlyCollapsing={this.state.collapsing}
                colWidthStyles={this.colWidthStyles()}
                showMoreExtTitle={
                    experimentsGroupedByBiosample.length > 5 ?
                        'with ' + _.flatten(experimentsGroupedByBiosample.slice(3), true).length + ' Experiments'
                        :
                        null
                }
            />
        );
    },

    renderers : {

        replicate : function(){

            var experimentsGroupedByBiosample = _.compose(
                this.renderRootStackedBlockListOfBiosamplesWithExperiments,
                ExperimentsTable.funcs.groupExperimentsByBiosampleRepNo,
                ExperimentsTable.funcs.groupFilesByPairsForEachExperiment,
                ExperimentsTable.funcs.combineWithReplicateNumbers
            );
            
            return (
                <div className="body clearfix">
                    { experimentsGroupedByBiosample(this.props.replicateExpsArray, this.props.experimentArray) }
                </div>
            );
        },

        default : function(){
            var experimentsGroupedByBiosample = _.compose(
                this.renderRootStackedBlockListOfBiosamplesWithExperiments,
                ExperimentsTable.funcs.groupExperimentsByBiosample,
                ExperimentsTable.funcs.flattenFileSetsToFilesIfNoFilesForEachExperiment
            );

            return (
                <div className="body clearfix">
                    { experimentsGroupedByBiosample(this.props.experimentArray) }
                </div>
            );
        }
    },

    render : function(){

        var renderHeader = function(h, i, arr){
            if (h.visible === false) return null;
            var visibleTitle = typeof h.visibleTitle !== 'undefined' ? h.visibleTitle : h.title;
            var style = null;
            if (Array.isArray(this.state.columnWidths) && this.state.columnWidths.length === arr.length){
                style = { 'width' : this.state.columnWidths[i] };
            }
            return (
                <div className={"heading-block col-" + h.className} key={'header-' + i} style={style} data-column-class={h.className}>
                    { visibleTitle }
                </div>
            );
        }.bind(this);

        return (
            <div className={"expset-experiments" + (this.state.mounted ? ' mounted' : '')}>
                <div className="headers expset-headers" ref="header">
                    { this.columnHeaders().map(renderHeader) }
                </div>
                { this.props.experimentSetType && typeof this.renderers[this.props.experimentSetType] === 'function' ? 
                    this.renderers[this.props.experimentSetType].call(this) : this.renderers.default.call(this) }
            </div>
        );
    }

});

var FilePairBlock = React.createClass({

    propTypes : {
        selectedFiles : React.PropTypes.instanceOf(Set),
        handleFileUpdate : React.PropTypes.func
    },

    updateFileChecked : function(add=true){
        if(
            Array.isArray(this.props.files) &&
            this.props.files[0].uuid &&
            typeof this.props.handleFileUpdate === 'function'
        ){
            this.props.handleFileUpdate(this.props.files[0].uuid, add);
        }
    },

    isChecked : function(){
        if (!Array.isArray(this.props.files) || !(this.props.selectedFiles instanceof Set) || !this.props.files[0].uuid) return null;
        return this.props.selectedFiles.has(this.props.files[0].uuid);
    },

    handleCheck: function() {
        this.updateFileChecked(!this.isChecked());
    },

    renderFileEntryBlock: function(file,i){
        return (
            <FileEntryBlock
                key={file['@id']}
                file={file}
                columnHeaders={ this.props.columnHeaders }
                className={null}
                isSingleItem={this.props.files.length < 2 ? true : false}
                pairParent={this}
                type="paired-end"
                colWidthStyles={this.props.colWidthStyles}
            />
        );
    },

    renderCheckBox : function(){
        var checked = this.isChecked();
        if (checked === null) return null;
        return (
            <Checkbox
                validationState='warning'
                checked={checked}
                name="file-checkbox"
                id={checked + "~" + true + "~" + this.props.files[0].file_format + "~" + this.props.files[0].uuid}
                className='exp-table-checkbox'
                onChange={this.handleCheck}
            />
        );
    },

    render : function(){

        function label(){
            if (typeof this.props.label === 'string'){
                return ExperimentsTable.StackedBlock.Name.renderBlockLabel('Pair', this.props.label)
            } else if (typeof this.props.label === 'object' && this.props.label){
                return ExperimentsTable.StackedBlock.Name.renderBlockLabel(this.props.label.title || null, this.props.label.subtitle || null)
            } else return null;
        }

        function nameColumn(){
            if (this.props.colVisible === false) return null;
            return (
                <div className="name col-file-pair" style={this.props.colWidthStyles ? this.props.colWidthStyles['file-pair'] : null}>
                    { label.call(this) }
                    <span className="name-title">
                        { this.renderCheckBox() }
                        { this.props.name }
                    </span>
                </div>
            );
        }

        return (
            <div className="s-block file-pair">
                { nameColumn.call(this) }
                <div className="files s-block-list">
                    { Array.isArray(this.props.files) ? 
                        this.props.files.map(this.renderFileEntryBlock)
                        :
                        <FileEntryBlock file={null} columnHeaders={ this.props.columnHeaders } colWidthStyles={this.props.colWidthStyles} />
                    }
                </div>
            </div>
        );
    }
});

var FileEntryBlock  = React.createClass({

    propTypes : {
        selectedFiles : React.PropTypes.instanceOf(Set),
        handleFileUpdate : React.PropTypes.func
    },

    updateFileChecked : function(add=true){
        if(
            this.props.file &&
            this.props.file.uuid &&
            typeof this.props.handleFileUpdate === 'function'
        ){
            this.props.handleFileUpdate(this.props.file.uuid, add);
        }
    },

    isChecked : function(){
        if (!this.props.file || !this.props.file.uuid || !(this.props.selectedFiles instanceof Set)) return null;
        return this.props.selectedFiles.has(this.props.file.uuid);
    },

    handleCheck: function() {
        this.updateFileChecked(!this.isChecked());
    },
    
    filledFileRow : function (file = this.props.file){
        var row = [];
        var cols = this.props.columnHeaders;
        var baseClassName = (this.props.className || '') + " col-file-detail item";
        var baseStyle = this.props.colWidthStyles ? this.props.colWidthStyles['file-detail'] : null;
        for (var i = 0; i < cols.length; i++){

            var className = baseClassName + ' col-' + cols[i].className + ' detail-col-' + i;
            var title = cols[i].valueTitle || cols[i].title;

            if (!file || !file['@id']) { 
                row.push(<div key={"file-detail-empty-" + i} className={className + i} style={baseStyle}></div>);
                continue;
            }

            if (title == 'File Type'){
                row.push(<div key="file-type" className={className + i} style={baseStyle}>{file.file_format}</div>);
                continue;
            }

            if (title == 'File Info'){
                if (typeof file.paired_end !== 'undefined') {
                    row.push(<div key="file-info" className={className + i} style={baseStyle}>
                        Paired end {file.paired_end}
                    </div>);
                } else if (file.file_format === 'fastq' || file.file_format === 'fasta') {
                    row.push(<div key="file-info" className={className + i} style={baseStyle}>Unpaired</div>);
                } else {
                    row.push(<div key="file-info" className={className + i} style={baseStyle}></div>);
                }
                continue;
            }
        }
        return row;
    },

    renderCheckBox : function(){
        if (!this.props.file) return null; // No file to select.
        if (this.props.pairParent) return null; // Part of pair -- FilePairBlock has own checkbox.

        var checked = this.isChecked();
        if (checked === null) return null; // No checked state.
        return (
            <Checkbox
                validationState='warning'
                checked={checked}
                name="file-checkbox"
                id={checked + "~" + true + "~" + this.props.file.file_format + "~" + this.props.file.uuid}
                className='exp-table-checkbox'
                onChange={this.handleCheck}
            />
        );
    },

    renderName : function(){

        function titleString(){
            if (!this.props.file) return 'No Files';
            return this.props.file.accession || this.props.file.uuid || this.props.file['@id'];
        }

        function title(){
            if (!this.props.file) return <span className="name-title">{ titleString.call(this) }</span>;
            return (
                <a className="name-title mono-text" href={ this.props.file['@id'] || '#' }>
                    { titleString.call(this) }
                </a>
            );
        }

        function label(){
            if (!this.props.file) return null;
            if (this.props.label) {
                return ExperimentsTable.StackedBlock.Name.renderBlockLabel(
                    this.props.label.title || null,
                    this.props.label.subtitle || null,
                    false,
                    'col-file'
                );
            } else if (this.props.type === 'sequence-replicate') {
                return ExperimentsTable.StackedBlock.Name.renderBlockLabel(
                    'File',
                    this.props.sequenceNum ? 'Seq Replicate ' + this.props.sequenceNum : null,
                    false,
                    'col-file'
                );
            } else if (this.props.type === 'paired-end') {
                return ExperimentsTable.StackedBlock.Name.renderBlockLabel(
                    'File',
                    this.props.file.paired_end ? 'Paired End ' + this.props.file.paired_end : null,
                    false,
                    'col-file'
                );
            }
            
            if (Array.isArray(this.props.columnHeaders)) {
                var headerTitles = _.pluck(this.props.columnHeaders, 'title');
                if (
                    (this.props.file.file_type || this.props.file.file_format) &&
                    _.intersection(headerTitles,['File Type', 'File Format']).length === 0
                ){
                    return ExperimentsTable.StackedBlock.Name.renderBlockLabel(
                        'File', this.props.file.file_type || this.props.file.file_format, false, 'col-file'
                    );
                } 
                if (
                    this.props.file.instrument &&
                    _.intersection(headerTitles,['Instrument', 'File Instrument']).length === 0
                ){
                    return ExperimentsTable.StackedBlock.Name.renderBlockLabel(
                        'File', this.props.file.instrument, false, 'col-file'
                    );
                }
            }
            
            return ExperimentsTable.StackedBlock.Name.renderBlockLabel('File', null, false, 'col-file');
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
    },

    render : function(){
        var sBlockClassName = "s-block file";
        if (this.props.type || this.props.hideNameOnHover) sBlockClassName += ' hide-name-on-block-hover';
        if (this.props.isSingleItem) sBlockClassName += ' single-item';
        return (
            <div className={sBlockClassName}>
                { this.renderName() }
                { this.filledFileRow() }
            </div>
        );
    }

});

/**
 * Returns an object containing fileDetail and emptyExps.
 * 
 * @param {Object[]} experimentArray - Array of experiments in set. Required.
 * @param {Set} [passedExperiments=null] - Set of experiments which match filter(s).
 * @return {Object} JS object containing two keys with arrays: 'fileDetail' of experiments with formatted details and 'emptyExps' with experiments with no files.
 */

var getFileDetailContainer = module.exports.getFileDetailContainer = function(experimentArray, passedExperiments = null){

    var fileDetail = {}; //use @id field as key
    var emptyExps = [];

    for (var i=0; i<experimentArray.length; i++){
        if(typeof passedExperiments === 'undefined' || passedExperiments == null || passedExperiments.has(experimentArray[i])){
            var tempFiles = [];
            var biosample_accession = experimentArray[i].biosample ? experimentArray[i].biosample.accession : null;
            var biosample_id = biosample_accession ? experimentArray[i].biosample['@id'] : null;

            var experimentDetails = {
                'accession':    experimentArray[i].accession,
                'biosample':    biosample_accession,
                'biosample_id': biosample_id,
                'uuid':         experimentArray[i].uuid,
                '@id' :         experimentArray[i]['@id']
                // Still missing : 'data', 'related'
            };

            if(experimentArray[i].files){
                tempFiles = experimentArray[i].files;
            } else if (experimentArray[i].filesets) {
                for (var j=0; j<experimentArray[i].filesets.length; j++) {
                    if (experimentArray[i].filesets[j].files_in_set) {
                        tempFiles = tempFiles.concat(experimentArray[i].filesets[j].files_in_set);
                    }
                }
            // No files in experiment
            } else {
                emptyExps.push(experimentArray[i]['@id']);
                experimentDetails.data = {};
                fileDetail[experimentArray[i]['@id']] = experimentDetails;
                continue;
            }

            // save appropriate experiment info
            if(tempFiles.length > 0){
                var relatedFiles = {};
                var relatedData = [];
                var k;
                for(k=0;k<tempFiles.length;k++){

                    // only use first file relation for now. Only support one relationship total
                    if(tempFiles[k].related_files && tempFiles[k].related_files[0].file){
                        // in form [related file @id, this file @id]
                        relatedFiles[tempFiles[k].related_files[0].file] =  tempFiles[k]['@id'];
                        fileDetail[tempFiles[k]['@id']] = _.extend({
                            'data' : tempFiles[k],
                            'related' : {
                                'relationship_type':tempFiles[k].related_files[0].relationship_type,
                                'file':tempFiles[k].related_files[0].file,
                                'data':null
                            }
                        }, experimentDetails);
                    } else {
                        fileDetail[tempFiles[k]['@id']] = _.extend({
                            'data' : tempFiles[k]
                        }, experimentDetails);
                    }
                }
                var usedRelations = [];
                for(k=0;k<tempFiles.length;k++){
                    if(_.contains(Object.keys(relatedFiles), tempFiles[k]['@id'])){
                        if(_.contains(usedRelations, tempFiles[k]['@id'])){
                            // skip already-added related files
                            delete fileDetail[relatedFiles[tempFiles[k]['@id']]];
                        }else{
                            fileDetail[relatedFiles[tempFiles[k]['@id']]]['related']['data'] = tempFiles[k];
                            usedRelations.push(relatedFiles[tempFiles[k]['@id']]);
                        }
                    }
                }
            }
        }
    }
    return { 'fileDetail' : fileDetail, 'emptyExps' : emptyExps };
}


var FileEntry = React.createClass({

    // TODO (ideally): Functionality to customize columns (e.g. pass in a schema instead of list of 
    // column names, arrange fields appropriately under them).

    getInitialState: function() {
        return {
            checked: this.props.parentChecked
        };
    },

    getDefaultProps : function(){
        return {
            experimentAccessionEntrySpan : 1
        };
    },

    // initial checkbox setting if parent is checked
    componentWillMount: function(){
        // if(this.props.exptPassed && _.contains(this.props.filteredFiles, this.props.file.uuid)){
        //     this.setState({
        //         checked: true
        //     });
        // }
        if(
            this.props.info.data &&
            this.props.info.data['@id'] &&
            this.state.checked &&
            typeof this.props.handleFileUpdate == 'function'
        ){
            this.props.handleFileUpdate(this.props.info.data.uuid, true);
        }
    },

    // update checkboxes if parent has changed
    componentWillReceiveProps: function(nextProps) {
        // if(this.props.filteredFiles !== nextProps.filteredFiles || this.props.exptPassed !== nextProps.exptPassed){
        //     if(nextProps.exptPassed && _.contains(nextProps.filteredFiles, this.props.file.uuid)){
        //         this.setState({
        //             checked: true
        //         });
        //     }
        // }

        if(this.props.parentChecked !== nextProps.parentChecked){
            this.setState({
                checked: nextProps.parentChecked
            });
        }
    },

    // update parent checked state
    componentWillUpdate(nextProps, nextState){
        if(
            (nextState.checked !== this.state.checked || this.props.expSetFilters !== nextProps.expSetFilters) &&
            nextProps.info.data &&
            nextProps.info.data['@id']
        ){
            this.props.handleFileUpdate(nextProps.info.data.uuid, nextState.checked);
        }
    },

    handleCheck: function() {
        this.setState({
            checked: !this.state.checked
        });
    },

    fastQFilePairRow : function(file, relatedFile, columnsOffset = 3){

        var columnHeadersShortened = this.props.columnHeaders.slice(columnsOffset);

        var fileOne;
        var fileTwo;
        var fileID;

        function fillFileRow(file, paired, exists = true){
            var f = [];
            for (var i = 0; i < columnHeadersShortened.length; i++){

                if (columnHeadersShortened[i] == 'File Accession'){
                    if (!exists) { 
                        f.push(<td>No files</td>);
                        continue;
                    } 
                    f.push(<td><a href={file['@id'] || ''}>{file.accession || file.uuid || file['@id']}</a></td>);
                }

                if (!exists) { 
                    f.push(<td></td>);
                    continue;
                }

                if (columnHeadersShortened[i] == 'File Type'){
                    f.push(<td>{file.file_format}</td>);
                    continue;
                }

                if (columnHeadersShortened[i] == 'File Info'){
                    if (paired) {
                        f.push(<td>Paired end {file.paired_end}</td>);
                    } else if (file.file_format === 'fastq' || file.file_format === 'fasta') {
                        f.push(<td>Unpaired</td>);
                    } else {
                        f.push(<td></td>);
                    }
                    continue;
                }
            }
            return f;
        }

        // code embarrasingly specific to fastq file pairs
        if(file){
            if(file.paired_end && file.paired_end === '1'){
                fileOne = fillFileRow(file, true, true);
            }else if(file.paired_end && file.paired_end === '2'){
                fileTwo = fillFileRow(file, true, true);
            }else{
                if(file['@id']){
                    fileOne = fillFileRow(file, false, true);
                }else{
                    fileOne = fillFileRow(file, false, false);
                }
            }
            fileID = this.state.checked + "~" + true + "~" + file.file_format + "~" + file.uuid;
        }
        if(relatedFile){
            if(relatedFile.paired_end && relatedFile.paired_end === '1'){
                fileOne = fillFileRow(relatedFile, true, true);
            }else if(relatedFile.paired_end && relatedFile.paired_end === '2'){
                fileTwo = fillFileRow(relatedFile, true, true);
            }else{
                fileTwo = fillFileRow(relatedFile, true, true);
            }
        }
        return {
            'fileOne' : fileOne,
            'fileTwo' : fileTwo,
            'fileID'  : fileID
        }
    },

    render: function(){
        var info = this.props.info;
        var file = info.data ? info.data : null;
        var relationship = info.related ? info.related : null;
        var relatedFile = null;

        if(relationship && relationship.data){
            relatedFile = relationship.data;
        }

        var fileInfo = this.fastQFilePairRow(file, relatedFile); 
        // Maybe later can do like switch...case for which function to run (fastQFilePairRow or other)
        // to fill fileInfo according to type of file or experiment type.
        var fileOne = fileInfo.fileOne;
        var fileTwo = fileInfo.fileTwo;
        var fileID  = fileInfo.fileID;

        var experimentAccessionCell = null;

        // Will need to separate out <tbody> before rowSpan will work correctly
        //if (this.props.experimentAccessionEntrySpan > 0){
            experimentAccessionCell = (
                <td rowSpan={2/* * this.props.experimentAccessionEntrySpan */} className="expset-exp-cell expset-exp-accession-title-cell">
                    <a href={
                        info['@id']  ? info['@id'] :
                        info['accession'] ? '/experiments/' + info['accession'] :
                        '#'
                    }>
                        {info.accession || info.uuid}
                    </a>
                </td>
            );
        //}
        
        return(
            <tbody>
                <tr className='expset-sublist-entry'>
                    { file['@id'] ?
                        <td rowSpan="2" className="expset-exp-cell expset-checkbox-cell">
                            <Checkbox validationState='warning' checked={this.state.checked} name="file-checkbox" id={fileID} className='expset-checkbox-sub' onChange={this.handleCheck}/>
                        </td>
                    : 
                        <td rowSpan="2" className="expset-exp-cell expset-checkbox-cell">
                            <Checkbox checked={false} disabled={true} className='expset-checkbox-sub' />
                        </td>
                    }
                    { experimentAccessionCell }
                    <td rowSpan="2" className="expset-exp-cell">
                        <a href={info.biosample_id || '#'}>
                            {info.biosample}
                        </a>
                    </td>
                    {(fileOne && fileOne[0]) ? fileOne[0] : null}
                    {(fileOne && fileOne[1]) ? fileOne[1] : null}
                    {(fileOne && fileOne[2]) ? fileOne[2] : null}
                </tr>
                {fileTwo ?
                <tr>
                    {fileTwo[0]}
                    {fileTwo[1]}
                    {fileTwo[2]}
                </tr>
                : null}
            </tbody>
        );
    }
});