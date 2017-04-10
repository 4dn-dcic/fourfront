'use strict';

var React = require('react');
var _ = require('underscore');
var url = require('url');
var querystring = require('querystring');
var { Button } = require('react-bootstrap');
var ReactTooltip = require('react-tooltip');
var { console, DateUtility, object } = require('./../../util');
var { FlexibleDescriptionBox } = require('./../../experiment-common');
var PartialList = require('./PartialList');


var testData = [ // Use this to test list view(s) as none defined in test data.
    { 'link_id' : '~something~here~1', 'display_title' : "Sample Publicstion One which involces this experiment set and other things" },
    { 'link_id' : '~something~here~2', 'display_title' : "Something else wich references this set and has data and many words" },
    { 'link_id' : '~something~here~3', 'display_title' : "Hello 1123" },
    { 'link_id' : '~something~here~4', 'display_title' : "Hello 11234 sdfsfd asfsdf asfgsdg sdfsdg sadfsdg sdgdsg" },
    { 'link_id' : '~something~here~5', 'display_title' : "Hello 112345" },
    { 'link_id' : '~something~here~6', 'display_title' : "Hello 1123456 123456" }
];

var ListBlock = React.createClass({

    statics : {

        Publication : React.createClass({
            render: function(){
                var atId = this.props.atId || object.atIdFromObject(this.props);
                return (
                    <li className="publication" key={atId}>
                        <a className="text-500" href={atId}>{ this.props.display_title || this.props.title }</a>
                    </li>
                );
            }
        })

    },

    getDefaultProps : function(){
        return {
            'persistentCount' : 3,
            'publications' : [],
            'singularTitle' : 'Publication'
        };
    },

    getInitialState : function(){
        if (this.props.publications.length < 4) return null;
        return {
            'open' : false
        };
    },

    publicationListItems : function(publications = this.props.publications){

        /**
         *  Maps an array of publications to ListBlock.Publication React elements.
         * 
         * @static
         * @private
         * @param {any} pubs - Array of publication objects containing at least link_id and display_title.
         * @returns {Element[]} List of React <li> elements wrapped.
         */
        function pubsToElements(pubs){
            return pubs.map(function(pub, i){
                return <ListBlock.Publication {...pub} key={pub.link_id || i} />;
            });
        }


        if (publications.length <= this.props.persistentCount){
            return <ul>{ pubsToElements(publications) }</ul>;
        } else {
            // Only show first 3, then a 'more' button.

            return (
                <PartialList
                    persistent={pubsToElements(publications.slice(0, this.props.persistentCount))}
                    collapsible={pubsToElements(publications.slice(this.props.persistentCount)) }
                    containerType="ul"
                    open={this.state && this.state.open}
                />
            );
        }
        return null;
    },

    render : function(){
        var publications = this.props.publications;
        // publications = testData; // Uncomment to test listview.

        if (!Array.isArray(publications) || publications.length < 1){
            return null;
        }

        var isSingleItem = publications.length === 1;

        return (
            <Publications.FormattedInfoWrapper isSingleItem={isSingleItem} singularTitle={this.props.singularTitle}>
                <div>
                    { this.publicationListItems(publications) }
                    { publications.length > this.props.persistentCount ?
                        <Button bsStyle="default" bsSize="small" onClick={()=>{
                            this.setState({ open : !(this.state && this.state.open) });
                        }}>{ this.state && this.state.open ? "Collapse" : "See " + (publications.length - this.props.persistentCount) + " More" }</Button>
                    : null }
                </div>
            </Publications.FormattedInfoWrapper>
        );
    }

});


