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
    baseURL: 'https://www.wikidata.org/'
},
    function (token, tokenSecret, profile, done) {
        process.nextTick(function () {
            profile.oauth = {
                consumer_key: process.env.MEDIAWIKI_CONSUMER_KEY,
                consumer_secret: process.env.MEDIAWIKI_CONSUMER_SECRET,
                token: token,
                token_secret: tokenSecret
            };
            profile.list = [];
            return done(null, profile);
        });
    }
));

const config = {
    instance: 'https://www.wikidata.org/w/api.php'
}
const wdEdit = require('wikibase-edit')(config);
const utils = require('./utils');
const Client = require('nextcloud-node-client').Client;
const nextcloud = new Client();
const fileUpload = require('express-fileupload');

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
app.use(fileUpload());
app.use(morgan('common'));
app.use(bodyParser.json());

// TODO remove when callback is set properly
app.get('/', function (req, res, next) {
    if (req.query.oauth_verifier && req.query.oauth_token) {
        res.redirect('/auth/mediawiki/callback?oauth_verifier=' + req.query.oauth_verifier + '&oauth_token=' + req.query.oauth_token);
    }
    return next();
});

app.use('/', express.static('./app'));

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

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

app.get('/the-end', function (req, res) {
    res.sendFile(__dirname + '/app/grazie.html');
});

app.get('/api/account', function (req, res) {
    res.json({ user: req.user });
});

app.post('/api/upload', async function (req, res) {
    const upload = req.files.upload;
    try {
        const folder = await nextcloud.getFolder("/");
        await folder.createFile(Date.now() + "-" + upload.name, upload.data);
        res.status(200).send();
    } catch {
        res.status(500).send();
    }
});

app.get('/api/store/ente', function (req, res) {
    req.user.ente = req.query.id;
    res.status(200).send("saved");
});

app.get('/api/suggestion/comune', function (req, res) {
    let matchComuni = utils.suggestComuni(req.query.q);
    res.status(200).send(matchComuni);
});

app.get('/api/suggestion/generic', function(req, res) {
    utils.simpleWikidataSuggestion(req.query.q, function(result) {
        if (result) {
            if (result.error) {
                res.status(404).send("Not Found");
            } else {
                result.search = result.search.filter(function (item) {
                    delete item.url;
                    return true;
                });
                res.status(200).send(result);
            }
        } else {
            res.status(500).send("Error");
        }
    });
});

app.get('/api/query/comuneByQ', function (req, res) {
    utils.getTitleFromQWithFile(req.query.id, function (obj) {
        res.status(200).send(obj);
    });
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

app.get('/api/entity/get', function (req, res) {
    utils.getItem(req.query.id, function (result) {
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

app.post('/api/entity/edit', function (req, res) {
    req.user.list.push({'id':req.body.entity.id, 'label':req.body.entity.label});
    utils.editItem(req.body.entity, function (success) {
        if (success) {
            res.status(200).send("OK");
        } else {
            res.status(500).send("Error");
        }
    });
});

app.post('/api/entity/create', function (req, res) {
    req.user.list.push(req.body.entity.id);
    utils.createNewItem(req.body.entity, function (success) {
        if (success) {
            res.status(200).send("OK");
        } else {
            res.status(500).send("Error");
        }
    });
});

let port = 8080;

if (process.argv.length > 2) {
    port = parseInt(process.argv[2]);
}

const server = app.listen(port, function () {
    var host = server.address().address;
    var port = server.address().port;
    utils.parseComuniFile();
    console.log('Server listening at http://%s:%s', host, port);
});
