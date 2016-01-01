usernameRegex=/^[a-zA-Z0-9]+[.]?[a-zA-Z0-9]+$/,emailRegex=/^[A-Za-z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i,$(document).ready(function(){$("input[name=spinner]").val();$("input#country").closest(".form-group").hide(),"signup"===$("#uname").val()&&(alert("find signup"),$("#country").parent().hide(),function(){var t=$("#username");return""===t.val()?t.focus():(t=$("#firstName"),""===t.val()?t.focus():(t=$("#lastName"),""===t.val()?t.focus():(t=$("#primaryEmail"),""===t.val()?t.focus():(t=$("#password"),""===t.val()?t.focus():void 0))))}(),$("#redirect-to").attr("value",getParameterByName("destination")))}),$(document).ready(function(){$("form input").focusin(function(){$(this).closest(".form-group").find(".description").addClass("show")}).focusout(function(){$(this).closest(".form-group").find(".description").removeClass("show")}),$("form input:focus").closest(".form-group").find(".description").addClass("show"),$("form.validate input").focusin(function(){$(this).closest(".input-wrapper").find("label.error.show").removeClass("show")}),$("form.validate label.error").click(function(){$(this).removeClass("show").closest(".input-wrapper").find("input").focus()}),$("form.validate input#username").data({validate:function(){var t=$("form.validate input#username").val();return t.length<3?"Too short":t.length>19?"Too long":/[0-9]/.test(t[0])?"Start with letter":usernameRegex.test(t)?void 0:"Only (a-z, 0-9) are allowed"}}),$("form.validate input#password").data({validate:function(){var t=$("form.validate input#password").val();return t.length<8?"Too short":t.length>19?"Too long":void 0}}),$("form.validate input#email").data({validate:function(){var t=$("form.validate input#email").val();return t.length>19?"Too long":emailRegex.test(t)?void 0:"Invalid email"}}),$("form#form-signup").data({validate:function(t){}}),$("form#form-login").data({}),$("form.validate").submit(function(t){function n(t,n){i=!1;var e=t.closest(".form-group").find("label.error");n||(n="×"),e.html(n),e.addClass("show")}t.preventDefault();var i=!0,e=0;$(this).find("input").each(function(t,i){++e,i=$(i);var r=i.data("validate");if(r){var o=r();o&&n(i,o)}}),console.log(e)})}),function(t){t.fn.invisible=function(){return this.each(function(){t(this).css("visibility","hidden")})},t.fn.visible=function(){return this.each(function(){t(this).css("visibility","visible")})}}(jQuery);var CryptoJS=CryptoJS||function(t,n){var i={},e=i.lib={},r=function(){},o=e.Base={extend:function(t){r.prototype=this;var n=new r;return t&&n.mixIn(t),n.hasOwnProperty("init")||(n.init=function(){n.$super.init.apply(this,arguments)}),n.init.prototype=n,n.$super=this,n},create:function(){var t=this.extend();return t.init.apply(t,arguments),t},init:function(){},mixIn:function(t){for(var n in t)t.hasOwnProperty(n)&&(this[n]=t[n]);t.hasOwnProperty("toString")&&(this.toString=t.toString)},clone:function(){return this.init.prototype.extend(this)}},s=e.WordArray=o.extend({init:function(t,i){t=this.words=t||[],this.sigBytes=i!=n?i:4*t.length},toString:function(t){return(t||u).stringify(this)},concat:function(t){var n=this.words,i=t.words,e=this.sigBytes;if(t=t.sigBytes,this.clamp(),e%4)for(var r=0;t>r;r++)n[e+r>>>2]|=(i[r>>>2]>>>24-8*(r%4)&255)<<24-8*((e+r)%4);else if(65535<i.length)for(r=0;t>r;r+=4)n[e+r>>>2]=i[r>>>2];else n.push.apply(n,i);return this.sigBytes+=t,this},clamp:function(){var n=this.words,i=this.sigBytes;n[i>>>2]&=4294967295<<32-8*(i%4),n.length=t.ceil(i/4)},clone:function(){var t=o.clone.call(this);return t.words=this.words.slice(0),t},random:function(n){for(var i=[],e=0;n>e;e+=4)i.push(4294967296*t.random()|0);return new s.init(i,n)}}),a=i.enc={},u=a.Hex={stringify:function(t){var n=t.words;t=t.sigBytes;for(var i=[],e=0;t>e;e++){var r=n[e>>>2]>>>24-8*(e%4)&255;i.push((r>>>4).toString(16)),i.push((15&r).toString(16))}return i.join("")},parse:function(t){for(var n=t.length,i=[],e=0;n>e;e+=2)i[e>>>3]|=parseInt(t.substr(e,2),16)<<24-4*(e%8);return new s.init(i,n/2)}},c=a.Latin1={stringify:function(t){var n=t.words;t=t.sigBytes;for(var i=[],e=0;t>e;e++)i.push(String.fromCharCode(n[e>>>2]>>>24-8*(e%4)&255));return i.join("")},parse:function(t){for(var n=t.length,i=[],e=0;n>e;e++)i[e>>>2]|=(255&t.charCodeAt(e))<<24-8*(e%4);return new s.init(i,n)}},f=a.Utf8={stringify:function(t){try{return decodeURIComponent(escape(c.stringify(t)))}catch(n){throw Error("Malformed UTF-8 data")}},parse:function(t){return c.parse(unescape(encodeURIComponent(t)))}},l=e.BufferedBlockAlgorithm=o.extend({reset:function(){this._data=new s.init,this._nDataBytes=0},_append:function(t){"string"==typeof t&&(t=f.parse(t)),this._data.concat(t),this._nDataBytes+=t.sigBytes},_process:function(n){var i=this._data,e=i.words,r=i.sigBytes,o=this.blockSize,a=r/(4*o),a=n?t.ceil(a):t.max((0|a)-this._minBufferSize,0);if(n=a*o,r=t.min(4*n,r),n){for(var u=0;n>u;u+=o)this._doProcessBlock(e,u);u=e.splice(0,n),i.sigBytes-=r}return new s.init(u,r)},clone:function(){var t=o.clone.call(this);return t._data=this._data.clone(),t},_minBufferSize:0});e.Hasher=l.extend({cfg:o.extend(),init:function(t){this.cfg=this.cfg.extend(t),this.reset()},reset:function(){l.reset.call(this),this._doReset()},update:function(t){return this._append(t),this._process(),this},finalize:function(t){return t&&this._append(t),this._doFinalize()},blockSize:16,_createHelper:function(t){return function(n,i){return new t.init(i).finalize(n)}},_createHmacHelper:function(t){return function(n,i){return new h.HMAC.init(t,i).finalize(n)}}});var h=i.algo={};return i}(Math);!function(t){function n(t,n,i,e,r,o,s){return t=t+(n&i|~n&e)+r+s,(t<<o|t>>>32-o)+n}function i(t,n,i,e,r,o,s){return t=t+(n&e|i&~e)+r+s,(t<<o|t>>>32-o)+n}function e(t,n,i,e,r,o,s){return t=t+(n^i^e)+r+s,(t<<o|t>>>32-o)+n}function r(t,n,i,e,r,o,s){return t=t+(i^(n|~e))+r+s,(t<<o|t>>>32-o)+n}for(var o=CryptoJS,s=o.lib,a=s.WordArray,u=s.Hasher,s=o.algo,c=[],f=0;64>f;f++)c[f]=4294967296*t.abs(t.sin(f+1))|0;s=s.MD5=u.extend({_doReset:function(){this._hash=new a.init([1732584193,4023233417,2562383102,271733878])},_doProcessBlock:function(t,o){for(var s=0;16>s;s++){var a=o+s,u=t[a];t[a]=16711935&(u<<8|u>>>24)|4278255360&(u<<24|u>>>8)}var s=this._hash.words,a=t[o+0],u=t[o+1],f=t[o+2],l=t[o+3],h=t[o+4],d=t[o+5],p=t[o+6],v=t[o+7],m=t[o+8],g=t[o+9],y=t[o+10],w=t[o+11],$=t[o+12],_=t[o+13],B=t[o+14],x=t[o+15],b=s[0],C=s[1],S=s[2],z=s[3],b=n(b,C,S,z,a,7,c[0]),z=n(z,b,C,S,u,12,c[1]),S=n(S,z,b,C,f,17,c[2]),C=n(C,S,z,b,l,22,c[3]),b=n(b,C,S,z,h,7,c[4]),z=n(z,b,C,S,d,12,c[5]),S=n(S,z,b,C,p,17,c[6]),C=n(C,S,z,b,v,22,c[7]),b=n(b,C,S,z,m,7,c[8]),z=n(z,b,C,S,g,12,c[9]),S=n(S,z,b,C,y,17,c[10]),C=n(C,S,z,b,w,22,c[11]),b=n(b,C,S,z,$,7,c[12]),z=n(z,b,C,S,_,12,c[13]),S=n(S,z,b,C,B,17,c[14]),C=n(C,S,z,b,x,22,c[15]),b=i(b,C,S,z,u,5,c[16]),z=i(z,b,C,S,p,9,c[17]),S=i(S,z,b,C,w,14,c[18]),C=i(C,S,z,b,a,20,c[19]),b=i(b,C,S,z,d,5,c[20]),z=i(z,b,C,S,y,9,c[21]),S=i(S,z,b,C,x,14,c[22]),C=i(C,S,z,b,h,20,c[23]),b=i(b,C,S,z,g,5,c[24]),z=i(z,b,C,S,B,9,c[25]),S=i(S,z,b,C,l,14,c[26]),C=i(C,S,z,b,m,20,c[27]),b=i(b,C,S,z,_,5,c[28]),z=i(z,b,C,S,f,9,c[29]),S=i(S,z,b,C,v,14,c[30]),C=i(C,S,z,b,$,20,c[31]),b=e(b,C,S,z,d,4,c[32]),z=e(z,b,C,S,m,11,c[33]),S=e(S,z,b,C,w,16,c[34]),C=e(C,S,z,b,B,23,c[35]),b=e(b,C,S,z,u,4,c[36]),z=e(z,b,C,S,h,11,c[37]),S=e(S,z,b,C,v,16,c[38]),C=e(C,S,z,b,y,23,c[39]),b=e(b,C,S,z,_,4,c[40]),z=e(z,b,C,S,a,11,c[41]),S=e(S,z,b,C,l,16,c[42]),C=e(C,S,z,b,p,23,c[43]),b=e(b,C,S,z,g,4,c[44]),z=e(z,b,C,S,$,11,c[45]),S=e(S,z,b,C,x,16,c[46]),C=e(C,S,z,b,f,23,c[47]),b=r(b,C,S,z,a,6,c[48]),z=r(z,b,C,S,v,10,c[49]),S=r(S,z,b,C,B,15,c[50]),C=r(C,S,z,b,d,21,c[51]),b=r(b,C,S,z,$,6,c[52]),z=r(z,b,C,S,l,10,c[53]),S=r(S,z,b,C,y,15,c[54]),C=r(C,S,z,b,u,21,c[55]),b=r(b,C,S,z,m,6,c[56]),z=r(z,b,C,S,x,10,c[57]),S=r(S,z,b,C,p,15,c[58]),C=r(C,S,z,b,_,21,c[59]),b=r(b,C,S,z,h,6,c[60]),z=r(z,b,C,S,w,10,c[61]),S=r(S,z,b,C,f,15,c[62]),C=r(C,S,z,b,g,21,c[63]);s[0]=s[0]+b|0,s[1]=s[1]+C|0,s[2]=s[2]+S|0,s[3]=s[3]+z|0},_doFinalize:function(){var n=this._data,i=n.words,e=8*this._nDataBytes,r=8*n.sigBytes;i[r>>>5]|=128<<24-r%32;var o=t.floor(e/4294967296);for(i[(r+64>>>9<<4)+15]=16711935&(o<<8|o>>>24)|4278255360&(o<<24|o>>>8),i[(r+64>>>9<<4)+14]=16711935&(e<<8|e>>>24)|4278255360&(e<<24|e>>>8),n.sigBytes=4*(i.length+1),this._process(),n=this._hash,i=n.words,e=0;4>e;e++)r=i[e],i[e]=16711935&(r<<8|r>>>24)|4278255360&(r<<24|r>>>8);return n},clone:function(){var t=u.clone.call(this);return t._hash=this._hash.clone(),t}}),o.MD5=u._createHelper(s),o.HmacMD5=u._createHmacHelper(s)}(Math);