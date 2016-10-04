'use strict';
var React = require('react');
var collection = require('./collection');
var fetched = require('./fetched');
var globals = require('./globals');
var audit = require('./audit');
var _ = require('underscore');
var Panel = require('react-bootstrap').Panel;
var AuditIndicators = audit.AuditIndicators;
var AuditDetail = audit.AuditDetail;
var AuditMixin = audit.AuditMixin;
var Table = collection.Table;
var ErrorPage = require('./error');

var Fallback = module.exports.Fallback = React.createClass({
    contextTypes: {
        location_href: React.PropTypes.string
    },

    render: function() {
        var url = require('url');
        var context = this.props.context;
        var title = typeof context.title == "string" ? context.title : url.parse(this.context.location_href).path;
        return (
            <div className="view-item">
                <header className="row">
                    <div className="col-sm-12">
                        <h2>{title}</h2>
                    </div>
                </header>
                {typeof context.description == "string" ? <p className="description">{context.description}</p> : null}
                <section className="view-detail panel">
                    <div className="container">
                        <pre>{JSON.stringify(context, null, 4)}</pre>
                    </div>
                </section>
            </div>
        );
    }
});

var ItemLoader = React.createClass({
    mixins: [AuditMixin],
    render: function() {
        return (
            <fetched.FetchedData>
                <fetched.Param name="schemas" url="/profiles/" />
                <Item context={this.props.context} />
            </fetched.FetchedData>
        );
    }
});

var Item = React.createClass({
    render: function() {
        var context = this.props.context;
        var itemClass = globals.itemClass(context, 'view-item');
        var title = globals.listing_titles.lookup(context)({context: context});
        var IPanel = globals.panel_views.lookup(context);
        // Make string of alternate accessions
        return (
            <div className={itemClass}>
                <header className="row">
                    <div className="col-sm-12">
                        <div className="status-line">
                            <AuditIndicators context={context} key="biosample-audit" />
                        </div>
                    </div>
                </header>
                <AuditDetail context={context} key="biosample-audit" />
                <div className="row item-row">
                     <IPanel {...this.props}/>
                </div>
            </div>
        );
    }
});

globals.content_views.register(ItemLoader, 'Item');


// Also use this view as a fallback for anything we haven't registered
globals.content_views.fallback = function () {
    return Fallback;
};


var IPanel = module.exports.IPanel = React.createClass({
    render: function() {
        var schemas = this.props.schemas;
        var context = this.props.context;
        var itemClass = globals.itemClass(context, 'view-detail panel');
        var title = globals.listing_titles.lookup(context)({context: context});
        var sortKeys = Object.keys(context).sort();
        var tips = tipsFromSchema(schemas, context);
        return (
            <Panel className="data-display panel-body-with-header">
                <div className="flexrow">
                    <div className="flexcol-sm-6">
                        <div className="flexcol-heading experiment-heading"><h5>{title}</h5></div>
                        <dl className="key-value">
                            {sortKeys.map(function(ikey, idx){
                                return (
                                    <div key={ikey} data-test="term-name">
                                        {formKey(tips,ikey)}
                                        <dd>{formValue(schemas,context[ikey])}</dd>
                                    </div>
                                );
                            })}
                        </dl>
                    </div>
                </div>
            </Panel>
        );
        // return (
        //         <Panel>BasicPanel</Panel>
        // );
    }
});


globals.panel_views.register(IPanel, 'Item');


// Also use this view as a fallback for anything we haven't registered
globals.panel_views.fallback = function () {
    return ItemLoader;
};


var title = module.exports.title = function (props) {
    var context = props.context;
    return context.title || context.name || context.accession || context['@id'];
};

globals.listing_titles.register(title, 'Item');


// Also use this view as a fallback for anything we haven't registered
globals.listing_titles.fallback = function () {
    return title;
};

// TODO: Add ItemEdit back in with custom forms. Removed this functionality for now...
// var ItemEdit = module.exports.ItemEdit = React.createClass({
//     contextTypes: {
//         navigate: React.PropTypes.func
//     },
//
//     render: function() {
//         var context = this.props.context;
//         var itemClass = globals.itemClass(context, 'view-item');
//         var title = globals.listing_titles.lookup(context)({context: context});
//         var action, form, schemaUrl, type;
//         if (context['@type'][0].indexOf('Collection') !== -1) {  // add form
//             type = context['@type'][0].substr(0, context['@type'][0].length - 10);
//             title = title + ': Add';
//             action = context['@id'];
//             form = (
//                 <fetched.FetchedData>
//                     <fetched.Param name="schemas" url="/profiles/" />
//                     <JSONSchemaForm type={type} action={action} method="POST" onFinish={this.finished}
//                                     showReadOnly={false} />
//                 </fetched.FetchedData>
//             );
//         } else {  // edit form
//             type = context['@type'][0];
//             title = 'Edit ' + title;
//             var id = this.props.context['@id'];
//             var url = id + '?frame=edit';
//             form = (
//                 <fetched.FetchedData>
//                     <fetched.Param name="context" url={url} etagName="etag" />
//                     <fetched.Param name="schemas" url="/profiles/" />
//                     <JSONSchemaForm id={id} type={type} action={id} method="PUT" onFinish={this.finished} />
//                 </fetched.FetchedData>
//             );
//         }
//         return (
//             <div className={itemClass}>
//                 <header className="row">
//                     <div className="col-sm-12">
//                         <h2>{title}</h2>
//                     </div>
//                 </header>
//                 {form}
//             </div>
//         );
//     },
//     finished: function(data) {
//       var url = data['@graph'][0]['@id'];
//       this.context.navigate(url);
//     }
// });
//
// globals.content_views.register(ItemEdit, 'Item', 'edit');
// globals.content_views.register(ItemEdit, 'Collection', 'add');


