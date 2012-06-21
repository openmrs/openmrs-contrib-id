var connect = require('connect'),
	crypto = require('crypto'),
	mail = require('nodemailer'),
	fs = require('fs'),
	path = require('path'),
	ejs = require('ejs'),
	url = require('url'),
	conf = require('./conf'),
	db = require('./db'),
	log = require('./logger').add('email-verification');
	
exports.active = {};
mail.SMTP = conf.email.smtp;
	

// create a verification and send emails
/* begin({
 *   urlBase      (required) e.g. 'reset' or 'signup'
 *   emails,      (required) string or array of email addresses to send to
 *   subject,     (required) subject of email sent
 *   template,    (required) relative path to template file
 *   locals,      extra local vars to pass to template renderer and to active
 *   timeout,     time before exiration, defaults to never
 * },callback)    receives errors
 */
exports.begin = function(settings, callback) {
	// parse arguments
	var urlBase = settings.urlBase,
		emails = settings.emails,
		subject = settings.subject,
		template = settings.template,
		locals = settings.locals || {},
		timeout = settings.timeout;
	
	if (!callback) var callback = function(err){
		if (err) throw err;
	}
	
	if (typeof emails == 'string') emails = [emails];
	var expiring = (timeout > 0);
	
	// begin standard verification
		
		var verifyId = crypto.randomBytes(8).toString('hex'),
			expireDate = new Date(Date.now() + timeout);
		
		// store in DB
		var thisVerify = db.create('EmailVerification');
		thisVerify.verifyId = verifyId;
		thisVerify.urlBase = urlBase;
		thisVerify.emails = emails;
		if (locals) thisVerify.locals = locals;
		if (timeout) thisVerify.timeoutDate = expireDate;
		log.trace('verification prepared for DB entry');
		
		db.update(thisVerify, function(err){
			if (err) return callback(err);
			log.trace('verification stored in DB');
			
			finishCreate();
		});
		
		
		fs.readFile(path.join(__dirname, template), 'utf-8', function(err, data) {
			if (err) return callback(err);
			var template = data.toString();
			var rendered = ejs.render(template, {
				locals: connect.utils.merge(locals, {
					emails: emails,
					urlBase: urlBase,
					verifyId: verifyId,
					siteURL: conf.site.url,
					expiring: expiring,
					expireDate: expireDate.toLocaleString(),
					url: url,
				})
			});
					
			mail.send_mail(
			    {   sender: "'OpenMRS ID Dashboard' <id-noreply@openmrs.org>",
			        to: emails,
			        subject: subject,
			        html: rendered
			    }, function(e, success){
			    	if (e) return callback(e);
			    	else {
				        log.info(urlBase+' email verification sent to '+emails.toString()+'.');
				        
				        finishCreate();
					}
			    }
			);
			
		});
		
		// callback once DB and email are done
		var finished = 0;
		var finishCreate = function(){
			finished++;
			if (finished == 2) callback();
		}
};

// verifies a validation request, callback returns error, boolean on whether request is valid, and any locals
exports.check = function(verifyId, callback){
	db.find('EmailVerification', {verifyId: verifyId}, function(err, instance){
		if (err) callback(err);
		
		var invalidate = function(){ // clear and return request as invalid
			log.debug('invalid validation requested');
			//exports.clear(verifyId);
			callback(null, false);
		}
		
		var verify = instance[0];
		if (verify) {
			var	locals = verify.locals || {};
			
			log.warn(verify.timeoutDate);
				
			if (verify.timeoutDate == null || verify.timeoutDate > Date.now()) { // still valid; has not expired
				log.debug('successful validation request');
				callback(null, true, locals);
			}
			else invalidate();
		}	
		else invalidate();
	});
};

// drops a validation (called on completion)
exports.clear = function(verifyId, callback) {
	if (!callback) var callback = function(err){if (err) log.error(err);}
	
	db.find('EmailVerification', {verifyId: verifyId}, function(err, instance){
		if (err) return callback(err);
		if (instance[0]) {
			db.drop(instance[0], function(err){
				if (err) return callback(err);
				else callback();
			});
		}
		else return callback(new Error('No instance found to destroy.'));
	});
}