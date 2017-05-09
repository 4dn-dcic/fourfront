'use strict';

var React = require('react');
var _ = require('underscore');
var vizUtil = require('./../utilities');
var barAggrFxn = require('./../BarPlot/aggregation-functions');
var { highlightTerm, unhighlightTerms } = require('./../../facetlist');
var { console, isServerSide, Filters, object } = require('./../../util');
import { CursorViewBounds } from './../ChartDetailCursor';


/**
 * React component which represents a Term item.
 * 
 * @class Term
 * @prop {string} field - Name of field to which this term belongs, in object-dot-notation.
 * @prop {string} term - Name of term.
 * @prop {string|Object} color - Color to show next to term, should be string or RGBColor object.
 * @type Component
 */
class Term extends React.Component {

    constructor(props){
        super(props);
        this.generateNode = this.generateNode.bind(this);
        this.onMouseEnter = this.onMouseEnter.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
        this.onClick = this.onClick.bind(this);
    }

    generateNode(){
        return {
            'field' : this.props.field,
            'term' : this.props.term,
            'color' : this.props.color,
            'position' : this.props.position,
            'experiment_sets' : this.props.experiment_sets,
            'experiments' : this.props.experiments,
            'files' : this.props.files
        };
    }

    onMouseEnter(e){
        highlightTerm.bind(this, this.props.field, this.props.term, this.props.color);
        if (typeof this.props.onNodeMouseEnter === 'function'){
            this.props.onNodeMouseEnter(this.generateNode(), e);
        }
    }

    onMouseLeave(e){
        if (typeof this.props.onNodeMouseLeave === 'function'){
            this.props.onNodeMouseLeave(this.generateNode(), e);
        }
    }

    onClick(e){
        if (typeof this.props.onNodeClick === 'function'){
            this.props.onNodeClick(this.generateNode(), e);
        }
    }

    /**
     * @returns {Element} A div element containing term name & color patch.
     */
    render(){
        var color = this.props.color;
        if (!color) color = 'transparent';
        return (
            <div className="term">
                <span
                    onMouseEnter={this.onMouseEnter}
                    onMouseLeave={this.onMouseLeave}
                    onClick={this.onClick}
                >
                    <div
                        className="color-patch no-highlight-color"
                        data-term={this.props.term}
                        style={{ backgroundColor : color }}
                    />
                    { this.props.name || Filters.Term.toName(this.props.field, this.props.term) }
                </span>
            </div>
        );
    }
}

/**
 * React component which represents a "Field", which might have multiple terms.
 * 
 * @class Field
 * @prop {string} field - Field name, in object-dot-notation.
 * @prop {boolean} includeFieldTitle - Whether field title should be included at the top of list of terms.
 * @prop {Object[]} terms - Terms which belong to this field, in the form of objects. 
 * @type {Component}
 */
class Field extends React.Component {

    static defaultProps = {
        'includeFieldTitle' : true
    }

    /**
     * @returns {Element} Div element containing props.title, .name, or .field if supplied along with props.includeFieldTitle == true, and list of terms & their colors.
     * @instance
     */
    render(){
        return (
            <div className="field" data-field={this.props.field} onMouseLeave={unhighlightTerms.bind(this, this.props.field)}>
                { this.props.includeFieldTitle ? 
                    <h5 className="text-500 legend-field-title">{ this.props.title || this.props.name || this.props.field }</h5>
                : null }
                { this.props.terms.map((term, i) =>
                    <Legend.Term
                        {...term}
                        field={this.props.field}
                        key={term.term}
                        onNodeMouseEnter={this.props.onNodeMouseEnter}
                        onNodeMouseLeave={this.props.onNodeMouseLeave}
                        onNodeClick={this.props.onNodeClick}
                        selectedTerm={this.props.selectedTerm}
                        hoverTerm={this.props.hoverTerm}
                        position={i}
                    />
                )}
            </div>
        );
    }
}


class LegendViewContainer extends React.Component {
    /**
     * @returns {Element} Div element containing props.title and list of {@link module:viz/components.Legend.Field} components.
     */
    render(){
        if (!this.props.fields) return null;
        return (
            <div className={"legend " + this.props.className} id={this.props.id} style={{
                opacity : !Array.isArray(this.props.fields) ? 0 : 1,
                width : this.props.width || null
            }}>
                { this.props.title }
                { Array.isArray(this.props.fields) ?
                    Legend.parseFieldNames(this.props.fields, this.props.schemas || null)
                    .map((field)=>
                        <Legend.Field
                            includeFieldTitle={this.props.includeFieldTitles}
                            {...field}
                            onNodeMouseEnter={this.props.onNodeMouseEnter}
                            onNodeMouseLeave={this.props.onNodeMouseLeave}
                            onNodeClick={this.props.onNodeClick}
                            selectedTerm={this.props.selectedTerm}
                            hoverTerm={this.props.hoverTerm}
                            key={field.field}
                        />
                    ) 
                : null }
            </div>
        );

    }
}


/**
 * Legend components to use alongside Charts. Best to include within a UIControlsWrapper, and place next to chart, utilizing the same data.
 * 
 * @class Legend
 * @type {Component}
 * @prop {Object[]} fields - List of objects containing at least 'field', in object dot notation. Ideally should also have 'name'.
 * @prop {boolean} includeFieldTitle - Whether to show field title at top of terms.
 * @prop {string} className - Optional className to add to Legend's outermost div container.
 * @prop {number} width - How wide should the legend container element (<div>) be.
 * @prop {string|Element|Component} title - Optional title to display at top of fields.
 */