var FetchedRelatedItems = React.createClass({
    getDefaultProps: function() {
        return {Component: Table};
    },

    render: function() {
        var {Component, context, title, url, ...props} = this.props;
        if (context === undefined) return null;
        var items = context['@graph'];
        if (!items.length) return null;

        return (
            <Component {...props} title={title} context={context} total={context.total} items={items} url={url} showControls={false} />
        );
    },

});


var RelatedItems = module.exports.RelatedItems = React.createClass({
    getDefaultProps: function() {
        return {limit: 5};
    },

    render: function() {
        var url = this.props.url + '&status!=deleted&status!=revoked&status!=replaced';
        var limited_url = url + '&limit=' + this.props.limit;
        var unlimited_url = url + '&limit=all';
        return (
            <fetched.FetchedData>
                <fetched.Param name="context" url={limited_url} />
                <FetchedRelatedItems {...this.props} url={unlimited_url} />
            </fetched.FetchedData>
        );
    },
});

// ******* Refined item.js code below... *******

// Formats the correct display for each metadata field
var formValue = function (schemas, item) {
    var toReturn = [];
    if(Array.isArray(item)) {
        for (var i=0; i < item.length; i++){
            toReturn.push(formValue(schemas, item[i]));
        }
    }else if (typeof item === 'object') {
        toReturn.push(<SubIPanel schemas={schemas} content={item}/>);
    }else{
        if (typeof item === 'string' && item.charAt(0) === '/') {
            toReturn.push(<a key={item} href={item}>{item}</a>)
        }else{
            toReturn.push(item);
        }
    }
    return(
        <div>{toReturn}</div>
    );
};

var SubIPanel = React.createClass({
    getInitialState: function() {
    	return {isOpen: false};
    },
    handleToggle: function (e) {
      e.preventDefault();
      this.setState({
  		  isOpen: !this.state.isOpen,
  	  });
    },
    render: function() {
        var schemas = this.props.schemas;
        var item = this.props.content;
        var title = item.title || item.name || item.accession || item.uuid || item['@id'] || "Open";
        var toggleRender;
        var toggleLink;
        if (!this.state.isOpen) {
            toggleLink = <a href="" className="item-toggle-link" onClick={this.handleToggle}>{title}</a>
            toggleRender = <span/>;
        }else{
            toggleLink = <a href="" className="item-toggle-link" onClick={this.handleToggle}>Close</a>
            toggleRender = <Subview schemas={schemas} content={item} title={title}/>;
        }
        return (
    	  <div className="flexrow">
              <div>
                  {toggleLink}
              </div>
              {toggleRender}
    	 </div>
        );
        },
});

var Subview = React.createClass({
    render: function(){
        var schemas = this.props.schemas;
        var item = this.props.content;
        var title = this.props.title;
        var tips = tipsFromSchema(schemas, item);
        var sortKeys = Object.keys(item).sort();
        return(
            <div className="flexcol-sm-6 subview">
              <Panel className="sub-panel data-display panel-body-with-header">
                  <div className="flexrow">
                      <div className="flexcol-sm-6">
                          <div className="flexcol-heading experiment-heading"><h5>{title}</h5></div>
                          <dl className="key-value sub-descriptions">
                              {sortKeys.map(function(ikey, idx){
                                  return (
                                    <div className="sub-entry" key={ikey} data-test="term-name">
                                      {formKey(tips,ikey)}
                                      <dd>{formValue(schemas, item[ikey])}</dd>
                                    </div>
                                  );
                              })}
                          </dl>
                      </div>
                  </div>
              </Panel>
            </div>
        );
    }
});

//Return the properties dictionary from a schema for use as tooltips
var tipsFromSchema = function(schemas, content){
    var tips = {};
    if(content['@type']){
        var type = content['@type'][0];
        if(schemas[type]){
            tips = schemas[type]['properties'];
        }
    }
    return tips;
};

var formKey =  function(tips, key){
    var tooltip = '';
    if (tips[key]){
        var info = tips[key];
        if(info['description']){
            tooltip = info['description'];
        }
    }
    return(
        <DescriptorField field={key} description={tooltip}/>
    );
};

// Display the item field with a tooltip showing the field description from
// schema, if available
var DescriptorField = React.createClass({
    propTypes: {
        field: React.PropTypes.string.isRequired,
        description: React.PropTypes.string.isRequired
    },
    getInitialState: function() {
        return {
            active: false
        };
    },

    handleHover: function(b) {
        this.setState({active: b});
    },

    render: function() {
        var {field, description} = this.props;
        var active = this.state.active;
        var header;
        if (description === ""){
            header = <span>{field}</span>;
        }else{
            header = (
                <div className="tooltip-trigger"
                    onMouseEnter={this.handleHover.bind(null, true)}
                    onMouseLeave={this.handleHover.bind(null, false)}>
                    <span>{field}</span>
                    <i className="icon icon-info-circle item-icon"/>
                    <div className={'tooltip bottom' + (active ? ' tooltip-open' : '')}>
                        <div className="tooltip-arrow"></div>
                        <div className="tooltip-inner">
                            <span>{description}</span>
                        </div>
                    </div>
                </div>
            );
        }
        return (<dt>{header}</dt>);
    }
});
