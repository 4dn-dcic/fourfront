'use strict';

/** @ignore */
var React = require('react');
var _ = require('underscore');
var d3 = require('d3');
var vizUtil = require('./utilities');
var { RotatedLabel, Legend } = require('./components');
var { console, object, isServerSide, expFxn, Filters, layout } = require('../util');
var { highlightTerm, unhighlightTerms } = require('./../facetlist');
var { ButtonToolbar, ButtonGroup, Button, DropdownButton, MenuItem } = require('react-bootstrap');


/**
 * Component for BarPlotChart. 
 * Contains chart and labels only -- no controls.
 * To add controls, wrap the chart in BarPlotChart.UIControlsWrapper, which will feed its state as props to BarPlotChart and has UI components
 * for adjusting its state to select Charting options.
 * Use BarPlotChart (or UIControlsWrapper, if is wrapping BarPlotChart) as child of ChartDataController.provider, which will feed props.experiments and props.filteredExperiments.
 * 
 * @module viz/BarPlotChart
 * @type {Component}
 * @see module:viz/chart-data-controller.Provider
 * @see module:viz/BarPlotChart.UIControlsWrapper
 */

/**
 * @alias module:viz/BarPlotChart
 */
var BarPlot = React.createClass({

    statics : {


        /**
         * Component which wraps the BarPlotChart and provides some UI buttons and stuff.
         * Passes props to BarPlotChart.
         * 
         * @namespace
         * @type {Component}
         * @memberof module:viz/BarPlotChart
         */
        UIControlsWrapper : React.createClass({

            /**
             * Default props for the UIControlsWrapper.
             * @memberof module:viz/BarPlotChart.UIControlsWrapper
             * @instance
             */
            getDefaultProps : function(){
                return {
                    'titleMap' : {
                        // Aggr type
                        'experiment_sets' : "Experiment Sets",
                        'experiments' : 'Experiments',
                        'files' : "Files",
                        // Show state
                        'all' : 'All',
                        'filtered' : 'Selected',
                        'both' : 'All & Selected'
                    },
                    'availableFields1' : [
                        { title : "Biosample", field : "experiments_in_set.biosample.biosource_summary" },
                        { title : "Digestion Enzyme", field : "experiments_in_set.digestion_enzyme.name" },
                        { title : "Biosource Type", field : 'experiments_in_set.biosample.biosource.biosource_type' }
                    ],
                    'availableFields2' : [
                        { title : "Experiment Type", field : 'experiments_in_set.experiment_type' },
                        { title : "Organism", field : "experiments_in_set.biosample.biosource.individual.organism.name" },
                    ],
                    'legend' : false,
                    'chartHeight' : 300
                };
            },

            /**
             * @ignore
             * @memberof module:viz/BarPlotChart.UIControlsWrapper
             */
            getInitialState : function(){
                return {
                    'fields' : [
                        { title : "Biosample", field : "experiments_in_set.biosample.biosource_summary" },
                        { title : "Experiment Type", field : 'experiments_in_set.experiment_type' },
                        //{ title : "Experiment Summary", field : "experiments_in_set.experiment_summary" }
                    ],
                    'aggregateType' : 'experiment_sets',
                    'showState' : 'all'
                };
            },

            /**
             * @ignore
             * @memberof module:viz/BarPlotChart.UIControlsWrapper
             */
            componentWillReceiveProps : function(nextProps){
                if (this.filterObjExistsAndNoFiltersSelected(nextProps.expSetFilters)){
                    this.setState({ 'showState' : 'all' });
                }
            },

            /**
             * @ignore
             * @memberof module:viz/BarPlotChart.UIControlsWrapper
             */
            filterObjExistsAndNoFiltersSelected : function(expSetFilters = this.props.expSetFilters){
                return (
                    typeof expSetFilters === 'object'
                    && expSetFilters !== null
                    && _.keys(expSetFilters).length === 0
                );
            },

            /**
             * @ignore
             * @memberof module:viz/BarPlotChart.UIControlsWrapper
             */
            titleMap : function(key = null, fromDropdown = false){
                if (!key) return this.props.titleMap;
                var title = this.props.titleMap[key];
                if (fromDropdown && ['all','filtered'].indexOf(key) > -1){
                    title += ' ' + this.titleMap(this.state.aggregateType);
                } else if (fromDropdown && key == 'both'){
                    return 'Both';
                }
                return title;
            },

            /**
             * Clones props.children, expecting a Chart React Component as the sole child, and extends Chart props with 'fields', 'showType', and 'aggregateType'.
             * @instance
             * @returns {React.Component} Cloned & extended props.children.
             * @memberof module:viz/BarPlotChart.UIControlsWrapper
             */
            adjustedChildChart : function(){
                // TODO: validate that props.children is a BarPlotChart

                return React.cloneElement(
                    this.props.children,
                    _.extend(
                        _.omit( // Own props minus these.
                            this.props,
                            'titleMap', 'availableFields1', 'availableFields2', 'legend', 'chartHeight'
                        ),
                        {
                            'fields' : this.state.fields,
                            'showType' : this.state.showState,
                            'aggregateType' : this.state.aggregateType,
                        }
                    )
                );
            },

            /**
             * @ignore
             * @memberof module:viz/BarPlotChart.UIControlsWrapper
             */
            handleAggregateTypeSelect : _.throttle(function(eventKey, event){
                this.setState({ aggregateType : eventKey });
            }, 300),

            /**
             * @ignore
             * @memberof module:viz/BarPlotChart.UIControlsWrapper
             */
            handleExperimentsShowType : _.throttle(function(eventKey, event){
                this.setState({ showState : eventKey });
            }, 300),

            /**
             * @ignore
             * @memberof module:viz/BarPlotChart.UIControlsWrapper
             */
            handleFieldSelect : _.throttle(function(fieldIndex, newFieldKey, event){
                var newFields;
                if (newFieldKey === "none"){ // Only applies to subdivision (fieldIndex 1)
                    newFields = this.state.fields.slice(0,1);
                    this.setState({ fields : newFields });
                    return;
                }

                var newField = _.find(
                    this.props['availableFields' + (fieldIndex + 1)],
                    { field : newFieldKey }
                );
                var otherFieldIndex = fieldIndex === 0 ? 1 : 0;
                if (fieldIndex === 0 && this.state.fields.length === 1){
                    newFields = [null];
                } else {
                    newFields = [null, null];
                }
                newFields[fieldIndex] = newField;
                if (newFields.length > 1) newFields[otherFieldIndex] = this.state.fields[otherFieldIndex];
                this.setState({ fields : newFields });
                //this.setState({ showState : eventKey });
            }, 300),

            /**
             * @ignore
             * @memberof module:viz/BarPlotChart.UIControlsWrapper
             */
            getFieldAtIndex : function(fieldIndex){
                if (!this.state.fields) return null;
                if (!Array.isArray(this.state.fields)) return null;
                if (this.state.fields.length < fieldIndex + 1) return null;
                return this.state.fields[fieldIndex];
            },

            /**
             * @ignore
             * @memberof module:viz/BarPlotChart.UIControlsWrapper
             */
            renderDropDownMenuItems : function(keys, active = null, noFiltersSet = true, disabledTitle = null){
                return keys.map((key)=>{
                    var subtitle = null;
                    var title = null;
                    if (Array.isArray(key)){
                        // Assume we have [key, title, subtitle].
                        title = key[1] || null;
                        subtitle = key[2] || null;
                        key = key[0];
                    }
                    var disabled = noFiltersSet && (key === 'filtered' || key === 'both');
                    return <MenuItem
                        key={key}
                        eventKey={key}
                        active={key === active}
                        children={title || this.titleMap(key, true)}
                        disabled={disabled}
                        title={(disabled && disabledTitle) || subtitle || null}
                    />;
                });
            },

            /**
             * @ignore
             * @memberof module:viz/BarPlotChart.UIControlsWrapper
             */
            render : function(){
                
                var filterObjExistsAndNoFiltersSelected = this.filterObjExistsAndNoFiltersSelected();
                var windowGridSize = layout.responsiveGridState();

                return (
                    <div className="bar-plot-chart-controls-wrapper">
                        <div className="overlay" style={{
                            height : this.props.chartHeight,
                            width  : (windowGridSize !== 'xs' ? (layout.gridContainerWidth() * (9/12) - 15) : null)
                        }}>

                            <div className="y-axis-top-label" style={{
                                width : this.props.chartHeight,
                                top: this.props.chartHeight - 40
                            }}>
                                <DropdownButton
                                    id="select-barplot-aggregate-type"
                                    bsSize="xsmall"
                                    onSelect={this.handleAggregateTypeSelect}
                                    title={this.titleMap(this.state.aggregateType)}
                                    children={this.renderDropDownMenuItems(
                                        ['experiment_sets','experiments','files'],
                                        this.state.aggregateType
                                    )}
                                />
                            </div>

                            <div className={"toggle-zoom" + (filterObjExistsAndNoFiltersSelected ? ' no-click' : '')} onClick={()=>
                                this.handleExperimentsShowType(this.state.showState === 'all' ? 'filtered' : 'all')
                            }>
                                <div className="text">
                                    <small>Viewing</small><br/>
                                    {this.state.showState === 'all' ? 'All' : 'Selected'}
                                </div>
                                <i className={"icon icon-search-" + (this.state.showState === 'all' ? 'plus' : 'minus')}/>
                            </div>
                            
                            <div className="controls" style={{ display : 'none'}}>
                                <ButtonToolbar>
                                    <ButtonGroup>
                                        <DropdownButton
                                            id="select-barplot-experiments-type"
                                            onSelect={this.handleExperimentsShowType}
                                            title={
                                                <div className="dropdown-title-container">
                                                    <small>Show</small><br/>
                                                    <h5>{ this.titleMap(!filterObjExistsAndNoFiltersSelected ? this.state.showState : 'all') }</h5>
                                                </div>
                                            }
                                            children={this.renderDropDownMenuItems(
                                                ['filtered','all'],
                                                this.state.showState,
                                                filterObjExistsAndNoFiltersSelected,
                                                "Please select some filters first."
                                            )}
                                        />
                                        
                                    </ButtonGroup>
                                </ButtonToolbar>
                            </div>

                        </div>

                        <div className="row">
                            <div className="col-sm-9">
                                { this.adjustedChildChart() }
                            </div>
                            <div className="col-sm-3 chart-aside" style={{ height : this.props.chartHeight }}>
                                <div className="legend-container" style={{ height : windowGridSize !== 'xs' ? 
                                    this.props.chartHeight - 49 : null
                                }}>
                                    <DropdownButton
                                        id="select-barplot-field-1"
                                        onSelect={this.handleFieldSelect.bind(this, 1)}
                                        title={(()=>{
                                            var field = this.getFieldAtIndex(1);
                                            if (!field) return "None";
                                            return field.title || Filters.Field.toName(field.field);
                                        })()}
                                        children={this.renderDropDownMenuItems(
                                            this.props.availableFields2.concat([{
                                                title : <em>None</em>,
                                                field : "none"
                                            }]).map(function(field){
                                                return [
                                                    field.field,
                                                    field.title || Filters.Field.toName(field.field),
                                                    field.description || null
                                                ]; // key, title, subtitle
                                            }),
                                            (this.state.fields[1] && this.state.fields[1].field) || "none"
                                        )}
                                    />
                                    <Legend
                                        fields={(
                                            this.props.experiments && this.state.fields[1] ? (
                                                Legend.experimentsAndFieldsToLegendData(
                                                    this.state.showState === 'filtered' ? 
                                                        (this.props.filteredExperiments || this.props.experiments)
                                                        : this.props.experiments,
                                                    [this.state.fields[1]],
                                                    this.props.schemas
                                                )
                                            ) : null
                                        )}
                                        includeFieldTitles={false}
                                        schemas={this.props.schemas}
                                        width={layout.gridContainerWidth() * (3/12) - 20}
                                        title={null
                                            /*
                                            <div>
                                                <h5 className="text-400 legend-title">
                                                    Legend
                                                </h5>
                                            </div>
                                            */
                                        }
                                    />
                                </div>
                                <div className="x-axis-right-label">
                                    <DropdownButton
                                        id="select-barplot-field-0"
                                        onSelect={this.handleFieldSelect.bind(this, 0)}
                                        title={(()=>{
                                            var field = this.getFieldAtIndex(0);
                                            return field.title || Filters.Field.toName(field.field);
                                        })()}
                                        children={this.renderDropDownMenuItems(
                                            this.props.availableFields1.map(function(field){
                                                return [
                                                    field.field,
                                                    field.title || Filters.Field.toName(field.field),
                                                    field.description || null
                                                ]; // key, title, subtitle
                                            }),
                                            this.state.fields[0].field
                                        )}
                                    />
                                </div>

                            </div>
                        </div>
                    </div>
                );
            }

        }),



        // *************************************
        // **** AGGREGATION FUNCTIONS BELOW ****
        // *************************************

        /** 
         * Entrypoint for aggregation. 
         * First, counts up terms per field from experiments for field in supplied 'fields' param array. Count is adjusted depending on if aggregating experiments, experiment_sets, or files.
         * Secondly, partitions one field as a child of another. If param 'useOnlyPopulatedFields' is false (default), then will use
         * first field in param 'fields' array as primary field, or X-axis, and second field as secondary field, or bar subdivision.
         * If 'useOnlyPopulatedFields' is set to true, will find the first field which has multiple terms (== multiple bars) to use as the primary field, and find
         * second field with multiple terms to use as the secondary field.
         * 
         * @static
         * @public
         * @memberof module:viz/BarPlotChart
         * @param {Array} experiments - List of experiments which are to be aggregated or counted by their term(s).
         * @param {Array} fields - List of fields containing at least 'field' property (as object-dot-notated string).
         * @param {string} [aggregate="experiments"] - What to aggregate. Can be 'experiments', 'experiment_sets', or 'files'.
         * @param {string} [experimentsOrSets="experiments"] - Deprecated. Whether chart is fed experiments or experiment_sets.
         * @param {boolean} [useOnlyPopulatedFields=false] - If true, will try to only select fields which have multiple terms to visualize.
         * 
         * @returns {Array} - Array of fields, now containing term counts per field. One field (either the first or first populated) will have a childField with partitioned terms.
         */
        genChartData : function(
            experiments = [],
            fields = [{ 'name' : 'Biosample' , field : 'experiments_in_set.biosample.biosource_summary' }],
            aggregate = 'experiments',
            experimentsOrSets = 'experiments',
            useOnlyPopulatedFields = false
        ){
            //aggregate='experiments';
            // Since we not looking for populated fields, only keep track of first two fields provided.
            fields = !useOnlyPopulatedFields ? fields.slice(0,2) : fields.slice(0);

            // Add terms and total for each field which isn't null or undefined.
            fields = _.filter(fields, function(f){
                return f;
            }).map(function(f){
                return _.extend({}, f, {
                    'terms' : {},
                    'total' : 0
                });
            });

            BarPlot.aggregateByType(fields, experiments, aggregate);

            if (fields.length === 1) return fields;
            return BarPlot.partitionFields(fields, experiments, aggregate, useOnlyPopulatedFields);
        },

        /**
         * @memberof module:viz/BarPlotChart
         * @static
         * @ignore
         */
        countTermForFieldFromExperimentByAggregateType : function(fieldObj, experiment, term, aggregate){
            if (!aggregate || aggregate === 'experiments'){
                BarPlot.countFieldTerm(fieldObj, term);
                //experiments.forEach(BarPlot.countFieldsTermsForExperiment.bind(this, fields));
            } else if ( aggregate === 'experiment_sets' ){
                throw new Error("Not yet built.");

            } else if ( aggregate === 'files' ){
                BarPlot.countFieldTerm(fieldObj, term, true, expFxn.fileCount(experiment));
            }
        },

        /**
         * @memberof module:viz/BarPlotChart
         * @static
         * @ignore
         */
        aggregateByType : function(fields, experiments, aggregate){
            if (!aggregate || aggregate === 'experiments'){
                experiments.forEach(function(exp){
                    BarPlot.getTermsForFieldsFromExperiment(fields,exp).forEach(function(fieldTermPair, i){
                        if (fields[i].field !== fieldTermPair[0]) throw new Error("This shouldn't happen");
                        BarPlot.countFieldTerm(fields[i], fieldTermPair[1]);
                    });
                });
                //experiments.forEach(BarPlot.countFieldsTermsForExperiment.bind(this, fields));
            } else if ( aggregate === 'experiment_sets' ){
                //throw new Error("Not yet built.");
                var expSets = expFxn.groupExperimentsIntoExperimentSets(experiments);
                _.forEach(expSets, function(expsInSet){
                    var aggrValue = (1 / expsInSet.length);
                    expsInSet.forEach(function(exp){
                        var fieldTermPairs = BarPlot.getTermsForFieldsFromExperiment(fields,exp);
                        fieldTermPairs.forEach(function(fieldTermPair, i){
                            if (fields[i].field !== fieldTermPair[0]) throw new Error("This shouldn't happen");
                            BarPlot.countFieldTerm(fields[i], fieldTermPair[1], true, aggrValue);
                        });
                    });
                    // Finally, round resulting counts because JS might leave as 0.99999999999 instead of 1.
                    fields.forEach(function(field){
                        _.forEach(_.keys(field.terms), function(term){
                            field.terms[term] = Math.round(field.terms[term] * 100) / 100;
                        });
                    });
                    
                });
            } else if ( aggregate === 'files' ){
                experiments.forEach(function(exp){
                    // [[field0Id, term], [field1Id, term], ...] . forEach( -->
                    BarPlot.getTermsForFieldsFromExperiment(fields,exp).forEach(function(fieldTermPair, i){
                        if (fields[i].field !== fieldTermPair[0]) throw new Error("This shouldn't happen");
                        BarPlot.countFieldTerm(fields[i], fieldTermPair[1], true, expFxn.fileCount(exp));
                    });
                });
            }
        },

        /**
         * @memberof module:viz/BarPlotChart
         * @static
         * @ignore
         */
        partitionFields : function(fields, experiments, aggregate, useOnlyPopulatedFields = false){
            var topIndex, nextIndex;
            if (!Array.isArray(fields) || fields.length < 2) throw new Error("Need at least 2 fields.");
            if (useOnlyPopulatedFields){
                // Find first & second fields which have more than 1 term and use those.
                topIndex = BarPlot.firstPopulatedFieldIndex(fields);
                if ((topIndex + 1) >= fields.length) return fields; // Cancel
                
                nextIndex = BarPlot.firstPopulatedFieldIndex(fields, topIndex + 1);
            } else {
                // Use fields[0] and fields[1].
                topIndex = 0;
                nextIndex = 1;
            }
            fields[topIndex].childField = fields[nextIndex];
            return BarPlot.combinedFieldTermsForExperiments(fields, experiments, aggregate);
        },


        /**
         * @memberof module:viz/BarPlotChart
         * @static
         * @public
         * @param {Object} fieldObj - A field object with present but incomplete 'terms' & 'total'.
         * @param {string|string[]} term - A string or array of strings denoting terms.
         * @param {boolean} [updateTotal=true] - Whether to update fieldObj.total property as well.
         * @param {number} [countIncrease=1] - Amount to increase count for term by.
         * @returns {undefined}
         */
        countFieldTerm : function(fieldObj, term, updateTotal = true, countIncrease = 1){
            if (term === null) term = "None";
            var termsCont = fieldObj.terms;
            if (Array.isArray(term)){
                term = _.uniq(term);
                if (term.length === 1) term = term[0];
                else {
                    console.warn('Multiple unique terms for field ' + fieldObj.field, term);
                    term = term[0];
                }
                /*
                else {
                    var i = 0;
                    while (i < term.length - 1){
                        termsCont = termsCont[term[i]].terms;
                        if (typeof termsCont === 'undefined') return;
                        i++;
                    }
                    term = term[i];
                }
                */
            }
            if (typeof termsCont[term] === 'number'){
                termsCont[term] += countIncrease;
            } else {
                termsCont[term] = countIncrease;
            }
            if (updateTotal) fieldObj.total += countIncrease;
        },

        /**
         * @memberof module:viz/BarPlotChart
         * @static
         * @public
         * @param {Array} fields - List of field objects.
         * @param {Object} exp - Experiment to get terms (field values) from to pair with fields.
         * @returns {Array} Array of pairs containing field key (index 0) and term (index 1) 
         */
        getTermsForFieldsFromExperiment : function(fields, exp){
            return fields.map(function(f){
                return [f.field, object.getNestedProperty(exp, f.field.replace('experiments_in_set.',''), true)];
            });
        },
/*
        countFieldsTermsForExperiment : function(fields, exp){
            _.forEach(fields, function(f){ 
                var term = object.getNestedProperty(exp, f.field.replace('experiments_in_set.',''), true);
                BarPlot.countFieldTerm(f, term);
            });
            return fields;
        },
*/
        /**
         * @memberof module:viz/BarPlotChart
         * @static
         * @ignore
         */
        combinedFieldTermsForExperiments : function(fields, experiments, aggregate){
            var field;
            var fieldIndex;
            if (Array.isArray(fields)){ // Fields can be array or single field object.
                fieldIndex = _.findIndex(fields, function(f){ return typeof f.childField !== 'undefined'; });
                field = fields[fieldIndex];
            } else {
                field = fields;
            }

            function createNoneChildField(){
                field.terms["None"] = {
                    'field' : field.childField.field, 
                    'cachedTotal' : null,
                    'total' : 0,
                    'term' : "None",
                    'terms' : {}
                };
            }

            field.terms = _(field.terms).chain()
                .clone()
                .pairs()
                .map(function(term){
                    var termField = {
                        'field' : field.childField.field, 
                        'cachedTotal' : term[1],
                        'total' : 0,
                        'term' : term[0],
                        'terms' : {} 
                    };
                    return [
                        term[0],
                        termField
                    ];
                })
                .object()
                .value();

            function aggregateExp(exp, aggrValue = null){
                if (typeof aggrValue !== 'number') aggrValue = null;
                var topLevelFieldTerm = object.getNestedProperty(exp, field.field.replace('experiments_in_set.',''), true);
                var nextLevelFieldTerm = object.getNestedProperty(exp, field.childField.field.replace('experiments_in_set.',''), true);

                // For now, just use first term if evaluates to list.
                if (Array.isArray(topLevelFieldTerm)) topLevelFieldTerm = topLevelFieldTerm[0];
                if (Array.isArray(nextLevelFieldTerm)) nextLevelFieldTerm = nextLevelFieldTerm[0];

                if (!topLevelFieldTerm){
                    topLevelFieldTerm = "None";
                    if (typeof field.terms[topLevelFieldTerm] === 'undefined') createNoneChildField();
                }

                if (aggregate === 'files' || aggregate === 'experiments'){
                    BarPlot.countTermForFieldFromExperimentByAggregateType(field.terms[topLevelFieldTerm], exp, nextLevelFieldTerm, aggregate);
                } else if (aggregate === 'experiment_sets'){
                    BarPlot.countFieldTerm(field.terms[topLevelFieldTerm], nextLevelFieldTerm, true, aggrValue);
                }
            }

            //BarPlot.aggregateByType([field,field.childField], experiments, aggregate);
            if (aggregate === 'files' || aggregate === 'experiments'){
                experiments.forEach(aggregateExp);
            } else if (aggregate === 'experiment_sets'){
                var expSets = expFxn.groupExperimentsIntoExperimentSets(experiments);

                _.forEach(expSets, function(expsInSet){
                    // Round to hundredths because of JS floating point smidgerry. (e.g. 0.99999999999999 instead of 1)
                    var aggrValue = 1 / expsInSet.length;

                    expsInSet.forEach(function(exp){
                        aggregateExp(exp, aggrValue);
                    });
                    
                });

                // Finally, round resulting counts because JS might leave as 0.99999999999 instead of 1.
                _.forEach(_.keys(field.terms), function(topFieldTerm){
                    _.forEach(_.keys(field.terms[topFieldTerm].terms), function(lowerFieldTerm){
                        field.terms[topFieldTerm].terms[lowerFieldTerm] = Math.round(field.terms[topFieldTerm].terms[lowerFieldTerm] * 100) / 100;
                    });
                    field.terms[topFieldTerm].total = Math.round(field.terms[topFieldTerm].total * 100) / 100;
                });

            }
            

            if (Array.isArray(fields)){
                fields[fieldIndex] = field; // Probably not needed as field already simply references fields[fieldIndex];
            }

            return fields;

        },
        /**
         * Find first field from param 'fields', starting from param 'start', which has more counts for more than 1 term.
         * 
         * @memberof module:viz/BarPlotChart
         * @static
         * @public
         * @param {Object[]} fields - List of field objects.
         * @param {number} start - Start index.
         * @returns {number} - Index of first populated field.
         */
        firstPopulatedFieldIndex : function(fields, start = 0){
            var topIndex = start;
            var numberOfTerms;

            // Go down list of fields until select field to display which has more than 1 term, or until last field.
            while (topIndex + 1 < fields.length){
                numberOfTerms = _.keys(fields[topIndex].terms).length;
                if (numberOfTerms > 1) break;
                topIndex++;
            }
            return topIndex;
        },

        /** 
         * Return an object containing bar dimensions for first field which has more than 1 possible term, index of field used, and all fields passed originally. 
         *
         * @memberof module:viz/BarPlotChart
         * @static
         * @public
         * @param {Object[]} fields - Array of fields (i.e. from props.fields) which contain counts by term and total added through @see BarPlot.genChartData().
         * @param {Object} fields.terms - Object keyed by possible term for field, with value being count of term occurences in [props.]experiments passed to genChartData.
         * @param {number} fields.total - Count of total experiments for which this field is applicable.
         * @param {number} [availWidth=400] - Available width, in pixels, for chart.
         * @param {number} [availHeight=400] - Available width, in pixels, for chart.
         * @param {Object} [styleOpts=BarPlot.getDefaultStyleOpts()] - Style settings for chart which may contain chart offsets (for axes).
         * @param {boolean} [useOnlyPopulatedFields=false] - Determine which fields to show via checking for which fields have multiple terms present.
         * @param {number} [maxValue] - Maximum y-axis value. Overrides height of bars.
         * 
         * @return {Object} Object containing bar dimensions for first field which has more than 1 possible term, index of field used, and all fields passed originally.
         */
        genChartBarDims : function(
            fields,
            availWidth = 400,
            availHeight = 400,
            styleOpts = BarPlot.getDefaultStyleOpts(),
            useOnlyPopulatedFields = false,
            maxValue = null
        ){

            var topIndex = 0;

            if (useOnlyPopulatedFields) {
                topIndex = BarPlot.firstPopulatedFieldIndex(fields);
            }
            
            var numberOfTerms = _.keys(fields[topIndex].terms).length;
            var largestExpCountForATerm = typeof maxValue === 'number' ?
                maxValue
                : _.reduce(fields[topIndex].terms, function(m,t){
                    return Math.max(m, typeof t === 'number' ? t : t.total);
                }, 0);

            var insetDims = {
                width  : Math.max(availWidth  - styleOpts.offset.left   - styleOpts.offset.right, 0),
                height : Math.max(availHeight - styleOpts.offset.bottom - styleOpts.offset.top,   0)
            };
            
            var availWidthPerBar = Math.min(Math.floor(insetDims.width / numberOfTerms), styleOpts.maxBarWidth + styleOpts.gap);
            var barXCoords = d3.range(0, insetDims.width, availWidthPerBar);
            var barWidth = Math.min(Math.abs(availWidthPerBar - styleOpts.gap), styleOpts.maxBarWidth);

            function genBarData(fieldObj, outerDims = insetDims, parent = null){
                return _(fieldObj.terms).chain()
                    .pairs()
                    .map(function(term, i){
                        var termKey = term[0];
                        var termCount = term[1];
                        var childBars = null;
                        if (typeof term[1] === 'object') termCount = term[1].total;
                        var maxYForBar = parent ? fieldObj.total : largestExpCountForATerm;
                        var barHeight = maxYForBar === 0 ? 0 : (termCount / maxYForBar) * outerDims.height;
                        var barNode = {
                            'name' : termKey,
                            'term' : termKey,
                            'count' : termCount,
                            'field' : fieldObj.field,
                            'attr' : {
                                'width' : barWidth,
                                'height' : barHeight
                            }
                        };
                        if (typeof term[1] === 'object') {
                            barNode.bars = genBarData(term[1], { 'height' : barHeight }, barNode);
                        }
                        if (parent){
                            barNode.parent = parent;
                        }
                        return barNode;
                    })
                    .sortBy(function(d){ return -d.attr.height; })
                    .forEach(function(d,i){
                        d.attr.x = barXCoords[i];
                    })
                    .value();
            }

            var barData = {
                'fieldIndex' : topIndex,
                'bars'       : genBarData(fields[topIndex], insetDims),
                'fields'     : fields,
                'maxY'       : largestExpCountForATerm
            };

            return barData;
        },

        /**
         * Deprecated. Convert barData to array of field objects to be consumed by Legend React component.
         * 
         * @static
         * @param {Object} barData - Data representing bars and their subdivisions.
         * @param {Object} [schemas=null] - Schemas to get field names from.
         * @returns {Array} - Fields with terms and colors for those terms.
         */
        barDataToLegendData : function(barData, schemas = null){
            var fields = {};
            _.reduce(barData.bars, function(m,b){
                if (Array.isArray(b.bars)) return m.concat(b.bars);
                else {
                    m.push(b);
                    return m;
                }
            }, []).forEach(function(b){
                if (typeof fields[b.field] === 'undefined') fields[b.field] = { 'field' : b.field, 'terms' : {}, 'name' : Filters.Field.toName(b.field, schemas) };
                fields[b.field].terms[b.term] = { 'term' : b.term, 'name' : b.name || Filters.Term.toName(b.field, b.term), 'color' : vizUtil.colorForNode(b, true) };
            });
            fields = _.values(fields);
            fields.forEach(function(f){ f.terms = _.values(f.terms); });
            return fields;
        },

        /**
         * @returns {Object} Default style options for chart. Should suffice most of the time.
         */
        getDefaultStyleOpts : function(){
            return {
                'gap' : 16,
                'maxBarWidth' : 60,
                'maxLabelWidth' : null,
                'labelRotation' : 30,
                'labelWidth' : 200,
                'yAxisMaxHeight' : 100, // This will override labelWidth to set it to something that will fit at angle.
                'offset' : {
                    'top' : 18,
                    'bottom' : 50,
                    'left' : 50,
                    'right' : 0
                }
            };
        }
    },

    /** @ignore */
    getInitialState : function(){
        return { 'mounted' : false };
    },
  
    /** @ignore */
    componentDidMount : function(){
        this.bars = {}; // Save currently-visible bar refs to this object to check if bar exists already or not on re-renders for better transitions.
        this.setState({ 'mounted' : true });
    },

    /** 
     * @prop {Object[]} experiments - List of all experiments, with at least fields needed to aggregate by embedded.
     * @prop {Object[]} filteredExperiments - List of selected experiments, with at least fields needed to aggregate by embedded.
     * @prop {Object[]} fields - List of at least one field objects, each containing at least 'field' property in object-dot-notation.
     * @prop {string} fields.field - Field, in <code>object.dot.notation</code>.
     * @prop {string} fields.name - Name of field.
     */
    propTypes : {
        'experiments'   : React.PropTypes.array,
        'filteredExperiments' : React.PropTypes.array,
        'fields'        : React.PropTypes.array,
        'styleOptions'  : React.PropTypes.shape({
            'gap'           : React.PropTypes.number,
            'maxBarWidth'   : React.PropTypes.number,
            'labelRotation' : React.PropTypes.oneOf([React.PropTypes.number, React.PropTypes.string]),
            'labelWidth'    : React.PropTypes.oneOf([React.PropTypes.number, React.PropTypes.string]),
            'offset'        : React.PropTypes.shape({
                'top'           : React.PropTypes.number,
                'bottom'        : React.PropTypes.number,
                'left'          : React.PropTypes.number,
                'right'         : React.PropTypes.number
            })
        }),
        'height'        : React.PropTypes.number,
        'width'         : React.PropTypes.number
    },
  
    /** @ignore */
    getDefaultProps : function(){
        return {
            'experiments' : [],
            'fields' : [],
            'useOnlyPopulatedFields' : false,
            'showType' : 'both',
            'aggregateType' : 'experiments',
            'styleOptions' : null, // Can use to override default margins/style stuff.
        };
    },

    /** 
     * Gets style options for BarPlotChart instance. Internally, extends BarPlotChart.getDefaultStyleOpts() with props.styleOptions.
     * @instance
     * @returns {Object} Style options object.
     */
    styleOptions : function(){ return vizUtil.extendStyleOptions(this.props.styleOptions, BarPlot.getDefaultStyleOpts()); },
  
    /**
     * @instance
     * @returns props.width or width of refs.container, if mounted.
     */
    width : function(){
        if (this.props.width) return this.props.width;
        if (!this.refs.container) return null;
        var width = this.refs.container.parentElement.clientWidth;
        if (this.refs.container.parentElement.className.indexOf('col-') > -1){
            // Subtract 20 to account for grid padding (10px each side).
            return width - 20;
        }
        return width;
    },

    /**
     * @instance
     * @returns props.height or height of refs.container, if mounted.
     */
    height : function(){
        if (this.props.height) return this.props.height;
        if (!this.refs.container) return null;
        return this.refs.container.parentElement.clientHeight;
    },

    /** @ignore */
    shouldPerformManualTransitions : function(nextProps, pastProps){
        return !!(
            !_.isEqual(pastProps.experiments, nextProps.experiments) ||
            pastProps.height !== nextProps.height ||
            !_.isEqual(pastProps.filteredExperiments, nextProps.filteredExperiments)
        );
    },

    /**
     * @deprecated
     * @instance
     * @ignore
     */
    componentWillReceiveProps : function(nextProps){
        /*
        if (this.shouldPerformManualTransitions(nextProps, this.props)){
            console.log('WILL DO SLOW TRANSITION');
            this.setState({ transitioning : true });
        }
        */
    },

    /**
     * @deprecated
     * @instance
     * @ignore
     */
    componentDidUpdate : function(pastProps){

        /*
        if (this.shouldPerformManualTransitions(this.props, pastProps)){
            // Cancel out of transitioning state after delay. Delay is to allow new/removing elements to adjust opacity.
            setTimeout(()=>{
                this.setState({ transitioning : false });
            },750);
        }
        */

        return;

        // THE BELOW IF BLOCK IS NO LONGER NECESSARY AS CONVERTED TO HTML ELEMS, KEEPING FOR IF NEEDED IN FUTURE.
        /*
        if (this.shouldPerformManualTransitions(this.props, pastProps)){
            if (typeof this.pastBars !== 'undefined'){

                var styleOpts = this.styleOptions();
                var _this = this;

                var existingAndCurrentElements = _.flatten(
                    _.map(
                        _.intersection( // Grab all bars which are current & pre-update-existing.
                            _.values(this.pastBars), // Obj to array
                            _.values(this.bars)
                        ),
                        function(b){ return [b.childNodes[0], b.childNodes[1]]; } // Get children
                    ),
                    true
                );

                console.log('EXISTING', existingAndCurrentElements);

                if (existingAndCurrentElements.length === 0){
                    console.info("No existing bars to do D3 transitions on, unsetting state.transitioning immediately.");
                    _this.setState({ transitioning : false });
                    return;
                }
                
                // Since 'on end' callback is called many times (multiple bars transition), defer until called for each.
                var transitionCompleteCallback = _.after(existingAndCurrentElements.length, function(){
                    console.info("Finished D3 transitions on BarPlot.");
                    _this.setState({ transitioning : false });
                });

                d3.selectAll(existingAndCurrentElements)
                .transition().duration(750)
                .attr('height', function(d){
                    return this.parentElement.__data__.attr.height;
                })
                .attr('y', function(d){
                    return _this.height() - this.parentElement.__data__.attr.height - styleOpts.offset.bottom;
                    //return _this.height() - parseFloat(this.getAttribute('data-target-height')) - styleOpts.offset.bottom;
                })
                .on('end', transitionCompleteCallback);
            }
        }
        */
    },

    /**
     * Call this function, e.g. through refs, to grab fields and terms for a/the Legend component.
     * Internally, runs BarPlotChart.barDataToLegendData().
     * 
     * @deprecated
     * @instance
     * @see module:viz/BarPlotChart.barDataToLegendData
     * @returns {Array|null} List of fields containing terms. For use by legend component.
     */
    getLegendData : function(){
        if (!this.barData) return null;
        return BarPlot.barDataToLegendData(this.barData, this.props.schemas || null);
    },

    /**
     * Get the for-bar-filled field object used for the X axis.
     * 
     * @instance
     * @returns {Object} Top-level field containing terms.
     */
    getTopLevelField : function(){
        if (!this.barData) return null;
        return this.barData.fields[this.barData.fieldIndex].field;
    },

    /** @ignore */
    renderParts : {

        /** @ignore */
        svg: {

            bar : function(d, index, all, styleOpts = null, existingBars = this.pastBars){
                var transitioning = this.state.transitioning; // Cache state.transitioning to avoid risk of race condition in ref function.
                if (!styleOpts) styleOpts = this.styleOptions();

                var prevBarExists = function(){ return typeof existingBars[d.term] !== 'undefined' && existingBars[d.term] !== null; };
                var prevBarData = null;
                if (prevBarExists() && transitioning) prevBarData = existingBars[d.term].__data__;

                function transformStyle(){
                    var xyCoords;
                    if ((d.removing || !prevBarExists()) && transitioning){
                        // Defer to slide in new bar via CSS on state.transitioning = false.
                        xyCoords = [d.attr.x, d.attr.height];
                    } else {
                        // 'Default' (no transitioning) style
                        xyCoords = [d.attr.x, 0];
                    }
                    return vizUtil.style.translate3d.apply(this, xyCoords);
                }

                function barStyle(){
                    var style = {};

                    // Position bar's x coord via translate3d CSS property for CSS3 transitioning.
                    if ((d.removing || !prevBarExists()) && transitioning){
                        // Defer to slide in new bar via CSS on state.transitioning = false.
                        style.opacity = 0;
                    } else {
                        // 'Default' (no transitioning) style
                        style.opacity = 1;
                    }
                    style.transform = transformStyle.call(this);
                    return style;
                }

                function rectHeight(){
                    // Defer updating rect height so we can use D3 to transition it in componentDidUpdate.
                    if (prevBarExists() && transitioning){
                        return prevBarData.attr.height;
                    }
                    return d.attr.height;
                }
                

                function rectY(){
                    if (prevBarExists() && transitioning){
                        return this.height() - prevBarData.attr.height - styleOpts.offset.bottom;
                    }
                    return this.height() - d.attr.height - styleOpts.offset.bottom;
                }

                return (
                    <g
                        className="chart-bar"
                        data-term={d.term}
                        key={"bar-" + d.term}
                        style={barStyle.call(this)}
                        ref={(r) => {
                            if (typeof this.bars !== 'undefined' && r !== null){
                                // Save bar element; set its data w/ D3 but don't save D3 wrapped-version
                                d3.select(r).datum(d);
                                if (!(d.removing && !transitioning)) this.bars[d.term] = r;
                            }
                        }}
                    >
                        <text
                            className="bar-top-label"
                            x={styleOpts.offset.left}
                            y={rectY.call(this)}
                            key="text-label"
                        >
                            { d.name }
                        </text>
                        <rect
                            y={rectY.call(this)}
                            x={styleOpts.offset.left /* Use style.transform for X coord */}
                            height={rectHeight.call(this)}
                            data-target-height={d.attr.height}
                            width={d.attr.width}
                            key="rect1"
                            rx={5}
                            ry={5}
                            style={{
                                fill : vizUtil.colorForNode(d)
                            }}
                        />
                    </g>
                );
            },

            topYAxis : function(availWidth, styleOpts){
                return (
                    <line
                        key="y-axis-top"
                        className="y-axis-top"
                        x1={styleOpts.offset.left}
                        y1={styleOpts.offset.top}
                        x2={availWidth - styleOpts.offset.right}
                        y2={styleOpts.offset.top}
                    />
                );
            },

            bottomXAxis : function(availWidth, availHeight, currentBars, styleOpts){
                var lineYCoord = availHeight - (styleOpts.offset.bottom * 0.75);
                return (
                    <g key="y-axis-bottom">
                        <line
                            key="y-axis-bottom-line"
                            className="y-axis-bottom"
                            x1={styleOpts.offset.left}
                            y1={lineYCoord}
                            x2={availWidth - styleOpts.offset.right}
                            y2={lineYCoord}
                        />
                        { currentBars.map(function(bar){
                            return (
                                <text
                                    key={'count-for-' + bar.term}
                                    data-term={bar.term}
                                    className="y-axis-label-count"
                                    x={bar.attr.x + styleOpts.offset.left + (bar.attr.width / 2)}
                                    y={lineYCoord + 20}
                                >{ bar.count }</text>
                            );
                        }) }
                    </g>
                );
            }

        },

        bar : function(d, index, all, styleOpts = null, existingBars = this.pastBars, isFilteredExperiments = false){

            var transitioning = this.state.transitioning; // Cache state.transitioning to avoid risk of race condition in ref function.
            if (!styleOpts) styleOpts = this.styleOptions();

            var prevBarData = null;
            if (d.existing && transitioning) prevBarData = existingBars[d.term].__data__;

            function barStyle(){
                var style = {};

                // Position bar's x coord via translate3d CSS property for CSS3 transitioning.
                if ((d.removing || !d.existing) && transitioning){
                    style.opacity = 0;
                    style.transform = vizUtil.style.translate3d(d.attr.x, Math.max(d.attr.height / 5, 10) + 10, 0);
                } else {
                    // 'Default' (no transitioning) style
                    style.opacity = 1;
                    style.transform = vizUtil.style.translate3d(d.attr.x,0,0);
                }
                style.left = styleOpts.offset.left;
                style.bottom = styleOpts.offset.bottom;
                style.width = d.attr.width;
                return style;
            }

            var barParts = Array.isArray(d.bars) ? 
                _.sortBy(d.bars, 'term').map(this.renderParts.barPart.bind(this))
                :
                this.renderParts.barPart.call(this, _.extend({}, d, { color : 'rgb(139, 114, 142)' }));

            return (
                <div
                    className={
                        "chart-bar no-highlight-color" + 
                        (
                            //d.attr.height > Math.max((this.height() - styleOpts.offset.bottom - styleOpts.offset.top) / 2, 30) ?
                            //' larger-height' : ''
                            ''
                        )
                    }
                    onMouseLeave={
                        Array.isArray(d.bars) && d.bars.length > 0 ?
                        function(e){
                            unhighlightTerms(d.bars[0].field);
                        } : null
                    }
                    data-term={d.term}
                    data-field={Array.isArray(d.bars) && d.bars.length > 0 ? d.bars[0].field : null}
                    key={"bar-" + d.term}
                    style={barStyle.call(this)}
                    ref={(r) => {
                        if (typeof this.bars !== 'undefined' && r !== null){
                            // Save bar element; set its data w/ D3 but don't save D3 wrapped-version
                            d3.select(r).datum(d);
                            if (!(d.removing && !transitioning)) this.bars[d.term] = r;
                        }
                    }}
                >
                    { !isFilteredExperiments ?
                    <span className="bar-top-label" key="text-label">
                        { d.count }
                    </span>
                    : null }
                    { barParts }
                </div>
            );
        },

        barPart : function(d){
            
            var color = vizUtil.colorForNode(d);

            return (
                <div
                    className={"bar-part no-highlight-color" + (d.parent ? ' multiple-parts' : '')}
                    style={{
                        //top : rectY.call(this),
                        height : d.attr.height,
                        width: (d.parent || d).attr.width,
                        backgroundColor : color
                    }}
                    data-color={color}
                    data-target-height={d.attr.height}
                    key={'bar-part-' + (d.parent ? d.parent.term + '~' + d.term : d.term)}
                    data-term={d.parent ? d.term : null}
                    onMouseEnter={highlightTerm.bind(this, d.field, d.term, color)}
                >

                </div>
            );
        },

        bottomXAxis : function(availWidth, availHeight, currentBars, styleOpts){
            var _this = this;

            var labelWidth = styleOpts.labelWidth;
            if (typeof styleOpts.labelRotation === 'number'){

                var maxWidthGivenBottomOffset = (
                    1 / Math.abs(Math.sin((styleOpts.labelRotation / 180) * Math.PI)
                )) * styleOpts.offset.bottom;

                labelWidth = Math.min(
                    maxWidthGivenBottomOffset,
                    (styleOpts.labelWidth || 100000)
                );

            }

            
            return (
                <div className="y-axis-bottom" style={{ 
                    left : styleOpts.offset.left, 
                    right : styleOpts.offset.right,
                    height : Math.max(styleOpts.offset.bottom - 5, 0),
                    bottom : Math.min(styleOpts.offset.bottom - 5, 0)
                }}>
                    <RotatedLabel.Axis
                        labels={currentBars.map(function(b){ 
                            return {
                                name : b.name || b.term,
                                term : b.term,
                                x: b.attr.x,
                                opacity : _this.state.transitioning && (b.removing || !b.existing) ? 0 : '',
                                color : vizUtil.colorForNode(b, true, null, null, true)
                            }; 
                        })}
                        labelClassName="y-axis-label no-highlight-color"
                        y={5}
                        extraHeight={5}
                        placementWidth={currentBars[0].attr.width}
                        placementHeight={styleOpts.offset.bottom}
                        angle={styleOpts.labelRotation}
                        maxLabelWidth={styleOpts.maxLabelWidth || 1000}
                        isMounted={_this.state.mounted}
                    />
                </div>
            );
        },

        leftAxis : function(availWidth, availHeight, barData, styleOpts){
            var chartHeight = availHeight - styleOpts.offset.top - styleOpts.offset.bottom;
            var chartWidth = availWidth - styleOpts.offset.left - styleOpts.offset.right;
            var ticks = d3.ticks(0, barData.maxY * ((chartHeight - 10)/chartHeight), Math.min(8, barData.maxY)).concat([barData.maxY]);
            var steps = ticks.map(function(v,i){
                var w = i === 0 ? chartWidth : (
                    Math.min(
                        (barData.bars.filter(function(b){
                            return b.count >= v - ((ticks[1] - ticks[0]) * 2);
                        }).length) * Math.min(styleOpts.maxBarWidth + styleOpts.gap, chartWidth / barData.bars.length) + (styleOpts.maxBarWidth * .66),
                        chartWidth
                    )
                );
                return (
                    <div className={"axis-step" + (i >= ticks.length - 1 ? ' last' : '')} data-tick-index={i} style={{
                        position : 'absolute',
                        left: 0,
                        right: 0,
                        bottom : (v / barData.maxY) * chartHeight - 1,
                    }} key={v}>
                        <span className="axis-label">
                            { v }
                        </span>
                        <div className="axis-bg-line" style={{ width : w + 3, right : -w - 5 }}/>
                    </div>
                );
            });
            return (
                <div className="bar-plot-left-axis" style={{
                    height : chartHeight,
                    width: Math.max(styleOpts.offset.left - 5, 0),
                    top:  styleOpts.offset.top + 'px'
                }}>
                    { steps }
                </div>
            );
        }

    },

    /**
     * Used to help generate "highlighted" selected bars against the output of this: the "all experiments" bars silhoutte.
     * Used conditionally in BarPlotChart.render to render clones of the BarChart behind the primary bars,
     * using 'all experiments' data instead of the 'filtered' or 'selected' experiments.
     * 
     * @instance
     * @param {number} width - Width of available chart drawing area.
     * @param {number} height - Height of available chart drawing area.
     * @param {Object} [styleOpts] - Style options for the chart, including gap between bars, maximum bar width, etc.
     * @returns {Object} "All Experiments" bars silhouttes, wrapped in an object also containing barData for all experiments.
     * @see module:viz/BarPlotChart.render
     * @see module:viz/BarPlotChart.genChartData
     */
    renderAllExperimentsSilhouette : function(width, height, styleOpts = null){
        if (!this.props.filteredExperiments) return null;
        if (!styleOpts) styleOpts = this.styleOptions();

        var allExperimentsBarData = BarPlot.genChartBarDims( // Gen bar dimensions (width, height, x/y coords). Returns { fieldIndex, bars, fields (first arg supplied) }
            BarPlot.genChartData( // Get counts by term per field.
                this.props.experiments,
                this.props.fields,
                this.props.aggregateType,
                'experiments',
                this.props.useOnlyPopulatedFields
            ),
            width,
            height,
            styleOpts,
            this.props.useOnlyPopulatedFields
        );

        return {
            'component' : (
                <div className="silhouette" style={{ 'width' : width, 'height' : height }}>
                    {
                        allExperimentsBarData.bars
                        .map(function(b){
                            b.attr.width = b.attr.width / 2 - 2;

                            return b;
                        })
                        .sort(function(a,b){ return a.term < b.term ? -1 : 1; })
                        .map((d,i,a) => this.renderParts.bar.call(this, d, i, a, styleOpts, this.pastBars))
                    }
                </div>
            ),
            'data' : allExperimentsBarData
        };
        
        
    },

    /** 
     * Parses props.experiments and/or props.filterExperiments, depending on props.showType, aggregates experiments into fields,
     * generates data for chart bars, and then draws and returns chart wrapped in a div React element.
     * 
     * @instance
     * @returns {React.Element} - Chart markup wrapped in a div.
     */
    render : function(){
        if (this.state.mounted === false) return <div ref="container"></div>;

        var availHeight = this.height(),
            availWidth = this.width(),
            styleOpts = this.styleOptions();

        // Reset this.bars, cache past ones.
        this.pastBars = _.clone(this.bars); // Difference between current and pastBars used to determine which bars to do D3 transitions on (if any).
        this.bars = {}; // ref to 'g' element is stored here.
        var allExpsBarDataContainer = null;

        if (
            this.props.filteredExperiments && this.props.showType === 'both'
        ){
            allExpsBarDataContainer = this.renderAllExperimentsSilhouette(availWidth, availHeight, styleOpts);
        }

        this.barData = BarPlot.genChartBarDims( // Gen bar dimensions (width, height, x/y coords). Returns { fieldIndex, bars, fields (first arg supplied) }
            BarPlot.genChartData( // Get counts by term per field.
                (   this.props.showType === 'all' ? this.props.experiments
                    : this.props.filteredExperiments || this.props.experiments  ),
                this.props.fields,
                this.props.aggregateType,
                'experiments',
                this.props.useOnlyPopulatedFields
            ),
            availWidth,
            availHeight,
            styleOpts,
            this.props.useOnlyPopulatedFields,
            allExpsBarDataContainer && allExpsBarDataContainer.data && allExpsBarDataContainer.data.maxY
        );

        console.log('BARDATA', this.props.showType, this.barData);

        // Bars from current dataset/filters only.
        var currentBars = this.barData.bars.map((d)=>{
            // Determine whether bar existed before, for this.renderParts.bar render func.
            return _.extend(d, { 
                'existing' : typeof this.pastBars[d.term] !== 'undefined' && this.pastBars[d.term] !== null
            });
        });

        var allBars = currentBars; // All bars -- current (from barData) and those which now need to be removed if transitioning (see block below).

        // If transitioning, get D3 datums of existing bars which need to transition out and add removing=true property to inform this.renderParts.bar.
        if (this.state.transitioning){
            var barsToRemove = _.difference(  _.keys(this.pastBars),  _.pluck(this.barData.bars, 'term')).map((barTerm) => {
                return _.extend(this.pastBars[barTerm].__data__, { 'removing' : true });
            });
            allBars = barsToRemove.concat(currentBars);
        }

        // The sort below only helps maintain order in which is processed thru renderParts.bar(), not order of bars shown.
        // This is to help React's keying algo adjust existing bars rather than un/remount them.
        allBars = allBars.sort(function(a,b){ return a.term < b.term ? -1 : 1; });

        function overWriteFilteredBarDimsWithAllExpsBarDims(barSet, allExpsBarSet){
            barSet.forEach(function(b){
                var allExpsBar = _.find(allExpsBarSet, { 'term' : b.term });
                _.extend(
                    b.attr,
                    {
                        'width' : allExpsBar.attr.width,
                        'x' : allExpsBar.attr.x + (allExpsBar.attr.width + 2)
                    }
                );
                if (Array.isArray(b.bars)){
                    overWriteFilteredBarDimsWithAllExpsBarDims(
                        b.bars, allExpsBar.bars
                    );
                }
            });
        }

        if (allExpsBarDataContainer){
            overWriteFilteredBarDimsWithAllExpsBarDims(
                allBars, allExpsBarDataContainer.data.bars
            );
        }

        var barComponents = allBars.map((d,i,a) => 
            this.renderParts.bar.call(this, d, i, a, styleOpts, this.pastBars, allExpsBarDataContainer)
        );

        return (
            <div
                className="bar-plot-chart chart-container"
                key="container"
                ref="container"
                data-field={this.props.fields[this.barData.fieldIndex].field}
                style={{ height : availHeight, width: availWidth }}
            >
                { this.renderParts.leftAxis.call(this, availWidth, availHeight, this.barData, styleOpts) }
                { allExpsBarDataContainer && allExpsBarDataContainer.component }
                { barComponents }
                { this.renderParts.bottomXAxis.call(this, availWidth, availHeight, allBars, styleOpts) }
            </div>
        );
        /*
        // Keep in mind that 0,0 coordinate is located at top left for SVGs.
        // Easier to reason in terms of 0,0 being bottom left, thus e.g. d.attr.y for bars is set to be positive,
        // so we need to flip it via like availHeight - y in render function(s).
  	    return (
            <svg ref="container" key="svg-container" className="bar-plot-chart" data-field={this.props.fields[barData.fieldIndex].field} style={{
                'height' : availHeight,
                'width' : availWidth
            }}>
                { this.renderParts.svg.topYAxis.call(this, availWidth, styleOpts) }
                { barComponents }
                { this.renderParts.svg.bottomXAxis.call(this, availWidth, availHeight, currentBars, styleOpts) }
            </svg>
        );
        */
    }
});

module.exports = BarPlot;

