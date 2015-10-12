Donors = new Mongo.Collection("donors");
var gateway;

//Code that runs on startup.
Meteor.startup(function () {
  // Braintree Setup
  var braintree = Meteor.npmRequire('braintree');

  if (Meteor.settings.public.SANDBOX_MODE) {
    console.log("Braintree: Sandbox Mode");
    gateway = braintree.connect({
      environment: braintree.Environment.Sandbox,
      publicKey: Meteor.settings.BT_PUBLIC_KEY,
      privateKey: Meteor.settings.BT_PRIVATE_KEY,
      merchantId: Meteor.settings.BT_MERCHANT_ID
    });
  } else {
    console.log("Braintree: Production Mode");
    gateway = braintree.connect({
      environment: braintree.Environment.Production,
      publicKey: Meteor.settings.BT_PUBLIC_KEY,
      privateKey: Meteor.settings.BT_PRIVATE_KEY,
      merchantId: Meteor.settings.BT_MERCHANT_ID
    });
  }

  // Stripe Setup
  Stripe = StripeAPI(Meteor.settings.STRIPE_SECRET_KEY);

  // Sendgrid Setup
  process.env.MAIL_URL = Meteor.settings.SENDGRID_SMTP_URL;

  // Publish nonprofit projects
  Meteor.publish('projects', function() {
    return Projects.find({});
  });
});

Meteor.methods({
  // Method to create a new Stripe subscriber
  createCustomer: function (token, name, address, comment, timestamp) {
    var success = true;

    Stripe.customers.create({
      card: token,
      plan: "one",
      email: address
    }, function(err, customer) {
        if (err) {
          console.log("Thrown Error: " + err);
          Email.send({
            from: "error@twocentsaday.com",
            to: "maruchi.kim@gmail.com",
            subject: "Error on Server ",
            text: String(err),
          });
          success = false;
        }
    });

    if (success) {
      // Insert user into database to ensure no duplicates exist in the future.
      Donors.insert({
        stripeToken: token,
        name: name,
        email: address,
        createdAt: timestamp,
      });

      // Send confirmation email
      Meteor.call("sendConfirmationEmail", name, address, comment);
    }
  },

  // Method to prevent duplicate users
  checkEmail: function(email) {
    var userObject = Donors.find({email: email}, {limit:1}).fetch();
    var userExists = (typeof userObject !== 'undefined' && userObject.length > 0);

    if (userExists) {
      return true;
    } else {
      return false;
    }
  },

  // Method to create a new paypal token
  getPaypalClientToken: function (clientId) {
    var generateToken = Meteor.wrapAsync(gateway.clientToken.generate, gateway.clientToken);
    var options = {};

    if (clientId) {
      options.clientId = clientId;
    }

    var response = generateToken(options);
    return response.clientToken;
  },

  // Method to create a new paypal subscriber
  createPaypalCustomer: function (name, address, comment, paymentNonce) {
    var createCustomer = Meteor.wrapAsync(gateway.customer.create, gateway.customer);
    var findCustomer = Meteor.wrapAsync(gateway.customer.find, gateway.customer);
    var newSubscription = Meteor.wrapAsync(gateway.subscription.create, gateway.subscription);

    createCustomer({
      firstName: name,
      email: address,
      paymentMethodNonce: paymentNonce
    }, function(err, result) {
        if (result.success) {
          findCustomer(result.customer.id, function(err, customer) {
            // Create a subscriptionRequest object
            var subscriptionRequest = {
              id: customer.paypalAccounts[0].token,
              paymentMethodToken: customer.paypalAccounts[0].token,
              planId : "b7tb"
            };

            // Create the new subscription
            newSubscription(subscriptionRequest, function(err, result) {});

            // Insert user into database to ensure no duplicates exist in the future.
            Donors.insert({
              paypalToken: subscriptionRequest.id,
              name: customer.firstName,
              email: customer.email,
              createdAt: customer.createdAt,
            });

            Meteor.call("sendConfirmationEmail", customer.firstName, customer.email, comment);
          })
        } else {
            console.log("Thrown Error: " + err);
            Email.send({
              from: "error@twocentsaday.com",
              to: "maruchi.kim@gmail.com",
              subject: "Error on Server ",
              text: String(err),
            });
        }
      })
  },

  // Method to send confirmation emails
  sendConfirmationEmail: function(name, email, comment) {
    console.log("Sending confirmation email to " + String(name));
    //Confirmation Email
    Email.send({
      from: "The Two Cents Team <hello@twocentsaday.com>",
      to: email,
      subject: "Two Cents Subscription Confirmation",
      html: Handlebars.templates['confirmation']({ user: name })
      // text: "Hello " + name + ",\n Thanks for signing up! Your two cents donations have begun (and will show as a $1.00 charge every fifty days on your bank statement). \n \n We really appreciate your contribution and hope you can help us spread the word by telling your friends and family. \n \n We'll reach you again at this email once we have collected enough donations to help make a difference. \n \n Here's to saving the world, \n The Two Cents Team"
    });

    console.log("Saving " + name + " to IFTTT");
    //IFTTT endpoint
    Email.send({
      from: "twocentsdonations@gmail.com",
      to: "trigger@recipe.ifttt.com",
      subject: String(Meteor.settings.IFTTT_ENDPOINT).concat(String(email)),
      text: String(comment),
    });

    console.log(String(Meteor.settings.IFTTT_ENDPOINT).concat(String(email)));
  },

  insertProject: function(id, organizationName, projectName, projectDescription, imageUrl, fundsRaised, fundsRequired, targetDate, dateFormatted) {
      if (id) {
        //find and update
        Projects.update(
          {_id: id},
          {$set:{organization:organizationName,
                 project: projectName,
                 description: projectDescription,
                 image: imageUrl,
                 fundsRaised: fundsRaised,
                 fundsRequired: fundsRequired,
                 targetDate: targetDate,
                 dateFormatted: dateFormatted}});
      } else {
        //insert
        Projects.insert({
          organization: organizationName,
          project: projectName,
          description: projectDescription,
          image: imageUrl,
          fundsRaised: fundsRaised,
          fundsRequired: fundsRequired,
          targetDate: targetDate,
          dateFormatted: dateFormatted
        });
      }
  },

  removeProject: function(id) {
    Projects.remove(id);
  }
});

