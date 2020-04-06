const express   = require('express');
const morgan    = require('morgan');
const request   = require('request');
const config    = {
    instance: 'https://www.wikidata.org/w/api.php',
    credentials: {
      username: "**********",
      password: "**********",
      summary: "Test Edit with API"
    }
}
const wdEdit    = require('wikibase-edit')(config);
const utils     = require('./utils');

const app = express();

app.use(morgan('common'));

app.use('/',express.static('./app'));

app.get('/login', function(req, res) {
    res.sendFile(__dirname + '/app/login.html');
});

app.get('/ente', function(req, res) {
    res.sendFile(__dirname + '/app/ente.html');
});

app.get('/upload', function(req, res) {
    res.sendFile(__dirname + '/app/upload.html');
});

app.get('/monumenti', function(req, res) {
    res.sendFile(__dirname + '/app/monumenti.html');
});

app.get('/maschera', function(req, res) {
    res.sendFile(__dirname + '/app/maschera.html');
});

app.get('/api/suggestion/comune', function(req, res) {
    let matchComuni = utils.suggestComuni(req.query.q);
    res.status(200).send(matchComuni);
});

app.get('/api/query/comune', function(req, res) {
    utils.getQfromTitleWithFile(req.query.q, function(pageId) {
        if (pageId === undefined) {
            console.log("Error: no entity found on wikidata with that title");
            res.status(404).send("Not Found");
            return;
        }

        let endpointWikidata = {
            method: 'GET',
            url: "https://query.wikidata.org/sparql?query=" + encodeURIComponent(utils.sparqlQueryMonuments(pageId)),
            headers: {
              'Accept': 'application/sparql-results+json',
              'User-Agent': 'nodejs'
            },
            timeout: 120000
        };

        request(endpointWikidata, function (error, resp, body) {
            if (error) {
                console.log("Error retrieving monuments list:\n\n", error)
                res.status(500).send("Error retrieving monuments list:\n\n", error);
            } else {
                res.status(200).send(JSON.parse(body).results.bindings);
            }
        });
    })
});

const server = app.listen(8080, function() {
    var host = server.address().address;
    var port = server.address().port;
    utils.parseComuniFile();
    console.log('Server listening at http://%s:%s', host, port);
});
