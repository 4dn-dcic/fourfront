/** @jsx React.DOM */
'use strict';
var React = require('react');
var cx = require('react/lib/cx');
var ReactForms = require('react-forms');
var ItemEdit = require('./item').ItemEdit;
var globals = require('./globals');
var url = require('url');


// Fixed-position lightbox background and image
var Lightbox = module.exports.Lightbox = React.createClass({
    getInitialState: function() {
        return {imgHeight: 0};
    },

    // Window resized; set max-height of image
    handleResize: function() {
        this.setState({imgHeight: this.refs.lightbox.getDOMNode().offsetHeight - 40});
    },

    componentDidMount: function() {
        window.addEventListener('resize', this.handleResize);
        this.setState({imgHeight: this.refs.lightbox.getDOMNode().offsetHeight - 40});
    },

    componentWillUnmount: function() {
        window.removeEventListener('resize', this.handleResize);
    },

    render: function() {
        var lightboxVisible = this.props.lightboxVisible;
        var lightboxClass = cx({
            "lightbox": true,
            "active": lightboxVisible
        });
        var imgStyle = {maxHeight: this.state.imgHeight};

        return (
            <div className={lightboxClass} onClick={this.props.clearLightbox} aria-label="Close" ref="lightbox">
                <div className="lightbox-img">
                    <a aria-label="Open image" data-bypass="true" href={this.props.lightboxImg}>
                        <img src={this.props.lightboxImg} style={imgStyle} />
                    </a>
                    <button className="lightbox-close" aria-label="Close" onClick={this.clearLightbox}></button>
                </div>
            </div>
        );
    }
});


var Attachment = module.exports.Attachment = React.createClass({
    // Handle a click on the lightbox trigger (thumbnail)
    lightboxClick: function(attachmentType, e) {
        if(attachmentType === 'image') {
            e.preventDefault();
            e.stopPropagation();
            this.setState({lightboxVisible: true});
        }
    },

    getInitialState: function() {
        return {lightboxVisible: false};
    },

    clearLightbox: function() {
        this.setState({lightboxVisible: false});
    },

    // If lightbox visible, ESC key closes it
    handleEscKey: function(e) {
        if(this.state.lightboxVisible && e.keyCode == 27) {
            this.clearLightbox();
        }
    },

    // Register for keyup events for ESC key
    componentDidMount: function() {
        if (window.addEventListener){
            window.addEventListener('keyup', this.handleEscKey, false); 
        } else if (window.attachEvent){
            window.attachEvent('onKeyup', this.handleEscKey);
        }
    },

    // Unregister keyup events when component closes
    componentWillUnmount: function() {
        if (window.removeEventListener){
            window.removeEventListener('keyup', this.handleEscKey, false); 
        } else if (window.detachEvent){
            window.detachEvent('onKeyup', this.handleEscKey);
        }
    },

    render: function() {
        var context = this.props.context;
        var attachmentHref;
        var src, alt;
        var height = "100";
        var width = "100";
        if (context.attachment && context.attachment.href && context.attachment.type) {
            attachmentHref = url.resolve(context['@id'], context.attachment.href);
            var attachmentType = context.attachment.type.split('/', 1)[0];
            if (attachmentType == 'image') {
                var imgClass = this.props.className ? this.props.className + '-img' : '';
                src = attachmentHref;
                height = context.attachment.height || 100;
                width = context.attachment.width || 100;
                alt = "Attachment Image";
                if (this.props.show_link === false) {
                    return <img className={imgClass} src={src} height={height} width={width} alt={alt} />;
                } else {
                    return (
                        <div className="attachment">
                            <a data-bypass="true" href={attachmentHref} onClick={this.lightboxClick.bind(this, attachmentType)}>
                                <img className={imgClass} src={src} height={height} width={width} alt={alt} />
                            </a>
                            <Lightbox lightboxVisible={this.state.lightboxVisible} lightboxImg={attachmentHref} clearLightbox={this.clearLightbox} />
                        </div>
                    );
                }
            } else if (context.attachment.type == "application/pdf"){
                return (
                    <div className="attachment">
                        <a data-bypass="true" href={attachmentHref} className="file-pdf">Attachment PDF Icon</a>
                    </div>
                );
            } else {
                return (
                    <div className="attachment">
                        <a data-bypass="true" href={attachmentHref} className="file-generic">Attachment Icon</a>
                    </div>
                );
            }
        } else {
            return (
                <div className="attachment">
                    <div className="file-missing">Attachment file broken icon</div>
                </div>
            );
        }
    }
});


var Image = React.createClass({
    render: function() {
        return (
            <figure>
                <Attachment context={this.props.context} show_link={false} />
                <figcaption>{this.props.context.caption}</figcaption>
            </figure>
        );
    }
});


globals.content_views.register(Image, 'image');


var FileInput = React.createClass({

    getInitialState: function() {
        return {
            value: this.props.value
        };
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState({value: nextProps.value});
    },

    render: function() {
        var mimetype = this.state.value.type;
        var preview = (mimetype && mimetype.indexOf('image/') === 0) ? <img src={this.state.value.href} width="128" /> : '';
        return (
            <div className="dropzone" onDragOver={this.onDragOver} onDrop={this.onDrop}>
                <div className="drop">Drop a file here.
                    <div>{preview}</div>
                </div>
                <div className="browse">Or <input ref="input" type="file" onChange={this.onChange} /></div>
            </div>
        );
    },

    onDragOver: function(e) {
        e.dataTransfer.dropEffect = 'copy';
        return false;  // indicate we are going to handle the drop
    },

    onDrop: function(e) {
        var file = e.dataTransfer.files[0];
        this.onChange(null, file);
        return false;
    },

    onChange: function(e, file) {
        if (file === undefined) {
            var input = this.refs.input.getDOMNode();
            file = input.files[0];
        }
        var reader = new FileReader();
        reader.onloadend = function() {
            var value = {
                download: file.name,
                type: file.type,
                href: reader.result
            };
            this.props.onChange(value);
        }.bind(this);
        if (file) {
            reader.readAsDataURL(file);
        }
    }
});


var Schema    = ReactForms.schema.Schema;
var Property  = ReactForms.schema.Property;

var ImageFormSchema = (
    <Schema>
        <Property name="caption" label="Caption" />
        <Property name="attachment" label="Image" input={FileInput()} />
    </Schema>
);


var ImageEdit = React.createClass({
    render: function() {
        return this.transferPropsTo(<ItemEdit context={this.props.context} schema={ImageFormSchema} />);
    }
});


globals.content_views.register(ImageEdit, 'image', 'edit');
globals.content_views.register(ImageEdit, 'image_collection', 'add');
