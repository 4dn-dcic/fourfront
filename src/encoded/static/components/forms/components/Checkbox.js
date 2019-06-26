import React from 'react';

/** Emulates React-Bootstrap 0.32.4 Checkbox for backwards compatibility */

export const Checkbox = React.memo(function Checkbox(props){
    const { className, children, title, ...passProps } = props;
    const cls = "checkbox" + (className ? " " + className : "");
    return (
        <div className={cls}>
            <label title={title}>
                <input type="checkbox" value="number_of_files" {...passProps} />
                { children }
            </label>
        </div>
    );
});
