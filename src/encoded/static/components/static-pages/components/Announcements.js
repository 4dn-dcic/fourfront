'use strict';

import React from 'react';
import _ from 'underscore';
import { console } from './../../util';
import { store } from '../../../store';
import * as globals from './../../globals';
import { announcements } from '../../../data/announcements_data';
import { Collapse, Button } from 'react-bootstrap';
import { PartialList } from './../../item-pages/components';

/**
 * A single Announcement block/view.
 */
class Announcement extends React.Component {

    render() {
        var title = this.props.content.title || "";
        var author = this.props.content.author || "";
        var date = this.props.content.date || "";
        var content = this.props.content.content || "";
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

        return (
            <div className="fourDN-section announcement">
                <div className="fourDN-section-title announcement-title">
                        <span dangerouslySetInnerHTML={{__html: title}}/>
                </div>
                <div className="fourDN-section-info announcement-subtitle">{subtitle}</div>
                <div className="fourDN-content announcement-content">
                    <p dangerouslySetInnerHTML={{__html: content}}></p>
                </div>
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

    constructor(props){
        super(props);
        this.toggleOpen = this.toggleOpen.bind(this);
        this.state = {
            'open' : false
        };
    }

    toggleOpen(){
        this.setState({ 'open' : !this.state.open });
    }

    render(){

        var persistent, collapsible = null;

        function createAnnouncement(announce, idx){
            return <Announcement key={announce.title} index={idx} content={announce} icon={collapsible ? true : false} />;
        }

        if (announcements.length > 3) {
            persistent = announcements.slice(0,3);
            collapsible = announcements.slice(3);
        } else {
            persistent = announcements;
        }

        return (
            <div className={this.props.className} id={this.props.id}>{
                collapsible ? [
                    <PartialList key="list" open={this.state.open} collapsible={collapsible.map(createAnnouncement)} persistent={persistent.map(createAnnouncement)}/>,
                    <Button key="button" bsSize="sm" className="pull-right" onClick={this.toggleOpen} bsStyle="default">{ !this.state.open ? 'See ' + (collapsible.length) + ' More' : 'Hide' }</Button>
                ] : announcements.map(createAnnouncement)
            }</div>
        );
    }
}
