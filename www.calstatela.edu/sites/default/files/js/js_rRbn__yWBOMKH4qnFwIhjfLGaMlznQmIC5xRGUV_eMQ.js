(function ($) {

Drupal.jQueryUiFilter = Drupal.jQueryUiFilter || {}

/**
 * Custom hash change event handling
 */
var _currentHash = location.hash;
Drupal.jQueryUiFilter.hashChange = function(func) {
  // Handle URL anchor change event in js
  // http://stackoverflow.com/questions/2161906/handle-url-anchor-change-event-in-js
  if ('onhashchange' in window) {
    $(window).bind('hashchange', func);
  }
  else {
    window.setInterval(function () {
      if (location.hash != _currentHash) {
        _currentHash = location.hash;
        func();
      }
    }, 100);
  }
}


/**
 * Apply jQuery UI filter widget options as the global default options.
 */
Drupal.jQueryUiFilter.globalOptions = function(widgetType) {
  Drupal.jQueryUiFilter.cleanupOptions(jQuery.extend(
    $.ui[widgetType].prototype.options,
    Drupal.settings.jQueryUiFilter[widgetType + 'Options'],
    Drupal.jQueryUiFilter[widgetType + 'Options']
  ));
}

/**
 * Get jQuery UI filter widget options.
 */
Drupal.jQueryUiFilter.getOptions = function(widgetType, options) {
  return Drupal.jQueryUiFilter.cleanupOptions(jQuery.extend(
    {}, // Using an empty object insures that new object is created and returned.
    Drupal.settings.jQueryUiFilter[widgetType + 'Options'],
    Drupal.jQueryUiFilter[widgetType + 'Options'],
    options || {}
  ));
}

/**
 * Cleanup jQuery UI filter options by converting 'true' and 'false' strings to native JavaScript Boolean value.
 */
Drupal.jQueryUiFilter.cleanupOptions = function(options) {
  // jQuery UI options that are Booleans must be converted from integers booleans
  for (var name in options) {
    if (typeof(options[name]) == 'string' && options[name] == '') {
      delete options[name];
    }
    else if (options[name] == 'false') {
      options[name] = false;
    }
    else if (options[name] === 'true') {
      options[name] = true;
    }
    else if (name === 'position' && options[name].indexOf(',') != -1) {
      options[name] = options[name].split(/\s*,\s*/);
    }
    else if (typeof(options[name]) == 'object') {
      options[name] = Drupal.jQueryUiFilter.cleanupOptions(options[name]);
    }
  }
  return options;
}

})(jQuery);
;
// $Id: contentanalysis.js,v 1.1.2.7 2010/11/09 21:50:14 tomdude48 Exp $
var contentanalysis = contentanalysis || {};

