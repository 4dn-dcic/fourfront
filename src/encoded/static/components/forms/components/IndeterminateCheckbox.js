import React from 'react';

export class IndeterminateCheckbox extends React.PureComponent {
    constructor(props){
        super(props);
        this.setIndeterminateOnRef = this.setIndeterminateOnRef.bind(this);
        this.checkboxRef = React.createRef();
    }

    componentDidMount(){
        // Can be skipped if not set to true.
        if (this.props.indeterminate === true){
            this.setIndeterminateOnRef();
        }
    }

    componentDidUpdate(pastProps){
        if (pastProps.indeterminate !== this.props.indeterminate){
            this.setIndeterminateOnRef();
        }
    }

    setIndeterminateOnRef(){
        if (this.checkboxRef.current){
            this.checkboxRef.current.indeterminate = this.props.indeterminate;
        }
    }

    render(){
        return <input type="checkbox" {...this.props} ref={this.checkboxRef} />;
    }
}
