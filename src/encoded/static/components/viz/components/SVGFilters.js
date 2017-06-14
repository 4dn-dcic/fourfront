'use strict';

import React from 'react';

export class SVGFilters extends React.Component {

    static defaultProps = {
        'enabled' : true,
        'wrapInOwnSVG' : true,
        'includeFilters' : ['svg-filter-highlight', 'svg-filter-brightness']
    }

    shouldComponentUpdate(){
        return false; // We never need to update this. Let's improve performance a little bit instead of re-rendering.
    }

    renderFilters(){
        var filterComponents = [];
        this.props.includeFilters.forEach(function(filterID){
            if (filterID === 'svg-filter-highlight'){
                filterComponents.push(
                    <filter id="svg-filter-highlight" key="svg-filter-highlight">

                        <feFlood floodColor="white" result="COLOR-black"></feFlood>
                        <feImage xmlnsXlink="http://www.w3.org/1999/xlink" xlinkHref="data:image/svg+xml;charset=utf-8,%3Csvg%20version%3D%221.1%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20width%3D%22100px%22%20height%3D%22200px%22%20%20%3E%0A%09%3Cdefs%3E%0A%09%09%3Cpattern%20id%3D%22pattern%22%20patternUnits%3D%22userSpaceOnUse%22%20width%3D%2210%22%20height%3D%2210%22%3E%0A%0A%09%09%09%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M0%2C8.239V10h1.761L0%2C8.239z%22%2F%3E%0A%09%09%09%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M5%2C0l5%2C5l0%2C0V3.238L6.762%2C0H5z%22%2F%3E%0A%09%09%09%3Cpolygon%20fill%3D%22%23FFFFFF%22%20points%3D%220%2C3.239%200%2C5%205%2C10%206.761%2C10%20%22%2F%3E%0A%09%09%09%3Cpolygon%20fill%3D%22%23FFFFFF%22%20points%3D%221.762%2C0%200%2C0%2010%2C10%2010%2C8.238%20%22%2F%3E%0A%09%09%3C%2Fpattern%3E%0A%09%3C%2Fdefs%3E%0A%09%3Crect%20x%3D%220%22%20y%3D%220%22%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22url(%23pattern)%22%20%2F%3E%0A%3C%2Fsvg%3E" 
                        x="0" y="2" width="100" height="200" result="STRIPED-FILL_10"></feImage>
                        <feTile in="STRIPED-FILL_10" result="STRIPED-FILL_20"></feTile>
                        <feComposite operator="in" in="STRIPED-FILL_20" in2="SourceAlpha" result="STRIPED-FILL_30"></feComposite>
                        <feComposite operator="in" in="COLOR-black" in2="STRIPED-FILL_30" result="STRIPED-FILL_40"></feComposite>

                        <feMerge result="BEVEL_40">
                            <feMergeNode in="SourceGraphic" />
                            <feMergeNode in="STRIPED-FILL_40" />
                        </feMerge>
                    
                </filter>
                );
            }
            if (filterID === 'svg-filter-brightness'){
                filterComponents.push(
                    <filter id="svg-filter-brightness" key="svg-filter-brightness">
                        <feComponentTransfer>
                            <feFuncR type="linear" slope="1.3"/>
                            <feFuncG type="linear" slope="1.3"/>
                            <feFuncB type="linear" slope="1.3"/>
                        </feComponentTransfer>
                    </filter>
                );
            }
        });
        return <defs>{ filterComponents }</defs>;
    }

    render(){
        if (!this.props.enabled) return null;
        if (this.props.wrapInOwnSVG){
            return <svg id="svg-filters" height={0} width={0}>{ this.renderFilters() }</svg>;
        } else return this.renderFilters();
    }

}
