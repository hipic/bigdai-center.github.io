(function ($, Drupal, window, document, undefined) {
    Drupal.behaviors.kwall_slide_menu = {
        attach: function(context, settings) {

            var navMenuID = Drupal.settings.kwall_slide_menu.navMenuID;
            var navSearchMenuID = Drupal.settings.kwall_slide_menu.navSearchMenuID;
            var $navMenu = $('#' + navMenuID);
            var $searchMenu = $('#' + navSearchMenuID);

            $navMenu.once('slideMenu', function() {
                // initializati on
                var ESCAPE_CODE = 27;

                var $navAllLinks = $navMenu.find('a');
                var $navTopLevelLinks = $navAllLinks.not('ul.slide-nav-menu a');
                var $searchInputs = $navMenu.find('input:not([type="hidden"]), button');

                var $searchMenuAllLinks = $searchMenu.find('a');
                var $searchMenuInputs = $searchMenu.find('input:not([type="hidden"]), button');

                var menuOpenSelector = Drupal.settings.kwall_slide_menu.menuOpenSelector;
                var searchOpenSelector = Drupal.settings.kwall_slide_menu.searchOpenSelector;
                var $openButtons = $(menuOpenSelector + ',' + searchOpenSelector); // the buttons that open the nav and search
                var $navOpenButton = $(menuOpenSelector); // the buttons that open the nav
                var $searchOpenButton = $(searchOpenSelector); // the buttons that open the search
                var $clickedOpenButton = null; // keep track of which button opened the nav (menu or search link)

                function closeMenu() {
                    $navMenu.removeClass('active').attr('aria-hidden');
                    $searchMenu.removeClass('active').attr('aria-hidden');
                    $(menuOpenSelector).attr('aria-label', 'Main Menu');
                    $(searchOpenSelector).attr('aria-label', 'Search and Quick Links Menu');
                    // Take all nav links and search inputs out of tab order
                    $navAllLinks.attr('tabIndex', '-1');
                    $searchInputs.attr('tabIndex', '-1');
                    $searchMenuAllLinks.attr('tabIndex', '-1');
                    $searchMenuInputs.attr('tabIndex', '-1');
                    /*
                     if ($clickedOpenButton) {
                     // Set focus back to the button that opened the nav
                     $clickedOpenButton.addClass('just-closed');
                     $clickedOpenButton.focus().removeClass('just-closed');
                     }
                     $('.slide-menu-close-button').removeClass('tabbed-from-last');
                     */
                }

                // Initialize to closed state
                $openButtons.attr({'aria-controls': navMenuID, 'aria-haspopup': 'true'});
                closeMenu();
                $navMenu.find('ul.slide-nav-menu').attr('aria-hidden', 'true');

                function openNavMenu() {
                    $navMenu.removeClass('closed').addClass('active').removeAttr('aria-hidden');
                    $(menuOpenSelector).attr('aria-label', 'Main Menu');
                    $(searchOpenSelector).attr('aria-label', 'Search and Quick Links Menu');
                    // Add all nav links and search inputs back to tab order
                    $navTopLevelLinks.removeAttr('tabIndex');
                    $searchInputs.removeAttr('tabIndex');
                    $navMenu.find('input.form-search').focus();
                }

                function openSearchMenu() {
                    $searchMenu.removeClass('closed').addClass('active').removeAttr('aria-hidden');
                    $(menuOpenSelector).attr('aria-label', 'Main Menu');
                    $(searchOpenSelector).attr('aria-label', 'Search and Quick Links Menu');
                    // Add all nav links and search inputs back to tab order
                    $navTopLevelLinks.removeAttr('tabIndex');
                    $searchInputs.removeAttr('tabIndex');
                }

                $navMenu.bind("webkitTransitionEnd mozTransitionEnd msTransitionEnd oTransitionEnd transitionend", function() {
                    if ($navMenu.hasClass('active')) {
                        if ($clickedOpenButton.is(searchOpenSelector)) {
                            // if the search button was clicked, wait for CSS animation to finish and then set focus to search field
                            $('.kwall-slide-nav-search').focus();
                        }
                        else {
                            // otherwise set focus after timeout to the first link in the nav (which actually is the close nav link
                            //$navAllLinks.eq(0).focus();
                        }
                    }
                    else {
                        $navMenu.addClass('closed');
                    }
                }).children().bind("webkitTransitionEnd mozTransitionEnd msTransitionEnd oTransitionEnd transitionend", function(e) {
                    // prevent transitionend event from bubbling up
                    e.stopPropagation();
                    e.preventDefault();
                });

                $searchMenu.bind("webkitTransitionEnd mozTransitionEnd msTransitionEnd oTransitionEnd transitionend", function() {
                    if ($searchMenu.hasClass('active')) {
                        if ($clickedOpenButton.is(searchOpenSelector)) {
                            // if the search button was clicked, wait for CSS animation to finish and then set focus to search field
                            $('.kwall-slide-nav-search').focus();
                        }
                        else {
                            // otherwise set focus after timeout to the first link in the nav (which actually is the close nav link
                            //$navAllLinks.eq(0).focus();
                        }
                    }
                    else {
                        $searchMenu.addClass('closed');
                    }
                }).children().bind("webkitTransitionEnd mozTransitionEnd msTransitionEnd oTransitionEnd transitionend", function(e) {
                    // prevent transitionend event from bubbling up
                    e.stopPropagation();
                    e.preventDefault();
                });

                // Handle opening the nav
                $navOpenButton.click(function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    $clickedOpenButton = $(this);

                    openNavMenu();
                });

                // Handle opening the search
                $('.header-search-open-button.fa-search').attr('tabindex', '0');
                $searchOpenButton.click(function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    $clickedOpenButton = $(this);

                    openSearchMenu();
                    $searchMenu.find('input:focusable').first().focus();
                });

                /* window.prevFocus = $();
                 var prev_html = '';
                 $(window).keyup(function (e) {
                 var code = (e.keyCode ? e.keyCode : e.which);
                 $("#prev").html($("#prev").html() + prevFocus.text());
                 window.prevFocus = $(':focus');
                 prev_html = $("#prev").html();
                 if ((e.shiftKey && code == 9) || code == 16) { //shift+tab is pressed
                 if ($('.button-give-now a').is(":focus") && prev_html.indexOf('Cal State LA on YouTube') == -1) {  //go back from close button to quicklinks menu button
                 $searchOpenButton.focus();
                 }
                 if ($('#kwall-slide-in-nav-search-menu .social-media-links-footer li:last-child a').is(":focus")) { //go back from main menu to "Give Now" bottom
                 if (!$searchMenu.hasClass('active')) {
                 $('#prev').html('');
                 $('.button-give-now a').focus();
                 }
                 }
                 }
                 }); */



                jQuery(window).keyup(function (e) {
                    var code = (e.keyCode ? e.keyCode : e.which);
                    if ((e.shiftKey && code == 9) || code == 16) { //shift+tab is pressed

                        if ($navOpenButton.is(":focus")) {
                            if(!$navMenu.hasClass('closed')) {
                                $navMenu.find('.appended-items li:last-child a').focus();
                            }
                        }

                        if ($searchOpenButton.is(":focus")) {
                            if($searchMenu.hasClass('active')) {
                                $searchMenu.find('.social-media-links-footer li:last-child a').focus();
                            }

                        }

                    }
                });

                $searchOpenButton.focus(function () {
                    $searchOpenButton.keypress(function(e) {
                        var code = (e.keyCode ? e.keyCode : e.which);
                        if (code == 13 && !$searchMenu.hasClass('active') &&  !$searchOpenButton.hasClass('just-closed')) {
                            //for desktop open quicklinks menu, for mobile - mobile menu on click on search button
                            if ( $('#block-menu-block-7').is(':visible') ) {
                                $searchOpenButton.click();
                                $searchMenu.find('input:focusable').first().focus();
                            } else {
                                $navOpenButton.click();
                            }
                        } });
                });





                //hide submenu after tabbing on last element in quicklinks menu
                /* $('.kwall-slide-menu-overlay').focus(function () {
                 if($searchMenu.hasClass('active')) {
                 $searchMenu.removeClass('active');
                 }
                 $('.button-give-now a').focus();
                 });

                 //go to main menu after "Give now" button
                 $('.slide-menu-close-button').focus(function () {
                 $('#prev').html('');
                 if(!$searchMenu.hasClass('active')) {
                 $('#navigation li:first-child a').focus();
                 }

                 });  */


                //close quicklinks menu on focus on "Give now" button
                /* $('.button-give-now a').focus(function () {
                 if($searchMenu.hasClass('active')) {
                 $searchMenu.removeClass('active');
                 }
                 }); */




                // Handle closing the slide in with escape key
                $navMenu.attr('tabIndex', '-1').bind('keydown', function(event) {
                    if (event.which == ESCAPE_CODE) {
                        closeMenu();
                    }
                });

                // Handle closing quick links menu with escape key
                $searchMenu.attr('tabIndex', '-1').bind('keydown', function(event) {
                    if (event.which == ESCAPE_CODE) {
                        closeMenu();
                    }
                });

                // Handle closing the nav by clicking the close button or the overlay
                $navMenu.find('.slide-menu-close-button').click(function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    closeMenu();
                });

                $navMenu.siblings('.kwall-slide-menu-overlay').click(function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    closeMenu();
                });
                $searchMenu.find('.slide-menu-close-button').click(function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    closeMenu();
                });

                $searchMenu.siblings('.kwall-slide-menu-overlay').click(function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    closeMenu();
                });
            });
        }
    };

})(jQuery, Drupal, this, this.document);;