(function ($, $$) {
	$.extend($$, {
		contentanalysisPrevAnalyzerTab: '',
		contentanalysisPrevReportTab: '',
		contentanalysisCurrentAnalyzerTab: '',
		contentanalysisCurrentReportTab: '',
		contentanalysisReportActiveTab: {},
		
		init: function() {
			$$.contentanalysis_contentanalysisui();
		},
		
		contentanalysis_contentanalysisui: function() {
		    if($('#modalContent div.analyzers h3.analyzer').size() > 0) {
		        $$.contentanalysis_show_analyzer_tab($('div.analyzers h3.analyzer').get(0));
		        $('div.analyzers h3.analyzer').mousedown(function () {
		        	$$.contentanalysis_show_analyzer_tab(this);
		        }) 
		        $('h3.contentanalysis-report-tab').mousedown(function () { 
		        	$$.contentanalysis_show_report_tab(this);
		        })
		    }	
		},

		contentanalysis_back: function() {
			$$.contentanalysis_show_analyzer_tab(contentanalysisPrevAnalyzerTab);
		  //contentanalysis_show_report_tab(contentanalysisPrevReportTab);
		},

		contentanalysis_show_analyzer_tab: function (theTab){
		  $('div.analysis-results div.analyzer-analysis:eq(' + $('.analyzers h3.analyzer').index(theTab) + ')').children('.content-analysis-tab:first').addClass('active');
		  $('div.analysis-results div.analyzer-analysis').hide();
		  $('.analyzers h3.analyzer').removeClass('active');
		  $(theTab).addClass('active');
		  $('div.analysis-results div.analyzer-analysis:eq(' + $('.analyzers h3.analyzer').index(theTab) + ')').show();
		  $('.content-analysis-results').hide();
		
		  var id = $(theTab).attr('id');
		  var e = id.split('-');
		  var analyzer = e[3];
		  
		  if($$.contentanalysisReportActiveTab[analyzer]) {
		    $$.contentanalysis_show_report_tab($('#contentanalysis-report-tab-' + analyzer + '-' + $$.contentanalysisReportActiveTab[analyzer]));
		  }
		  else {
		    $$.contentanalysis_show_report_tab($('#contentanalysis-report-tab-' + analyzer + '-0'));
		  }
		  $$.contentanalysisPrevAnalyzerTab = $$.contentanalysisCurrentAnalyzerTab;
		  $$.contentanalysisCurrentAnalyzerTab = theTab;  
		},

		contentanalysis_show_report_tab: function (theTab){
		  var id = $(theTab).attr('id');
		  var e = id.split('-');
		  $$.contentanalysisReportActiveTab[e[3]] = e[4];
		  $('h3.contentanalysis-report-tab').removeClass('active');  
		  $(theTab).addClass('active');
		  $('.contentanalysis-results-section').hide();
		
		  var tabs = $("#contentanalysis-report-tabs-" + e[3]);
		  //tabs.css('border','2px solid red');
		  var pos = $("#contentanalysis-report-tabs-" + e[3]).position(); 
		  var offset = $("#contentanalysis-report-tabs-" + e[3]).offset(); 
		  var height = tabs.height();
		  var top = (pos.top+height)+"px";
		  var left = (pos.left)+"px";
		  
		  var sec_id = id.replace('tab', 'results');
		  var result_id = sec_id.replace('-'+e[4],'')
		  //$('#' + result_id).css({'top': top, 'left': left}); 
		  $('#' + result_id).css('top', top); 
		  //$('#' + result_id).css('border', '2px solid green'); 
		  $('#' + sec_id).show();
		//alert("pos.left="+pos.left+",pos.top="+pos.top+",offset.left="+offset.left+",offset.top="+offset.top);
		  $$.contentanalysisPrevReportTab = $$.contentanalysisCurrentReportTab;
		  $$.contentanalysisCurrentReportTab = theTab; 
		},

		// called from inline Analyze content button
		contentanalysis_inline_analysis: function() {
		  Drupal.settings.contentanalysis.display_dialog = 0;
		  Drupal.settings.contentanalysis.display_inline = 1;
		  //$('#contentanalysis-ininline-analysis-button').after('<span class="throbber">Loading...</span>');
		  //$('#contentanalysis-ininline-analysis-button').after(Drupal.settings.contentanalysis.throbber);
		  $('#contentanalysis-buttons').after('<div class="ahah-progress ahah-progress-throbber"><div class="throbber">&nbsp;</div><div class="message">' + Drupal.t('Analyzing...') + '</div></div>');
		  $$.contentanalysis_analyze();
		},

		// called from inline Analyze content button
		contentanalysis_dialog_analysis: function() {
		  Drupal.settings.contentanalysis.display_dialog = 1;
		  Drupal.settings.contentanalysis.display_inline = 0;
		  $$.contentanalysis_analyze();
		},

		// called from inline Analyze content button
		contentanalysis_full_analysis: function() {
		  Drupal.settings.contentanalysis.display_dialog = 1;
		  Drupal.settings.contentanalysis.display_inline = 1;
		  
		  $$.contentanalysis_analyze();
		},

		// called from inline Analyze content button
		contentanalysis_refresh_analysis: function(analyzer) {
		  Drupal.settings.contentanalysis.display_dialog = 0;
		  Drupal.settings.contentanalysis.display_inline = 1;
		  //$('.contentanalysis-refresh-link-' + analyzer).replaceWith('<span class="throbber">Loading...</span>');
		  $('.contentanalysis-refresh-link-' + analyzer).replaceWith('<div class="ahah-progress ahah-progress-throbber"><div class="throbber">&nbsp;</div></div>');
		  $$.contentanalysis_analyze(analyzer);
		},

		contentanalysis_analyze: function(analyzer_override) {
		  // if TinyMCE is used, turn off and on to save body text to textarea
		  var data = { 
		    'nid': -1,
		    'node_type': -1,
		    'source': -1,
		    'analyzers':-1,
		    'title': -1, 
		    'body': -1,
		    'body_summary': -1,
		    'page_title':-1, 
		    'meta_title':-1,
		    'meta_keywords':-1, 
		    'meta_description':-1,
		    'path_alias': -1,
		    'path_pathauto': -1,
		    'url': -1,
		    'page': -1,
		    'body_input_filter': -1,
		    'hidden': -1,    
		    'code': Drupal.settings.contentanalysis.code,
		    'action': -1
		  };
		  if(analyzer_override) {
		    data.action = 'refresh';
		  }
		  if ($('#contentanalysis-page-analyzer-form').html()) {
		    data.source = 'admin-form';
		    data.body = $('[name=input]').val()
		    data.nid = $('[name=input_nid]').val()
		    data.url = $('[name=input_url]').val()
		    if(data.body == '') {
		      data.body = -1;
		    }
		    if(data.nid == '') {
		      data.nid = -1;
		    }
		    if(data.url == '') {
		      data.url = -1;
		    }    
		  } else if ($('.node-form').html()) {
		    data.source = 'node-edit-form';
		    // Turn off TinyMCE if enabled
		    if(typeof tinyMCE == 'object') {
		    	tinyMCE.get('edit-body-und-0-value').hide();
		    }
		    // Turn off CKEditor if any.
		    var ckeditor = false;
		    if ($('#cke_edit-body-und-0-value').html()) {
		      $('#wysiwyg-toggle-edit-body-und-0-value').click();
		      ckeditor = true;
		    }
		
		    data.title = $('#edit-title').val();
		    data.body = $('#edit-body-und-0-value').val();
		    if ($('#edit-body-und-0-summary').val() != null) {
		      data.body_summary = $('#edit-body-und-0-summary').val();
		    } 
		    data.nid = Drupal.settings.contentanalysis.nid
		    data.node_type = Drupal.settings.contentanalysis.node_type
		    data.body_input_filter = $("select[name='body[und][0][format]'] option:selected").val();
		    
		    if ($('#edit-page-title').val() != null) {
		      data.page_title = $('#edit-page-title').val();
		    }    
		    // check if metatag module fields exist
		    if ($('#edit-metatags-title-value').val() != null) {
		      data.meta_title = $('#edit-metatags-title-value').val();
		    }
		    if ($('#edit-metatags-keywords-value').val() != null) {
		      data.meta_keywords = $('#edit-metatags-keywords-value').val();
		    }
		    if ($('#edit-metatags-description-value').val() != null) {
		      data.meta_description = $('#edit-metatags-description-value').val();
		    }
		    if ($('#edit-path-alias').val() != null) {
		      data.url = window.location.host + Drupal.settings.contentanalysis.base_path + $('#edit-path-alias').val();
		      data.path_alias = $('#edit-path-alias').val();
		    }
		    if ($("input[name='path[pathauto]']:checked").val() != null) {
		    	data.path_pathauto = 1;
		    }
		    // Turn back on tinyMCE
		    if(typeof tinyMCE == 'object') {
		    	tinyMCE.get('edit-body-und-0-value').show();
		    }	
		    // Turn back on CKEditor if needed.
		    if (ckeditor) {
		      $('#wysiwyg-toggle-edit-body-und-0-value').click();
		    }
		
		  } else {
		    data.source = 'page-link';
		    data.page = $('html').html()  
		    data.url = window.location.href
		  }
		  if(Drupal.settings.contentanalysis.hidden != null) {
		    data.hidden = Drupal.settings.contentanalysis.hidden;
		  }
		  
		  //alert('data.nid ' + data.nid)
		  var analyzers_arr = new Array();
		  if(analyzer_override) {
		    data.analyzers = analyzer_override;
		    analyzers_arr[0] = data.analyzers; 
		  }
		  else if($('#contentanalysis_analyzers_override input').val() != null) {    
		    data.analyzers = $('#contentanalysis_analyzers_override input').val();
		    analyzers_arr[0] = data.analyzers;
		  } 
		  else {
		    var i = 0;
		    $('#contentanalysis_analyzers .form-checkbox:checked').each ( function () {  
		      var expr = new RegExp(/\[[^\]]+\]/);
		      analyzers_arr[i] = expr.exec($(this).attr('name'))[0].replace(']', '').replace('[','');    
		      i++;
		    })
		    data.analyzers = analyzers_arr.join(',');
		  }
		  // call contentanalysis_data for enabed analyzers
		  for(var i in analyzers_arr) {
		    var aid = analyzers_arr[i];
		    var module = Drupal.settings.contentanalysis.analyzer_modules[aid].module;
		    if (eval('typeof ' + module + '_contentanalysis_data == "function"')) {
		      d = eval(module + '_contentanalysis_data')(aid, data);
		      for(var k in d) {
		        eval('data.ao_'+aid+'_'+k+' = "'+d[k]+'";');
		      }
		    }
		  }  
		  $('#contentanalysis-buttons').hide(); 
		  $.ajax({
		    type: 'POST',
		    url: Drupal.settings.contentanalysis.analyze_callback,
		    data: data,
		    dataType: 'json',
		    success: function(data, textStatus) {
		      analyzers_arr = data.inputs['analyzers'].split(",");
		      if(Drupal.settings.contentanalysis.display_dialog == 1) {
		        $('#analysis-modal').append(data.main['output']);
		        $('#analysis-modal .progress').remove();
		        //Drupal.behaviors.contentanalysisui();
		        $$.contentanalysis_contentanalysisui()
		      }
		      // display inline if enabled
		      if(Drupal.settings.contentanalysis.display_inline == 1) {
		        if(data.inputs['action'] == 'refresh') {
		          //if($('.contentanalysis_section_analysis').length > 0)
		          for(i in analyzers_arr) {
		            aid = analyzers_arr[i];
		            $('.contentanalysis-report-'+aid+'-page_title').replaceWith(data.page_title['output']);
		            $('.contentanalysis-report-'+aid+'-body').replaceWith(data.body['output']);
		            $('.contentanalysis-report-'+aid+'-meta_description').replaceWith(data.meta_description['output']);
		            $('.contentanalysis-report-'+aid+'-meta_keywords').replaceWith(data.meta_keywords['output']);
		          }
		        }
		        else {
		          var show_title = true;
		          if($('.form-item-metatags-title-value').length > 0) {
		            $('.form-item-metatags-title-value > .contentanalysis_section_analysis').remove();
		            $('.form-item-metatags-title-value').append(data.page_title['output']);
		            // check if metatag-title contains [node:title] token
		            if ($('#edit-metatags-title-value').val() != null) {
		              var meta_title = $('#edit-metatags-title-value').val();
		              if(meta_title.indexOf("[node:title]") == -1) {
		            	//show_title = false;
		              }
		            }
		          } 
		          if (show_title) {
		            $('.form-item-title > .contentanalysis_section_analysis').remove();
		            $('.form-item-title').append(data.page_title['output']);				
		          }
		    
		          $('#edit-body > .contentanalysis_section_analysis').remove();
		          $('#edit-body').append(data.body['output']);
		          // check newer nodewords format
		          if(($('.form-item-metatags-description-value').length > 0) && data.meta_description != null) {
		            $('.form-item-metatags-description-value > .contentanalysis_section_analysis').remove();
		            $('.form-item-metatags-description-value').append(data.meta_description['output']);
		          }
		          
		          if(($('.form-item-metatags-keywords-value').length > 0) && data.meta_keywords != null) {
		            $('.form-item-metatags-keywords-value > .contentanalysis_section_analysis').remove();
		            $('.form-item-metatags-keywords-value').append(data.meta_keywords['output']);
		          }
		        }
		        for(var i in analyzers_arr) {
		          var aid = analyzers_arr[i];
		          h = '<a href="#" class="contentanalysis-refresh-link-' + aid + '" onclick="contentanalysis.contentanalysis_refresh_analysis(\'' + aid + '\'); return false;">';
		          h += '<img src="' + Drupal.settings.contentanalysis.path_to_module + '/icons/refresh.png" alt="refresh" />';
		          h += '</a>';
		          $('.contentanalysis-report-' + aid + ' label').append(h);
		        } 
					}      
		      // call any modules post analysis hooks      
		      for(var i in analyzers_arr) {
		        var aid = analyzers_arr[i];        
		        var module = Drupal.settings.contentanalysis.analyzer_modules[aid].module;     
		        if (eval('typeof ' + module + '_contentanalysis_analysis_success == "function"')) {
		          eval(module + '_contentanalysis_analysis_success')(aid, data);
		        }
		      } 
		      if(typeof Drupal.behaviors.collapse == 'function') {
		    	  Drupal.behaviors.collapse();  
		      }
		      $('.ahah-progress-throbber').remove();
		      $('#contentanalysis-buttons').show();
		    },
		    error: function(xhr, status) {
		      alert(xhr.responseText.toString());
		      $('.ahah-progress-throbber').remove();
		      $('#contentanalysis-buttons').show();
		    }
		  });
		  return false;	
		}
	});	

	Drupal.behaviors.contentanalysisui = {
	  attach: function (context, settings) {
		$$.init();
	  }
	};
	
	Sliders = {};
	
	Sliders.changeHandle = function(e,ui) {
	  var id = jQuery(ui.handle).parents('div.slider-widget-container').attr('id');
	  if (typeof(ui.values) != 'undefined') {
	    jQuery.each(ui.values, function(i,val) {
	      jQuery("#"+id+"_value_"+i).val(val);
	      jQuery("#"+id+"_nr_"+i).text(val);
	    });
	  } else {
	    jQuery("#"+id+"_value_0").val(ui.value);
	    jQuery("#"+id+"_nr_0").text(ui.value);
	  }
	};

})(jQuery, contentanalysis);
;
var contentoptimizer_contentanalysis_data = function(aid) {		
  data = new Array();	
  data['keyword'] = document.getElementById('edit-seo-keyword').value;	
  return data;
};
(function ($) {

Drupal.behaviors.csulaCustom = {
  attach: function (context) {
    Drupal.behaviors.csulaCustom.hash_change();
    if ($('body').hasClass('page-group-calendar-event-date')) {
	    //$("#edit-group-events option[value='All']").remove();

      var group_event = '0';
      var cat = 'All';
      if ($('#edit-group-events option:selected').val() !== '') {
        group_event = $('#edit-group-events option:selected').val();
      }
      if ($('#edit-field-event-category-tid option:selected').val() !== '') {
        cat = $('#edit-field-event-category-tid option:selected').val();
      }
        var href_link =  $('.tabs-primary__tab a.tabs-primary__tab-link').attr('href');
      $(".tabs-primary__tab a.tabs-primary__tab-link").each(function() {
        var _href = $(this).attr("href");
        $(this).attr("href", _href + '?&group_events=' + group_event +'&field_event_category_tid=' + cat);
      });

      var selected = $('#edit-group-events option:selected').text();
      $('#content .view-header .date-heading-p').once().before('<h1><a  style="color: #000;" href="/node/' + group_event + '">' + selected + ' Calendar</a></h1>');
    }
    // Requesting Web Space
    $('input[name*="the-webspace-will-be-used-for"]').change(function() {
      if($(this).val() == 2){
         $('.node-362901 .form-submit').addClass('hidden');
      }
      else {
        if($('.node-362901 .form-submit').hasClass('hidden')) {
          $('.node-362901 .form-submit').removeClass('hidden');
        }
      }
    });
  },
  hash_change: function() {
    if (window.location.hash && window.location.hash !== '#') {
      var hash = window.location.hash;
      var parts = hash.split("_");
      var tab_focus = '';
      var scroll_focus = '';
      var focus = '';

      if (parts.length) {
        hash = parts[0];
        focus = parts[1];

        if ($("#" + focus).length) {
          scroll_focus = $("#" + focus).closest('.field-type-field-collection');
        }
      }

      if ($(hash).length) {
        tab_focus = $(hash).closest('.horizontal-tabs-pane');
      }

      if (tab_focus.length) {
        tab_focus.data('horizontalTab').focus();

        if (scroll_focus.length) {
          $('html, body').animate({
              scrollTop: scroll_focus.offset().top
          }, 500);
        }
      }
    }
  }
}
$(window).bind('hashchange', Drupal.behaviors.csulaCustom.hash_change);
})(jQuery);
;
(function ($) {

  Drupal.csula_menu = {
    menu_created: false,
    responsive_width: 959,
    
    mobile_menu: function () {
      var mobile_menu = $('.mobile-menu-popout');
      var wrapper = $('.menu-block-wrapper', mobile_menu);
      
      if (Drupal.csula_menu.menu_created) {
        if ($(window).width() >= Drupal.csula_menu.responsive_width) {
          mobile_menu.hide();
        }
        
        return;
      }
      
      var mobile_menu_link = $('.mobile-menu-popout-link').click(function() {
        // Show the first level of links
        mobile_menu.toggle();
        $('ul.menu', mobile_menu).removeClass('menu-show');
        $('ul.menu', mobile_menu).eq(0).addClass('menu-show');
        wrapper.css('left', 0);
        return false;
      });
      
      // add back button
      mobile_menu.find(".expanded").each(function () {
        $(this).children("ul").prepend('<li class="title"><a href="#" class="back">Back</a> <a href="' + $(this).children("a").attr('href') + '"><span>' + $(this).children("a").text() + "</span></a></li>");
      });
      
/*
      // make page titles open the menu
      var current_page = $('ul.menu a.active', mobile_menu).eq(0);
      if (current_page[0]) {
        var parents = current_page.parents('ul.menu');
        if (parents.size() - 1 == 0) {
          // we need to add the section rather than the top level item, so find where the
          // title item is then use that to get the menu parents.
          parents = current_page.closest('li').children('ul.menu').children('li.title').parents('ul.menu');
        }
        $('h1#page-title').click(function() {
          if ($(window).width() > Drupal.csula_menu.responsive_width) {
            $(this).css('cursor', '');
            mobile_menu.hide();
            return;
          }
          $(this).css('cursor', 'pointer');
          var depth = parents.size() - 1;
          mobile_menu.show();
          $('ul.menu', mobile_menu).removeClass('menu-show');
          parents.addClass('menu-show');
          wrapper.css('left', (-1 * depth * Drupal.csula_menu.responsive_width) + 'px');
        }).css('cursor', 'pointer');
      }
      
      // hide the li for no-mobile items
      $.each($('a.no-mobile', mobile_menu), function() {
        $(this).closest('li').hide();
      });
*/
      
      $('ul.menu a', mobile_menu).click(function(event) {
        // make menus open sub items
        var position = wrapper.css("left");
        position = parseInt(position.replace("px", ""));
        var next_position = 0;
        
        var parent = $(this).closest('li');
        if (parent.hasClass('expanded') && $('ul.menu', parent).eq(0).size() > 0) {
          event.preventDefault();
          
          var current_width = $(window).width();
          next_position = position - current_width;
          $('ul.menu', parent).css('left', current_width);
          wrapper.stop().animate({
            left: next_position
          }, 250, function () {
            $('ul.menu', parent).eq(0).addClass('menu-show');
          });
          
          return false;
        }
        else if (parent.hasClass('title') && $(this).hasClass('back')) {
          // add back button functionality
          var current_width = $(window).width();
          parent.closest('ul.menu').removeClass('menu-show');
          wrapper.stop().animate({
            left: position + current_width
          }, 250, function () {
          });
          return false;
        }
      });
      
      Drupal.csula_menu.menu_created = true;
    }
  }

  Drupal.behaviors.csula_menu = {
    attach: function (context, settings) {
      if ($(window).width() <= Drupal.csula_menu.responsive_width) {
        Drupal.csula_menu.mobile_menu();
      }
    }
  }
  
  $(window).resize(function() {
    Drupal.csula_menu.mobile_menu();
  });
})(jQuery);;
