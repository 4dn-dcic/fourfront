//
// undo, redo, reset buttons
(function(pbuttons, $, undefined) {

    pbuttons.add = function(options) {
        return;
        /*
        var opts = $.extend({
            // defaults
            btn_target: 'pedigree_history'
        }, options );

        var btns = [
            { "fa": "fa-undo", "title": "undo" },
            { "fa": "fa-repeat", "title": "redo" },
            { "fa": "fa-refresh", "title": "reset" },
            { "fa": "fa-arrows-alt", "title": "fullscreen" }
        ];
        var lis = "";
        for(var i=0; i<btns.length; i++) {
            lis += '<li">';
            lis += '&nbsp;<i class="fa fa-lg ' + btns[i].fa + '" ' +
                (btns[i].fa == "fa-arrows-alt" ? 'id="fullscreen" ' : '') +
                ' aria-hidden="true" title="'+ btns[i].title +'"></i>';
            lis += '</li>';
        }
        $( "#"+opts.btn_target ).append(lis);
        click(opts);
        */
    };

    pbuttons.bindButtons = function(opts){
        const fullScreenBtn = document.getElementById('pedigree-fullscreen-btn');
        if (fullScreenBtn){
            fullScreenBtn.onclick = function(e) {
                if (!document.mozFullScreen && !document.webkitFullScreen) {
                    const target = opts.targetDiv;
                    if (target.mozRequestFullScreen)
                        target.mozRequestFullScreen();
                    else
                        target.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
                } else {
                    if (document.mozCancelFullScreen)
                        document.mozCancelFullScreen();
                    else
                        document.webkitCancelFullScreen();
                }
            };
        }
        const undoBtn = document.getElementById('pedigree-undo-btn');
        if (undoBtn){
            undoBtn.onclick = function(e) {
                opts.dataset = pedcache.previous(opts);
                opts.targetDiv.innerHTML = '';
                ptree.build(opts);
            };
        }
        const redoBtn = document.getElementById('pedigree-redo-btn');
        if (redoBtn){
            redoBtn.onclick = function(e) {
                opts.dataset = pedcache.next(opts);
                opts.targetDiv.innerHTML = '';
                ptree.build(opts);
            };
        }
    };

    pbuttons.is_fullscreen = function(){
        return (document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement);
    };

    function click(opts) {
        // fullscreen
        $(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange', function(e)  {
            var local_dataset = pedcache.current(opts);
            if (local_dataset !== undefined && local_dataset !== null) {
                opts.dataset = local_dataset;
            }
            ptree.rebuild(opts);
        });

        $('#fullscreen').on('click', function(e) {
            if (!document.mozFullScreen && !document.webkitFullScreen) {
                var target = opts.targetDiv;
                if (target.mozRequestFullScreen)
                    target.mozRequestFullScreen();
                else
                    target.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
            } else {
                if (document.mozCancelFullScreen)
                    document.mozCancelFullScreen();
                else
                    document.webkitCancelFullScreen();
            }
        });

        // undo/redo/reset
        $("#" + opts.btn_target).on( "click", function(e) {
            e.stopPropagation();
            if ($(e.target).hasClass("disabled"))
                return false;

            if ($(e.target).hasClass('fa-undo')) {
                opts.dataset = pedcache.previous(opts);
                opts.targetDiv.innerHTML = '';
                ptree.build(opts);
            } else if ($(e.target).hasClass('fa-repeat')) {
                opts.dataset = pedcache.next(opts);
                opts.targetDiv.innerHTML = '';
                ptree.build(opts);
            } else if ($(e.target).hasClass('fa-refresh')) {
                pbuttons.reset(opts, opts.keep_proband_on_reset);
            }
            // trigger fhChange event
            $(document).trigger('fhChange', [opts]);
        });
    }

    // reset pedigree and clear the history
    pbuttons.reset = function(opts, keep_proband) {
        return;

        const localDataset = pedcache.current(opts);

        let proband;
        if (keep_proband) {
            var local_dataset = pedcache.current(opts);
            var newdataset =  ptree.copy_dataset(local_dataset);
            proband = newdataset[pedigree_util.getProbandIndex(newdataset)];
            //var children = pedigree_util.getChildren(newdataset, proband);
            proband.name = "ch1";
            proband.mother = "f21";
            proband.father = "m21";
            // clear pedigree data but keep proband data and risk factors
            pedcache.clear_pedigree_data(opts);
        } else {
            proband = {
                "name":"ch1","sex":"F","mother":"f21","father":"m21","proband":true,"status":"0","display_name":"me"
            };
            pedcache.clear(opts); // clear all storage data
        }

        delete opts.dataset;

        var selected = $("input[name='default_fam']:checked");
        if(selected.length > 0 && selected.val() == 'extended2') {    // secondary relatives
            opts.dataset = [
                { "name":"wZA","sex":"M","top_level":true,"status":"0","display_name":"paternal grandfather" },
                { "name":"MAk","sex":"F","top_level":true,"status":"0","display_name":"paternal grandmother" },
                { "name":"zwB","sex":"M","top_level":true,"status":"0","display_name":"maternal grandfather" },
                { "name":"dOH","sex":"F","top_level":true,"status":"0","display_name":"maternal grandmother" },
                { "name":"MKg","sex":"F","mother":"MAk","father":"wZA","status":"0","display_name":"paternal aunt" },
                { "name":"xsm","sex":"M","mother":"MAk","father":"wZA","status":"0","display_name":"paternal uncle" },
                { "name":"m21","sex":"M","mother":"MAk","father":"wZA","status":"0","display_name":"father" },
                { "name":"f21","sex":"F","mother":"dOH","father":"zwB","status":"0","display_name":"mother" },
                { "name":"aOH","sex":"F","mother":"f21","father":"m21","status":"0","display_name":"sister" },
                { "name":"Vha","sex":"M","mother":"f21","father":"m21","status":"0","display_name":"brother" },
                { "name":"Spj","sex":"M","mother":"f21","father":"m21","noparents":true,"status":"0","display_name":"partner" },
                proband,
                //{"name":"ch1","sex":"F","mother":"f21","father":"m21","proband":true,"status":"0","display_name":"me"},
                { "name":"zhk","sex":"F","mother":"ch1","father":"Spj","status":"0","display_name":"daughter" },
                { "name":"Knx","display_name":"son","sex":"M","mother":"ch1","father":"Spj","status":"0" },
                { "name":"uuc","display_name":"maternal aunt","sex":"F","mother":"dOH","father":"zwB","status":"0" },
                { "name":"xIw","display_name":"maternal uncle","sex":"M","mother":"dOH","father":"zwB","status":"0" }
            ];
        } else if(selected.length > 0 && selected.val() == 'extended1') {    // primary relatives
            opts.dataset = [
                { "name":"m21","sex":"M","mother":null,"father":null,"status":"0","display_name":"father","noparents":true },
                { "name":"f21","sex":"F","mother":null,"father":null,"status":"0","display_name":"mother","noparents":true },
                { "name":"aOH","sex":"F","mother":"f21","father":"m21","status":"0","display_name":"sister" },
                { "name":"Vha","sex":"M","mother":"f21","father":"m21","status":"0","display_name":"brother" },
                { "name":"Spj","sex":"M","mother":"f21","father":"m21","noparents":true,"status":"0","display_name":"partner" },
                proband,
                //{"name":"ch1","sex":"F","mother":"f21","father":"m21","proband":true,"status":"0","display_name":"me"},
                { "name":"zhk","sex":"F","mother":"ch1","father":"Spj","status":"0","display_name":"daughter" },
                { "name":"Knx","display_name":"son","sex":"M","mother":"ch1","father":"Spj","status":"0" }
            ];
        } else {
            opts.dataset = [
                { "name": "m21", "display_name": "father", "sex": "M", "top_level": true },
                { "name": "f21", "display_name": "mother", "sex": "F", "top_level": true },
                proband
            ];
            //{"name": "ch1", "display_name": "me", "sex": "F", "mother": "f21", "father": "m21", "proband": true}];
        }
        ptree.rebuild(opts);
    };

    pbuttons.updateButtons = function(opts) {
        var current = pedcache.get_count(opts);
        var nstore = pedcache.nstore(opts);
        var id = "#"+opts.btn_target;
        if(nstore <= current)
            $(id+" .fa-repeat").addClass('disabled');
        else
            $(id+" .fa-repeat").removeClass('disabled');

        if(current > 1)
            $(id+" .fa-undo").removeClass('disabled');
        else
            $(id+" .fa-undo").addClass('disabled');
    };

}(window.pbuttons = window.pbuttons || {}, jQuery));

