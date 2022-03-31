/*
 * jQuery FlexSlider v2.6.3
 * Copyright 2012 WooThemes
 * Contributing Author: Tyler Smith
 */
;
(function ($) {

    var focused = true;

    //FlexSlider: Object Instance
    $.flexslider = function(el, options) {
        var slider = $(el);

        // making variables public
        slider.vars = $.extend({}, $.flexslider.defaults, options);

        var namespace = slider.vars.namespace,
            msGesture = window.navigator && window.navigator.msPointerEnabled && window.MSGesture,
            touch = (( "ontouchstart" in window ) || msGesture || window.DocumentTouch && document instanceof DocumentTouch) && slider.vars.touch,
            // depricating this idea, as devices are being released with both of these events
            eventType = "click touchend MSPointerUp keyup",
            watchedEvent = "",
            watchedEventClearTimer,
            vertical = slider.vars.direction === "vertical",
            reverse = slider.vars.reverse,
            carousel = (slider.vars.itemWidth > 0),
            fade = slider.vars.animation === "fade",
            asNav = slider.vars.asNavFor !== "",
            methods = {};

        // Store a reference to the slider object
        $.data(el, "flexslider", slider);

        // Private slider methods
        methods = {
            init: function() {
                slider.animating = false;
                // Get current slide and make sure it is a number
                slider.currentSlide = parseInt( ( slider.vars.startAt ? slider.vars.startAt : 0), 10 );
                if ( isNaN( slider.currentSlide ) ) { slider.currentSlide = 0; }
                slider.animatingTo = slider.currentSlide;
                slider.atEnd = (slider.currentSlide === 0 || slider.currentSlide === slider.last);
                slider.containerSelector = slider.vars.selector.substr(0,slider.vars.selector.search(' '));
                slider.slides = $(slider.vars.selector, slider);
                slider.container = $(slider.containerSelector, slider);
                slider.count = slider.slides.length;
                // SYNC:
                slider.syncExists = $(slider.vars.sync).length > 0;
                // SLIDE:
                if (slider.vars.animation === "slide") { slider.vars.animation = "swing"; }
                slider.prop = (vertical) ? "top" : "marginLeft";
                slider.args = {};
                // SLIDESHOW:
                slider.manualPause = false;
                slider.stopped = false;
                //PAUSE WHEN INVISIBLE
                slider.started = false;
                slider.startTimeout = null;
                // TOUCH/USECSS:
                slider.transitions = !slider.vars.video && !fade && slider.vars.useCSS && (function() {
                        var obj = document.createElement('div'),
                            props = ['perspectiveProperty', 'WebkitPerspective', 'MozPerspective', 'OPerspective', 'msPerspective'];
                        for (var i in props) {
                            if ( obj.style[ props[i] ] !== undefined ) {
                                slider.pfx = props[i].replace('Perspective','').toLowerCase();
                                slider.prop = "-" + slider.pfx + "-transform";
                                return true;
                            }
                        }
                        return false;
                    }());
                slider.ensureAnimationEnd = '';
                // CONTROLSCONTAINER:
                if (slider.vars.controlsContainer !== "") slider.controlsContainer = $(slider.vars.controlsContainer).length > 0 && $(slider.vars.controlsContainer);
                // MANUAL:
                if (slider.vars.manualControls !== "") slider.manualControls = $(slider.vars.manualControls).length > 0 && $(slider.vars.manualControls);

                // CUSTOM DIRECTION NAV:
                if (slider.vars.customDirectionNav !== "") slider.customDirectionNav = $(slider.vars.customDirectionNav).length === 2 && $(slider.vars.customDirectionNav);

                // RANDOMIZE:
                if (slider.vars.randomize) {
                    slider.slides.sort(function() { return (Math.round(Math.random())-0.5); });
                    slider.container.empty().append(slider.slides);
                }

                slider.doMath();

                // INIT
                slider.setup("init");

                // CONTROLNAV:
                if (slider.vars.controlNav) { methods.controlNav.setup(); }

                // DIRECTIONNAV:
                if (slider.vars.directionNav) { methods.directionNav.setup(); }

                // KEYBOARD:
                if (slider.vars.keyboard && ($(slider.containerSelector).length === 1 || slider.vars.multipleKeyboard)) {
                    $(document).bind('keyup', function(event) {
                        var keycode = event.keyCode;
                        if (!slider.animating && (keycode === 39 || keycode === 37)) {
                            var target = (keycode === 39) ? slider.getTarget('next') :
                                (keycode === 37) ? slider.getTarget('prev') : false;
                            slider.flexAnimate(target, slider.vars.pauseOnAction);
                        }
                    });
                }
                // MOUSEWHEEL:
                if (slider.vars.mousewheel) {
                    slider.bind('mousewheel', function(event, delta, deltaX, deltaY) {
                        event.preventDefault();
                        var target = (delta < 0) ? slider.getTarget('next') : slider.getTarget('prev');
                        slider.flexAnimate(target, slider.vars.pauseOnAction);
                    });
                }

                // PAUSEPLAY
                if (slider.vars.pausePlay) { methods.pausePlay.setup(); }

                //PAUSE WHEN INVISIBLE
                if (slider.vars.slideshow && slider.vars.pauseInvisible) { methods.pauseInvisible.init(); }

                // SLIDSESHOW
                if (slider.vars.slideshow) {
                    if (slider.vars.pauseOnHover) {
                        slider.hover(function() {
                            if (!slider.manualPlay && !slider.manualPause) { slider.pause(); }
                        }, function() {
                            if (!slider.manualPause && !slider.manualPlay && !slider.stopped) { slider.play(); }
                        });
                    }
                    // initialize animation
                    //If we're visible, or we don't use PageVisibility API
                    if(!slider.vars.pauseInvisible || !methods.pauseInvisible.isHidden()) {
                        (slider.vars.initDelay > 0) ? slider.startTimeout = setTimeout(slider.play, slider.vars.initDelay) : slider.play();
                    }
                }

                // ASNAV:
                if (asNav) { methods.asNav.setup(); }

                // TOUCH
                if (touch && slider.vars.touch) { methods.touch(); }

                // FADE&&SMOOTHHEIGHT || SLIDE:
                if (!fade || (fade && slider.vars.smoothHeight)) { $(window).bind("resize orientationchange focus", methods.resize); }

                slider.find("img").attr("draggable", "false");

                // API: start() Callback
                setTimeout(function(){
                    slider.vars.start(slider);
                }, 200);
            },
            asNav: {
                setup: function() {
                    slider.asNav = true;
                    slider.animatingTo = Math.floor(slider.currentSlide/slider.move);
                    slider.currentItem = slider.currentSlide;
                    slider.slides.removeClass(namespace + "active-slide").eq(slider.currentItem).addClass(namespace + "active-slide");
                    if(!msGesture){
                        slider.slides.on(eventType, function(e){
                            e.preventDefault();
                            var $slide = $(this),
                                target = $slide.index();
                            var posFromLeft = $slide.offset().left - $(slider).scrollLeft(); // Find position of slide relative to left of slider container
                            if( posFromLeft <= 0 && $slide.hasClass( namespace + 'active-slide' ) ) {
                                slider.flexAnimate(slider.getTarget("prev"), true);
                            } else if (!$(slider.vars.asNavFor).data('flexslider').animating && !$slide.hasClass(namespace + "active-slide")) {
                                slider.direction = (slider.currentItem < target) ? "next" : "prev";
                                slider.flexAnimate(target, slider.vars.pauseOnAction, false, true, true);
                            }
                        });
                    }else{
                        el._slider = slider;
                        slider.slides.each(function (){
                            var that = this;
                            that._gesture = new MSGesture();
                            that._gesture.target = that;
                            that.addEventListener("MSPointerDown", function (e){
                                e.preventDefault();
                                if(e.currentTarget._gesture) {
                                    e.currentTarget._gesture.addPointer(e.pointerId);
                                }
                            }, false);
                            that.addEventListener("MSGestureTap", function (e){
                                e.preventDefault();
                                var $slide = $(this),
                                    target = $slide.index();
                                if (!$(slider.vars.asNavFor).data('flexslider').animating && !$slide.hasClass('active')) {
                                    slider.direction = (slider.currentItem < target) ? "next" : "prev";
                                    slider.flexAnimate(target, slider.vars.pauseOnAction, false, true, true);
                                }
                            });
                        });
                    }
                }
            },
            controlNav: {
                setup: function() {
                    if (!slider.manualControls) {
                        methods.controlNav.setupPaging();
                    } else { // MANUALCONTROLS:
                        methods.controlNav.setupManual();
                    }
                },
                setupPaging: function() {
                    var type = (slider.vars.controlNav === "thumbnails") ? 'control-thumbs' : 'control-paging',
                        j = 1,
                        item,
                        slide;

                    slider.controlNavScaffold = $('<ol class="'+ namespace + 'control-nav ' + namespace + type + '"></ol>');

                    if (slider.pagingCount > 1) {
                        for (var i = 0; i < slider.pagingCount; i++) {
                            slide = slider.slides.eq(i);
                            if ( undefined === slide.attr( 'data-thumb-alt' ) ) { slide.attr( 'data-thumb-alt', '' ); }
                            var altText = ( '' !== slide.attr( 'data-thumb-alt' ) ) ? altText = ' alt="' + slide.attr( 'data-thumb-alt' ) + '"' : '';
                            item = (slider.vars.controlNav === "thumbnails") ? '<img src="' + slide.attr( 'data-thumb' ) + '"' + altText + '/>' : '<a href="#">' + j + '</a>';
                            if ( 'thumbnails' === slider.vars.controlNav && true === slider.vars.thumbCaptions ) {
                                var captn = slide.attr( 'data-thumbcaption' );
                                if ( '' !== captn && undefined !== captn ) { item += '<span class="' + namespace + 'caption">' + captn + '</span>'; }
                            }
                            slider.controlNavScaffold.append('<li>' + item + '</li>');
                            j++;
                        }
                    }

                    // CONTROLSCONTAINER:
                    (slider.controlsContainer) ? $(slider.controlsContainer).append(slider.controlNavScaffold) : slider.append(slider.controlNavScaffold);
                    methods.controlNav.set();

                    methods.controlNav.active();

                    slider.controlNavScaffold.delegate('a, img', eventType, function(event) {
                        event.preventDefault();

                        if (watchedEvent === "" || watchedEvent === event.type) {
                            var $this = $(this),
                                target = slider.controlNav.index($this);

                            if (!$this.hasClass(namespace + 'active')) {
                                slider.direction = (target > slider.currentSlide) ? "next" : "prev";
                                slider.flexAnimate(target, slider.vars.pauseOnAction);
                            }
                        }

                        // setup flags to prevent event duplication
                        if (watchedEvent === "") {
                            watchedEvent = event.type;
                        }
                        methods.setToClearWatchedEvent();

                    });
                },
                setupManual: function() {
                    slider.controlNav = slider.manualControls;
                    methods.controlNav.active();

                    slider.controlNav.bind(eventType, function(event) {
                        event.preventDefault();

                        if (watchedEvent === "" || watchedEvent === event.type) {
                            var $this = $(this),
                                target = slider.controlNav.index($this);

                            if (!$this.hasClass(namespace + 'active')) {
                                (target > slider.currentSlide) ? slider.direction = "next" : slider.direction = "prev";
                                slider.flexAnimate(target, slider.vars.pauseOnAction);
                            }
                        }

                        // setup flags to prevent event duplication
                        if (watchedEvent === "") {
                            watchedEvent = event.type;
                        }
                        methods.setToClearWatchedEvent();
                    });
                },
                set: function() {
                    var selector = (slider.vars.controlNav === "thumbnails") ? 'img' : 'a';
                    slider.controlNav = $('.' + namespace + 'control-nav li ' + selector, (slider.controlsContainer) ? slider.controlsContainer : slider);
                },
                active: function() {
                    slider.controlNav.removeClass(namespace + "active").eq(slider.animatingTo).addClass(namespace + "active");
                },
                update: function(action, pos) {
                    if (slider.pagingCount > 1 && action === "add") {
                        slider.controlNavScaffold.append($('<li><a href="#">' + slider.count + '</a></li>'));
                    } else if (slider.pagingCount === 1) {
                        slider.controlNavScaffold.find('li').remove();
                    } else {
                        slider.controlNav.eq(pos).closest('li').remove();
                    }
                    methods.controlNav.set();
                    (slider.pagingCount > 1 && slider.pagingCount !== slider.controlNav.length) ? slider.update(pos, action) : methods.controlNav.active();
                }
            },
            directionNav: {
                setup: function() {
                    var directionNavScaffold = $('<ul class="' + namespace + 'direction-nav"><li class="' + namespace + 'nav-prev"><a class="' + namespace + 'prev" href="#">' + slider.vars.prevText + '</a></li><li class="' + namespace + 'nav-next"><a class="' + namespace + 'next" href="#">' + slider.vars.nextText + '</a></li></ul>');

                    // CUSTOM DIRECTION NAV:
                    if (slider.customDirectionNav) {
                        slider.directionNav = slider.customDirectionNav;
                        // CONTROLSCONTAINER:
                    } else if (slider.controlsContainer) {
                        $(slider.controlsContainer).append(directionNavScaffold);
                        slider.directionNav = $('.' + namespace + 'direction-nav li a', slider.controlsContainer);
                    } else {
                        slider.append(directionNavScaffold);
                        slider.directionNav = $('.' + namespace + 'direction-nav li a', slider);
                    }

                    methods.directionNav.update();

                    slider.directionNav.bind(eventType, function(event) {
                        event.preventDefault();
                        var target;

                        if (watchedEvent === "" || watchedEvent === event.type) {
                            target = ($(this).hasClass(namespace + 'next')) ? slider.getTarget('next') : slider.getTarget('prev');
                            slider.flexAnimate(target, slider.vars.pauseOnAction);
                        }

                        // setup flags to prevent event duplication
                        if (watchedEvent === "") {
                            watchedEvent = event.type;
                        }
                        methods.setToClearWatchedEvent();
                    });
                },
                update: function() {
                    var disabledClass = namespace + 'disabled';
                    if (slider.pagingCount === 1) {
                        slider.directionNav.addClass(disabledClass).attr('tabindex', '-1');
                    } else if (!slider.vars.animationLoop) {
                        if (slider.animatingTo === 0) {
                            slider.directionNav.removeClass(disabledClass).filter('.' + namespace + "prev").addClass(disabledClass).attr('tabindex', '-1');
                        } else if (slider.animatingTo === slider.last) {
                            slider.directionNav.removeClass(disabledClass).filter('.' + namespace + "next").addClass(disabledClass).attr('tabindex', '-1');
                        } else {
                            slider.directionNav.removeClass(disabledClass).removeAttr('tabindex');
                        }
                    } else {
                        slider.directionNav.removeClass(disabledClass).removeAttr('tabindex');
                    }
                }
            },
            pausePlay: {
                setup: function() {
                    var pausePlayScaffold = $('<div class="' + namespace + 'pauseplay"><a href="#"></a></div>');

                    // CONTROLSCONTAINER:
                    if (slider.controlsContainer) {
                        slider.controlsContainer.append(pausePlayScaffold);
                        slider.pausePlay = $('.' + namespace + 'pauseplay a', slider.controlsContainer);
                    } else {
                        slider.append(pausePlayScaffold);
                        slider.pausePlay = $('.' + namespace + 'pauseplay a', slider);
                    }

                    methods.pausePlay.update((slider.vars.slideshow) ? namespace + 'pause' : namespace + 'play');

                    slider.pausePlay.bind(eventType, function(event) {
                        event.preventDefault();

                        if (watchedEvent === "" || watchedEvent === event.type) {
                            if ($(this).hasClass(namespace + 'pause')) {
                                slider.manualPause = true;
                                slider.manualPlay = false;
                                slider.pause();
                            } else {
                                slider.manualPause = false;
                                slider.manualPlay = true;
                                slider.play();
                            }
                        }

                        // setup flags to prevent event duplication
                        if (watchedEvent === "") {
                            watchedEvent = event.type;
                        }
                        methods.setToClearWatchedEvent();
                    });
                },
                update: function(state) {
                    (state === "play") ? slider.pausePlay.removeClass(namespace + 'pause').addClass(namespace + 'play').html(slider.vars.playText) : slider.pausePlay.removeClass(namespace + 'play').addClass(namespace + 'pause').html(slider.vars.pauseText);
                }
            },
            touch: function() {
                var startX,
                    startY,
                    offset,
                    cwidth,
                    dx,
                    startT,
                    onTouchStart,
                    onTouchMove,
                    onTouchEnd,
                    scrolling = false,
                    localX = 0,
                    localY = 0,
                    accDx = 0;

                if(!msGesture){
                    onTouchStart = function(e) {
                        if (slider.animating) {
                            e.preventDefault();
                        } else if ( ( window.navigator.msPointerEnabled ) || e.touches.length === 1 ) {
                            slider.pause();
                            // CAROUSEL:
                            cwidth = (vertical) ? slider.h : slider. w;
                            startT = Number(new Date());
                            // CAROUSEL:

                            // Local vars for X and Y points.
                            localX = e.touches[0].pageX;
                            localY = e.touches[0].pageY;

                            offset = (carousel && reverse && slider.animatingTo === slider.last) ? 0 :
                                (carousel && reverse) ? slider.limit - (((slider.itemW + slider.vars.itemMargin) * slider.move) * slider.animatingTo) :
                                    (carousel && slider.currentSlide === slider.last) ? slider.limit :
                                        (carousel) ? ((slider.itemW + slider.vars.itemMargin) * slider.move) * slider.currentSlide :
                                            (reverse) ? (slider.last - slider.currentSlide + slider.cloneOffset) * cwidth : (slider.currentSlide + slider.cloneOffset) * cwidth;
                            startX = (vertical) ? localY : localX;
                            startY = (vertical) ? localX : localY;

                            el.addEventListener('touchmove', onTouchMove, false);
                            el.addEventListener('touchend', onTouchEnd, false);
                        }
                    };

                    onTouchMove = function(e) {
                        // Local vars for X and Y points.

                        localX = e.touches[0].pageX;
                        localY = e.touches[0].pageY;

                        dx = (vertical) ? startX - localY : startX - localX;
                        scrolling = (vertical) ? (Math.abs(dx) < Math.abs(localX - startY)) : (Math.abs(dx) < Math.abs(localY - startY));

                        var fxms = 500;

                        if ( ! scrolling || Number( new Date() ) - startT > fxms ) {
                            e.preventDefault();
                            if (!fade && slider.transitions) {
                                if (!slider.vars.animationLoop) {
                                    dx = dx/((slider.currentSlide === 0 && dx < 0 || slider.currentSlide === slider.last && dx > 0) ? (Math.abs(dx)/cwidth+2) : 1);
                                }
                                slider.setProps(offset + dx, "setTouch");
                            }
                        }
                    };

                    onTouchEnd = function(e) {
                        // finish the touch by undoing the touch session
                        el.removeEventListener('touchmove', onTouchMove, false);

                        if (slider.animatingTo === slider.currentSlide && !scrolling && !(dx === null)) {
                            var updateDx = (reverse) ? -dx : dx,
                                target = (updateDx > 0) ? slider.getTarget('next') : slider.getTarget('prev');

                            if (slider.canAdvance(target) && (Number(new Date()) - startT < 550 && Math.abs(updateDx) > 50 || Math.abs(updateDx) > cwidth/2)) {
                                slider.flexAnimate(target, slider.vars.pauseOnAction);
                            } else {
                                if (!fade) { slider.flexAnimate(slider.currentSlide, slider.vars.pauseOnAction, true); }
                            }
                        }
                        el.removeEventListener('touchend', onTouchEnd, false);

                        startX = null;
                        startY = null;
                        dx = null;
                        offset = null;
                    };

                    el.addEventListener('touchstart', onTouchStart, false);
                }else{
                    el.style.msTouchAction = "none";
                    el._gesture = new MSGesture();
                    el._gesture.target = el;
                    el.addEventListener("MSPointerDown", onMSPointerDown, false);
                    el._slider = slider;
                    el.addEventListener("MSGestureChange", onMSGestureChange, false);
                    el.addEventListener("MSGestureEnd", onMSGestureEnd, false);

                    function onMSPointerDown(e){
                        e.stopPropagation();
                        if (slider.animating) {
                            e.preventDefault();
                        }else{
                            slider.pause();
                            el._gesture.addPointer(e.pointerId);
                            accDx = 0;
                            cwidth = (vertical) ? slider.h : slider. w;
                            startT = Number(new Date());
                            // CAROUSEL:

                            offset = (carousel && reverse && slider.animatingTo === slider.last) ? 0 :
                                (carousel && reverse) ? slider.limit - (((slider.itemW + slider.vars.itemMargin) * slider.move) * slider.animatingTo) :
                                    (carousel && slider.currentSlide === slider.last) ? slider.limit :
                                        (carousel) ? ((slider.itemW + slider.vars.itemMargin) * slider.move) * slider.currentSlide :
                                            (reverse) ? (slider.last - slider.currentSlide + slider.cloneOffset) * cwidth : (slider.currentSlide + slider.cloneOffset) * cwidth;
                        }
                    }

                    function onMSGestureChange(e) {
                        e.stopPropagation();
                        var slider = e.target._slider;
                        if(!slider){
                            return;
                        }
                        var transX = -e.translationX,
                            transY = -e.translationY;

                        //Accumulate translations.
                        accDx = accDx + ((vertical) ? transY : transX);
                        dx = accDx;
                        scrolling = (vertical) ? (Math.abs(accDx) < Math.abs(-transX)) : (Math.abs(accDx) < Math.abs(-transY));

                        if(e.detail === e.MSGESTURE_FLAG_INERTIA){
                            setImmediate(function (){
                                el._gesture.stop();
                            });

                            return;
                        }

                        if (!scrolling || Number(new Date()) - startT > 500) {
                            e.preventDefault();
                            if (!fade && slider.transitions) {
                                if (!slider.vars.animationLoop) {
                                    dx = accDx / ((slider.currentSlide === 0 && accDx < 0 || slider.currentSlide === slider.last && accDx > 0) ? (Math.abs(accDx) / cwidth + 2) : 1);
                                }
                                slider.setProps(offset + dx, "setTouch");
                            }
                        }
                    }

                    function onMSGestureEnd(e) {
                        e.stopPropagation();
                        var slider = e.target._slider;
                        if(!slider){
                            return;
                        }
                        if (slider.animatingTo === slider.currentSlide && !scrolling && !(dx === null)) {
                            var updateDx = (reverse) ? -dx : dx,
                                target = (updateDx > 0) ? slider.getTarget('next') : slider.getTarget('prev');

                            if (slider.canAdvance(target) && (Number(new Date()) - startT < 550 && Math.abs(updateDx) > 50 || Math.abs(updateDx) > cwidth/2)) {
                                slider.flexAnimate(target, slider.vars.pauseOnAction);
                            } else {
                                if (!fade) { slider.flexAnimate(slider.currentSlide, slider.vars.pauseOnAction, true); }
                            }
                        }

                        startX = null;
                        startY = null;
                        dx = null;
                        offset = null;
                        accDx = 0;
                    }
                }
            },
            resize: function() {
                if (!slider.animating && slider.is(':visible')) {
                    if (!carousel) { slider.doMath(); }

                    if (fade) {
                        // SMOOTH HEIGHT:
                        methods.smoothHeight();
                    } else if (carousel) { //CAROUSEL:
                        slider.slides.width(slider.computedW);
                        slider.update(slider.pagingCount);
                        slider.setProps();
                    }
                    else if (vertical) { //VERTICAL:
                        slider.viewport.height(slider.h);
                        slider.setProps(slider.h, "setTotal");
                    } else {
                        // SMOOTH HEIGHT:
                        if (slider.vars.smoothHeight) { methods.smoothHeight(); }
                        slider.newSlides.width(slider.computedW);
                        slider.setProps(slider.computedW, "setTotal");
                    }
                }
            },
            smoothHeight: function(dur) {
                if (!vertical || fade) {
                    var $obj = (fade) ? slider : slider.viewport;
                    (dur) ? $obj.animate({"height": slider.slides.eq(slider.animatingTo).innerHeight()}, dur) : $obj.innerHeight(slider.slides.eq(slider.animatingTo).innerHeight());
                }
            },
            sync: function(action) {
                var $obj = $(slider.vars.sync).data("flexslider"),
                    target = slider.animatingTo;

                switch (action) {
                    case "animate": $obj.flexAnimate(target, slider.vars.pauseOnAction, false, true); break;
                    case "play": if (!$obj.playing && !$obj.asNav) { $obj.play(); } break;
                    case "pause": $obj.pause(); break;
                }
            },
            uniqueID: function($clone) {
                // Append _clone to current level and children elements with id attributes
                $clone.filter( '[id]' ).add($clone.find( '[id]' )).each(function() {
                    var $this = $(this);
                    $this.attr( 'id', $this.attr( 'id' ) + '_clone' );
                });
                return $clone;
            },
            pauseInvisible: {
                visProp: null,
                init: function() {
                    var visProp = methods.pauseInvisible.getHiddenProp();
                    if (visProp) {
                        var evtname = visProp.replace(/[H|h]idden/,'') + 'visibilitychange';
                        document.addEventListener(evtname, function() {
                            if (methods.pauseInvisible.isHidden()) {
                                if(slider.startTimeout) {
                                    clearTimeout(slider.startTimeout); //If clock is ticking, stop timer and prevent from starting while invisible
                                } else {
                                    slider.pause(); //Or just pause
                                }
                            }
                            else {
                                if(slider.started) {
                                    slider.play(); //Initiated before, just play
                                } else {
                                    if (slider.vars.initDelay > 0) {
                                        setTimeout(slider.play, slider.vars.initDelay);
                                    } else {
                                        slider.play(); //Didn't init before: simply init or wait for it
                                    }
                                }
                            }
                        });
                    }
                },
                isHidden: function() {
                    var prop = methods.pauseInvisible.getHiddenProp();
                    if (!prop) {
                        return false;
                    }
                    return document[prop];
                },
                getHiddenProp: function() {
                    var prefixes = ['webkit','moz','ms','o'];
                    // if 'hidden' is natively supported just return it
                    if ('hidden' in document) {
                        return 'hidden';
                    }
                    // otherwise loop over all the known prefixes until we find one
                    for ( var i = 0; i < prefixes.length; i++ ) {
                        if ((prefixes[i] + 'Hidden') in document) {
                            return prefixes[i] + 'Hidden';
                        }
                    }
                    // otherwise it's not supported
                    return null;
                }
            },
            setToClearWatchedEvent: function() {
                clearTimeout(watchedEventClearTimer);
                watchedEventClearTimer = setTimeout(function() {
                    watchedEvent = "";
                }, 3000);
            }
        };

        // public methods
        slider.flexAnimate = function(target, pause, override, withSync, fromNav) {
            if (!slider.vars.animationLoop && target !== slider.currentSlide) {
                slider.direction = (target > slider.currentSlide) ? "next" : "prev";
            }

            if (asNav && slider.pagingCount === 1) slider.direction = (slider.currentItem < target) ? "next" : "prev";

            if (!slider.animating && (slider.canAdvance(target, fromNav) || override) && slider.is(":visible")) {
                if (asNav && withSync) {
                    var master = $(slider.vars.asNavFor).data('flexslider');
                    slider.atEnd = target === 0 || target === slider.count - 1;
                    master.flexAnimate(target, true, false, true, fromNav);
                    slider.direction = (slider.currentItem < target) ? "next" : "prev";
                    master.direction = slider.direction;

                    if (Math.ceil((target + 1)/slider.visible) - 1 !== slider.currentSlide && target !== 0) {
                        slider.currentItem = target;
                        slider.slides.removeClass(namespace + "active-slide").eq(target).addClass(namespace + "active-slide");
                        target = Math.floor(target/slider.visible);
                    } else {
                        slider.currentItem = target;
                        slider.slides.removeClass(namespace + "active-slide").eq(target).addClass(namespace + "active-slide");
                        return false;
                    }
                }

                slider.animating = true;
                slider.animatingTo = target;

                // SLIDESHOW:
                if (pause) { slider.pause(); }

                // API: before() animation Callback
                slider.vars.before(slider);

                // SYNC:
                if (slider.syncExists && !fromNav) { methods.sync("animate"); }

                // CONTROLNAV
                if (slider.vars.controlNav) { methods.controlNav.active(); }

                // !CAROUSEL:
                // CANDIDATE: slide active class (for add/remove slide)
                if (!carousel) { slider.slides.removeClass(namespace + 'active-slide').eq(target).addClass(namespace + 'active-slide'); }

                // INFINITE LOOP:
                // CANDIDATE: atEnd
                slider.atEnd = target === 0 || target === slider.last;

                // DIRECTIONNAV:
                if (slider.vars.directionNav) { methods.directionNav.update(); }

                if (target === slider.last) {
                    // API: end() of cycle Callback
                    slider.vars.end(slider);
                    // SLIDESHOW && !INFINITE LOOP:
                    if (!slider.vars.animationLoop) { slider.pause(); }
                }

                // SLIDE:
                if (!fade) {
                    var dimension = (vertical) ? slider.slides.filter(':first').height() : slider.computedW,
                        margin, slideString, calcNext;

                    // INFINITE LOOP / REVERSE:
                    if (carousel) {
                        margin = slider.vars.itemMargin;
                        calcNext = ((slider.itemW + margin) * slider.move) * slider.animatingTo;
                        slideString = (calcNext > slider.limit && slider.visible !== 1) ? slider.limit : calcNext;
                    } else if (slider.currentSlide === 0 && target === slider.count - 1 && slider.vars.animationLoop && slider.direction !== "next") {
                        slideString = (reverse) ? (slider.count + slider.cloneOffset) * dimension : 0;
                    } else if (slider.currentSlide === slider.last && target === 0 && slider.vars.animationLoop && slider.direction !== "prev") {
                        slideString = (reverse) ? 0 : (slider.count + 1) * dimension;
                    } else {
                        slideString = (reverse) ? ((slider.count - 1) - target + slider.cloneOffset) * dimension : (target + slider.cloneOffset) * dimension;
                    }
                    slider.setProps(slideString, "", slider.vars.animationSpeed);
                    if (slider.transitions) {
                        if (!slider.vars.animationLoop || !slider.atEnd) {
                            slider.animating = false;
                            slider.currentSlide = slider.animatingTo;
                        }

                        // Unbind previous transitionEnd events and re-bind new transitionEnd event
                        slider.container.unbind("webkitTransitionEnd transitionend");
                        slider.container.bind("webkitTransitionEnd transitionend", function() {
                            clearTimeout(slider.ensureAnimationEnd);
                            slider.wrapup(dimension);
                        });

                        // Insurance for the ever-so-fickle transitionEnd event
                        clearTimeout(slider.ensureAnimationEnd);
                        slider.ensureAnimationEnd = setTimeout(function() {
                            slider.wrapup(dimension);
                        }, slider.vars.animationSpeed + 100);

                    } else {
                        slider.container.animate(slider.args, slider.vars.animationSpeed, slider.vars.easing, function(){
                            slider.wrapup(dimension);
                        });
                    }
                } else { // FADE:
                    if (!touch) {
                        slider.slides.eq(slider.currentSlide).css({"zIndex": 1}).animate({"opacity": 0}, slider.vars.animationSpeed, slider.vars.easing);
                        slider.slides.eq(target).css({"zIndex": 2}).animate({"opacity": 1}, slider.vars.animationSpeed, slider.vars.easing, slider.wrapup);
                    } else {
                        slider.slides.eq(slider.currentSlide).css({ "opacity": 0, "zIndex": 1 });
                        slider.slides.eq(target).css({ "opacity": 1, "zIndex": 2 });
                        slider.wrapup(dimension);
                    }
                }
                // SMOOTH HEIGHT:
                if (slider.vars.smoothHeight) { methods.smoothHeight(slider.vars.animationSpeed); }
            }
        };
        slider.wrapup = function(dimension) {
            // SLIDE:
            if (!fade && !carousel) {
                if (slider.currentSlide === 0 && slider.animatingTo === slider.last && slider.vars.animationLoop) {
                    slider.setProps(dimension, "jumpEnd");
                } else if (slider.currentSlide === slider.last && slider.animatingTo === 0 && slider.vars.animationLoop) {
                    slider.setProps(dimension, "jumpStart");
                }
            }
            slider.animating = false;
            slider.currentSlide = slider.animatingTo;
            // API: after() animation Callback
            slider.vars.after(slider);
        };

        // SLIDESHOW:
        slider.animateSlides = function() {
            if (!slider.animating && focused ) { slider.flexAnimate(slider.getTarget("next")); }
        };
        // SLIDESHOW:
        slider.pause = function() {
            clearInterval(slider.animatedSlides);
            slider.animatedSlides = null;
            slider.playing = false;
            // PAUSEPLAY:
            if (slider.vars.pausePlay) { methods.pausePlay.update("play"); }
            // SYNC:
            if (slider.syncExists) { methods.sync("pause"); }
        };
        // SLIDESHOW:
        slider.play = function() {
            if (slider.playing) { clearInterval(slider.animatedSlides); }
            slider.animatedSlides = slider.animatedSlides || setInterval(slider.animateSlides, slider.vars.slideshowSpeed);
            slider.started = slider.playing = true;
            // PAUSEPLAY:
            if (slider.vars.pausePlay) { methods.pausePlay.update("pause"); }
            // SYNC:
            if (slider.syncExists) { methods.sync("play"); }
        };
        // STOP:
        slider.stop = function () {
            slider.pause();
            slider.stopped = true;
        };
        slider.canAdvance = function(target, fromNav) {
            // ASNAV:
            var last = (asNav) ? slider.pagingCount - 1 : slider.last;
            return (fromNav) ? true :
                (asNav && slider.currentItem === slider.count - 1 && target === 0 && slider.direction === "prev") ? true :
                    (asNav && slider.currentItem === 0 && target === slider.pagingCount - 1 && slider.direction !== "next") ? false :
                        (target === slider.currentSlide && !asNav) ? false :
                            (slider.vars.animationLoop) ? true :
                                (slider.atEnd && slider.currentSlide === 0 && target === last && slider.direction !== "next") ? false :
                                    (slider.atEnd && slider.currentSlide === last && target === 0 && slider.direction === "next") ? false :
                                        true;
        };
        slider.getTarget = function(dir) {
            slider.direction = dir;
            if (dir === "next") {
                return (slider.currentSlide === slider.last) ? 0 : slider.currentSlide + 1;
            } else {
                return (slider.currentSlide === 0) ? slider.last : slider.currentSlide - 1;
            }
        };

        // SLIDE:
        slider.setProps = function(pos, special, dur) {
            var target = (function() {
                var posCheck = (pos) ? pos : ((slider.itemW + slider.vars.itemMargin) * slider.move) * slider.animatingTo,
                    posCalc = (function() {
                        if (carousel) {
                            return (special === "setTouch") ? pos :
                                (reverse && slider.animatingTo === slider.last) ? 0 :
                                    (reverse) ? slider.limit - (((slider.itemW + slider.vars.itemMargin) * slider.move) * slider.animatingTo) :
                                        (slider.animatingTo === slider.last) ? slider.limit : posCheck;
                        } else {
                            switch (special) {
                                case "setTotal": return (reverse) ? ((slider.count - 1) - slider.currentSlide + slider.cloneOffset) * pos : (slider.currentSlide + slider.cloneOffset) * pos;
                                case "setTouch": return (reverse) ? pos : pos;
                                case "jumpEnd": return (reverse) ? pos : slider.count * pos;
                                case "jumpStart": return (reverse) ? slider.count * pos : pos;
                                default: return pos;
                            }
                        }
                    }());

                return (posCalc * -1) + "px";
            }());

            if (slider.transitions) {
                target = (vertical) ? "translate3d(0," + target + ",0)" : "translate3d(" + target + ",0,0)";
                dur = (dur !== undefined) ? (dur/1000) + "s" : "0s";
                slider.container.css("-" + slider.pfx + "-transition-duration", dur);
                slider.container.css("transition-duration", dur);
            }

            slider.args[slider.prop] = target;
            if (slider.transitions || dur === undefined) { slider.container.css(slider.args); }

            slider.container.css('transform',target);
        };

        slider.setup = function(type) {
            // SLIDE:
            if (!fade) {
                var sliderOffset, arr;

                if (type === "init") {
                    slider.viewport = $('<div class="' + namespace + 'viewport"></div>').css({"overflow": "hidden", "position": "relative"}).appendTo(slider).append(slider.container);
                    // INFINITE LOOP:
                    slider.cloneCount = 0;
                    slider.cloneOffset = 0;
                    // REVERSE:
                    if (reverse) {
                        arr = $.makeArray(slider.slides).reverse();
                        slider.slides = $(arr);
                        slider.container.empty().append(slider.slides);
                    }
                }
                // INFINITE LOOP && !CAROUSEL:
                if (slider.vars.animationLoop && !carousel) {
                    slider.cloneCount = 2;
                    slider.cloneOffset = 1;
                    // clear out old clones
                    if (type !== "init") { slider.container.find('.clone').remove(); }
                    slider.container.append(methods.uniqueID(slider.slides.first().clone().addClass('clone')).attr('aria-hidden', 'true'))
                        .prepend(methods.uniqueID(slider.slides.last().clone().addClass('clone')).attr('aria-hidden', 'true'));
                }
                slider.newSlides = $(slider.vars.selector, slider);

                sliderOffset = (reverse) ? slider.count - 1 - slider.currentSlide + slider.cloneOffset : slider.currentSlide + slider.cloneOffset;
                // VERTICAL:
                if (vertical && !carousel) {
                    slider.container.height((slider.count + slider.cloneCount) * 200 + "%").css("position", "absolute").width("100%");
                    setTimeout(function(){
                        slider.newSlides.css({"display": "block"});
                        slider.doMath();
                        slider.viewport.height(slider.h);
                        slider.setProps(sliderOffset * slider.h, "init");
                    }, (type === "init") ? 100 : 0);
                } else {
                    slider.container.width((slider.count + slider.cloneCount) * 200 + "%");
                    slider.setProps(sliderOffset * slider.computedW, "init");
                    setTimeout(function(){
                        slider.doMath();
                        slider.newSlides.css({"width": slider.computedW, "marginRight" : slider.computedM, "float": "left", "display": "block"});
                        // SMOOTH HEIGHT:
                        if (slider.vars.smoothHeight) { methods.smoothHeight(); }
                    }, (type === "init") ? 100 : 0);
                }
            } else { // FADE:
                slider.slides.css({"width": "100%", "float": "left", "marginRight": "-100%", "position": "relative"});
                if (type === "init") {
                    if (!touch) {
                        //slider.slides.eq(slider.currentSlide).fadeIn(slider.vars.animationSpeed, slider.vars.easing);
                        if (slider.vars.fadeFirstSlide == false) {
                            slider.slides.css({ "opacity": 0, "display": "block", "zIndex": 1 }).eq(slider.currentSlide).css({"zIndex": 2}).css({"opacity": 1});
                        } else {
                            slider.slides.css({ "opacity": 0, "display": "block", "zIndex": 1 }).eq(slider.currentSlide).css({"zIndex": 2}).animate({"opacity": 1},slider.vars.animationSpeed,slider.vars.easing);
                        }
                    } else {
                        slider.slides.css({ "opacity": 0, "display": "block", "webkitTransition": "opacity " + slider.vars.animationSpeed / 1000 + "s ease", "zIndex": 1 }).eq(slider.currentSlide).css({ "opacity": 1, "zIndex": 2});
                    }
                }
                // SMOOTH HEIGHT:
                if (slider.vars.smoothHeight) { methods.smoothHeight(); }
            }
            // !CAROUSEL:
            // CANDIDATE: active slide
            if (!carousel) { slider.slides.removeClass(namespace + "active-slide").eq(slider.currentSlide).addClass(namespace + "active-slide"); }

            //FlexSlider: init() Callback
            slider.vars.init(slider);
        };

        slider.doMath = function() {
            var slide = slider.slides.first(),
                slideMargin = slider.vars.itemMargin,
                minItems = slider.vars.minItems,
                maxItems = slider.vars.maxItems;

            slider.w = (slider.viewport===undefined) ? slider.width() : slider.viewport.width();
            slider.h = slide.height();
            slider.boxPadding = slide.outerWidth() - slide.width();

            // CAROUSEL:
            if (carousel) {
                slider.itemT = slider.vars.itemWidth + slideMargin;
                slider.itemM = slideMargin;
                slider.minW = (minItems) ? minItems * slider.itemT : slider.w;
                slider.maxW = (maxItems) ? (maxItems * slider.itemT) - slideMargin : slider.w;
                slider.itemW = (slider.minW > slider.w) ? (slider.w - (slideMargin * (minItems - 1)))/minItems :
                    (slider.maxW < slider.w) ? (slider.w - (slideMargin * (maxItems - 1)))/maxItems :
                        (slider.vars.itemWidth > slider.w) ? slider.w : slider.vars.itemWidth;

                slider.visible = Math.floor(slider.w/(slider.itemW));
                slider.move = (slider.vars.move > 0 && slider.vars.move < slider.visible ) ? slider.vars.move : slider.visible;
                slider.pagingCount = Math.ceil(((slider.count - slider.visible)/slider.move) + 1);
                slider.last =  slider.pagingCount - 1;
                slider.limit = (slider.pagingCount === 1) ? 0 :
                    (slider.vars.itemWidth > slider.w) ? (slider.itemW * (slider.count - 1)) + (slideMargin * (slider.count - 1)) : ((slider.itemW + slideMargin) * slider.count) - slider.w - slideMargin;
            } else {
                slider.itemW = slider.w;
                slider.itemM = slideMargin;
                slider.pagingCount = slider.count;
                slider.last = slider.count - 1;
            }
            slider.computedW = slider.itemW - slider.boxPadding;
            slider.computedM = slider.itemM;
        };

        slider.update = function(pos, action) {
            slider.doMath();

            // update currentSlide and slider.animatingTo if necessary
            if (!carousel) {
                if (pos < slider.currentSlide) {
                    slider.currentSlide += 1;
                } else if (pos <= slider.currentSlide && pos !== 0) {
                    slider.currentSlide -= 1;
                }
                slider.animatingTo = slider.currentSlide;
            }

            // update controlNav
            if (slider.vars.controlNav && !slider.manualControls) {
                if ((action === "add" && !carousel) || slider.pagingCount > slider.controlNav.length) {
                    methods.controlNav.update("add");
                } else if ((action === "remove" && !carousel) || slider.pagingCount < slider.controlNav.length) {
                    if (carousel && slider.currentSlide > slider.last) {
                        slider.currentSlide -= 1;
                        slider.animatingTo -= 1;
                    }
                    methods.controlNav.update("remove", slider.last);
                }
            }
            // update directionNav
            if (slider.vars.directionNav) { methods.directionNav.update(); }

        };

        slider.addSlide = function(obj, pos) {
            var $obj = $(obj);

            slider.count += 1;
            slider.last = slider.count - 1;

            // append new slide
            if (vertical && reverse) {
                (pos !== undefined) ? slider.slides.eq(slider.count - pos).after($obj) : slider.container.prepend($obj);
            } else {
                (pos !== undefined) ? slider.slides.eq(pos).before($obj) : slider.container.append($obj);
            }

            // update currentSlide, animatingTo, controlNav, and directionNav
            slider.update(pos, "add");

            // update slider.slides
            slider.slides = $(slider.vars.selector + ':not(.clone)', slider);
            // re-setup the slider to accomdate new slide
            slider.setup();

            //FlexSlider: added() Callback
            slider.vars.added(slider);
        };
        slider.removeSlide = function(obj) {
            var pos = (isNaN(obj)) ? slider.slides.index($(obj)) : obj;

            // update count
            slider.count -= 1;
            slider.last = slider.count - 1;

            // remove slide
            if (isNaN(obj)) {
                $(obj, slider.slides).remove();
            } else {
                (vertical && reverse) ? slider.slides.eq(slider.last).remove() : slider.slides.eq(obj).remove();
            }

            // update currentSlide, animatingTo, controlNav, and directionNav
            slider.doMath();
            slider.update(pos, "remove");

            // update slider.slides
            slider.slides = $(slider.vars.selector + ':not(.clone)', slider);
            // re-setup the slider to accomdate new slide
            slider.setup();

            // FlexSlider: removed() Callback
            slider.vars.removed(slider);
        };

        //FlexSlider: Initialize
        methods.init();
    };

    // Ensure the slider isn't focussed if the window loses focus.
    $( window ).blur( function ( e ) {
        focused = false;
    }).focus( function ( e ) {
        focused = true;
    });

    //FlexSlider: Default Settings
    $.flexslider.defaults = {
        namespace: "flex-",             //{NEW} String: Prefix string attached to the class of every element generated by the plugin
        selector: ".slides > li",       //{NEW} Selector: Must match a simple pattern. '{container} > {slide}' -- Ignore pattern at your own peril
        animation: "fade",              //String: Select your animation type, "fade" or "slide"
        easing: "swing",                //{NEW} String: Determines the easing method used in jQuery transitions. jQuery easing plugin is supported!
        direction: "horizontal",        //String: Select the sliding direction, "horizontal" or "vertical"
        reverse: false,                 //{NEW} Boolean: Reverse the animation direction
        animationLoop: true,            //Boolean: Should the animation loop? If false, directionNav will received "disable" classes at either end
        smoothHeight: false,            //{NEW} Boolean: Allow height of the slider to animate smoothly in horizontal mode
        startAt: 0,                     //Integer: The slide that the slider should start on. Array notation (0 = first slide)
        slideshow: true,                //Boolean: Animate slider automatically
        slideshowSpeed: 7000,           //Integer: Set the speed of the slideshow cycling, in milliseconds
        animationSpeed: 600,            //Integer: Set the speed of animations, in milliseconds
        initDelay: 0,                   //{NEW} Integer: Set an initialization delay, in milliseconds
        randomize: false,               //Boolean: Randomize slide order
        fadeFirstSlide: true,           //Boolean: Fade in the first slide when animation type is "fade"
        thumbCaptions: false,           //Boolean: Whether or not to put captions on thumbnails when using the "thumbnails" controlNav.

        // Usability features
        pauseOnAction: true,            //Boolean: Pause the slideshow when interacting with control elements, highly recommended.
        pauseOnHover: false,            //Boolean: Pause the slideshow when hovering over slider, then resume when no longer hovering
        pauseInvisible: true,   		//{NEW} Boolean: Pause the slideshow when tab is invisible, resume when visible. Provides better UX, lower CPU usage.
        useCSS: true,                   //{NEW} Boolean: Slider will use CSS3 transitions if available
        touch: true,                    //{NEW} Boolean: Allow touch swipe navigation of the slider on touch-enabled devices
        video: false,                   //{NEW} Boolean: If using video in the slider, will prevent CSS3 3D Transforms to avoid graphical glitches

        // Primary Controls
        controlNav: true,               //Boolean: Create navigation for paging control of each slide? Note: Leave true for manualControls usage
        directionNav: true,             //Boolean: Create navigation for previous/next navigation? (true/false)
        prevText: "Previous",           //String: Set the text for the "previous" directionNav item
        nextText: "Next",               //String: Set the text for the "next" directionNav item

        // Secondary Navigation
        keyboard: true,                 //Boolean: Allow slider navigating via keyboard left/right keys
        multipleKeyboard: false,        //{NEW} Boolean: Allow keyboard navigation to affect multiple sliders. Default behavior cuts out keyboard navigation with more than one slider present.
        mousewheel: false,              //{UPDATED} Boolean: Requires jquery.mousewheel.js (https://github.com/brandonaaron/jquery-mousewheel) - Allows slider navigating via mousewheel
        pausePlay: false,               //Boolean: Create pause/play dynamic element
        pauseText: "Pause",             //String: Set the text for the "pause" pausePlay item
        playText: "Play",               //String: Set the text for the "play" pausePlay item

        // Special properties
        controlsContainer: "",          //{UPDATED} jQuery Object/Selector: Declare which container the navigation elements should be appended too. Default container is the FlexSlider element. Example use would be $(".flexslider-container"). Property is ignored if given element is not found.
        manualControls: "",             //{UPDATED} jQuery Object/Selector: Declare custom control navigation. Examples would be $(".flex-control-nav li") or "#tabs-nav li img", etc. The number of elements in your controlNav should match the number of slides/tabs.
        customDirectionNav: "",         //{NEW} jQuery Object/Selector: Custom prev / next button. Must be two jQuery elements. In order to make the events work they have to have the classes "prev" and "next" (plus namespace)
        sync: "",                       //{NEW} Selector: Mirror the actions performed on this slider with another slider. Use with care.
        asNavFor: "",                   //{NEW} Selector: Internal property exposed for turning the slider into a thumbnail navigation for another slider

        // Carousel Options
        itemWidth: 0,                   //{NEW} Integer: Box-model width of individual carousel items, including horizontal borders and padding.
        itemMargin: 0,                  //{NEW} Integer: Margin between carousel items.
        minItems: 1,                    //{NEW} Integer: Minimum number of carousel items that should be visible. Items will resize fluidly when below this.
        maxItems: 0,                    //{NEW} Integer: Maxmimum number of carousel items that should be visible. Items will resize fluidly when above this limit.
        move: 0,                        //{NEW} Integer: Number of carousel items that should move on animation. If 0, slider will move all visible items.
        allowOneSlide: true,           //{NEW} Boolean: Whether or not to allow a slider comprised of a single slide

        // Callback API
        start: function(){},            //Callback: function(slider) - Fires when the slider loads the first slide
        before: function(){},           //Callback: function(slider) - Fires asynchronously with each slider animation
        after: function(){},            //Callback: function(slider) - Fires after each slider animation completes
        end: function(){},              //Callback: function(slider) - Fires when the slider reaches the last slide (asynchronous)
        added: function(){},            //{NEW} Callback: function(slider) - Fires after a slide is added
        removed: function(){},           //{NEW} Callback: function(slider) - Fires after a slide is removed
        init: function() {}             //{NEW} Callback: function(slider) - Fires after the slider is initially setup
    };

    //FlexSlider: Plugin Function
    $.fn.flexslider = function(options) {
        if (options === undefined) { options = {}; }

        if (typeof options === "object") {
            return this.each(function() {
                var $this = $(this),
                    selector = (options.selector) ? options.selector : ".slides > li",
                    $slides = $this.find(selector);

                if ( ( $slides.length === 1 && options.allowOneSlide === false ) || $slides.length === 0 ) {
                    $slides.fadeIn(400);
                    if (options.start) { options.start($this); }
                } else if ($this.data('flexslider') === undefined) {
                    new $.flexslider(this, options);
                }
            });
        } else {
            // Helper strings to quickly perform functions on the slider
            var $slider = $(this).data('flexslider');
            switch (options) {
                case "play": $slider.play(); break;
                case "pause": $slider.pause(); break;
                case "stop": $slider.stop(); break;
                case "next": $slider.flexAnimate($slider.getTarget("next"), true); break;
                case "prev":
                case "previous": $slider.flexAnimate($slider.getTarget("prev"), true); break;
                default: if (typeof options === "number") { $slider.flexAnimate(options, true); }
            }
        }
    };
})(jQuery);;
/*!
 * parallax.js v1.5.0 (http://pixelcog.github.io/parallax.js/)
 * @copyright 2016 PixelCog, Inc.
 * @license MIT (https://github.com/pixelcog/parallax.js/blob/master/LICENSE)
 */