var Publications = module.exports = React.createClass({

    statics : {
        
        ListBlock : ListBlock,

        DetailBlock : React.createClass({

            getDefaultProps : function(){
                return {
                    'singularTitle' : 'Publication'
                };
            },

            render : function(){
                var publication = this.props.publication;
                return (
                    <Publications.FormattedInfoWrapper singularTitle={this.props.singularTitle} isSingleItem={true}>
                        <h5 className="block-title">
                            <a href={object.atIdFromObject(publication)}>{ publication.display_title }</a>
                        </h5>
                        <div className="details">
                            { this.props.children }
                        </div>
                    </Publications.FormattedInfoWrapper>
                );
            }

        }),

        /**
         * Wraps some React elements, such as a list or title, in a FormattedInfoBlock-styled wrapper.
         * 
         * @prop {boolean} isSingleItem - Whether there is only 1 item or not.
         * @prop {Element[]} children - React Elements or Components to be wrapped.
         * @prop {string} [singularTitle] - Optional. Title displayed in top left label. Defaults to 'Publication'.
         */
        FormattedInfoWrapper : React.createClass({

            getDefaultProps : function(){
                return {
                    isSingleItem : false,
                    singularTitle : 'Publication',
                    iconClass : 'book',
                    className : null
                };
            },
            
            render : function(){
                return (
                    <div className={
                        "publications-block formatted-info-panel" +
                        (this.props.isSingleItem ? ' single-item' : '') +
                        (this.props.className ? ' ' + this.props.className : '')
                    }>
                        <h6 className="publication-label">{ this.props.singularTitle }{ this.props.isSingleItem ? '' : 's' }</h6>
                        <div className="row">
                            <div className="icon-container col-xs-2 col-lg-1">
                                <i className={"icon icon-" + this.props.iconClass} />
                            </div>
                            <div className="col-xs-10 col-lg-11">
                                { this.props.children }
                            </div>
                        </div>
                    </div>
                );
            }
        }),

    },

    getInitialState : function(){
        return {
            'abstractCollapsed' : true
        };
    },

    componentDidMount : function(){
        ReactTooltip.rebuild();
    },

    shortAbstract : function(){
        var abstract = this.props.context.produced_in_pub.abstract;
        if (!abstract || typeof abstract !== 'string') return null;
        if (!this.state.abstractCollapsed) return abstract;
        if (abstract.length > 240){
            return abstract.slice(0, 238) + '...';
        } else {
            return abstract;
        }
    },

    toggleAbstractIcon : function(publication = this.props.context.produced_in_pub){
        if (!publication || !publication.abstract) return null;
        if (publication && publication.abstract && publication.abstract.length <= 240){
            return null;
        }
        return (
            <i
                className={"icon abstract-toggle icon-fw icon-" + (this.state.abstractCollapsed ? 'plus' : 'minus')}
                data-tip={this.state.abstractCollapsed ? 'See More' : 'Collapse'}
                onClick={(e)=>{
                    this.setState({ abstractCollapsed : !this.state.abstractCollapsed });
                }}
            />
        );
    },

    detailRows : function(publication = this.props.context.produced_in_pub){
        var details = [];
        if (typeof publication.date_published === 'string'){
            details.push({
                'label' : 'Published',
                'content' : DateUtility.format(publication.date_published)
            });
        }
        if (typeof publication.authors === 'string'){
            details.push({
                'label' : 'Authors',
                'content' : publication.authors
            });
        }
        if (typeof publication.abstract === 'string'){
            //var inclProps = {};
            //var shortAbstract = this.shortAbstract();
            //if (shortAbstract !== publication.abstract){
            //    inclProps['data-tip'] = '...' + publication.abstract.slice(238);
            //    inclProps['data-place'] = 'bottom';
            //}
            details.push({
                label : <span>{ this.toggleAbstractIcon() } Abstract</span>,
                content : this.shortAbstract()
            });
        }

        return details;
    },

    render : function(){
        var context = this.props.context;
        var usedInPublications = [];
        if (Array.isArray(context.publications_of_set) && context.publications_of_set.length > 0){
            usedInPublications = context.publications_of_set.filter(function(pub){
                if (pub.link_id && context.produced_in_pub && context.produced_in_pub.link_id && pub.link_id === context.produced_in_pub.link_id){
                    return false;
                }
                return true;
            });
        }

        return (
            <div className="publications-section">
                <Publications.DetailBlock publication={context.produced_in_pub} singularTitle="Publication Details">
                    {
                        this.detailRows().map(function(d, i){
                            return (
                                <div className="row details-row" key={ d.key || d.label || i }>
                                    <div className="col-xs-2 text-600 text-right label-col">
                                        { d.label }
                                    </div>
                                    <div className="col-xs-10">
                                        { d.content }
                                    </div>
                                </div>
                            );
                        })
                    }
                </Publications.DetailBlock>
                <Publications.ListBlock publications={usedInPublications} singularTitle="Used in Publication" />
            </div>
        );
    }

});

