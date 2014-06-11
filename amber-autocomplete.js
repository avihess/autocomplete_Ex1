

 //child view specific to the list-element (li), which holds each word.
 var AutoCompleteWordView = Backbone.View.extend({
 	tagName: "li",
 	template: _.template('<a href="#"><%= word %></a>'),

 	events: {
 		click: 'select',
        mouseover: 'highlight',
 	},

    initialize: function(options) {
        this.parent = options.parent
        this.model = options.model;
    },

 	render: function() {
 		this.$el.html(this.template({
 			"word": this.model.get('word')
 		}));
        this.$el.attr("role", "option");
		this.$el.attr("tabindex", "-1");
 		return this;
 	},
	
	//select word from list
 	select: function () {
        this.parent.input.focus();
 		this.parent.hide();
 		this.parent.select(this.model);
 	},

    //on mouseover, highlight the appropriate row and remove the highlight from other rows
    //put the highlighted word into the input
    highlight: function () {
        var cur = this.parent.$el.children(".highlight");
        if (cur.length) {
            cur.removeClass("highlight");
        }
        this.$el[0].className += "highlight";
        this.parent.input.val(this.model.get('word'));
    },

 });

 //parent view (ul element) that holds all the autocomplete words
 var AutoCompleteView = Backbone.View.extend({
 	tagName: "ul",
 	currText: "", //text that the user has entered
 	className: "auto-complete",
 	wait: 200, //the time to wait (milliseconds) before we call the getMatches function
 	minKwrdLen: 1, //minimum number of characters required
	accessibilityOn: false, //if this is true, then a hidden div with accessibleID becomes visible (for screen readers)
	accessibleDiv: $("#accessible-div"),

 	initialize: function (options) {
 		_.extend(this, options);
 		this.getMatches = _.debounce(this.getMatches, this.wait); //when user inputs text, wait some time before firing the getMatches function. 
 	},

 	render: function () {
 		this.input.after(this.$el); //attach the list after the input field
 		this.input.keyup(_.bind(this.onKeyUp, this));
 		this.input.keydown(_.bind(this.onKeyDown, this));
        $(document).click(_.bind(function(e) {this.exitOut(e)}, this)); //if user clicks outside of list or input field, hide the list
		this.$el.width(this.input.outerWidth()); //set width of the list equal to the input text
        this.$el.attr("role", "listbox"); //WAI-ARIA
		this.$el.attr("id", "menu");
		
		if (this.accessibilityOn) {
			this.accessibleDiv.show();
		}
		else {
			this.accessibleDiv.hide();
		}
 		return this;
 	},

    //when user enters text, check to see if it is different from what was previously entered
    //then, check to see if the current text equals the minum number of characters specified
 	onKeyUp: function (event) {
        if (event.keyCode !== 38 && event.keyCode !== 40) {
     		var kwrd = this.input.val();
     		if (this.hasChanged(kwrd)) {
     			this.currText = kwrd;
     			if (this.isMin(kwrd)) {
     				this.getMatches(kwrd);
     			}
     			else {
     				this.hide();
					this.reset();
     			}
     		}
        }
 		
 	},

    //key down events
 	onKeyDown: function (event) {

 		switch (event.keyCode) {
	 		case 38: //up arrow key
	 			return this.move("up");
	 		case 40: //down arrow key
	 			return this.move("down");
	 		case 13: //enter key
	 			return this.onEnter();
	 		case 27: //escape key
                return this.exitOut(event);
 		}

 	},

    //when the user presses enter key (or clicks a list item), call the word-view's click event to select the word
 	onEnter: function () {
 		this.$el.children('.highlight').click();
		this.accessibleDiv.text('');
 		return false;
 	},

    //grab any models with text that match the user input so far, then update the list
 	getMatches: function (kwrd) {
 		var kwrd = kwrd.toLowerCase();
 		this.updateList(this.model.filter(function (model) {
                return model.get('word').toLowerCase().indexOf(kwrd) !== -1
            }), kwrd);
 	},

    //is the text at least as long as the minimum specified?
 	isMin: function (kwrd) {
 		return kwrd.length >= this.minKwrdLen;
 	},

    //has the user changed the text?
 	hasChanged: function (kwrd) {
 		return this.currText != kwrd;
 	},

    //for each model, create a child view and update the overall list
 	updateList: function (model) {
 		this.reset();
 		if (model.length) {
 			_.forEach(model, this.addWord, this);
 			this.show();
 		}
 		else {
 			this.hide();
 		}
 	},

    //add each matching word from the user-provided model into a new view, then render the list
    addWord: function (model) {
        this.$el.append(new AutoCompleteWordView({
            model: model,
            parent: this
        }).render().$el);
    },

    //called from the word-view (child view). Get the word the user selected from the list, then
    //set the input equal to it.
 	select: function (model) {
        var currWord = model.get('word');
        this.input.val(currWord);
        this.currText = currWord;
		if (this.accessibilityOn) {
			this.accessibleDiv.text('');
		}
        return false;
    },

    //when user presses up/down arrow keys, highlight the appropriate row by changing the class
    move: function (direction) {
    	var cur = this.$el.children('.highlight'); //get all list elements with class of "highlight"

        if (!this.doesExist(cur)) {
            return false;
        }        
        else if (cur.length == 0) {//nothing is highlighted yet, highlight first child
            var cur = this.$el.children()[0];
            if (this.doesExist(cur)) {
                cur.className += "highlight";
                this.input.val(cur.innerText); //change the text in the input to the highlighted word
				if (this.accessibilityOn) {
					this.accessibleDiv.text(cur.innerText);
				}
            }
        }
        else if (this.doesExist(cur[0])) { //highlight list item before or after the current one
            cur = cur[0]; //current list element
            var next;
            if (direction == "up") {
                next = cur.previousSibling;
            }
            else if (direction == "down") {
                next = cur.nextSibling;
            }
    	  	if (this.doesExist(next)) {
	    		cur.className = cur.className.replace("highlight", "");
				cur.setAttribute("id", "");
	    		next.className += "highlight";
                this.input.val(next.innerText); //change the text in the input to the highlighted word
				if (this.accessibilityOn) {
					this.accessibleDiv.text(next.innerText);
				}
	    	}
	    }
    	return false;
    },

 	reset: function () {
 		this.$el.empty();
 		return this;
 	},

 	hide: function () {
 		this.$el.hide();
 		return this;
 	},

 	show: function () {
 		this.$el.show();
 		return this;
 	},

    exitOut: function (e) {
 
        //if user clicks anywhere on the DOM outside of the input element, check to see if the target was one of the autocomplete list elements.
        //If it is a list element, we want to select the element in the list.
        if (e.target && e.target.nodeName.toLowerCase() == 'a' && e.target.parentNode && 
            e.target.parentNode.className && e.target.parentNode.className.indexOf("highlight") > -1) {
            this.onEnter();
         }
        //If use hits Esc key or clicks on DOM, hide auto-complete list and reset input value to what the user originally typed.     
        else { 
            this.hide();
            this.reset();
            this.input.val(this.currText);
            return this;
        }
    },

	//does a variable/element exist?
    doesExist: function (elem) {
        if (typeof(elem) != 'undefined' && elem != null)
            return true;
        else
            return false;
    }

 })