!function(t,i,e,s){function o(i,e){var h=this;"object"==typeof e&&(delete e.refresh,delete e.render,t.extend(this,e)),this.$element=t(i),!this.imageSrc&&this.$element.is("img")&&(this.imageSrc=this.$element.attr("src"));var r=(this.position+"").toLowerCase().match(/\S+/g)||[];if(r.length<1&&r.push("center"),1==r.length&&r.push(r[0]),"top"!=r[0]&&"bottom"!=r[0]&&"left"!=r[1]&&"right"!=r[1]||(r=[r[1],r[0]]),this.positionX!==s&&(r[0]=this.positionX.toLowerCase()),this.positionY!==s&&(r[1]=this.positionY.toLowerCase()),h.positionX=r[0],h.positionY=r[1],"left"!=this.positionX&&"right"!=this.positionX&&(isNaN(parseInt(this.positionX))?this.positionX="center":this.positionX=parseInt(this.positionX)),"top"!=this.positionY&&"bottom"!=this.positionY&&(isNaN(parseInt(this.positionY))?this.positionY="center":this.positionY=parseInt(this.positionY)),this.position=this.positionX+(isNaN(this.positionX)?"":"px")+" "+this.positionY+(isNaN(this.positionY)?"":"px"),navigator.userAgent.match(/(iPod|iPhone|iPad)/))return this.imageSrc&&this.iosFix&&!this.$element.is("img")&&this.$element.css({backgroundImage:"url("+this.imageSrc+")",backgroundSize:"cover",backgroundPosition:this.position}),this;if(navigator.userAgent.match(/(Android)/))return this.imageSrc&&this.androidFix&&!this.$element.is("img")&&this.$element.css({backgroundImage:"url("+this.imageSrc+")",backgroundSize:"cover",backgroundPosition:this.position}),this;this.$mirror=t("<div />").prependTo(this.mirrorContainer);var a=this.$element.find(">.parallax-slider"),n=!1;0==a.length?this.$slider=t("<img />").prependTo(this.$mirror):(this.$slider=a.prependTo(this.$mirror),n=!0),this.$mirror.addClass("parallax-mirror").css({visibility:"hidden",zIndex:this.zIndex,position:"fixed",top:0,left:0,overflow:"hidden"}),this.$slider.addClass("parallax-slider").one("load",function(){h.naturalHeight&&h.naturalWidth||(h.naturalHeight=this.naturalHeight||this.height||1,h.naturalWidth=this.naturalWidth||this.width||1),h.aspectRatio=h.naturalWidth/h.naturalHeight,o.isSetup||o.setup(),o.sliders.push(h),o.isFresh=!1,o.requestRender()}),n||(this.$slider[0].src=this.imageSrc),(this.naturalHeight&&this.naturalWidth||this.$slider[0].complete||a.length>0)&&this.$slider.trigger("load")}!function(){for(var t=0,e=["ms","moz","webkit","o"],s=0;s<e.length&&!i.requestAnimationFrame;++s)i.requestAnimationFrame=i[e[s]+"RequestAnimationFrame"],i.cancelAnimationFrame=i[e[s]+"CancelAnimationFrame"]||i[e[s]+"CancelRequestAnimationFrame"];i.requestAnimationFrame||(i.requestAnimationFrame=function(e){var s=(new Date).getTime(),o=Math.max(0,16-(s-t)),h=i.setTimeout(function(){e(s+o)},o);return t=s+o,h}),i.cancelAnimationFrame||(i.cancelAnimationFrame=function(t){clearTimeout(t)})}(),t.extend(o.prototype,{speed:.2,bleed:0,zIndex:-100,iosFix:!0,androidFix:!0,position:"center",overScrollFix:!1,mirrorContainer:"body",refresh:function(){this.boxWidth=this.$element.outerWidth(),this.boxHeight=this.$element.outerHeight()+2*this.bleed,this.boxOffsetTop=this.$element.offset().top-this.bleed,this.boxOffsetLeft=this.$element.offset().left,this.boxOffsetBottom=this.boxOffsetTop+this.boxHeight;var t,i=o.winHeight,e=o.docHeight,s=Math.min(this.boxOffsetTop,e-i),h=Math.max(this.boxOffsetTop+this.boxHeight-i,0),r=this.boxHeight+(s-h)*(1-this.speed)|0,a=(this.boxOffsetTop-s)*(1-this.speed)|0;r*this.aspectRatio>=this.boxWidth?(this.imageWidth=r*this.aspectRatio|0,this.imageHeight=r,this.offsetBaseTop=a,t=this.imageWidth-this.boxWidth,"left"==this.positionX?this.offsetLeft=0:"right"==this.positionX?this.offsetLeft=-t:isNaN(this.positionX)?this.offsetLeft=-t/2|0:this.offsetLeft=Math.max(this.positionX,-t)):(this.imageWidth=this.boxWidth,this.imageHeight=this.boxWidth/this.aspectRatio|0,this.offsetLeft=0,t=this.imageHeight-r,"top"==this.positionY?this.offsetBaseTop=a:"bottom"==this.positionY?this.offsetBaseTop=a-t:isNaN(this.positionY)?this.offsetBaseTop=a-t/2|0:this.offsetBaseTop=a+Math.max(this.positionY,-t))},render:function(){var t=o.scrollTop,i=o.scrollLeft,e=this.overScrollFix?o.overScroll:0,s=t+o.winHeight;this.boxOffsetBottom>t&&this.boxOffsetTop<=s?(this.visibility="visible",this.mirrorTop=this.boxOffsetTop-t,this.mirrorLeft=this.boxOffsetLeft-i,this.offsetTop=this.offsetBaseTop-this.mirrorTop*(1-this.speed)):this.visibility="hidden",this.$mirror.css({transform:"translate3d("+this.mirrorLeft+"px, "+(this.mirrorTop-e)+"px, 0px)",visibility:this.visibility,height:this.boxHeight,width:this.boxWidth}),this.$slider.css({transform:"translate3d("+this.offsetLeft+"px, "+this.offsetTop+"px, 0px)",position:"absolute",height:this.imageHeight,width:this.imageWidth,maxWidth:"none"})}}),t.extend(o,{scrollTop:0,scrollLeft:0,winHeight:0,winWidth:0,docHeight:1<<30,docWidth:1<<30,sliders:[],isReady:!1,isFresh:!1,isBusy:!1,setup:function(){function s(){if(p==i.pageYOffset)return i.requestAnimationFrame(s),!1;p=i.pageYOffset,h.render(),i.requestAnimationFrame(s)}if(!this.isReady){var h=this,r=t(e),a=t(i),n=function(){o.winHeight=a.height(),o.winWidth=a.width(),o.docHeight=r.height(),o.docWidth=r.width()},l=function(){var t=a.scrollTop(),i=o.docHeight-o.winHeight,e=o.docWidth-o.winWidth;o.scrollTop=Math.max(0,Math.min(i,t)),o.scrollLeft=Math.max(0,Math.min(e,a.scrollLeft())),o.overScroll=Math.max(t-i,Math.min(t,0))};a.on("resize.px.parallax load.px.parallax",function(){n(),h.refresh(),o.isFresh=!1,o.requestRender()}).on("scroll.px.parallax load.px.parallax",function(){l(),o.requestRender()}),n(),l(),this.isReady=!0;var p=-1;s()}},configure:function(i){"object"==typeof i&&(delete i.refresh,delete i.render,t.extend(this.prototype,i))},refresh:function(){t.each(this.sliders,function(){this.refresh()}),this.isFresh=!0},render:function(){this.isFresh||this.refresh(),t.each(this.sliders,function(){this.render()})},requestRender:function(){var t=this;t.render(),t.isBusy=!1},destroy:function(e){var s,h=t(e).data("px.parallax");for(h.$mirror.remove(),s=0;s<this.sliders.length;s+=1)this.sliders[s]==h&&this.sliders.splice(s,1);t(e).data("px.parallax",!1),0===this.sliders.length&&(t(i).off("scroll.px.parallax resize.px.parallax load.px.parallax"),this.isReady=!1,o.isSetup=!1)}});var h=t.fn.parallax;t.fn.parallax=function(s){return this.each(function(){var h=t(this),r="object"==typeof s&&s;this==i||this==e||h.is("body")?o.configure(r):h.data("px.parallax")?"object"==typeof s&&t.extend(h.data("px.parallax"),r):(r=t.extend({},h.data(),r),h.data("px.parallax",new o(this,r))),"string"==typeof s&&("destroy"==s?o.destroy(this):o[s]())})},t.fn.parallax.Constructor=o,t.fn.parallax.noConflict=function(){return t.fn.parallax=h,this},t(function(){t('[data-parallax="scroll"]').parallax()})}(jQuery,window,document);;
/**
 * @file
 * A JavaScript file for the theme.
 *
 * In order for this JavaScript to be loaded on pages, see the instructions in
 * the README.txt next to this file.
 */

