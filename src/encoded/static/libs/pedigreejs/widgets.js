
// pedigree widgets
(function(widgets, $, undefined) {

	function getTranslation(transform) {
    	  // Create a dummy g for calculation purposes only. This will never
    	  // be appended to the DOM and will be discarded once this function
    	  // returns.
    	  var g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    	  // Set the transform attribute to the provided string value.
    	  g.setAttributeNS(null, "transform", transform);

    	  // consolidate the SVGTransformList containing all transformations
    	  // to a single SVGTransform of type SVG_TRANSFORM_MATRIX and get
    	  // its SVGMatrix.
    	  var matrix = g.transform.baseVal.consolidate().matrix;

    	  // As per definition values e and f are the ones for the translation.
    	  return [matrix.e, matrix.f];
    	}

	var dragging;
	var last_mouseover;
	//
	// Add widgets to nodes and bind events
    widgets.addWidgets = function(opts, node) {

    	// popup gender selection box
    	var font_size = parseInt($("body").css('font-size'));
    	var popup_selection = d3.select('.diagram');
    	popup_selection.append("rect").attr("class", "popup_selection")
    							.attr("rx", 6)
    							.attr("ry", 6)
    							.attr("transform", "translate(-1000,-100)")
    							.style("opacity", 0)
    							.attr("width",  font_size*7.9)
    							.attr("height", font_size*2)
    							.style("stroke", "darkgrey")
    							.attr("fill", "white");

		var square = popup_selection.append("text")  // male
			.attr('font-family', 'FontAwesome')
			.style("opacity", 0)
			.attr('font-size', '1.em' )
			.attr("class", "popup_selection fa-lg fa-square persontype")
			.attr("transform", "translate(-1000,-100)")
			.attr("x", font_size/3)
			.attr("y", font_size*1.5)
			.text("\uf096 ");
		var square_title = square.append("svg:title").text("add male");

		var circle = popup_selection.append("text")  // female
			.attr('font-family', 'FontAwesome')
			.style("opacity", 0)
			.attr('font-size', '1.em' )
			.attr("class", "popup_selection fa-lg fa-circle persontype")
			.attr("transform", "translate(-1000,-100)")
			.attr("x", font_size*1.7)
			.attr("y", font_size*1.5)
			.text("\uf10c ");
		var circle_title = circle.append("svg:title").text("add female");

		var unspecified = popup_selection.append("text")  // unspecified
			.attr('font-family', 'FontAwesome')
			.style("opacity", 0)
			.attr('font-size', '1.em' )
			.attr("transform", "translate(-1000,-100)")
			.attr("class", "popup_selection fa-lg fa-unspecified popup_selection_rotate45 persontype")
			.text("\uf096 ");
		var unspecified_title = unspecified.append("svg:title").text("add unspecified");

		var dztwin = popup_selection.append("text")  // dizygotic twins
			.attr('font-family', 'FontAwesome')
			.style("opacity", 0)
			.attr("transform", "translate(-1000,-100)")
			.attr("class", "popup_selection fa-2x fa-angle-up persontype dztwin")
			.attr("x", font_size*4.6)
			.attr("y", font_size*1.5)
			.text("\uf106 ");
		var dztwin_title = dztwin.append("svg:title").text("add dizygotic/fraternal twins");

		var mztwin = popup_selection.append("text")  // monozygotic twins
		.attr('font-family', 'FontAwesome')
		.style("opacity", 0)
		.attr("transform", "translate(-1000,-100)")
		.attr("class", "popup_selection fa-2x fa-caret-up persontype mztwin")
		.attr("x", font_size*6.2)
		.attr("y", font_size*1.5)
		.text("\uf0d8");
		var mztwin_title = mztwin.append("svg:title").text("add monozygotic/identical twins");

		var add_person = {};
		// click the person type selection
		d3.selectAll(".persontype")
		  .on("click", function () {
			var newdataset = ptree.copy_dataset(pedcache.current(opts));
			var mztwin = d3.select(this).classed("mztwin");
			var dztwin = d3.select(this).classed("dztwin");
			var twin_type;
			var sex;
			if(mztwin || dztwin) {
				sex = add_person.node.datum().data.sex;
				twin_type = (mztwin ? "mztwin" : "dztwin");
			} else {
				sex = d3.select(this).classed("fa-square") ? 'M' : (d3.select(this).classed("fa-circle") ? 'F' : 'U');
			}

			if(add_person.type === 'addsibling')
				ptree.addsibling(newdataset, add_person.node.datum().data, sex, false, twin_type);
			else if(add_person.type === 'addchild')
				ptree.addchild(newdataset, add_person.node.datum().data, (twin_type ? 'U' : sex), (twin_type ? 2 : 1), twin_type);
			else
				return;
			opts.dataset = newdataset;
			ptree.rebuild(opts);
			d3.selectAll('.popup_selection').style("opacity", 0);
			add_person = {};
		  })
		  .on("mouseover", function() {
			  if(add_person.node)
				  add_person.node.select('rect').style("opacity", 0.2);
			  d3.selectAll('.popup_selection').style("opacity", 1);
			  // add tooltips to font awesome widgets
			  if(add_person.type === 'addsibling'){
				 if(d3.select(this).classed("fa-square"))
					  square_title.text("add brother");
				  else
					  circle_title.text("add sister");
			  } else if(add_person.type === 'addchild'){
				  if(d3.select(this).classed("fa-square"))
					  square_title.text("add son");
				  else
					  circle_title.text("add daughter");
			  }
		  });

		// handle mouse out of popup selection
		d3.selectAll(".popup_selection").on("mouseout", function () {
			// hide rect and popup selection
			if(add_person.node !== undefined && highlight.indexOf(add_person.node.datum()) == -1)
				add_person.node.select('rect').style("opacity", 0);
			d3.selectAll('.popup_selection').style("opacity", 0);
		});


		// drag line between nodes to create partners
		drag_handle(opts);

		// rectangle used to highlight on mouse over
		node.append("rect")
			.filter(function (d) {
			    return d.data.hidden && !opts.DEBUG ? false : true;
			})
			.attr("class", 'indi_rect')
			.attr("rx", 6)
			.attr("ry", 6)
			.attr("x", function(d) { return - 0.75*opts.symbol_size; })
			.attr("y", function(d) { return - opts.symbol_size; })
			.attr("width",  (1.5 * opts.symbol_size)+'px')
			.attr("height", (2 * opts.symbol_size)+'px')
			.style("stroke", "black")
			.style("stroke-width", 0.7)
			.style("opacity", 0)
			.attr("fill", "lightgrey");

		// widgets
		var fx = function(d) {return off - 0.75*opts.symbol_size;};
		var fy = opts.symbol_size -2;
		var off = 0;
		var widgets = {
			'addchild':   {'text': '\uf063', 'title': 'add child',   'fx': fx, 'fy': fy},
			'addsibling': {'text': '\uf234', 'title': 'add sibling', 'fx': fx, 'fy': fy},
			'addpartner': {'text': '\uf0c1', 'title': 'add partner', 'fx': fx, 'fy': fy},
			'addparents': {
				'text': '\uf062', 'title': 'add parents',
				'fx': - 0.75*opts.symbol_size,
				'fy': - opts.symbol_size + 11
			},
			'delete': {
				'text': 'X', 'title': 'delete',
				'fx': opts.symbol_size/2 - 1,
				'fy': - opts.symbol_size + 12,
				'styles': {"font-weight": "bold", "fill": "darkred", "font-family": "monospace"}
			}
		};

		if(opts.edit) {
			widgets.settings = {'text': '\uf013', 'title': 'settings', 'fx': -font_size/2+2, 'fy': -opts.symbol_size + 11};
		}

		for(var key in widgets) {
			var widget = node.append("text")
				.filter(function (d) {
			    	return  (d.data.hidden && !opts.DEBUG ? false : true) &&
			    	       !((d.data.mother === undefined || d.data.noparents) && key === 'addsibling') &&
			    	       !(d.data.parent_node !== undefined && d.data.parent_node.length > 1 && key === 'addpartner') &&
			    	       !(d.data.parent_node === undefined && key === 'addchild') &&
			    	       !((d.data.noparents === undefined && d.data.top_level === undefined) && key === 'addparents');
				})
				.attr("class", key)
				.style("opacity", 0)
				.attr('font-family', 'FontAwesome')
				.attr("xx", function(d){return d.x;})
				.attr("yy", function(d){return d.y;})
				.attr("x", widgets[key].fx)
				.attr("y", widgets[key].fy)
				.attr('font-size', '0.9em' )
				.text(widgets[key].text);

			if('styles' in widgets[key])
				for(var style in widgets[key].styles){
					widget.attr(style, widgets[key].styles[style]);
				}

			widget.append("svg:title").text(widgets[key].title);
			off += 17;
		}

		// add sibling or child
		d3.selectAll(".addsibling, .addchild")
		  .on("mouseover", function () {
			  var type = d3.select(this).attr('class');
			  d3.selectAll('.popup_selection').style("opacity", 1);
			  add_person = {'node': d3.select(this.parentNode), 'type': type};

			  //var translate = getTranslation(d3.select('.diagram').attr("transform"));
			  var x = parseInt(d3.select(this).attr("xx")) + parseInt(d3.select(this).attr("x"));
			  var y = parseInt(d3.select(this).attr("yy")) + parseInt(d3.select(this).attr("y"));
			  d3.selectAll('.popup_selection').attr("transform", "translate("+x+","+(y+2)+")");
			  d3.selectAll('.popup_selection_rotate45')
			  	.attr("transform", "translate("+(x+3*font_size)+","+(y+(font_size*1.2))+") rotate(45)");
		  });

		// handle widget clicks
		d3.selectAll(".addchild, .addpartner, .addparents, .delete, .settings")
		  .on("click", function () {
			d3.event.stopPropagation();
			var opt = d3.select(this).attr('class');
			var d = d3.select(this.parentNode).datum();
			if(opts.DEBUG) {
				console.log(opt);
			}

			var newdataset;
			if(opt === 'settings') {
				if(typeof opts.edit === 'function') {
					opts.edit(opts, d);
				} else {
					openEditDialog(opts, d);
				}
			} else if(opt === 'delete') {
				newdataset = ptree.copy_dataset(pedcache.current(opts));
				function onDone(opts, dataset) {
					// assign new dataset and rebuild pedigree
					opts.dataset = dataset;
					ptree.rebuild(opts);
				}
				ptree.delete_node_dataset(newdataset, d.data, opts, onDone);
			} else if(opt === 'addparents') {
				newdataset = ptree.copy_dataset(pedcache.current(opts));
				opts.dataset = newdataset;
				ptree.addparents(opts, newdataset, d.data.name);
				ptree.rebuild(opts);
			} else if(opt === 'addpartner') {
				newdataset = ptree.copy_dataset(pedcache.current(opts));
				ptree.addpartner(opts, newdataset, d.data.name);
				opts.dataset = newdataset;
				ptree.rebuild(opts);
			}
			// trigger fhChange event
			$(document).trigger('fhChange', [opts]);
		});

		// other mouse events
		var highlight = [];

		node.filter(function (d) { return !d.data.hidden; })
		.on("click", function (d) {
			if (d3.event.ctrlKey) {
				if(highlight.indexOf(d) == -1)
					highlight.push(d);
				else
					highlight.splice(highlight.indexOf(d), 1);
			} else
				highlight = [d];

			if('nodeclick' in opts) {
				opts.nodeclick(d.data);
				d3.selectAll(".indi_rect").style("opacity", 0);
				d3.selectAll('.indi_rect').filter(function(d) {return highlight.indexOf(d) != -1;}).style("opacity", 0.5);
			}
     	})
		.on("mouseover", function(d){
			d3.event.stopPropagation();
			last_mouseover = d;
			if(dragging) {
				if(dragging.data.name !== last_mouseover.data.name &&
				   dragging.data.sex !== last_mouseover.data.sex) {
					d3.select(this).select('rect').style("opacity", 0.2);
				}
				return;
			}
			d3.select(this).select('rect').style("opacity", 0.2);
			d3.select(this).selectAll('.addchild, .addsibling, .addpartner, .addparents, .delete, .settings').style("opacity", 1);
			d3.select(this).selectAll('.indi_details').style("opacity", 0);
			setLineDragPosition(opts.symbol_size-10, 0, opts.symbol_size-2, 0, d.x+","+(d.y+2));
		})
		.on("mouseout", function(d){
			if(dragging)
				return;

			d3.select(this).selectAll('.addchild, .addsibling, .addpartner, .addparents, .delete, .settings').style("opacity", 0);
			if(highlight.indexOf(d) == -1)
				d3.select(this).select('rect').style("opacity", 0);
			d3.select(this).selectAll('.indi_details').style("opacity", 1);
			// hide popup if it looks like the mouse is moving north
	        if(d3.mouse(this)[1] < 0.8*opts.symbol_size)
	        	d3.selectAll('.popup_selection').style("opacity", 0);
	        if(!dragging) {
	        	// hide popup if it looks like the mouse is moving north, south or west
	        	if(Math.abs(d3.mouse(this)[1]) > 0.25*opts.symbol_size ||
	        	   Math.abs(d3.mouse(this)[1]) < -0.25*opts.symbol_size ||
	        	   d3.mouse(this)[0] < 0.2*opts.symbol_size){
	        		setLineDragPosition(0, 0, 0, 0);
	        	}
	        }
		});
	};

	// drag line between nodes to create partners
	function drag_handle(opts) {
		var line_drag_selection = d3.select('.diagram');
		var dline = line_drag_selection.append("line").attr("class", 'line_drag_selection')
	        .attr("stroke-width", 6)
	        .style("stroke-dasharray", ("2, 1"))
	        .attr("stroke","black")
	        .call(d3.drag()
	                .on("start", dragstart)
	                .on("drag", drag)
	                .on("end", dragstop));
		dline.append("svg:title").text("drag to create consanguineous partners");

		setLineDragPosition(0, 0, 0, 0);

		function dragstart(d) {
			d3.event.sourceEvent.stopPropagation();
			dragging = last_mouseover;
			d3.selectAll('.line_drag_selection')
				.attr("stroke","darkred");
		}

		function dragstop(d) {
			if(last_mouseover &&
			   dragging.data.name !== last_mouseover.data.name &&
			   dragging.data.sex  !== last_mouseover.data.sex) {
				// make partners
				var child = {"name": ptree.makeid(4), "sex": 'U',
					     "mother": (dragging.data.sex === 'F' ? dragging.data.name : last_mouseover.data.name),
				         "father": (dragging.data.sex === 'F' ? last_mouseover.data.name : dragging.data.name)};
				newdataset = ptree.copy_dataset(opts.dataset);
				opts.dataset = newdataset;

				var idx = pedigree_util.getIdxByName(opts.dataset, dragging.data.name)+1;
				opts.dataset.splice(idx, 0, child);
				ptree.rebuild(opts);
			}
			setLineDragPosition(0, 0, 0, 0);
			d3.selectAll('.line_drag_selection')
				.attr("stroke","black");
			dragging = undefined;
			return;
		}

		function drag(d) {
			d3.event.sourceEvent.stopPropagation();
			var dx = d3.event.dx;
			var dy = d3.event.dy;
            var xnew = parseFloat(d3.select(this).attr('x2'))+ dx;
            var ynew = parseFloat(d3.select(this).attr('y2'))+ dy;
            setLineDragPosition(opts.symbol_size-10, 0, xnew, ynew);
		}
	}

	function setLineDragPosition(x1, y1, x2, y2, translate) {
		if(translate)
			d3.selectAll('.line_drag_selection').attr("transform", "translate("+translate+")");
		d3.selectAll('.line_drag_selection')
	    	.attr("x1", x1)
	    	.attr("y1", y1)
	    	.attr("x2", x2)
	        .attr("y2", y2);
	}

	function capitaliseFirstLetter(string) {
	    return string.charAt(0).toUpperCase() + string.slice(1);
	}

    // if opt.edit is set true (rather than given a function) this is called to edit node attributes
    function openEditDialog(opts, d) {
		$('#node_properties').dialog({
		    autoOpen: false,
		    title: d.data.display_name,
		    width: ($(window).width() > 400 ? 450 : $(window).width()- 30)
		});

		var table = "<table id='person_details' class='table'>";

		table += "<tr><td style='text-align:right'>Unique ID</td><td><input class='form-control' type='text' id='id_name' name='name' value="+
		(d.data.name ? d.data.name : "")+"></td></tr>";
		table += "<tr><td style='text-align:right'>Name</td><td><input class='form-control' type='text' id='id_display_name' name='display_name' value="+
				(d.data.display_name ? d.data.display_name : "")+"></td></tr>";

		table += "<tr><td style='text-align:right'>Age</td><td><input class='form-control' type='number' id='id_age' min='0' max='120' name='age' style='width:7em' value="+
				(d.data.age ? d.data.age : "")+"></td></tr>";

		table += "<tr><td style='text-align:right'>Year Of Birth</td><td><input class='form-control' type='number' id='id_yob' min='1900' max='2050' name='yob' style='width:7em' value="+
			(d.data.yob ? d.data.yob : "")+"></td></tr>";

		table += '<tr><td colspan="2" id="id_sex">' +
				 '<label class="radio-inline"><input type="radio" name="sex" value="M" '+(d.data.sex === 'M' ? "checked" : "")+'>Male</label>' +
				 '<label class="radio-inline"><input type="radio" name="sex" value="F" '+(d.data.sex === 'F' ? "checked" : "")+'>Female</label>' +
				 '<label class="radio-inline"><input type="radio" name="sex" value="U">Unknown</label>' +
				 '</td></tr>';

		// alive status = 0; dead status = 1
		table += '<tr><td colspan="2" id="id_status">' +
				 '<label class="checkbox-inline"><input type="radio" name="status" value="0" '+(d.data.status === 0 ? "checked" : "")+'>&thinsp;Alive</label>' +
				 '<label class="checkbox-inline"><input type="radio" name="status" value="1" '+(d.data.status === 1 ? "checked" : "")+'>&thinsp;Deceased</label>' +
				 '</td></tr>';
		$("#id_status input[value='"+d.data.status+"']").prop('checked', true);

		// switches
		var switches = ["adopted_in", "adopted_out", "miscarriage", "stillbirth", "termination"];
		table += '<tr><td colspan="2"><strong>Reproduction:</strong></td></tr>';
		table += '<tr><td colspan="2">';
		for(var iswitch=0; iswitch<switches.length; iswitch++){
			var attr = switches[iswitch];
			if(iswitch === 2)
				table += '</td></tr><tr><td colspan="2">';
			table +=
			 '<label class="checkbox-inline"><input type="checkbox" id="id_'+attr +
			    '" name="'+attr+'" value="0" '+(d.data[attr] ? "checked" : "")+'>&thinsp;' +
			    capitaliseFirstLetter(attr.replace('_', ' '))+'</label>'
		}
		table += '</td></tr>';

		//
		var exclude = ["children", "name", "parent_node", "top_level", "id", "noparents",
			           "level", "age", "sex", "status", "display_name", "mother", "father",
			           "yob", "mztwin", "dztwin"];
		$.merge(exclude, switches);
		table += '<tr><td colspan="2"><strong>Age of Diagnosis:</strong></td></tr>';
		$.each(opts.diseases, function(k, v) {
			exclude.push(v.type+"_diagnosis_age");

			var disease_colour = '&thinsp;<span style="padding-left:5px;background:'+opts.diseases[k].colour+'"></span>';
			var diagnosis_age = d.data[v.type + "_diagnosis_age"];

			table += "<tr><td style='text-align:right'>"+capitaliseFirstLetter(v.type.replace("_", " "))+
						disease_colour+"&nbsp;</td><td>" +
						"<input class='form-control' id='id_" +
						v.type + "_diagnosis_age_0' max='110' min='0' name='" +
						v.type + "_diagnosis_age_0' style='width:5em' type='number' value='" +
						(diagnosis_age !== undefined ? diagnosis_age : "") +"'></td></tr>";
		});

		table += '<tr><td colspan="2" style="line-height:1px;"></td></tr>';
		$.each(d.data, function(k, v) {
			if($.inArray(k, exclude) == -1) {
				var kk = capitaliseFirstLetter(k);
				if(v === true || v === false) {
					table += "<tr><td style='text-align:right'>"+kk+"&nbsp;</td><td><input type='checkbox' id='id_" + k + "' name='" +
							k+"' value="+v+" "+(v ? "checked" : "")+"></td></tr>";
				} else if(k.length > 0){
					table += "<tr><td style='text-align:right'>"+kk+"&nbsp;</td><td><input type='text' id='id_" +
							k+"' name='"+k+"' value="+v+"></td></tr>";
				}
			}
	    });
		table += "</table>";

		$('#node_properties').html(table);
		$('#node_properties').dialog('open');

		//$('#id_name').closest('tr').toggle();
		$('#node_properties input[type=radio], #node_properties input[type=checkbox], #node_properties input[type=text], #node_properties input[type=number]').change(function() {
	    	pedigree_form.save(opts);
	    });
		pedigree_form.update(opts);
		return;
    }

}(window.widgets = window.widgets || {}, jQuery));