'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import * as offset from '../libs/offset';


/**
 * Keeping this file around because it'll be a good base for sticky headers.
 */
export default class StickyHeader extends React.Component {

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillUnmount = this.componentDidMount.bind(this);
        this.stickyHeader = this.stickyHeader.bind(this);
        this.render = this.render.bind(this);
    }

    componentDidMount() {
        // Avoid shimming as ie8 does not support css transform
        if (window.getComputedStyle === undefined) return;
        this.stickyHeader();
        window.addEventListener('scroll', this.stickyHeader);
        window.addEventListener('resize', this.stickyHeader);
    }

    componentWillUnmount() {
        if (window.getComputedStyle === undefined) return;
        window.removeEventListener('scroll', this.stickyHeader);
        window.removeEventListener('resize', this.stickyHeader);
    }

    stickyHeader() {
        // http://stackoverflow.com/a/6625189/199100
        // http://css-tricks.com/persistent-headers/
        const header = ReactDOM.findDOMNode(this);
        const table = header.parentElement;
        const offsetTop = offset(table).top;
        const nb = document.querySelector('.navbar-fixed-top');
        let nb_height = 0;

        if (window.getComputedStyle(nb).getPropertyValue('position') === 'fixed') {
            nb_height = nb.clientHeight;
        }
        const scrollTop = document.body.scrollTop + nb_height;
        let y = 0;

        if((scrollTop > offsetTop) && (scrollTop < (offsetTop + table.clientHeight))) {
            y = scrollTop - offsetTop - 3; // correction for borders
        }
        const transform = 'translate(0px,' + y + 'px)';
        header.style.transform = transform;
    }

    render() {
        return React.Children.only(this.props.children);
    }

}
