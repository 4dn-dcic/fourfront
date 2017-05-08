'use strict';

var React = require('react');
var _ = require('underscore');
var url = require('url');
var vizUtil = require('./../utilities');
var { RotatedLabel, Legend } = require('./../components');
var { console, object, isServerSide, expFxn, Filters, layout } = require('./../../util');
var { ButtonToolbar, ButtonGroup, Button, DropdownButton, MenuItem } = require('react-bootstrap');
var { Toggle } = require('./../../inputs');

export default class UIControlsWrapper extends React.Component {

    static defaultProps = {
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
        'availableFields_XAxis' : [
            { title : "Digestion Enzyme", field : "experiments_in_set.digestion_enzyme.name" },
            { title : "Biosource", field : "experiments_in_set.biosample.biosource_summary" },
            { title : "Biosource Type", field : 'experiments_in_set.biosample.biosource.biosource_type' }
        ],
        'availableFields_Subdivision' : [
            { title : "Experiment Type", field : 'experiments_in_set.experiment_type' },
            { title : "Organism", field : "experiments_in_set.biosample.biosource.individual.organism.name" },
        ],
        'legend' : false,
        'chartHeight' : 300
    }

    constructor(props){
        super(props);
        this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this);
        this.filterObjExistsAndNoFiltersSelected = this.filterObjExistsAndNoFiltersSelected.bind(this);
        this.titleMap = this.titleMap.bind(this);
        this.adjustedChildChart = this.adjustedChildChart.bind(this);
        this.handleAggregateTypeSelect = _.throttle(this.handleAggregateTypeSelect.bind(this), 750);
        this.handleExperimentsShowType = _.throttle(this.handleExperimentsShowType.bind(this), 750, { trailing : false });
        this.handleFieldSelect = _.throttle(this.handleFieldSelect.bind(this), 300);
        this.getFieldAtIndex = this.getFieldAtIndex.bind(this);
        this.contextualView = this.contextualView.bind(this);
        this.renderDropDownMenuItems = this.renderDropDownMenuItems.bind(this);
        this.handleDropDownToggle = this.handleDropDownToggle.bind(this);
        this.renderShowTypeToggle = this.renderShowTypeToggle.bind(this);
        this.renderShowTypeDropdown = this.renderShowTypeDropdown.bind(this);
        this.render = this.render.bind(this);

