/**
 * impress.js
 *
 * impress.js is a presentation tool based on the power of CSS3 transforms and transitions
 * in modern browsers and inspired by the idea behind prezi.com.
 *
 * MIT Licensed.
 *
 * Copyright 2011 Bartek Szopka (@bartaz)
 */

(function ( document, window ) {
    'use strict';

    var impress = window.impress = {};

    // HELPER FUNCTIONS

    var forEach = Array.prototype.forEach,
        slice = Array.prototype.slice,
        isArray = Array.isArray;
    
    var pfx = (function () {

        var style = document.createElement('dummy').style,
            prefixes = 'Webkit Moz O ms Khtml'.split(' '),
            memory = {};
            
        return function ( prop ) {
            if ( typeof memory[ prop ] === "undefined" ) {

                var ucProp  = prop.charAt(0).toUpperCase() + prop.substr(1),
                    props   = (prop + ' ' + prefixes.join(ucProp + ' ') + ucProp).split(' ');

                memory[ prop ] = null;
                for ( var i in props ) {
                    if ( style[ props[i] ] !== undefined ) {
                        memory[ prop ] = props[i];
                        break;
                    }
                }

            }

            return memory[ prop ];
        }

    })();

    var arrayify = function ( a ) {
        return [].slice.call( a );
    };
    
    var css = function ( el, props ) {
        var key, pkey;
        for ( key in props ) {
            if ( props.hasOwnProperty(key) ) {
                pkey = pfx(key);
                if ( pkey != null ) {
                    el.style[pkey] = props[key];
                }
            }
        }
        return el;
    }
    
    var byId = function ( id ) {
        return document.getElementById(id);
    }
    
    var $ = function ( selector, context ) {
        context = context || document;
        return context.querySelector(selector);
    };
    
    var $$ = function ( selector, context ) {
        context = context || document;
        return arrayify( context.querySelectorAll(selector) );
    };
    
    var translate = function ( t ) {
        return " translate3d(" + (Number(t.x) || 0) + "px," +
            (Number(t.y) || 0) + "px," + (Number(t.z) || 0) + "px) ";
    };
    
    var rotate = function ( r, revert ) {
        var rX = " rotateX(" + (Number(r.x) || 0) + "deg) ",
            rY = " rotateY(" + (Number(r.y) || 0) + "deg) ",
            rZ = " rotateZ(" + (Number(r.z) ||
                 (isNaN(r.z) && Number(r)) || 0) + "deg) ";
        
        return revert ? rZ+rY+rX : rX+rY+rZ;
    };
    
    var scale = function ( s ) {
        return " scale(" + s + ") ";
    }
    
    var impressEl, canvas, steps, current, active, hashTimeout;

    var select = function ( el ) {
        if ( !el || !el.stepData || el == active) {
            // selected element is not defined as step or is already active
            return false;
        }
        
        // Sometimes it's possible to trigger focus on first link with some keyboard action.
        // Browser in such a case tries to scroll the page to make this element visible
        // (even that body overflow is set to hidden) and it breaks our careful positioning.
        //
        // So, as a lousy (and lazy) workaround we will make the page scroll back to the top
        // whenever slide is selected
        //
        // If you are reading this and know any better way to handle it, I'll be glad to hear about it!
        window.scrollTo(0, 0);
        
        var step = el.stepData;
        
        if ( active ) {
            active.classList.remove("active");
        }
        el.classList.add("active");
        
        impressEl.className = "step-" + el.id;
        
        // `#/step-id` is used instead of `#step-id` to prevent default browser
        // scrolling to element in hash
        //
        // and it has to be set after animation finishes, because in chrome it
        // causes transtion being laggy
        window.clearTimeout( hashTimeout );
        hashTimeout = window.setTimeout(function () {
            window.location.hash = "#/" + el.id;
        }, 1000);
        
        var target = {
            rotate: {
                x: -((step.rotate && Number(step.rotate.x)) || 0),
                y: -((step.rotate && Number(step.rotate.y)) || 0),
                z: -((step.rotate && Number(step.rotate.z)) ||
                    ((!step.rotate || isNaN(step.rotate.z))
                        && Number(step.rotate)) || 0)
            },
            translate: {
                x: -(Number(step.x) || 0),
                y: -(Number(step.y) || 0),
                z: -(Number(step.z) || 0)
            },
            scale: 1 / (Number(step.scale) || 1)
        };
        
        // check if the transition is zooming in or not
        var zoomin = target.scale >= current.scale;
        
        // if presentation starts (nothing is active yet)
        // don't animate (set duration to 0)
        var duration = (active) ? "1s" : "0";
        
        css(impressEl, {
            // to keep the perspective look similar for different scales
            // we need to 'scale' the perspective, too
            perspective: step.scale * 1000 + "px",
            transform: scale(target.scale),
            transitionDuration: duration,
            transitionDelay: (zoomin ? "500ms" : "0ms")
        });
        
        css(canvas, {
            transform: rotate(target.rotate, true) + translate(target.translate),
            transitionDuration: duration,
            transitionDelay: (zoomin ? "0ms" : "500ms")
        });
        
        current = target;
        active = el;
        
        return el;
    };
    
    
    // EVENTS
    
    var setSubSteps = function (el) {
        var steps = el.querySelectorAll(".substep"),
        order = [], unordered = [];
        forEach.call(steps, function (el) {
            var index = Number(el.dataset.order);
            if (!isNaN(index)) {
                if (!order[index]) {
                    order[index] = el;
                } else if (Array.isArray(order[index])) {
                    order[index].push(el);
                } else {
                    order[index] = [order[index], el];
                }
            } else {
                unordered.push(el);
            }
        });
        el.subSteps = order.filter(Boolean).concat(unordered);
    };

    var setPrevious = function (data) {
        if (isArray(data)) {
            data.forEach(setPrevious);
            return;
        }
        data.classList.remove('active');
        data.classList.add('previous');
    };

    var setActive = function (data) {
        if (isArray(data)) {
            data.forEach(setActive);
            return;
        }
        data.classList.remove('previous');
        data.classList.add('active');
    };

    var clearSub = function (data) {
        if (isArray(data)) {
            data.forEach(clearSub);
            return;
        }
        data.classList.remove('active');
        data.classList.remove('previous');
    };

    var selectPrev = function () {
        var subactive, next, subSteps;
        if (!active.subSteps) {
            setSubSteps(active);
        }
        subSteps = active.subSteps;
        if (false && subSteps.length && ((subactive = subSteps.active) || (subactive === 0))) {
            clearSub(subSteps[subactive]);
            if (subactive) {
                setActive(subSteps[--subactive]);
                subSteps.active = subactive;
            } else {
                subSteps.active = null;
            }
            return;
        }
        next = steps.indexOf( active ) - 1;
        next = next >= 0 ? steps[ next ] : steps[ steps.length-1 ];
        if (!next.subSteps) {
            setSubSteps(next);
        }
        if (next.subSteps.length &&
            (next.subSteps.active !== (next.subSteps.length - 1))) {
            slice.call(next.subSteps, 0, -1).forEach(setPrevious);
            setActive(next.subSteps[next.subSteps.length - 1]);
            next.subSteps.active = next.subSteps.length - 1;
        }
        select(next);
    };

    var selectNext = function () {
        var subactive, next, subSteps;
        if (!active.subSteps) {
            setSubSteps(active);
        }
        subSteps = active.subSteps;
        if (false && subSteps.length && ((subactive = subSteps.active) !==
            (subSteps.length - 1))) {
            if (subactive != null) {
                setPrevious(subSteps[subactive]);
            } else {
                subactive = -1;
            }
            setActive(subSteps[++subactive]);
            subSteps.active = subactive;
            return;
        }
        next = steps.indexOf( active ) + 1;
        next = next < steps.length ? steps[ next ] : steps[ 0 ];
        if (!next.subSteps) {
            setSubSteps(next);
        }
        if (next.subSteps.active != null) {
            forEach.call(next.subSteps, clearSub);
            next.subSteps.active = null;
        }
        select(next);
    };

    var getElementFromUrl = function () {
        // get id from url # by removing `#` or `#/` from the beginning,
        // so both "fallback" `#slide-id` and "enhanced" `#/slide-id` will work
        return byId( window.location.hash.replace(/^#\/?/,"") );
    }

    impress.init = function () {
        // CHECK SUPPORT

        var ua = navigator.userAgent.toLowerCase();
        var impressSupported = ( pfx("perspective") != null ) &&
            ( ua.search(/(iphone)|(ipod)|(ipad)|(android)/) == -1 );

        // DOM ELEMENTS

        impressEl = byId("impress");

        if (!impressSupported) {
            impressEl.className = "impress-not-supported";
            return;
        } else {
            impressEl.className = "";
        }

        canvas = document.createElement("div");
        canvas.className = "canvas";

        arrayify( impressEl.childNodes ).forEach(function ( el ) {
            canvas.appendChild( el );
        });
        impressEl.appendChild(canvas);

        steps = $$(".step", impressEl);

        // SETUP
        // set initial values and defaults

        document.documentElement.style.height = "100%";

        css(document.body, {
            height: "100%",
            overflow: "hidden"
        });

        var props = {
            position: "absolute",
            transformOrigin: "top left",
            transition: "all 0s ease-in-out",
            transformStyle: "preserve-3d"
        }

        css(impressEl, props);
        css(impressEl, {
            top: "50%",
            left: "50%",
            perspective: "1000px"
        });
        css(canvas, props);

        current = {
            translate: { x: 0, y: 0, z: 0 },
            rotate:    { x: 0, y: 0, z: 0 },
            scale:     1
        };

        // making given step active

        active = null;
        hashTimeout = null;

        var conf = impress.steps || (impress.steps = {});

        steps.forEach(function ( el, idx ) {
            if ( !el.id ) {
                el.id = "step-" + (idx + 1);
            }

            var data = el.dataset,
            step = conf[el.id] || (conf[el.id] = {});

            (step.x == null) && (step.x = (Number(data.x) || 0));
            (step.y == null) && (step.y = (Number(data.y) || 0));
            (step.z == null) && (step.z = (Number(data.z) || 0));
            (step.rotate == null) && (step.rotate = (Number(data.rotate) || 0));
            if (data.rotateX || data.rotateY) {
                (typeof step.rotate !== 'object') &&
                    (step.rotate = { z: step.rotate });
                (step.rotate.x == null) && (step.rotate.x = (data.rotateX || 0));
                (step.rotate.y == null) && (step.rotate.y = (data.rotateY || 0));
            }
            (step.scale == null) && (step.scale = Number(data.scale) || 1);

            el.stepData = step;

            css(el, {
                position: "absolute",
                transform: "translate(-50%,-50%)" +
                    translate(step) +
                    rotate(step.rotate) +
                    scale(Number(step.scale) || 1),
                transformStyle: "preserve-3d"
            });

        });

        // EVENTS

        document.addEventListener("keydown", function ( event ) {
            if ( event.keyCode == 9 || ( event.keyCode >= 32 && event.keyCode <= 34 ) || (event.keyCode >= 37 && event.keyCode <= 40) ) {
                switch( event.keyCode ) {
                case 33: ; // pg up
                case 37: ; // left
                case 38:   // up
                         selectPrev();
                         break;
                case 9:  ; // tab
                case 32: ; // space
                case 34: ; // pg down
                case 39: ; // right
                case 40:   // down
                         selectNext();
                         break;
                }

                event.preventDefault();
            }
        }, false);

        document.addEventListener("click", function ( event ) {
            // event delegation with "bubbling"
            // check if event target (or any of its parents is a link or a step)
            var target = event.target;
            while ( (target.tagName != "A") &&
                (!target.stepData) &&
                (target != document.body) ) {
                target = target.parentNode;
            }

            if ( target.tagName == "A" ) {
                var href = target.getAttribute("href");

                // if it's a link to presentation step, target this step
                if ( href && href[0] == '#' ) {
                    target = byId( href.slice(1) );
                }
            }

            if ((target.tagName == "A") || (active && (active.id == 'overview'))) {
                if ( select(target) ) {
                    event.preventDefault();
                }
            } else {
                selectNext();
            }
        }, false);

        window.addEventListener("hashchange", function () {
            select( getElementFromUrl() );
        }, false);

        // START
        // by selecting step defined in url or first step of the presentation
        select(getElementFromUrl() || steps[0]);

    };

})(document, window);

