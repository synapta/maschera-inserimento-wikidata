require('dotenv').config();

const express = require('express');
const session = require('express-session');
const MemoryStore = require('memorystore')(session)
const morgan = require('morgan');
const request = require('request');
const passport = require('passport');
const bodyParser = require('body-parser');
const MediaWikiStrategy = require('passport-mediawiki-oauth').OAuthStrategy;

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (obj, done) {
    done(null, obj);
});

passport.use(new MediaWikiStrategy({
    consumerKey: process.env.MEDIAWIKI_CONSUMER_KEY,
    consumerSecret: process.env.MEDIAWIKI_CONSUMER_SECRET,
    baseURL: 'https://wiki.synapta.io/' // TODO
},
    function (token, tokenSecret, profile, done) {
        process.nextTick(function () {
            profile.oauth = {
                consumer_key: process.env.MEDIAWIKI_CONSUMER_KEY,
                consumer_secret: process.env.MEDIAWIKI_CONSUMER_SECRET,
                token: token,
                token_secret: tokenSecret
              };
            return done(null, profile);
        });
    }
));

const config = {
    instance: 'https://www.wikidata.org/w/api.php',
}
const wdEdit = require('wikibase-edit')(config);
const utils = require('./utils');

const app = express();

app.use(session({
    cookie: { maxAge: 86400000 },
    store: new MemoryStore({
        checkPeriod: 86400000
    }),
    secret: 'keyboard cat', // TODO
    resave: false,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(morgan('common'));
app.use(bodyParser.json());
app.use('/', express.static('./app'));

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

app.get('/account', ensureAuthenticated, function (req, res) {
    res.json({ user: req.user });
});

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

app.get('/login/mediawiki',
    passport.authenticate('mediawiki'),
    function (req, res) {
    });

app.get('/auth/mediawiki/callback',
    passport.authenticate('mediawiki', { failureRedirect: '/login' }),
    function (req, res) {
        res.redirect('/ente');
    });

app.get('/login', function (req, res) {
    res.sendFile(__dirname + '/app/login.html');
});

app.get('/ente', function (req, res) {
    res.sendFile(__dirname + '/app/ente.html');
});

app.get('/upload', function (req, res) {
    res.sendFile(__dirname + '/app/upload.html');
});

app.get('/monumenti', function (req, res) {
    res.sendFile(__dirname + '/app/monumenti.html');
});

app.get('/maschera', function (req, res) {
    res.sendFile(__dirname + '/app/maschera.html');
});

app.get('/api/suggestion/comune', function (req, res) {
    let matchComuni = utils.suggestComuni(req.query.q);
    res.status(200).send(matchComuni);
});

app.get('/api/query/comune', function (req, res) {
    utils.getQfromTitleWithFile(req.query.q, function (pageId) {
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

app.get('/api/entity/get', function(req, res) {
    utils.getItem(req.query.id, function(result) {
        if (result) {
            if (result.error) {
                res.status(404).send("Not Found");
            } else {
                res.status(200).send(Object.values(result.entities)[0]);
            }
        } else {
            res.status(500).send("Error");
        }
    });
});

app.post('/api/entity/edit', function(req, res) {
    utils.editItem(req.body.entity, function(success) {
        if (success) {
            res.status(200).send("OK");
        } else {
            res.status(500).send("Error");
        }
    });
});

app.post('/api/entity/create', function(req, res) {
    utils.createNewItem(req.body.entity, function(success) {
        if (success) {
            res.status(200).send("OK");
        } else {
            res.status(500).send("Error");
        }
    });
});

const server = app.listen(8080, function() {
    var host = server.address().address;
    var port = server.address().port;
    utils.parseComuniFile();
    console.log('Server listening at http://%s:%s', host, port);
});