// JavaScript should be made compatible with libraries other than jQuery by
// wrapping it with an "anonymous closure". See:
// - http://drupal.org/node/1446420
// - http://www.adequatelygood.com/2010/3/JavaScript-Module-Pattern-In-Depth


(function ($, Drupal, window, document, undefined) {


    function psuedoClick(parentElem, event) {

        var beforeClicked,
            afterClicked;

        var parentLeft = parseInt(parentElem.getBoundingClientRect().left, 10),
            parentTop = parseInt(parentElem.getBoundingClientRect().top, 10);

        var parentWidth = parseInt(window.getComputedStyle(parentElem).width, 10),
            parentHeight = parseInt(window.getComputedStyle(parentElem).height, 10);

        var before = window.getComputedStyle(parentElem, ':before');

        var beforeStart = parentLeft + (parseInt(before.getPropertyValue("left"), 10)),
            beforeEnd = beforeStart + parseInt(before.width, 10);

        var beforeYStart = parentTop + (parseInt(before.getPropertyValue("top"), 10)),
            beforeYEnd = beforeYStart + parseInt(before.height, 10);

        var after = window.getComputedStyle(parentElem, ':after');

        var afterStart = parentLeft + (parseInt(after.getPropertyValue("left"), 10)),
            afterEnd = afterStart + parseInt(after.width, 10);

        var afterYStart = parentTop + (parseInt(after.getPropertyValue("top"), 10)),
            afterYEnd = afterYStart + parseInt(after.height, 10);

        var mouseX = event.clientX,
            mouseY = event.clientY;


        beforeClicked = (mouseX >= beforeStart && mouseX <= beforeEnd && mouseY >= beforeYStart && mouseY <= beforeYEnd ? true : false);

        afterClicked = (mouseX >= afterStart && mouseX <= afterEnd && mouseY >= afterYStart && mouseY <= afterYEnd ? true : false);

        return {
            "before" : beforeClicked,
            "after"  : afterClicked

        };

    }

    function sidebar_add_left_position() {
        $('.region-sidebar .block-og-menu ul.menu li.is-expanded > a, .region-sidebar .block-og-menu ul.menu li.is-expanded > span').each(function() {
                var left = $(this).parent().width() - 55;
                $('head').append("<style> .region-sidebar .block-og-menu ul.menu li.is-expanded > a::before, .region-sidebar .block-og-menu ul.menu li.is-expanded > span::before { left: " + left + "px; } </style>");

            }
        );
    }


$(window).load(function() {

  //$('.node-type-webform .region-sidebar .block>ul.menu>li.is-expanded').addClass('opened')

    if (getCurrentNodeId()) {
        var nid = getCurrentNodeId();

        $.ajax({
            url: Drupal.settings.basePath + 'views/ajax',
            type: 'post',
            data: {
                view_name: 'hero_slideshow',
                view_display_id: 'block',
                view_args: nid,
            },
            dataType: 'json',
            success: function (response) {
                if (response[1] !== undefined) {
                    var viewHtml = response[1].data;
                    $('.paragraphs-item-hero-slideshow-main .field-name-field-view > .field-items .field-item').html(viewHtml);
                    flexslider_hero();
                    $('.view-hero-slideshow').css('opacity', '1');
                    console.log('test_ajax');
                }
            }
        });
    }


    //slider tabs hover functionality
    $('.paragraphs-item-slider-with-tabs .tabs li a').hover(function(){
        var content_id = $(this).attr('name');
        $('a[value="' + content_id +'"]').focus();
    });

    //go to the tab link on click
    $('.paragraphs-item-slider-with-tabs .tabs li a').click(function(e){
        if($(window).width() >= 768 && $(window).width() <= 1112) {
            e.preventDefault();
        }
    });

    //focus functionality on slideshow tabs (actually hidden links which are in correct tabbing order)
    $('.paragraphs-item-slider-with-tabs a.tab-hidden-link').focus(function () {
        var content_id = $(this).attr('value');
        var according_tab = $('a[name="' + content_id +'"]').parent();

        according_tab.siblings().removeClass('ui-tabs-selected').removeClass('ui-state-active').removeClass('dotted-line');
        according_tab.addClass('ui-tabs-selected').addClass('ui-state-active').addClass('dotted-line');
        $(content_id).siblings('div').addClass('ui-tabs-hide').find('a');
        $(content_id).removeClass('ui-tabs-hide');
    });

    //additinal focus functionality for slideshow tabs paragraph
    $('*').focus(function() {
        if(!$(this).hasClass('tab-hidden-link')) {
           $('.ui-tabs-selected').removeClass('dotted-line');
        }
        if($(this).parent().hasClass('ui-tabs-panel')) {
            var scroll = $(window).scrollTop();
            var scrolltop = $(this).offset().top - 150;

            if(scroll > scrolltop && $(this).parent().is(':last-child')) {
                $('html,body').animate({scrollTop: scrolltop}); //scroll to tabs when going back (shift+tab)
            }
        }
    });


    $(window).keydown(function (e) {
        var code = (e.keyCode ? e.keyCode : e.which);
        if ($('.paragraphs-item-slider-with-tabs a.tab-hidden-link').is(':focus')) {
            if (e.shiftKey && code == 9) { //shift+tab is pressed
                var prev = $(':focus').prev().prev();
                if (prev.length) {
                    e.preventDefault();
                    var content_id = prev.attr('value');
                    var according_tab = $('a[name="' + content_id + '"]').parent();
                    according_tab.siblings().removeClass('ui-tabs-selected').removeClass('ui-state-active').removeClass('dotted-line');
                    according_tab.addClass('ui-tabs-selected').addClass('ui-state-active');
                    $(content_id).siblings('div').addClass('ui-tabs-hide').find('a');
                    $(content_id).removeClass('ui-tabs-hide').find('a').focus();
                }
            }
        }

    });



   image_side_text();
   show_hide_image();


  //add class nav-transparent if header is scrolled
  $(window).scroll(function () {
       if ($(this).scrollTop() >= 100) {
            $('#header').addClass('nav-transparent');
        } else {
            $('#header').removeClass('nav-transparent');
        }

    });
  $(window).resize(function() {
      image_side_text();
      show_hide_image();
  });






  //hero slider info box functionality
  $(document).mouseup(function (e) {
        var container = $(".view-hero-slideshow .info-text-wrapper");
        if ($(e.target).attr('class') == 'fa fa-info') { //click on info button
            if($('.view-hero-slideshow .info-text-wrapper').hasClass('opened')) {
                $('.view-hero-slideshow .info-text-wrapper').removeClass('opened');
            } else {
                $('.view-hero-slideshow .info-text-wrapper').addClass('opened');
            }
        //} else if ($(e.target).attr('class') == 'close-button' || (!container.is(e.target) && container.has(e.target).length === 0)) { //click on close button or out of container
        } else if ($(e.target).attr('class') == 'close-button' || (container.has(e.target).length === 0)) { //click on close button or out of container
            container.removeClass('opened');
        }
    });


   //video play/pause button
    $('body').delegate('.video-button', 'click',  function(){
        var video = $(this).parent().find('video').get(0);
        if(video.paused === false) {
          $(this).addClass('playing');
          video.pause();
        } else {
            $(this).removeClass('playing');
            video.play();
        }
    });

    if($('#above-content').length > 0) {
        if($('#above-content').html().length == 0) {
            $('#page-wrapper').css('margin-top', '200px');
        }
    }

    /*
    $(window).scroll(function() {

        if (window.innerWidth > 1112) {
            if ($('.paragraphs-item-landing-page-hero').length > 0) {
                // calculate the percentage the user has scrolled down the page
                var height = $('.paragraphs-item-landing-page-hero').height();
                var scrolled_height = $(window).scrollTop() - $( '.paragraphs-item-landing-page-hero' ).offset().top;
                if(scrolled_height > 0) {
                    var margin = (scrolled_height / height) * 35;
                    if(margin > 20) {
                        margin = 20;
                    }
                    $('#page-wrapper').css('margin-top', -margin + '%');
                    $('h1#page-title').css('margin-bottom', margin + '%')
                }

            }
        }
        */
        /*

        if (window.innerWidth > 1112) {
            $('.parallax-animation').each(function() {
                    var scrolled_height = ($(window).scrollTop() - $(this).parent().offset().top);
                    var height = $(this).parent().height();
                    if (scrolled_height > 0) {
                        var margin = ( scrolled_height / height) * 40;
                        if(margin > 40) {
                            margin = 40;
                        }
                        $(this).parent().next().css('margin-top', -margin  + '%');
                    } else {
                        $(this).parent().next().css('margin-top', 0);
                    }
            });
            $(window).trigger('resize.px.parallax');
        }
    });


    $(window).resize(function() {
        if (window.innerWidth <= 991) {
            $('.parallax-animation').each(function() {
                $(this).parent().next().css('margin-top', '0');
            });
        }
    });

    */




    var acc = $('.paragraphs-item-accordion-item');
    if ( acc.length ) {
      acc.each(function(){
        if ($(this).children('.field-name-field-text').length) {
      		$(this).addClass('has-child');
        }

      });

      $('.paragraphs-item-accordion-item .field-name-field-title').each(function() {
          $(this).attr('tabindex', '0');
      })

        //accordion element click function
        $('.paragraphs-item-accordion-item .field-name-field-title').click(function(){
            if ($(this).parent().hasClass('has-child')) {
                $(this).parent().toggleClass('active');
            }
        });



        $('.paragraphs-item-accordion-item .field-name-field-text').each(function () {
            $(this).find('a').attr('tabindex', '-1');
        });


        //navigation through accordion via Enter, arrows up and down
        $('.paragraphs-item-accordion-item .field-name-field-title').keyup(function(e){
            var parent_acc_item = $(this).parent();
            if (e.keyCode == 13 || e.keyCode == 32){ //press on Enter key233
                $tabcontent = $(this).next();
                $(this).click()
                if ( parent_acc_item.hasClass('active')) {
                    $tabcontent.find('a').attr('tabindex', '0').attr('aria-hidden', 'false');
                } else {
                    $tabcontent.find('a').attr('tabindex', '-1').attr('aria-hidden', 'true');
                }
            }
            if(e.keyCode == 40) { //press on arrow down
                e.preventDefault();
                if(!parent_acc_item.is(':last-child')) { //if it's not last child
                    parent_acc_item.next().find('.field-name-field-title').focus();
                } else {
                    parent_acc_item.siblings().first().find('.field-name-field-title').focus();
                }
            }
            if(e.keyCode == 38) { //press on arrow up
                e.preventDefault();
                if(!parent_acc_item.is(':first-child')) { //if it's not first child
                    parent_acc_item.prev().find('.field-name-field-title').focus();
                } else {
                    parent_acc_item.siblings().last().find('.field-name-field-title').focus();
                }
            }
        });


    }
    if(!$('.paragraphs-item-landing-page-hero').length > 0 && $('#above-content').length > 0 && !$('body').hasClass('node-type-homepage')) {
        $('#above-content').css('background', '#000');
    }





    $('.paragraph-align-accordion-open-first .paragraphs-items .paragraphs-item-accordion-item:first-child .field-name-field-title').click();


    /* horizintal and sidebar menus tabindex for span */
    $('.region-menu-horizontal .block > ul:not(.contextual-links) > li.is-expanded > span, .region-menu-horizontal .block > ul:not(.contextual-links) > li.menuparent > span,  .region-sidebar .block-og-menu ul.menu li.is-expanded > span').each(function() {
        $(this).attr('tabindex', '0');
    })

    //show/hide horizontal menu on click on menu title for mobile view (991px and less)
    $('.region-menu-horizontal .block > h2, .region-sidebar .block-og-menu > h2').click(function() {
        var menu_parent = $(this).parent().find(' > ul');
        if(!menu_parent.hasClass('opened')) {
            $(this).addClass('opened');
            menu_parent.addClass('opened');
        } else {
            $(this).removeClass('opened');
            menu_parent.removeClass('opened');
        }
    });


    if($('.sidebar-first .block-og-menu ul.menu li a.active').length > 0) {
        $('.sidebar-first .block-og-menu ul.menu li a.active').parents('li').addClass('opened');
        $('.sidebar-first .block-og-menu ul.menu li a.active').parent().addClass('is-active-trail');
    }
    if($('.region-menu-horizontal .block-og-menu ul.menu li a.active').length > 0) {
        $('.region-menu-horizontal .block-og-menu ul.menu li a.active').parent().addClass('is-active-trail');
    }

    //add left position for ::before psewdo element to fix issue in IE
    sidebar_add_left_position();
    $(window).on('resize', function() {
        sidebar_add_left_position();
    });


    //sidebar OG menu click functionality
    $('.region-sidebar .block-og-menu ul.menu li.is-expanded > a, .region-sidebar .block-og-menu ul.menu li.is-expanded > span').click(function(e) {
        $(this).focusout();
        if(psuedoClick(this, e).before || $(this).prop("tagName") == 'SPAN') {
            e.preventDefault();
                if (!$(this).parent().hasClass('first-single')) {
                    if ($(this).parent().hasClass('opened')) {
                        $(this).parent().removeClass('opened');
                    } else {
                        $(this).parent().addClass('opened');
                    }
                }
            }
    });


    //sidebar OG menu functionality on click on "TAB" and "ENTER"
    // $(".region-sidebar .block-og-menu ul.menu li.is-expanded > a, .region-sidebar .block-og-menu ul.menu li.is-expanded > span").keydown(function(e) {
    //     if(e.keyCode == 9) {
    //       if($(window).width() < 1311){
    //         if (!$(this).parent().hasClass('opened')) {
    //           $(this).parent().addClass('opened');
    //         }
    //       }
    //     }
    // });


    $(document).on('click touchend', function(e)
    {
        var container = $(".region-menu-horizontal ul:not(.contextual-links) li.opened ul, .region-menu-horizontal ul:not(.contextual-links) li");

        // if the target of the click isn't the container nor a descendant of the container
        if (!container.is(e.target) && container.has(e.target).length === 0)
        {
          $('.region-menu-horizontal ul:not(.contextual-links) li.opened').removeClass('opened').removeClass('is-focused');
        }
    });


    //horizontal mobile menu
    $('.region-menu-horizontal ul:not(.contextual-links) li.is-expanded > a, .region-menu-horizontal ul:not(.contextual-links) li.menuparent > a, .region-menu-horizontal ul:not(.contextual-links) li.is-expanded > span, .region-menu-horizontal ul:not(.contextual-links) li.menuparent > span').click(function(e) {
      if(window.innerWidth <= 1112 || navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i)) {
        $(this).focusout();
        if (psuedoClick(this, e).after || $(this).prop("tagName") == 'SPAN') {
          e.preventDefault();
          if ($(this).parent().hasClass('opened')) {
            $(this).parent().removeClass('opened').removeClass('is-focused');
          } else {
            $(this).parent().addClass('opened').addClass('is-focused');
            if(window.innerWidth > 1112) {
              $(this).parent().siblings().removeClass('opened').removeClass('is-focused');
            }
          }
        }
      }
    });
  $('.region-menu-horizontal ul:not(.contextual-links) li.is-expanded > span, .region-menu-horizontal ul:not(.contextual-links) li.menuparent > span').on('keydown', function(e) {
    var code = (e.keyCode ? e.keyCode : e.which);
    if(code == 13){
      if(window.innerWidth <= 1112 || navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i)) {
        $(this).focusout();
        if (psuedoClick(this, e).after || $(this).prop("tagName") == 'SPAN') {
          // e.preventDefault();
          if ($(this).parent().hasClass('opened')) {
            $(this).parent().removeClass('opened').removeClass('is-focused');
          } else {
            $(this).parent().addClass('opened').addClass('is-focused');
            if(window.innerWidth > 1112) {
              $(this).parent().siblings().removeClass('opened').removeClass('is-focused');
            }
          }
        }
      }
    }
  });


  $(".region-menu-horizontal ul:not(.contextual-links) li").on('mouseenter', function(event) {
    if(!navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i)) {
      $(this).addClass('is-hovered');
    }
  });
  $(".region-menu-horizontal ul:not(.contextual-links) li").on('mouseleave', function(event) {
    if(!navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i)) {
      $(this).removeClass('is-hovered');
    }
  });


    $('.region-menu-horizontal .block').removeClass('block-superfish');
    $('.region-menu-horizontal .block').attr('id', '');
    $('.region-menu-horizontal .block ul:not(.contextual-links)').each(function(){
       $(this).attr('class', 'menu');
        $(this).attr('id', '');
    });

    //remove odd "MENU" for mobile horizontal OG menu on Landing page
    var menu_title_mobile = $('.node-type-landing-page-no-sidebars .region-menu-horizontal h2.block-title');
    if (menu_title_mobile.length > 0) {
        var html = menu_title_mobile.html();
        var count = html.match(/MENU/g).length;
        if (count > 1) { //more than one occurency of "MENU" in title
            html = html.replace('MENU', '');
            menu_title_mobile.html(html);
        }
    }

   /* horizintal menu sublinks hover functions */
    $('.region-menu-horizontal ul:not(.contextual-links) li.is-expanded ul li.is-expanded, .region-menu-horizontal ul:not(.contextual-links) li.menuparent ul li.menuparent').hover(function(e) {
        $(this).addClass('is-hover');
    });
    $('.region-menu-horizontal ul:not(.contextual-links) li').hover(function(e) {
        $(this).nextAll().removeClass('is-hover');
        $(this).find('.is-hover').removeClass('is-hover');

    });

    $('.region-menu-horizontal .block > ul:not(.contextual-links) > li.is-expanded > a, .region-menu-horizontal .block > ul:not(.contextual-links) > li.menuparent > a, .region-menu-horizontal .block > ul:not(.contextual-links) > li.is-expanded > span, .region-menu-horizontal .block > ul:not(.contextual-links) > li.menuparent > span').hover(function(e) {
       $(this).parent().find('.is-hover').removeClass('is-hover');
       $(this).parent().siblings().removeClass('is-focused');
    });

    /* horizintal menu sublinks hover functions */
    $('.region-menu-horizontal .block > ul:not(.contextual-links) > li.is-expanded > span, .region-menu-horizontal .block > ul:not(.contextual-links) > li.menuparent > span').each(function() {
        $(this).attr('tabindex', '0');
    })

    // $('.region-menu-horizontal .block > ul:not(.contextual-links) > li > a, .region-menu-horizontal .block > ul:not(.contextual-links) > li > span').on('focus', function(e) {
    //     $(this).parent().siblings().removeClass('is-focused');
    //     $(this).parent().addClass('is-focused');
    // });

  $(document).on('keydown', '.child-menu-toggle', function (e) {
    // e.preventDefault();
    if($(window).width > 1112){
      if(e.keyCode == 13){
        if ($(this).next().height() > 0) {
          $(this).next().css('max-height', '0');
        } else {
          $(this).next().css('max-height', '1500px');
        }
      }
    }
  });
    $(document).mouseup(function(e)
    {
        var container = $(".region-menu-horizontal .block > ul:not(.contextual-links)");

        // if the target of the click isn't the container nor a descendant of the container
        if (!container.is(e.target) && container.has(e.target).length === 0)
        {
            $(this).find('.is-focused').removeClass('is-focused');
        }
    });


    /**
     * Preparing navigation for mobile
     * @type {*|jQuery}
     */
    $searchBlock = $('.kwall-slide-in-nav-search-menu li.menu-attach-block.block-search .node-block .field-name-body .field-item').html();
    if($('.kwall-slide-in-nav-menu .block-menu-block .menu-attach-block.block-search').length < 1){
        $('.kwall-slide-in-nav-menu .block-menu-block').prepend('<div class="menu-attach-block block-search">'+$searchBlock+'</div>');
    }

    if ($('.kwall-slide-in-nav-menu ul.appended-items').length == 0) {
        $('.kwall-slide-in-nav-menu .menu-block-wrapper').append("<ul class='menu appended-items'>" + $('.menu-name-menu-header-menu-right ul:not(".contextual-links")').html() +  $('.menu-name-menu-quick-links-new li.is-expanded ul').html()+ $('.menu-name-menu-header-menu-left ul:not(".contextual-links")').html() + "</ul>");
        $(".kwall-slide-in-nav-menu .menu-block-wrapper ul.appended-items li.button-give-now").detach().appendTo('.kwall-slide-in-nav-menu .menu-block-wrapper ul:not(.appended-items)');
    }




    //hide upcoming events paragraph if no events are available
    if($('.paragraphs-item-events-calendar-and-social-media').length > 0) {
        if($('.paragraphs-item-events-calendar-and-social-media .view-event-calendar-new').html().trim().length == 0) {
            $('.paragraphs-item-events-calendar-and-social-media').removeClass('paragraphs-item-events-calendar-and-social-media').addClass('paragraphs-item-social-media-bar');
        } else {
            events_social_equal_height();
            $(window).on('resize', function() {
                events_social_equal_height();
            });
        }
    }
    if($('.paragraphs-item-events-calendar').length > 0) {
        if($('.paragraphs-item-events-calendar .view-event-calendar-new').html().trim().length == 0) {
            $('.paragraphs-item-events-calendar').hide();
        }
    }
    if($('.paragraphs-item-news-feed').length > 0) {
        if($('.paragraphs-item-news-feed .view-news-feed').html().trim().length == 0) {
            $('.paragraphs-item-news-feed').hide();
        }
    }

    /**
     * Remove all duplicate ids from copied element
     * For accessibility fixes
     */
    if($('.kwall-slide-in-nav-menu').length > 0){
        $('.kwall-slide-in-nav-menu [id]').each(function () {
            $(this).removeAttr('id');
        });
    }
    if($('#block-kwall-slide-menu-menu [aria-label="Main"]').length > 0){
        $('#block-kwall-slide-menu-menu [aria-label="Main"]').attr('aria-label','Main Mobile');
    }
    if($('#node-7').length > 0){
        $('#node-7').removeAttr('id');
    }
    // if($('.custom-aria-label').length > 0){
    //     $('.custom-aria-label').each(function(){
    //         var title = $(this).parents('.entity-paragraphs-item').find('.field-name-field-title').text();
    //         if(typeof title === 'undefined'){
    //             title = "Read more about this news.";
    //         }
    //         $(this).attr('aria-label',title)
    //     });
    // }