        this.state = {
            'fields' : [
                props.availableFields_XAxis[0],
                props.availableFields_Subdivision[0],
                //{ title : "Experiment Summary", field : "experiments_in_set.experiment_summary" }
            ],
            'aggregateType' : 'experiment_sets',
            'showState' : this.filterObjExistsAndNoFiltersSelected(props.expSetFilters) ? 'all' : 'filtered',
            'openDropdown' : null
        }
    }

    componentWillReceiveProps(nextProps){
        if (
            this.filterObjExistsAndNoFiltersSelected(this.props.expSetFilters) &&
            !this.filterObjExistsAndNoFiltersSelected(nextProps.expSetFilters) && (
                this.state.showState === 'all'
            )
        ){
            this.setState({ 'showState' : 'filtered' });
        } else if (
            this.filterObjExistsAndNoFiltersSelected(nextProps.expSetFilters) &&
            !this.filterObjExistsAndNoFiltersSelected(this.props.expSetFilters) && (
                this.state.showState === 'filtered'
            )
        ){
            this.setState({ 'showState' : 'all' });
        }
    }

    filterObjExistsAndNoFiltersSelected(expSetFilters = this.props.expSetFilters){
        return Filters.filterObjExistsAndNoFiltersSelected(expSetFilters);
    }

    titleMap(key = null, fromDropdown = false){
        if (!key) return this.props.titleMap;
        var title = this.props.titleMap[key];
        if (fromDropdown && ['all','filtered'].indexOf(key) > -1){
            title += ' ' + this.titleMap(this.state.aggregateType);
        } else if (fromDropdown && key == 'both'){
            return 'Both';
        }
        return title;
    }

    /**
     * Clones props.children, expecting a Chart React Component as the sole child, and extends Chart props with 'fields', 'showType', and 'aggregateType'.
     *
     * @returns {React.Component} Cloned & extended props.children.
     */
    adjustedChildChart(){
        // TODO: validate that props.children is a BarPlot.Chart

        return React.cloneElement(
            this.props.children,
            _.extend(
                _.omit( // Own props minus these.
                    this.props,
                    'titleMap', 'availableFields_XAxis', 'availableFields_Subdivision', 'legend', 'chartHeight', 'children'
                ),
                {
                    'fields' : this.state.fields,
                    'showType' : this.state.showState,
                    'aggregateType' : this.state.aggregateType,
                }
            )
        );
    }


    handleAggregateTypeSelect(eventKey, event){
        this.setState({ aggregateType : eventKey });
    }

    handleExperimentsShowType(eventKey, event){
        this.setState({ showState : eventKey });
    }

    handleFieldSelect(fieldIndex, newFieldKey, event){
        var newFields;
        if (newFieldKey === "none"){ // Only applies to subdivision (fieldIndex 1)
            newFields = this.state.fields.slice(0,1);
            this.setState({ fields : newFields });
            return;
        }

        var newField = _.find(
            this.props['availableFields' + (fieldIndex === 0 ? '_XAxis' : '_Subdivision') ],
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
    }

    getFieldAtIndex(fieldIndex){
        if (!this.state.fields) return null;
        if (!Array.isArray(this.state.fields)) return null;
        if (this.state.fields.length < fieldIndex + 1) return null;
        return this.state.fields[fieldIndex];
    }

    contextualView(){
        if (this.props.href){
            // Hide on homepage.
            var hrefParts = url.parse(this.props.href);
            if (hrefParts.pathname === '/' || hrefParts.pathname === '/home'){
                return 'home';
            }
        }
        return 'browse';
    }

    renderDropDownMenuItems(keys, active = null){
        return keys.map((key)=>{
            var subtitle = null;
            var title = null;
            var disabled = null;
            if (Array.isArray(key)){
                // Assume we have [key, title, subtitle].
                title = key[1] || null;
                subtitle = key[2] || null;
                disabled = key[3] || false;
                key = key[0];
            }

            return <MenuItem
                key={key}
                eventKey={key}
                active={key === active}
                children={title || this.titleMap(key, true)}
                disabled={disabled}
            />;
        });
    }

    handleDropDownToggle(id, isOpen, evt, source){
        if (isOpen){
            setTimeout(this.setState.bind(this), 10, { 'openDropdown' : id });
        } else {
            this.setState({ 'openDropdown' : null });
        }
    }

    renderShowTypeToggle(windowGridSize){

        if (this.contextualView() === 'home') return null;

        return (
            <div className={"toggle-zoom" + (/*filterObjExistsAndNoFiltersSelected ? ' no-click' : */'')} onClick={(e)=>{
                e.preventDefault();
                this.handleExperimentsShowType(this.state.showState === 'all' ? 'filtered' : 'all')
            }} 
                data-tip="Toggle between <span class='text-600'>all</span> data <em>or</em> data <span class='text-600'>selected via filters</span> below."
                data-place={ windowGridSize === 'xs' ? 'bottom' : "left" } data-html data-delay-show={600}
            >
            {/*
                <div className="text">
                    <small>Viewing</small><br/>
                    {this.state.showState === 'all' ? 'All' : 'Selected'}
                </div>
                */}
                
                <i className="icon icon-filter"/>
                <span className="text">View Selected</span>
                <span className="inline-block toggle-container">
                    <Toggle checked={this.state.showState === 'filtered'} />
                </span>
                
            </div>
        );
    }

    renderShowTypeDropdown(contextualView){
        if (contextualView === 'home') return null;
        var isSelectedDisabled = this.filterObjExistsAndNoFiltersSelected();
        return (
            <div className="show-type-change-section">
                <h6 className="dropdown-heading">Show</h6>
                <DropdownButton
                    id="select-barplot-show-type"
                    onSelect={this.handleExperimentsShowType}
                    bsSize='xsmall'
                    title={(()=>{
                        //if (this.state.openDropdown === 'subdivisionField'){
                        //    return <em className="dropdown-open-title">Color Bars by</em>;
                        //}
                        var aggrType = this.titleMap(this.state.aggregateType);
                        var showString = (this.state.showState === 'all' || isSelectedDisabled) ? 'All' : 'Selected';
                        return (
                            <span>
                                <span className="text-600">{ showString }</span> { aggrType }
                            </span>
                        );
                    })()}
                    onToggle={this.handleDropDownToggle.bind(this, 'showType')}
                    children={this.renderDropDownMenuItems([
                        ['all', <span>
                            <span className="text-500">All</span> { this.titleMap(this.state.aggregateType) }
                        </span>],
                        ['filtered', <span className="inline-block" data-place="left" data-tip={isSelectedDisabled ? 'No filters currently set' : null}>
                            <span className="text-500">Selected</span> { this.titleMap(this.state.aggregateType) }
                        </span>, null, isSelectedDisabled]
                    ], this.state.showState)}
                />
            </div>
        );
    }

    render(){

        if (!this.props.experiments) return null;
        
        var filterObjExistsAndNoFiltersSelected = this.filterObjExistsAndNoFiltersSelected();
        var windowGridSize = layout.responsiveGridState();
        var contextualView = this.contextualView();

        return (
            <div className="bar-plot-chart-controls-wrapper">
                <div className="overlay" style={{
                    width  : (windowGridSize !== 'xs' ? (layout.gridContainerWidth() * (9/12) - 15) : null)
                }}>

                    <div className="y-axis-top-label" style={{
                        width : this.props.chartHeight,
                        top: this.props.chartHeight - 4
                    }}>
                        <div className="row" style={{ maxWidth : 210, float: 'right' }}>
                            <div className="col-xs-3" style={{ width : 51 }}>
                                <h6 className="dropdown-heading">Y Axis</h6>
                            </div>
                            <div className="col-xs-9" style={{ width : 159, textAlign : 'left' }}>
                                <DropdownButton
                                    id="select-barplot-aggregate-type"
                                    bsSize="xsmall"
                                    onSelect={this.handleAggregateTypeSelect}
                                    title={(() => {
                                        //if (this.state.openDropdown === 'yAxis'){
                                        //    return 'Y-Axis Aggregation';
                                        //}
                                        return this.titleMap(this.state.aggregateType);
                                    })()}
                                    onToggle={this.handleDropDownToggle.bind(this, 'yAxis')}
                                    children={this.renderDropDownMenuItems(
                                        ['experiment_sets','experiments','files'],
                                        this.state.aggregateType
                                    )}
                                />
                            </div>
                        </div>
                    </div>

                    {/* this.renderShowTypeToggle(windowGridSize) */}

                </div>

                <div className="row">
                    <div className="col-sm-9">
                        { this.adjustedChildChart() }
                    </div>
                    <div className="col-sm-3 chart-aside" style={{ height : this.props.chartHeight }}>
                        { this.renderShowTypeDropdown(contextualView) }
                        <div className="field-1-change-section">
                            <h6 className="dropdown-heading">Group By</h6>
                            <DropdownButton
                                id="select-barplot-field-1"
                                onSelect={this.handleFieldSelect.bind(this, 1)}
                                title={(()=>{
                                    //if (this.state.openDropdown === 'subdivisionField'){
                                    //    return <em className="dropdown-open-title">Color Bars by</em>;
                                    //}
                                    var field = this.getFieldAtIndex(1);
                                    if (!field) return "None";
                                    return field.title || Filters.Field.toName(field.field);
                                })()}
                                onToggle={this.handleDropDownToggle.bind(this, 'subdivisionField')}
                                children={this.renderDropDownMenuItems(
                                    this.props.availableFields_Subdivision.concat([{
                                        title : <em>None</em>,
                                        field : "none"
                                    }]).map(function(field){
                                        return [
                                            field.field,                                        // Field
                                            field.title || Filters.Field.toName(field.field),   // Title
                                            field.description || null,                          // Description
                                            false                                               // Disabled
                                        ]; // key, title, subtitle
                                    }),
                                    (this.state.fields[1] && this.state.fields[1].field) || "none"
                                )}
                            />
                        </div>
                        <div className="legend-container" style={{ height : windowGridSize !== 'xs' ? 
                            this.props.chartHeight - (49 * (contextualView === 'home' ? 1 : 2 )) - 50 : null
                        }}>
                            
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
                            />
                        </div>
                        <div className="x-axis-right-label">
                            <div className="row">
                                <div className="col-xs-3" style={{ width : 51 }}>
                                    <h6 className="dropdown-heading">X Axis</h6>
                                </div>
                                <div className="col-xs-9 pull-right" style={{ width : (layout.gridContainerWidth() * (windowGridSize !== 'xs' ? 3/12 : 1)) + 5 - 52 }}>
                                    <DropdownButton
                                        id="select-barplot-field-0"
                                        onSelect={this.handleFieldSelect.bind(this, 0)}
                                        title={(()=>{
                                            //if (this.state.openDropdown === 'xAxisField'){
                                            //    return <em className="dropdown-open-title">X-Axis Field</em>;
                                            //}
                                            var field = this.getFieldAtIndex(0);
                                            return <span>{(field.title || Filters.Field.toName(field.field))}</span>;
                                        })()}
                                        onToggle={this.handleDropDownToggle.bind(this, 'xAxisField')}
                                        children={this.renderDropDownMenuItems(
                                            this.props.availableFields_XAxis.map(function(field){
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
                </div>
            </div>
        );
    }

}
