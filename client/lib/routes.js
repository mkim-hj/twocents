Router.route('/', function() {
	this.render('index');
	YT.load();
	window.scrollTo(0, 0);
});

Router.route('/login', function() {
	this.layout('BlankLayout');
	this.render('login');
	window.scrollTo(0, 0);
})

Router.route('/dev', function() {
	this.render('index');
	YT.load();
	window.scrollTo(0, 0);
});

Router.route('/about', function () {
	this.render('about');
	window.scrollTo(0, 0);
});

Router.route('/blog', function () {
	this.render('blog');
	window.scrollTo(0, 0);
});

Router.route('/legal', function() {
	this.render('legal');
	window.scrollTo(0,0);
});

Router.route('/contact', function() {
	this.render('contact');
	window.scrollTo(0,0);
});

Router.route('/faqs', function() {
	this.render('faqs');
	window.scrollTo(0,0);
});

// Router.route('/emailTemplate', function() {
// 	this.render('emailTemplate');
// 	window.scrollTo(0,0);
// });

Router.configure({
  layoutTemplate: 'ApplicationLayout'
});