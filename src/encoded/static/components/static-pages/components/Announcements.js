'use strict';

var React = require('react');
var _ = require('underscore');
var { console } = require('./../../util');
var store = require('../../../store');
var globals = require('./../../globals');
var announcements_data = require('../../../data/announcements_data');
var Collapse = require('react-bootstrap').Collapse;

/**
 * A single Announcement block/view.
 */
class Announcement extends React.Component {

    constructor(props){
        super(props);
        this.handleToggle = this.handleToggle.bind(this);
        this.render = this.render.bind(this);
        this.state = { active : props.index > 2 ? false : true };
    }

    handleToggle(e) {
        e.preventDefault();
        this.setState({active: !this.state.active});
    }

    render() {
        var title = this.props.content.title || "";
        var author = this.props.content.author || "";
        var date = this.props.content.date || "";
        var content = this.props.content.content || "";
        var active = this.state.active;
        var subtitle;
        if (author && date){
            subtitle = "Posted by " + author + " | " + date;
        }else if (author && !date){
            subtitle = "Posted by " + author;
        }else if (!author && date){
            subtitle = "Posted on " + date;
        }else{
            subtitle = "";
        }

        var icon = null;
        if (this.props.icon){
            if (this.props.icon === true){
                icon = <i className={"icon text-small icon-" + (this.state.active ? 'minus' : 'plus')}></i>;
            } else {
                icon = this.props.icon; // Custom icon maybe for future
            }
        }

        return (
            <div className="fourDN-section announcement">
                <div className="fourDN-section-title announcement-title">
                    <a className="fourDN-section-toggle" href="#" onClick={this.handleToggle}>
                        {icon} <span dangerouslySetInnerHTML={{__html: title}}/>
                    </a>
                </div>
                <div className="fourDN-section-info announcement-subtitle">{subtitle}</div>
                <Collapse in={this.state.active}>
                    <div className="fourDN-content announcement-content">
                        <p dangerouslySetInnerHTML={{__html: content}}></p>
                    </div>
                </Collapse>
            </div>
        );
    }

}

/**
 * Component which shows currents announcements.
 * Announcements are (temporarily) currently stored in src/encoded/static/data/announcements_data.js.
 * 
 * @prop {string} className - Outer <div> element's className
 * @prop {string} id - Outer <div> element's id attribute.
 */
export class Announcements extends React.Component {
    render(){
        return (
            <div className={this.props.className} id={this.props.id}>{
                announcements_data.map(function(announce, idx){
                    return (
                        <Announcement key={announce.title} index={idx} content={announce} icon={announcements_data.length > 3 ? true : false} />
                    );
                })
            }</div>
        );
    }
}