/*
    $('.view-hero-slideshow video').each(function() {
      var video = $(this).get(0);
      console.log(video);
        video.onended = function(){
            console.log('video_ended');
            $('.view-hero-slideshow .flexslider').flexslider("next");
            $('.view-hero-slideshow .flexslider').flexslider("play");
        }
    });
*/

    cards_equal_height();
    image_text_overlap_height();
    intro_height();
    cta_buttons_width();
    $(".paragraphs-item-intro img").one('load', function() {
        intro_height()
    });

    $(window).resize(function() {
        cards_equal_height();
        image_text_overlap_height();
        intro_height();
        cta_buttons_width();
    });

    $('.paragraphs-item-slider .hide-link').each(function() {
        var title = $(this).find('a').attr('title');
        var target = $(this).find('a').attr('target');
        $(this).next().attr('title', title);
        $(this).next().attr('target', target);
        $(this).remove();
    })

    $('a#go-to-content').click(function(){
        if($('body').hasClass('front')) {
            scrollDown();
        }
    })
    var hash = $(location).attr('hash');
    var scroll = $(window).scrollTop();
    if($('body').hasClass('front') && hash == '#content' && scroll < 200) {
        scrollDown();
    }
    if(hash == '#navigation') {
        $('.region-navigation ul.menu li:first-child a').focus();
    }

    $('body').keydown(function(e) {
        if(e.keyCode == 9) { //press on "Tab"
            if($('body').hasClass('front') && $(':focus').html() == 'Campaign') {
                scrollDown();
            }
        }
    });

    if($('.parallax-animation').length > 0) {
        //$('.parallax-animation').parent().nextAll().wrapAll("<div class='animation-wrapper' />");
        $('.parallax-animation').each(function() {
            $(this).parent().next().css('background', '#fff');
            $(this).parent().next().next().css('background', '#fff');
        })
    }


});


    var flexslider_hero = function () {
        $('.view-hero-slideshow .flexslider').flexslider({
            animation: "fade",
            animationLoop: true,
            video: true,
            slideshow: true,
            randomize: true,
            directionNav: false,
            controlNav: false,
            pausePlay: true,
            slideshowSpeed: 7000,
            start: function () {

            }
        });

        if (window.innerWidth > 767) {
            var video_wrapper = $(".view-hero-slideshow .video-image-wrapper");
            video_wrapper.removeClass("video-loaded");


            var mp4 = video_wrapper.data('mp4');
            var webm = video_wrapper.data('webm');

            if (typeof mp4 !== 'undefined' && mp4.length > 0  || typeof webm !== 'undefined' && webm.length >0) {
                var video = $.parseHTML("<video autoplay='autoplay' loop='loop' muted='muted' data-object-fit='cover'></video>");

                if (mp4.length > 0) {
                    $(video).append("<source src='" + mp4 + "' type='video/mp4' />");
                    $("body").addClass("processed-video-script");
                }

                if (webm.length > 0) {
                    $(video).append("<source src='" + webm + "' type='video/webm' />");
                    $("body").addClass("processed-video-script");
                }
                video_wrapper.append(video);
                $('.video-button').show();

            }
        }

        $('.view-hero-slideshow ul.slides .video-image-wrapper video, .view-hero-slideshow ul.slides .video-image-wrapper img, .paragraphs-item-images-with-text-overlay img').each(function () {
            if ($(this).css('margin-top') == '0px') {
                $(this).css('top', '0');
            }
        });

   };

  /* set equal width for each button in row (CTA buttons paragraph) */
  var cta_buttons_width = function() {
      $('.paragraphs-item-cta-buttons').each(function() {
         var items = $(this).find('.field-items .field-item a');
         if(items.length > 1) { //2 and more buttons in row
                 items.css('width', 'auto');
                 var max = 0;
                 items.each(function(){
                     var c_width = parseInt($(this).outerWidth());
                     if (c_width > max) {
                         max = c_width;
                     }
                 });
                 items.css('width', max + 1 + 'px');

             if(window.innerWidth > 1112) {
                 items.css('height', 'auto');
                 var max = 0;
                 items.each(function(){
                     var c_height = parseInt($(this).outerHeight());
                     if (c_height > max) {
                         max = c_height;
                     }
                 });
                 items.css('height', max + 1 + 'px');
             } else {
                 items.css('height', 'auto');
             }
         }
      });
  };

  var intro_height = function() {
      if($(".paragraphs-item-intro").length > 0) {
          var height1 = $(".paragraphs-item-intro .field-name-field-text").height();
          var height2 = $(window).height();
          if (height1 + 100  > height2) {
              $(".paragraphs-item-intro").addClass('intro-height-auto');
          } else {
              $(".paragraphs-item-intro").removeClass('intro-height-auto');
          }
      }
  }


    var image_side_text = function() {
        $('.paragraphs-item-image-with-side-text-general .group-text-wrapper').each(function() {
            $(this).css('height', 'auto');
            var height = $(this).parent().parent().height();
            $(this).css('height', height + 'px');

        })
    }
    var image_text_overlap_height = function() {
        $('.paragraphs-item-image-with-text-overlap .group-content-inner').each(function() {
                var height = $(this).outerHeight(true);
                $(this).parent().css('min-height', height + 'px');
        })
    }

   var events_social_equal_height = function() {
        if(window.innerWidth >= 768) {
            var height1 = $('.paragraphs-item-events-calendar-and-social-media .field-name-field-view').height();
            var height2 = $('.paragraphs-item-events-calendar-and-social-media .field-name-field-view2').height();
            var height = Math.max(height1, height2);
            $('.paragraphs-item-events-calendar-and-social-media .field-name-field-view, .paragraphs-item-events-calendar-and-social-media .field-name-field-view2').css('height', height + 'px');
        } else {
            $('.paragraphs-item-events-calendar-and-social-media .field-name-field-view, .paragraphs-item-events-calendar-and-social-media .field-name-field-view2').css('height', 'auto');
        }
   }

   var cards_equal_height = function() {
       $('.paragraphs-item-cards').each(function() {
           if(window.innerWidth >= 992) {
               var maxheight = null;
               var hi = 0;

               $(this).find('.paragraphs-item-cards-item .group-text-wrapper').each(function () {
                   $(this).css('height', 'auto');
                   var h = $(this).height();
                   if (h > hi) {
                       hi = h;
                       maxheight = $(this).height();
                   }
               });
               if (maxheight) {
                   $(this).find('.paragraphs-item-cards-item .group-text-wrapper').css('height', maxheight + 'px');
               }
           } else {
               $(this).find('.paragraphs-item-cards-item .group-text-wrapper').css('height', 'auto');
           }
       });
   }


   var show_hide_image = function() {
       $('.flexslider ul.slides li .mobile-image').each(function() {
           if($(this).html().length == 0 && window.innerWidth <= 767) {
               $(this).parent().find('.main-image').css('display', 'block');
           }
       });

       $('.paragraphs-item-image-with-text-overlap').each(function() {
           if($(this).find('.field-name-field-mobile-image').length == 0 && window.innerWidth <= 1112) {
               $(this).find('.field-name-field-image').css('display', 'block');
           }
       });
   }



    var CSU_LA_Splash = {

        splash_elem: null,
        brand_elem: null,
        content_elem: null,
        spacer_elem: null,
        waypoint: null,
        basic_height: 0,

        setSplashHeight: function(){
            var elem_inner_height = window.innerHeight;
            $('html').css('scroll-behavior','smooth');
            var elem_height = elem_inner_height - $('#navigation').height(); // fix
            //$('.eb-image-right-bottom').css("height", elem_height);
            $('.paragraphs-item-intro').css({
                "height": elem_height,
                "margin-top":  $('#navigation').height(),
            });
        },
        setMainContentToFixed: function(){
            this.content_elem.addClass('fixed');
            this.spacer_elem.css('display','block');
        },
        setSpacer: function(){
            if(!this.spacer_elem){
                this.basic_height = this.content_elem.height();
                this.spacer_elem = $('<div id="main-spacer"></div>').attr("aria-role", "presentation")
                    .css("visibility", "hidden")
                    .css("height", this.basic_height).css("z-index", "-100")
                    .insertAfter(this.content_elem);
            }
        },
        removeSpacer: function(){
            if(this.spacer_elem){
                this.spacer_elem.remove();
                this.spacer_elem = null;
            }
        },
        destroy: function(){
            this.removeSpacer();
            this.content_elem.removeClass('fixed');
        },
        initWayPointScroll: function($splash_elem,$content_elem,$brand_elem,$spacer_elem){
            if(window.innerWidth > 767) {
                var match_height = $splash_elem.innerHeight();
                if ($(window).scrollTop() >= match_height) {
                    $content_elem.removeClass("fixed");
                    $spacer_elem.css('display', 'none').css('height', this.basic_height);
                } else {
                    var brand_inner_h = $brand_elem.outerHeight(),
                        spacer_inner_h = this.basic_height,
                        brand_inner_h_adj = brand_inner_h - 10;
                    $content_elem.addClass("fixed");
                    $spacer_elem.css('display', 'block').css("height", spacer_inner_h - brand_inner_h_adj);
                }
            }
        },
        init: function () {

            // init elem
            this.splash_elem = $('#above-content');
            this.brand_elem = $('#header');
            this.content_elem = $('#page-wrapper');

            // Not for mobile
            if(window.innerWidth < 768){
                this.destroy();
                return;
            }

            this.removeSpacer();
            this.setSpacer();
            this.setSplashHeight();
            this.setMainContentToFixed();

            if(this.splash_elem){
                var loc_splash = this.splash_elem;
                var loc_brand = this.brand_elem;
                var loc_content = this.content_elem;
                var loc_spacer = this.spacer_elem;
                $(window).bind('scroll', function(e){
                    CSU_LA_Splash.initWayPointScroll(loc_splash,loc_content,loc_brand,loc_spacer);
                });
                CSU_LA_Splash.initWayPointScroll(loc_splash,loc_content,loc_brand,loc_spacer);
            }
        }
    };

    if (typeof define === 'function' && define.amd) {
        define(CSU_LA_Splash);
    }
    else {
        window.CSU_LA_Splash = CSU_LA_Splash;
    }

    $(window).load(function () {
        if($('body').hasClass('node-type-homepage')){
            CSU_LA_Splash.init();
        }

    });
    $(window).resize(function() {
        if($('body').hasClass('node-type-homepage')){
            CSU_LA_Splash.init();
        }
    });


  $(window).load(function() {
    $('.section-eddie-gateway-test .paragraphs-item-accordion-with-side-image .paragraphs-item-accordion').each(function () {
      if (!$(this).find('.paragraphs-item-accordion-item').parent().find('.paragraphs-item-accordion-item.active').length) {
        $(this).find('.paragraphs-item-accordion-item').parent().find('.paragraphs-item-accordion-item:first-child').addClass('active');
      }
    });
  });


  Drupal.behaviors.parallax_background_mobile_Image = {
    attach: function (context, settings) {
      mobile_image_url = [];
      var images = Drupal.settings.entity_background_image;
      if(settings.parallax_background_mobile_Image) {
        if ($(window).width() <= 991) {
          $.each(settings.parallax_background_mobile_Image, function (selector, value) {
            $('.paragraphs-item-text-over-background-image.paragraph-mobile-image.' + selector).css('background-image', 'url(' + value + ')');
          })
        }
        $(window).resize(function () {
          var win = $(this);
          if (win.width() <= 991) {
            $.each(settings.parallax_background_mobile_Image, function (selector, value) {
              $('.paragraphs-item-text-over-background-image.paragraph-mobile-image.'+ selector).css('background-image', 'url(' + value + ')');
            })
            } else if(images) {
            $.each(images, function (selector, value) {
              $(selector).css('background-image', 'url(' + value.image + ')');
              // Add class.
              $(selector).addClass('eb-image');
              // Add style class.
              if (value.style) {
                $(selector).addClass(value.style);
              }
            });
          }
        });
      }
    }
  }



    function scrollDown() {
        var vheight = $(window).height();
        $('html, body').animate({
            scrollTop: (Math.floor($(window).scrollTop() / vheight)+1) * vheight
        }, 500);
    };




    function getCurrentNodeId() {
        var $body = $('body.node-type-homepage');
        if ( ! $body.length )
            return false;
        var bodyClasses = $body.attr('class').split(/\s+/);
        for ( i in bodyClasses ) {
            var c = bodyClasses[i];
            if ( c.length > 10 && c.substring(0, 10) === "page-node-" )
                return parseInt(c.substring(10), 10);
        }
        return false;
    }

})(jQuery, Drupal, this, this.document);