export default class Legend extends React.Component {

    static Term = Term
    static Field = Field

    static aggregegateBarPlotData(experiments, fields){
        return barAggrFxn.genChartData(
            experiments,
            fields,
            null,
            'experiments',
            false
        );
    }

    static barPlotFieldDataToLegendFieldsData(field){
        if (Array.isArray(field) && field.length > 0 && field[0] && typeof field[0] === 'object'){
            return field.map(Legend.barPlotFieldDataToLegendFieldsData);
        }
        if (!field) return null;
        var terms = _.pairs(field.terms).map(function(p){ // p[0] = term, p[1] = term counts
            return {
                'field' : field.field,
                'name' : Filters.Term.toName(field.field, p[0]),
                'term' : p[0],
                'color' : vizUtil.colorForNode({
                    'term' : p[0],
                    'field' : field.field
                }, true, 'muted', null, true),
                'experiment_sets' : p[1].experiment_sets,
                'experiments' : p[1].experiments,
                'files' : p[1].files
            };
        });

        var adjustedField = _.extend({}, field, { 'terms' : terms });

        return _.extend(adjustedField, { 'terms' : Legend.sortLegendFieldTermsByColorPalette(adjustedField) });
    }

    /**
     * @deprecated
     */
    static experimentsAndFieldsToLegendData(experiments, fields, schemas = null){
        return fields.map(function(field){
            return Legend.experimentsAndFieldToLegendDataItem(experiments, field, schemas);
        });
    }

    /**
     * @deprecated
     */
    static experimentsAndFieldToLegendDataItem(experiments, field, schemas = null){

        var legendFieldItem = {
            'field' : field.field,
            'name' : field.title || field.name || Filters.Field.toName(field.field, schemas),
            'terms' : {}
        };

        experiments.forEach(function(exp){
            var term = object.getNestedProperty(exp, field.field.replace('experiments_in_set.',''), true);
            if (!term) term = "None";
            if (Array.isArray(term)){
                term = _.uniq(term);
                if (term.length === 1) term = term[0];
                else {
                    console.warn('Multiple unique terms for field ' + field.field, term);
                    term = term[0];
                }
            }
            if (typeof legendFieldItem.terms[term] === 'object') return; // aka continue.
            if (!legendFieldItem.terms[term]){
                legendFieldItem.terms[term] = {
                    'color' : vizUtil.colorForNode({
                        'term' : term,
                        'field' : field.field
                    }, true, 'muted', null, true),
                    'term' : term,
                    'name' : Filters.Term.toName(field.field, term)
                };
            }
        });

        legendFieldItem.terms = _.values(legendFieldItem.terms);
        return _.extend(legendFieldItem, { 'terms' : Legend.sortLegendFieldTermsByColorPalette(legendFieldItem) });
        
    }

    static sortLegendFieldsTermsByColorPalette(fields, palette = 'muted'){
        return fields.map(function(f){
            return _.extend({}, f, { 'terms' : Legend.sortLegendFieldTermsByColorPalette(f, palette) });
        });
    }

    static sortLegendFieldTermsByColorPalette(field, palette = 'muted'){
        var orderedColorList = vizUtil.colorPalettes[palette];
        if (!orderedColorList) {
            console.error("No palette " + palette + ' found.');
            return field.terms;
        }
        if (field.terms && field.terms[0] && field.terms[0].color === null){
            console.warn("No colors assigned to legend terms, skipping sorting. BarPlot.UIControlsWrapper or w/e should catch lack of color and force update within 1s.");
            return field.terms;
        }
        var groups = _.groupBy(field.terms, 'color');

        function getSortedTermsSection(){
            return _.map(orderedColorList, function(color){
                var term = groups[color] && groups[color].shift();
                if (groups[color] && groups[color].length === 0) delete groups[color];
                return term;
            }).filter(function(term){
                if (!term) return false;
                return true;
            });
        }
    
        var result = [];
        while (_.keys(groups).length > 0){
            result = result.concat(getSortedTermsSection());
        }

        return result;

    }

    /**
     * @param {Object[]} fields - List of field objects, each containing at least a title, name, or field.
     * @param {{Object}} schemas - Schemas object passed down from app.state. 
     * @returns {Object[]} Modified field objects.
     */
    static parseFieldNames(fields, schemas){
        return fields.map(function(field){
            if (!field.title && !field.name) {
                return _.extend({} , field, {
                    'name' : Filters.Field.toName(field.field, schemas || null)
                });
            }
            return field;
        });
    }

    static defaultProps = {
        'hasPopover' : false,
        'position' : 'absolute',
        'fields' : [],
        'id' : null,
        'className' : 'chart-color-legend',
        'width' : null,
        'title' : null //<h4 className="text-500">Legend</h4>
    }

    render(){
        if (!this.props.hasPopover) return <LegendViewContainer {...this.props} />;
        return (
            <CursorViewBounds
                eventCategory="BarPlotLegend"
                actions={this.props.cursorDetailActions}
                clickCoordsFxn={(node, containerPosition, boundsHeight, isOnRightSide)=>{

                    var margin = 260;

                    return {
                        x : !isOnRightSide ? containerPosition.left - margin : containerPosition.left + 30,
                        y : containerPosition.top - 10 + (16 * (node.position || 0)),
                    };

                }}
            >
                <LegendViewContainer {...this.props} />
            </CursorViewBounds>
        );
    }

}
