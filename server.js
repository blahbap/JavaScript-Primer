var express = require('express'),
    app = express.createServer(),
    port = process.env.PORT;


// Action: perform a redirect to the home page (index.html)   
function home(req, res) {
  res.redirect('/index.html')
}

//Static routing
app.use(express.static(__dirname + '/public'));

// If you just call the server (root), redirect to homepage
app.get('/', home);

// Routes are set up,
// Now start the app server...
app.listen(port);

console.log('Server started on port ' + port);