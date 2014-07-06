$().ready(function () {

  var editors = [];

  $('.ace-editor').each(function (i, elem) {
    var editor = ace.edit(elem);
    editor.getSession().setMode('ace/mode/json');

    editors.push(editor);
  });

});