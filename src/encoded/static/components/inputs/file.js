'use strict';

import React from 'react';

export class FileInput extends React.Component {

    constructor(props){
        super(props);
        this.onDragOver = this.onDragOver.bind(this);
        this.onDrop = this.onDrop.bind(this);
        this.onChange = this.onChange.bind(this);
        this.state = {
            value: props.value || {},
        };
    }

    componentWillReceiveProps(nextProps) {
        this.setState({value: nextProps.value});
    }

    onDragOver(e) {
        e.dataTransfer.dropEffect = 'copy';
        e.preventDefault();  // indicate we are going to handle the drop
    }

    onDrop(e) {
        var file = e.dataTransfer.files[0];
        this.onChange(null, file);
        e.preventDefault();
    }

    onChange(e, file) {
        if (file === undefined) {
            var input = this.refs.input.getDOMNode();
            file = input.files[0];
        }
        var reader = new FileReader();
        reader.onloadend = function() {
            var value = {
                download: file.name,
                type: file.type || undefined,
                href: reader.result
            };
            this.props.onChange(value);
        }.bind(this);
        if (file) {
            reader.readAsDataURL(file);
        }
    }

    render() {
        var mimetype = this.state.value.type;
        var preview = (mimetype && mimetype.indexOf('image/') === 0) ? <img src={this.state.value.href} width="128" /> : '';
        var filename = this.state.value.download;
        return (
            <div className="dropzone" onDragOver={this.onDragOver} onDrop={this.onDrop}>
                <div className="drop">
                    {filename ? <div>
                        <a href={this.state.value.href} target="_blank">{filename}</a>
                    </div> : ''}
                    <div>{preview}</div>
                    <br />Drop a {filename ? 'replacement' : ''} file here.
                    Or <input ref="input" type="file" onChange={this.onChange} />
                    <br /><br />
                </div>
            </div>
        );
    }

}
