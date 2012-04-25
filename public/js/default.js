var presentation = {};

(function(ns) { 
    var totalNoOfSlides; 

    var setSlidesPosition = function ( ) {
        var slides = document.querySelectorAll("div.slide"),
         xPos = 0;
         for (var i = 0; i < slides.length; i++) {
             slides[i].setAttribute("data-x", xPos);
             if (!$(slides[i]).hasClass("flip-front")) {
                xPos += 1000;
             };
         };       
    };

    var setCounter = function() {
        var forEach = Array.prototype.forEach,
            steps = document.querySelectorAll("div.step");
            totalNoOfSlides = $(".step").length;

        forEach.call(steps, function (dom, index) {
           dom.setAttribute("data-counter", index + 1);
        });
    }; 

    var stepEnter = function() {
        $(".slideno").html($(".present").attr("data-counter") + "/" + totalNoOfSlides).fadeIn("fast");
    };

    var stepLeave = function() {
        $(".slideno").fadeOut("fast");
    };

    var setEventHandlers = function() { 
        addEventListener("impress:stepenter", stepEnter, false);
        addEventListener("impress:stepleave", stepLeave, false);
    }; 

    ns.init = function() {

        setSlidesPosition();
        setCounter();
        setEventHandlers();
      
        impress().init();
        hljs.initHighlightingOnLoad();
    };

})(presentation); 


