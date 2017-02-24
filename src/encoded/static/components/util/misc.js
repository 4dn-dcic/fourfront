'use strict';


module.exports = {
    
    /**
     * Check if JS is processing on serverside, vs in browser (clientside).
     * Adapted from react/node_modules/fbjs/lib/ExecutionEnvironment.canUseDOM()
     *
     * @return {boolean} - True if processing on serverside.
     */
    isServerSide : function(){
        if (typeof window == 'undefined' || !window || !window.document || !window.document.createElement){
            return true;
        }
        return false;
    }

};
