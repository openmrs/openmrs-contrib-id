// Thanks, IE8
if(!function(){}.bind){
  Function.prototype.bind = function(){
    var me = this
    , shift = [].shift
    , he = shift.apply(arguments)
    , ar = arguments
    return function(){
      return me.apply(he, ar);
    }
  }
}

OpenMRSNavbar.loadStylesheet(function() {
    OpenMRSNavbar.instance = new OpenMRSNavbar.Model();
});