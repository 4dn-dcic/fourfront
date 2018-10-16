'use strict';

/**
 * Singleton class used for communicating with LocalStorage
 */
export class HiGlassLocalStorage {

    static instances = {}

    static DEFAULT_PREFIX = "higlass_4dn_data_";

    static validators = {
        'domains' : function(val){
            if (!val || !Array.isArray(val.x) || !Array.isArray(val.y)) return false;
            if (val.x.length != 2) return false;
            if (val.y.length != 2) return false;
            return true;
        }
    }

    constructor(prefix = HiGlassLocalStorage.DEFAULT_PREFIX){
        if (HiGlassLocalStorage.instances[prefix]){
            return HiGlassLocalStorage.instances[prefix];
        }

        if (!this.doesLocalStorageExist()){
            return null;
        }

        this.prefix = prefix;
        HiGlassLocalStorage.instances[prefix] = this;

        return HiGlassLocalStorage.instances[prefix];
    }

    doesLocalStorageExist(){
        var someVariable = 'helloworld';
        try {
            localStorage.setItem(someVariable, someVariable);
            localStorage.removeItem(someVariable);
            return true;
        } catch(e) {
            return false;
        }
    }

    getDomains(){
        var localStorageKey = this.prefix + 'domains';
        var domains = localStorage.getItem(localStorageKey);
        if (domains) domains = JSON.parse(domains);
        if (!HiGlassLocalStorage.validators.domains(domains)){
            localStorage.removeItem(localStorageKey);
            console.error('Domains failed validation, removing key & value - ' + localStorageKey, domains);
            return null;
        }
        return domains || null;
    }

    /**
     * Save domain range location to localStorage.
     *
     * @param {{ 'x' : number[], 'y' : number[] }} domains - Domains to save from viewConfig.
     */
    saveDomains(domains){
        if (!HiGlassLocalStorage.validators.domains(domains)){
            console.error('Invalid value for domains passed in', domains);
            return false;
        }
        localStorage.setItem(this.prefix + 'domains', JSON.stringify(domains));
        return true;
    }
}