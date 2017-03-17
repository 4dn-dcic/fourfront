'use strict';

var React = require('react');
var globals = require('./../../globals');
var { Filters } = require('./../../util');
var _ = require('underscore');

var ItemPageTitle = module.exports = React.createClass({

    statics : {
        
        /**
         * Get Item title string from a context object (JSON representation of Item).
         * 
         * @memberof module:item-pages/components.ItemPageTitle
         * @static
         * @public
         * @param {Object} context - JSON representation of an Item object.
         * @returns {string} The title.
         */
        getTitleStringFromContext : function(context){
            return context.display_title || globals.listing_titles.lookup(context)({'context' : context});
        },

        /**
         * Determine whether the title which is displayed is an accession or not.
         * Use for determining whether to include accession in ItemHeader.TopRow.
         * 
         * @memberof module:item-pages/components.ItemPageTitle
         * @static
         * @public
         * @param {Object} context - JSON representation of an Item object.
         * @param {string} [displayTitle] - Display title of Item object. Gets it from context if not provided.
         * @returns {string} The title.
         */
        isDisplayTitleAccession : function(context, displayTitle = null){
            if (!displayTitle) displayTitle = ItemPageTitle.getTitleStringFromContext(context);
            if (context.accession && context.accession === displayTitle) return true;
            return false;
        },

        getBaseItemType : function(context){
            var types = context['@type'];
            if (!Array.isArray(types) || types.length === 0) return "Unknown";
            var i = 0;
            while (i < types.length){
                if (types[i + 1] === 'Item'){
                    return types[i]; // Last type before 'Item'.
                }
                i++;
            }
            return types[i-1]; // Fallback.
        },

        getBaseItemTypeTitle : function(context, schemas = null){
            var baseType = ItemPageTitle.getBaseItemType(context);

            // Grab schemas from Filters if we don't have them but they've been cached into there from App.
            schemas = schemas || (Filters.getSchemas && Filters.getSchemas());

            if (schemas && schemas[baseType] && schemas[baseType].title){
                return schemas[baseType].title;
            }

            // Correct baseType to title if not in schemas.
            switch (baseType){
                case 'ExperimentSet':
                    return 'Experiment Set';
                default:
                    return baseType;
            }
        }

    },

    /**
     * The render function. If the display title is an accession, we do
     * 
     * @instance
     * @returns {Element} An <h1> element with .page-title class.
     */
    render : function(){
        var title = ItemPageTitle.getTitleStringFromContext(this.props.context);
        var titleIsAccession = ItemPageTitle.isDisplayTitleAccession(this.props.context, title);
        return (
            <h1 className="page-title">
                { ItemPageTitle.getBaseItemTypeTitle(this.props.context, this.props.schemas) } <span className="subtitle prominent">
                    { !titleIsAccession || this.props.showAccessionTitles ? title : null }
                </span>
            </h1>
        );
    }

});