(function ($) {
  Drupal.behaviors.keyboardaccessibility = {
    attach: function (context, settings) {

     function sectionMenuTabIndex() {

        if ( jQuery('.region-menu-horizontal .menu').hasClass('opened')
            || jQuery( window ).width() > 1112 ) {
          jQuery('.region-menu-horizontal .block > ul > li > a').attr('tabindex','0');
          jQuery('.region-menu-horizontal a.menuparent > .child-menu-toggle').attr('tabindex','0');
          jQuery('.region-menu-horizontal li.menuparent').each(function() {
            if ( jQuery(this).hasClass('opened') || jQuery( window ).width() > 1112 ) {
              jQuery(this).find('.menu a').attr('tabindex','0');
            }
          });
        } else {
          if(jQuery(window).width() > 1112){
            jQuery('.region-menu-horizontal .menu').find('a, .child-menu-toggle').attr('tabindex','-1');
          }
        }

        if ( jQuery('.block-og-menu > .menu').hasClass('opened') || jQuery( window ).width() > 1112 ) {
          jQuery('.block-og-menu > .menu > .menu__item > a').attr('tabindex','0');
          jQuery('.block-og-menu > .menu > .menu__item > a > .child-menu-toggle').attr('tabindex','0');

          jQuery('.block-og-menu > .menu > .menu__item').each(function() {
            if ( jQuery(this).hasClass('opened') || jQuery( window ).width() > 1112 ) {
              jQuery(this).find('.menu a').attr('tabindex','0');
            }
          });
        } else {
          // jQuery('.  > .menu').find('a, .child-menu-toggle').attr('tabindex','-1');
        }

        //console.log('Section menu tab index function ran.');
      }

      // Set tabindex values based on zoom/responsiveness
      function setMenuTabIndex() {
        if (jQuery('.kwall-slide-in-nav-search-menu, .kwall-slide-in-nav-menu').hasClass('active')) {
          jQuery('.kwall-slide-in-nav-search-menu a, .kwall-slide-in-nav-search-menu input, .kwall-slide-in-nav-menu a, .kwall-slide-in-nav-menu input').attr('tabindex', '0');
        } else {
          jQuery('.kwall-slide-in-nav-search-menu a, .kwall-slide-in-nav-search-menu input, .kwall-slide-in-nav-menu a, .kwall-slide-in-nav-menu input').attr('tabindex', '-1');
        }
        if (jQuery('#block-block-26').is(':visible')) {
          jQuery('.kwall-slide-in-nav-menu a').attr('tabindex', '-1');
          jQuery('#block-block-16').addClass('mobile-logo-header');
          if (jQuery('.kwall-slide-in-nav-menu').hasClass('active')) {
            jQuery('.kwall-slide-in-nav-menu a').attr('tabindex', '0');
          }
          jQuery('#block-menu-block-8 a, #block-menu-block-8 .header-search-open-button').attr('tabindex', '-1');
          jQuery('#block-kwall-slide-menu-search a').attr('tabindex', '-1');
          jQuery('.kwall-slide-in-nav-search-menu a, .kwall-slide-in-nav-search-menu input').attr('tabindex', '-1');
        } else {
          jQuery('#block-menu-block-8 a, #block-menu-block-8 .header-search-open-button').attr('tabindex', '0');
          jQuery('.kwall-slide-in-nav-menu a, #linkicon-bean-slide-menu-toggle-field-menu-toggle-2 a.header-menu-open-button').attr('tabindex', '-1');
          jQuery('.header-utility-nav-menu-block a, #block-menu-block-3--2 a').attr('tabindex', '0');
          jQuery('#block-block-16').removeClass('mobile-logo-header');
        }
      }

      // Add child menu toggles for keyboard accessibility
      addChildMenuToggle();
      addChildMenuToggleHorizontal();

      function addChildMenuToggleHorizontal() {
        jQuery('.region-menu-horizontal .menu > li > a').each(function() {
          if ( jQuery(this).hasClass('menuparent') ) {
            if ( !jQuery(this).find('.child-menu-toggle').length ) {
              // jQuery(this).append('<span class="child-menu-toggle" tabindex="0"></span>');
              if(jQuery(this).parent().find('.child-menu-toggle').length == 0){
                jQuery('<span class="child-menu-toggle" tabindex="0"></span>').insertAfter(jQuery(this));
              }
            }
          }
          if ( jQuery(this).hasClass('expanded') ) {
            if ( !jQuery(this).find('.child-menu-toggle').length ) {
              // jQuery(this).find('a').first().append('<span class="child-menu-toggle" tabindex="0"></span>');
              if(jQuery(this).find('.child-menu-toggle').length == 0) {
                jQuery('<span class="child-menu-toggle" tabindex="0"></span>').insertAfter(jQuery(this).find('a').first());
              }
            }
          }
        });

        // console.log('Menu toggles added.');
      }
      function addChildMenuToggle() {
        jQuery('.region-sidebar .block-og-menu .menu.opened > li').each(function() {
          if ( jQuery(this).hasClass('menuparent') ) {
            if ( !jQuery(this).find('.child-menu-toggle').length ) {
              // jQuery(this).append('<span class="child-menu-toggle" tabindex="0"></span>');
              jQuery('<span class="child-menu-toggle" tabindex="0"></span>').insertAfter( ".sidebar-og-block .menuparent > a" );
            }
          }
          if ( jQuery(this).hasClass('expanded') ) {
            var _cHeight = jQuery(this).find('a').first().innerHeight();
            if ( !jQuery(this).find('.child-menu-toggle').length ) {
              jQuery(this).find('a').first().after('<span style="height: '+_cHeight+'px !important;" class="child-menu-toggle" tabindex="0"></span>');
            } else {
              jQuery(this).find('.child-menu-toggle').css('cssText','height: '+_cHeight+'px !important;');
            }
          }
        });

        // console.log('Menu toggles added.');
      }

      function addDesktopChildMenuToggle(){
        $('.sidebar-og-block .is-expanded').each(function(e){
          var _height = $(this).find('a').first().innerHeight();
          if ( !$(this).find('.child-menu-toggle-desktop').length ) {
            $(this).find('a').first().after('<span style="height: '+_height+'px !important;" class="child-menu-toggle-desktop" tabindex="0"></span>');
          } else{
            $(this).find('.child-menu-toggle-desktop').css('cssText','height: '+_height+'px !important;');
          }
        });
      }
      addDesktopChildMenuToggle();

      // Vertical scroll to tab focus
      function scrollToFocus() {
        var container = jQuery("html,body");
        var focus = jQuery('.tabfocus');
        var offset = focus.offset();

        // scroll to focus if not already in viewport
        if ( document.querySelector("body").getBoundingClientRect().top < -300 ) {
          container.animate({
            scrollTop: offset.top - 300,
            scrollLeft: 0
          }, 300);
        }
      }

      // OG/Superfish mobile keyboard accessibility
      $('.region-menu-horizontal .block-title, .block-og-menu .block-title').attr('tabindex','0');

      $('body').keyup(function(event) {
        if (event.which === 13 || event.keyCode === 13 || event.key === "Enter") {

          // Trigger click on mobile menu block titles
          $('.block-title.tabfocus').trigger('click');
          setTimeout(function () {
            sectionMenuTabIndex();
            setMenuTabIndex();
          }, 200);

          // Add tabbable elements to sidebar menu
          addChildMenuToggle();
          addChildMenuToggleHorizontal();

          // Toggle parent menu classes to open child menus
          $('.menuparent.tabfocus').parent().toggleClass("opened");
          setTimeout(function () {
            sectionMenuTabIndex();
          }, 200);
        }
        if(event.which === 9 || event.keyCode === 9) {
          sectionMenuTabIndex();
        }
      });

      $('body').on('click', function () {
        setTimeout(function () {
          setMenuTabIndex();
          sectionMenuTabIndex();
          addChildMenuToggle();
          addChildMenuToggleHorizontal();
        }, 200);
      });

      //disable menu link on Enter if toggle is focused
      jQuery('.region-menu-horizontal .menuparent, .region-sidebar li.expanded > a').keypress(function (e) {
            var code = (e.keyCode ? e.keyCode : e.which);
            if (code == 13) {
                if (jQuery(this).find('.child-menu-toggle').is(':focus')) {
                    // e.preventDefault();
                }
            }
        });

      // Keep track of tab and shift keys
      var tabKey = false,
        shiftKey = false;

      $('body').on('keydown', function(e) {
        tabKey = e.which === 9 ? true : false;
        shiftKey = e.shiftKey;
      });

      $(window).load(function () {

        setTimeout(function () {

          // Add tab focus class to tabbable elements
          var $all_links = $('#skip-link a, #header a, #page-wrapper a, #banner-wrapper a, .search-link span, .region-menu-horizontal .block-title, .block-og-menu .block-title');

          // Add class to last social link in quick links menu
          $('#block-menu-block-11 .social-media-links-footer a').last().addClass('last-social');

          // Tab focus logic links selected above
          var mousedown = false;

          $all_links.on('mousedown', function () {
            mousedown = true;
          });
          $all_links.on('focusin', function () {
            if (!mousedown) {
              $all_links.each(function (index) {
                // $(this).parent().removeClass("open");
              });
              $(this).addClass("tabfocus");
            }
            mousedown = false;
            scrollToFocus();
          });
          $all_links.on('focusout', function () {
            $(this).removeClass('tabfocus');
          });

          // Set menu item tabindex values on load
          setMenuTabIndex();
          sectionMenuTabIndex();

          // Reset menu tabindex values on first menu link focus
          $('#kwall-slide-in-nav-menu').on('focusin', '.block-menu-block .menu__item.first a' ,function(){
            setMenuTabIndex();
          });

          // Tabbing away from last mobile menu link, focus on close icon
          $('#kwall-slide-in-nav-menu').on('blur', '.block-menu-block .menu.appended-items .menu__item.last.no-border a' ,function(){
            if (tabKey && !shiftKey) {
              $('.kwall-slide-in-nav-menu .slide-menu-close-button').focus();
              $('.kwall-slide-in-nav-menu .slide-menu-close-button').addClass('tabbed-from-last');
              tabKey = shiftKey = false;
            }
          });

          // Focus on last link if shift tab back
          $('#kwall-slide-in-nav-menu').on('blur', '.slide-menu-close-button', function(){
            if (tabKey && shiftKey) {
              $('.block-menu-block .menu.appended-items .menu__item.last.no-border a').focus();
              $('.kwall-slide-in-nav-menu .slide-menu-close-button').removeClass('tabbed-from-last');
              tabKey = shiftKey = false;
            }
          });

          // Tabbing away from last quick links menu link, focus on close icon
          $('#kwall-slide-in-nav-search-menu').on('blur', '.fab.last-social' ,function(){
            if (tabKey && !shiftKey) {
              $('#kwall-slide-in-nav-search-menu .slide-menu-close-button').focus();
              $('#kwall-slide-in-nav-search-menu .slide-menu-close-button').addClass('tabbed-from-last');
              tabKey = shiftKey = false;
            }
          });

          // Focus on last link if shift tab back
          $('#kwall-slide-in-nav-search-menu').on('blur', '.slide-menu-close-button', function(){
            if (tabKey && shiftKey) {
              if ( $('.slide-menu-close-button').hasClass('tabbed-from-last') ) {
                $('#kwall-slide-in-nav-search-menu .fab.last-social').focus();
                $('#kwall-slide-in-nav-search-menu .slide-menu-close-button').removeClass('tabbed-from-last');
              }
              tabKey = shiftKey = false;
            }
          });

        }, 250);

      });

      // Reset menu tabindex values on resize
      $(window).resize(function () {
        setMenuTabIndex();
        sectionMenuTabIndex();
        addChildMenuToggle();
        addChildMenuToggleHorizontal();
        addDesktopChildMenuToggle();
      });

    }
  };

  $(document).ready(function () {

    // Move primary tabs.
    var tabs = $('.tabs-primary.tabs.primary');
    if(tabs.length){
      $('.tabs-primary.tabs.primary').prependTo('#content');
    }

    /**
     * https://app.asana.com/0/1169491993850290/1199536827183280
     * Sidebar Menu - Desktop styling
     */
    $(document).on('click', '.sidebar-og-block .is-expanded .child-menu-toggle-desktop, .sidebar-og-block .is-expanded .child-menu-toggle', function(e){
      e.preventDefault();
      if($(this).hasClass('child-menu-toggle-desktop')){
        $(this).next().toggle();
      }
      if($(this).hasClass('child-menu-toggle')){
        $(this).next().next().toggle();
        $(this).parent().toggleClass('opened');
      }
      // $(this).parent().toggleClass('opened');
    });
    $(document).on('keypress', '.sidebar-og-block .is-expanded .child-menu-toggle-desktop, .sidebar-og-block .is-expanded .child-menu-toggle', function(e){
      var code = (e.keyCode ? e.keyCode : e.which);
      if (code == 13) {
        if($(this).hasClass('child-menu-toggle-desktop')){
          $(this).next().toggle();
          $(this).parent().toggleClass('opened');
        }
        if($(this).hasClass('child-menu-toggle')){
          $(this).next().next().toggle();
          $(this).parent().toggleClass('opened');
        }
      }
    });

    /**
     * https://app.asana.com/0/1169491993850290/1199536827183274
     * Horizontal Menu Desktop Style
     */
    jQuery('<span class="child-menu-toggle-desktop" tabindex="0"></span>').insertAfter( ".region-menu-horizontal .sf-depth-1.menuparent > a" );


    $(document).on('keypress', '.region-menu-horizontal .sf-depth-1.menuparent .child-menu-toggle-desktop, .region-menu-horizontal .sf-depth-1.menuparent .child-menu-toggle', function(e){
      var code = (e.keyCode ? e.keyCode : e.which);
      if (code == 13) {
        $(this).parent().toggleClass('is-focused');
      }
    });
    $('.region-menu-horizontal li.menuparent').find('.last > a').on('keydown', function(e){
      var code = (e.keyCode ? e.keyCode : e.which);
      if (code == 9) {
        $(this).parent().parent().parent().toggleClass('is-focused');
      }
    });


    jQuery('.main-menu-block').find('.sf-depth-1.menuparent, .child-menu-toggle-desktop').on('hover', function(){
      jQuery(this).parent().children('.menu').toggle();
    });

    /**
     * Landing Page Menu
     */
    $('.node-type-landing-page-no-sidebars .region-menu-horizontal li.is-expanded').each(function () {
      $('<span class="child-menu-toggle-desktop" tabindex="0"></span><span class="child-menu-toggle" tabindex="0"></span>').insertAfter($(this).children('a'));
    });
    $(document).on('keypress', '.node-type-landing-page-no-sidebars .region-menu-horizontal li.is-expanded .child-menu-toggle-desktop, .region-menu-horizontal li.is-expanded .child-menu-toggle', function(e){
      var code = (e.keyCode ? e.keyCode : e.which);
      if (code == 13) {
        $(this).parent().toggleClass('is-focused');
      }
    });
    $('.region-menu-horizontal li.is-expanded ').find('.last > a').on('keydown', function(e){
      var code = (e.keyCode ? e.keyCode : e.which);
      if (code == 9) {
        $(this).parent().parent().parent().toggleClass('is-focused');
      }
    });


    jQuery('.node-type-landing-page-no-sidebars').find('.child-menu-toggle-desktop').on('hover', function(){
      jQuery(this).parent().children('.menu').toggle();
    });

    $('.node-type-landing-page-no-sidebars .region-menu-horizontal  li.is-expanded > a, .region-menu-horizontal li.is-expanded > span').click(function(e) {
      if(window.innerWidth <= 1112 || navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i)) {
        $(this).focusout();
        if (psuedoClick(this, e).after || $(this).prop("tagName") == 'SPAN') {
          e.preventDefault();
          if ($(this).parent().hasClass('opened')) {
            $(this).parent().removeClass('opened').removeClass('is-focused');
          } else {
            $(this).parent().addClass('opened').addClass('is-focused');
            if(window.innerWidth > 1112) {
              $(this).parent().siblings().removeClass('opened').removeClass('is-focused');
            }
          }
        }
      }
    });
    $('.node-type-landing-page-no-sidebars .region-menu-horizontal  li.is-expanded > span').on('keydown', function(e) {
      var code = (e.keyCode ? e.keyCode : e.which);
      if(code == 13){
        if(window.innerWidth <= 1112 || navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i)) {
          $(this).focusout();
          if (psuedoClick(this, e).after || $(this).prop("tagName") == 'SPAN') {
            // e.preventDefault();
            if ($(this).parent().hasClass('opened')) {
              $(this).parent().removeClass('opened').removeClass('is-focused');
            } else {
              $(this).parent().addClass('opened').addClass('is-focused');
              if(window.innerWidth > 1112) {
                $(this).parent().siblings().removeClass('opened').removeClass('is-focused');
              }
            }
          }
        }
      }
    });

    $(document).on('click', '.node-type-landing-page-no-sidebars .region-menu-horizontal li.is-expanded span.child-menu-toggle', function () {
      $(this).parent().toggleClass('opened');
    });
    $(document).on('keypress', '.node-type-landing-page-no-sidebars .region-menu-horizontal li.is-expanded span.child-menu-toggle', function (e) {
      var code = (e.keyCode ? e.keyCode : e.which);
      if (code == 13) {
        $(this).parent().toggleClass('opened');
      }
    });

    $('.paragraphs-item-slider .flexslider').flexslider({
      animation: "fade",
      slideshow: true,
      slideshowSpeed: 6000,
      pauseOnHover: true,
    });

    $('.paragraphs-item-slider-with-side-text-main .flexslider').flexslider({
      animation: "fade",
      slideshow: false
    });

    var alert_block = function () {
      if ($('.block-nodeblock.alert-block').length > 0) {
        $('body').addClass('alert-added');
        var height = $('.block-nodeblock.alert-block').outerHeight();
        $('#header, #above-content').css('margin-top', height + 'px');
      }
    }
    alert_block();
    $(window).resize(function () {
      alert_block();
    });
  });
}(jQuery));
;
!function(){"use strict";if("undefined"!=typeof window){var t=window.navigator.userAgent.match(/Edge\/(\d{2})\./),e=!!t&&parseInt(t[1],10)>=16;if("objectFit"in document.documentElement.style!=!1&&!e)return void(window.objectFitPolyfill=function(){return!1});var i=function(t){var e=window.getComputedStyle(t,null),i=e.getPropertyValue("position"),n=e.getPropertyValue("overflow"),o=e.getPropertyValue("display");i&&"static"!==i||(t.style.position="relative"),"hidden"!==n&&(t.style.overflow="hidden"),o&&"inline"!==o||(t.style.display="block"),0===t.clientHeight&&(t.style.height="100%"),-1===t.className.indexOf("object-fit-polyfill")&&(t.className=t.className+" object-fit-polyfill")},n=function(t){var e=window.getComputedStyle(t,null),i={"max-width":"none","max-height":"none","min-width":"0px","min-height":"0px",top:"auto",right:"auto",bottom:"auto",left:"auto","margin-top":"0px","margin-right":"0px","margin-bottom":"0px","margin-left":"0px"};for(var n in i){e.getPropertyValue(n)!==i[n]&&(t.style[n]=i[n])}},o=function(t,e,i){var n,o,l,a,d;if(i=i.split(" "),i.length<2&&(i[1]=i[0]),"x"===t)n=i[0],o=i[1],l="left",a="right",d=e.clientWidth;else{if("y"!==t)return;n=i[1],o=i[0],l="top",a="bottom",d=e.clientHeight}return n===l||o===l?void(e.style[l]="0"):n===a||o===a?void(e.style[a]="0"):"center"===n||"50%"===n?(e.style[l]="50%",void(e.style["margin-"+l]=d/-2+"px")):n.indexOf("%")>=0?(n=parseInt(n),void(n<50?(e.style[l]=n+"%",e.style["margin-"+l]=d*(n/-100)+"px"):(n=100-n,e.style[a]=n+"%",e.style["margin-"+a]=d*(n/-100)+"px"))):void(e.style[l]=n)},l=function(t){var e=t.dataset?t.dataset.objectFit:t.getAttribute("data-object-fit"),l=t.dataset?t.dataset.objectPosition:t.getAttribute("data-object-position");e=e||"cover",l=l||"50% 50%";var a=t.parentNode;i(a),n(t),t.style.position="absolute",t.style.height="100%",t.style.width="auto","scale-down"===e&&(t.style.height="auto",t.clientWidth<a.clientWidth&&t.clientHeight<a.clientHeight?(o("x",t,l),o("y",t,l)):(e="contain",t.style.height="100%")),"none"===e?(t.style.width="auto",t.style.height="auto",o("x",t,l),o("y",t,l)):"cover"===e&&t.clientWidth>a.clientWidth||"contain"===e&&t.clientWidth<a.clientWidth?(t.style.top="0",t.style.marginTop="0",o("x",t,l)):"scale-down"!==e&&(t.style.width="100%",t.style.height="auto",t.style.left="0",t.style.marginLeft="0",o("y",t,l))},a=function(t){if(void 0===t)t=document.querySelectorAll("[data-object-fit]");else if(t&&t.nodeName)t=[t];else{if("object"!=typeof t||!t.length||!t[0].nodeName)return!1;t=t}for(var i=0;i<t.length;i++)if(t[i].nodeName){var n=t[i].nodeName.toLowerCase();"img"!==n||e?"video"===n&&(t[i].readyState>0?l(t[i]):t[i].addEventListener("loadedmetadata",function(){l(this)})):t[i].complete?l(t[i]):t[i].addEventListener("load",function(){l(this)})}return!0};document.addEventListener("DOMContentLoaded",function(){a()}),window.addEventListener("resize",function(){a()}),window.objectFitPolyfill=a}}();;
