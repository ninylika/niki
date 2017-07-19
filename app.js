var restify = require('restify');
var builder = require('botbuilder');
var pg = require("pg");

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

var savedAddress;
// Listen for messages from users 
server.post('/api/messages', connector.listen());

// This bot enables users to either make a dinner reservation or order dinner.
var bot = new builder.UniversalBot(connector, function(session){
    var msg = "Welcome to the your assistst bot. Please say `Country code`";
    session.send(msg);
});

bot.dialog('CoutryCode', [
    function (session) {
		savedAddress = session.message.address;
		console.log(savedAddress);
        //session.send("Tell me Country Code");
        session.beginDialog('askCountryCode');
    },
 
    function (session, results) {
        //session.send("Get me Country Code");
        session.dialogData.CountryCode = results.response;
        //session.send("Coutry code you asked:  %s", session.dialogData.CountryCode);
		//session.beginDialog('CountryCodeQuery');
		//session.send("Start connection session.");
        GetCountryName(session.dialogData.CountryCode);
        session.endDialog();
    },
])
.triggerAction({
    matches: /^country code$/i,
    confirmPrompt: "This will cancel your current request. Are you sure?"
});

bot.dialog('askCountryCode', [
    function (session) {
        builder.Prompts.text(session, "Your country code");
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
]);

function GetCountryName(code){
	var country_name = 'not found.';
	console.log(code);
	var conString = "pg://postgres:chatbot@localhost:5432/postgres";
	var client = new pg.Client(conString);
	client.connect();
	console.log("connected.");
	
	const query = {
		text: "SELECT \"Country_Name\" FROM \"ChatBotBizV\".country_code where \"Country_Code\" like '%'||$1||'%'",
		values: [code.toUpperCase()]
	};
	
	client.query(query)
		.then(result => {
			console.log(result);
			if(result.rowCount > 0)
				country_name = result.rows[0].Country_Name;
			client.end();
			sendProactiveMessage(country_name);
		})
		.catch(error => console.log(error.stack));
};

function sendProactiveMessage(country_name) {
  var msg = new builder.Message().address(savedAddress);
  msg.text('Country is ' + country_name);
  msg.textLocale('en-US');
  bot.send(msg);
}