//
//store a history of pedigree
(function(pedcache, $, undefined) {

    var count = 0;
    const max_limit = 3;
    var dict_cache = {};

    function getStore(opts){
        return window.fourfront.PedigreeJS.instances[opts.fourfrontInstanceID];
    }

    // remove all storage items with keys that have the pedigree history prefix
    pedcache.clear_pedigree_data = function(opts) {
        var prefix = get_prefix(opts);
        var store = (opts.store_type === 'local' ? localStorage : sessionStorage);
        var items = [];
        var i;
        for(i = 0; i < store.length; i++){
            if(store.key(i).indexOf(prefix) == 0)
                items.push(store.key(i));
        }
        for(i = 0; i < items.length; i++)
            store.removeItem(items[i]);
    };

    pedcache.get_count = function(opts) {
        const { count } = getStore(opts);
        if (count !== null && count !== undefined) return count;
        return 0;
    };

    pedcache.add = function(opts) {
        if (!opts.dataset) return;
        const store = getStore(opts);
        let count = store.count || 0;

        if (store.history.length - 1 > count){
            store.history = store.history.slice(0, count + 1);
        }

        const nextHistItem = JSON.stringify(opts.dataset); // stringify creates a clone of object.
        if (nextHistItem === store.history[store.history.length - 1]){
            return; // Cancel -- no changes
        }

        store.history.push(nextHistItem); // stringify creates a clone of object.

        if (count < max_limit)
            count++;
        else
            // count stays same, remove first history item to make space for more history items.
            store.history.shift();
        store.count = count;
        if (typeof opts.onChangeCallback === 'function'){
            opts.onChangeCallback("pedcache.add", store);
        }
    };

    pedcache.nstore = function(opts) {
        const store = getStore(opts);
        return store.history.length;
    };

    pedcache.current = function(opts) {
        const store = getStore(opts);
        const { count = 0 } = store;
        const current = count - 1;
        return JSON.parse(store.history[current]);
    };

    pedcache.last = function(opts) {
        const store = getStore(opts);
        const { count: existingCount = 0, history = [] } = store;
        store.count = history.length;
        const lastHistoryIdx = store.count - 1;
        return JSON.parse(store.history[lastHistoryIdx]);
    };

    pedcache.previous = function(opts, previous) {
        const store = getStore(opts);
        if (typeof previous === "undefined"){
            previous = store.count - 2;
        }
        if (previous < 0) {
            return;
            // Default to latest
            //return pedcache.last(opts);
        }
        store.count = previous + 1;
        if (typeof opts.onChangeCallback === 'function'){
            opts.onChangeCallback("pedcache.previous", store);
        }
        return JSON.parse(store.history[previous]);
    };

    pedcache.next = function(opts, next) {
        const store = getStore(opts);
        if (typeof previous === "undefined"){
            next = store.count || 0;
        }

        if (next > max_limit) {
            return;
            // Default to latest
            //return pedcache.last(opts);
        }
        store.count = next + 1;
        if (typeof opts.onChangeCallback === 'function'){
            opts.onChangeCallback("pedcache.next", store);
        }
        return JSON.parse(store.history[next]);
    };

    pedcache.clear = function(opts) {
        const store = getStore(opts);
        store.count = 0;
        store.history = [];
        store.x = 0;
        store.y = 0;
        if (typeof opts.onChangeCallback === 'function'){
            opts.onChangeCallback("pedcache.clear", store);
        }
    };

    // zoom - store translation coords
    pedcache.setposition = function(opts, x, y, zoom) {
        const store = getStore(opts);
        store.x = x;
        store.y = y;
        if (zoom) {
            store.zoom = zoom;
        }
        if (typeof opts.onChangeCallback === 'function'){
            opts.onChangeCallback("pedcache.setposition", store);
        }
    };

    pedcache.getposition = function(opts) {
        const store = getStore(opts);
        const pos = [
            store.x || null,
            store.y || null
        ];
        if (store.zoom){
            pos.push(store.zoom);
        }
        return pos;
    };

}(window.pedcache = window.pedcache || {}, jQuery));