/*
*
* Placeholder.js 1.1.1
* Creates placeholder on inputs/textareas for browsers that don't support it (well, IE...)
*
* @ Created by Guillaume Gaubert
* @ http://widgetulous.com/placeholderjs/
* @ © 2011 Guillaume Gaubert
*
* @ Default use :
*   Placeholder.init();
*
*/


Placeholder = {
    
    // The normal and placeholder colors
    defaultSettings : {
        normal      : '#000000',
        placeholder : '#C0C0C0',
        wait        : false,
        classFocus  : '',
        classBlur   : ''
    },

    
    init: function(settings)
    {
        // Merge default settings with the ones provided
        if(settings) {
            // Merge the desired settings
            for(var property in settings) {
                Placeholder.defaultSettings[property] = settings[property];
            }
        }
        
        // Let's make the funky part...
        /*// Get inputs and textareas
        var inputs = document.getElementsByTagName("input");
        var textareas = document.getElementsByTagName("textarea");
        */
        
        // Instead let's get the inputs and textareas of a certain class (elliott)
        var inputs = textareas = document.getElementsByClassName('use-placeholder');
        	
        
        // Merge all that
        var elements = Placeholder.utils.concat(inputs, textareas);
        // Bind events to all the elements
        for (var i = 0; i < elements.length; i++) {
            var placeholder = elements[i].getAttribute("placeholder");
            
            if(placeholder && elements[i].type == "text" || elements[i].type == "password" || elements[i].type == "textarea") {
                var _input = elements[i];
                
                // Bind events
                _input.onclick = function(){
                    Placeholder.onSelected(this);
                };
                
                _input.onfocus = function(){
                };
                
                _input.onblur = function(){
                    Placeholder.unSelected(this);
                };
                // Only if we want that wait feature
                if(Placeholder.defaultSettings.wait) {
                    _input.onkeypress = function(){
                        Placeholder.onType(this);
                    };
                }
                
                // Set style and value
                Placeholder.style.inactive(_input);
                _input.value = placeholder;
                //_input.className = Placeholder.defaultSettings.class;
                
                // Check for parent forms
                var forms = document.getElementsByTagName('form');
                for(var f = 0; f < forms.length; f++) {
                    if(forms[f]) {
                        // Check if the current input is a child of that form
                        var children = forms[f].children;
                        if(Placeholder.utils.contains(children, _input)) {
                            // Bind the submit to clear all empty fields
                            forms[f].onsubmit = function() {
                                Placeholder.submitted(this);
                            };
                        }
                    }
                }
                
            }
        };
    },
    
    // Called when an input/textarea is selected
    onSelected: function(input)
    {
        if(Placeholder.defaultSettings.wait == true) {
            if(input.value == input.getAttribute('placeholder')) {
                Placeholder.utils.caret(input);
            }
        }
        else {
            if(input.value == input.getAttribute('placeholder')) {
                input.value = '';
            }
            Placeholder.style.normal(input);
        }
    },
    
    // Called on onkeypressed of an input/textarea, used for the 'wait' setting
    onType: function(input)
    {
        var placeholder = input.getAttribute('placeholder');
        input.value = input.value.replace(placeholder, '');
        /*if(input.value != placeholder) {
            var diff = input.value.length - placeholder.length;
            // Check if this is the first character typed
            if(diff >= 1 && input.value.indexOf(placeholder) != -1) {
                input.value = input.value.substring(0, diff);
            }
            Placeholder.style.normal(input);
        }*/
        // Check if the text field is empty, so back to the inactive state
        if(input.value.length <= 0) {
            Placeholder.style.inactive(input);
            input.value = placeholder;
            Placeholder.utils.caret(input);
        }
        else {
            Placeholder.style.normal(input);
        }
    },
    
    // Called when an input/textarea is unselected
    // It applies the placeholder state if input value is empty
    unSelected: function(input)
    {
        // Reset a placeholder if the user didn't type text
        if(input.value.length <= 0) {
            Placeholder.style.inactive(input);
            input.value = input.getAttribute("placeholder");
        }
    },
    
    // Called when a form containing an input/textarea is submitted
    // If one of these are empty (placeholder is left), we clear the value for each
    submitted: function(form)
    {
        var children = form.children;
        for(var i = 0; i < children.length; i++) {
            if(children[i]) {
                var node = children[i];
                if(node.tagName.toLowerCase() == "input" || node.tagName.toLowerCase() == "textarea") {
                    if(node.value == node.getAttribute('placeholder')) {
                        node.value = "";
                    }
                }
            }
        }
    },
    
    
    // Style
    // Manage styles for normal and inactive
    
    style : {
        // Apply the normal style to the element
        normal: function(input) {
            // Check if class if set so we use that
            if(Placeholder.defaultSettings.classFocus) {
                input.className = Placeholder.defaultSettings.classFocus;
            }
            else {
                // Use the text color
                input.style.color = Placeholder.defaultSettings.normal;
            }
        },
        
        // Apply the inactive style to the element
        inactive: function(input) {
            // Check if class if set so we use that
            if(Placeholder.defaultSettings.classBlur) {
                input.className = Placeholder.defaultSettings.classBlur;
            }
            else {
                // Use the text color
                input.style.color = Placeholder.defaultSettings.placeholder;
            }
        }
    },
    
    // Utils
    // Private methods
    
    utils : {
        // Check if array contains el
        contains: function(array, el) {
            for(var i = 0; i < array.length; i++) {
                if(array[i]) {
                    if(array[i] == el) {
                        return true;
                    }
                }
            }
            return false;
        },
        // Merge two node lists
        concat: function(node1, node2) {
            var array = [];
            for(var i = 0; i < node1.length; i++) {
                if(node1[i]) {
                    array.push(node1[i]);
                }
            }
            for(var i = 0; i < node2.length; i++) {
                if(node2[i]) {
                    array.push(node2[i]);
                }
            }
            return array;
        },
        // Set caret position to the beginning
        caret: function(input) {
            if(input.setSelectionRange) {
                input.focus();
                input.setSelectionRange(0,0);
            }
            else if(input.createTextRange) {
                var range = input.createTextRange();
                range.collapse(true);
                range.moveEnd('character', 0);
                range.moveStart('character', 0);
                range.select();
            }
        }
    }
};