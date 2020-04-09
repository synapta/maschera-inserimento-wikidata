require('dotenv').config();

const express = require('express');
const session = require('express-session');
const MemoryStore = require('memorystore')(session)
const morgan = require('morgan');
const request = require('request');
const passport = require('passport');
const bodyParser = require('body-parser');
const MediaWikiStrategy = require('passport-mediawiki-oauth').OAuthStrategy;
const AnonymousStrategy = require('passport-anonymous').Strategy;

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
            return done(null, profile);
        });
    }
));

passport.use(new AnonymousStrategy());

const Client = require('nextcloud-node-client').Client;
const nextcloud = new Client();
const fileUpload = require('express-fileupload');
const utils = require('./utils');

// Logger
const winston = require('winston');

const wbs = require('winston-better-sqlite3');
const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.json(),
    defaultMeta: { resource: 'renew' },
    transports: [
        new wbs({
            db: 'log.sqlite',
            params: ['level', 'action', 'user', 'target', 'label']
        })
    ]
});

const database = require('better-sqlite3')('log.sqlite', { readonly: true });

const app = express();

app.use(session({
    cookie: { maxAge: 86400000 },
    store: new MemoryStore({
        checkPeriod: 86400000
    }),
    secret: process.env.MEDIAWIKI_CONSUMER_SECRET,
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
    } else {
        return next();
    }
});

app.use('/', express.static('./app'));

function ensureAuthenticated(req, res, next) {
    if (req.session.username) {
        return next();
    }
    res.redirect('/login?error');
}

app.get('/logout', function (req, res) {
    delete req.session.username;
    delete req.session.ente;
    delete req.session.list;
    req.logout();
    res.redirect('/the-end');
});

app.get('/login/noauth', passport.authenticate('anonymous'), function (req, res) {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    req.session.username = ip;
    logger.log({
        level: 'info',
        action: 'login',
        user: req.session.username
    });
    res.redirect('/ente');
});

app.get('/login/mediawiki',
    passport.authenticate('mediawiki'),
    function (req, res) {
    });

app.get('/auth/mediawiki/callback',
    passport.authenticate('mediawiki', { failureRedirect: '/login' }),
    function (req, res) {
        req.session.username = req.user.displayName;
        logger.log({
            level: 'info',
            action: 'login',
            user: req.session.username
        });
        res.redirect('/ente');
    });

app.get('/login', function (req, res) {
    res.sendFile(__dirname + '/app/login.html');
});

app.get('/ente', ensureAuthenticated, function (req, res) {
    res.sendFile(__dirname + '/app/ente.html');
});

app.get('/upload', ensureAuthenticated, function (req, res) {
    res.sendFile(__dirname + '/app/upload.html');
});

app.get('/log', function (req, res) {
    res.sendFile(__dirname + '/app/log.html');
});

app.get('/monumenti', ensureAuthenticated, function (req, res) {
    res.sendFile(__dirname + '/app/monumenti.html');
});

app.get('/maschera', ensureAuthenticated, function (req, res) {
    res.sendFile(__dirname + '/app/maschera.html');
});

app.get('/the-end', function (req, res) {
    res.sendFile(__dirname + '/app/grazie.html');
});

app.get('/api/list', ensureAuthenticated, function (req, res) {
    res.json(req.session.list);
});

app.post('/api/upload', ensureAuthenticated, async function (req, res) {
    const upload = req.files.upload;
    try {
        const folder = await nextcloud.getFolder("/");
        await folder.createFile(Date.now() + "-" + upload.name, upload.data);
        logger.log({
            level: 'info',
            action: 'upload',
            user: req.session.username,
            target: upload.name
        });
        res.status(200).send();
    } catch {
        res.status(500).send();
    }
});

app.get('/api/ente', ensureAuthenticated, function (req, res) {
    res.json(req.session.ente);
});

app.get('/api/account', ensureAuthenticated, function (req, res) {
    res.json({ username: req.session.username });
});

app.post('/api/ente', ensureAuthenticated, function (req, res) {
    req.session.ente = req.body.id;
    logger.log({
        level: 'info',
        action: 'ente',
        user: req.session.username,
        target: req.session.ente,
        label: req.body.title
    });
    res.status(200).send("Saved");
});

app.get('/api/suggestion/comune', function (req, res) {
    let matchComuni = utils.suggestComuni(req.query.q);
    res.status(200).send(matchComuni);
});

app.get('/api/suggestion/generic', function (req, res) {
    utils.simpleWikidataSuggestion(req.query.q, function (result) {
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

function addEntity(session, entity) {
    if (!session.list) {
        session.list = [];
    }
    session.list.push({ 'id': entity.id, 'label': entity.label });
    logger.log({
        level: 'info',
        action: 'entity',
        user: session.username,
        target: entity.id,
        label: entity.label
    });
}

app.post('/api/entity/edit', ensureAuthenticated, function (req, res) {
    addEntity(req.session, req.body.entity);
    utils.editItem(req.body.entity, req.user, function (success) {
        if (success) {
            res.status(200).send("OK");
        } else {
            res.status(500).send("Error");
        }
    });
});

app.post('/api/entity/create', ensureAuthenticated, function (req, res) {
    addEntity(req.session, req.body.entity);
    utils.createNewItem(req.body.entity, req.user, function (success) {
        if (success) {
            res.status(200).send("OK");
        } else {
            res.status(500).send("Error");
        }
    });
});

app.get('/api/registro', function (req, res) {
    let page = 0;
    if (req.query.page !== undefined) {
        page = parseInt(req.query.page);
    }

    let limit = 100;
    if (req.query.limit !== undefined) {
        limit = parseInt(req.query.limit);
    }

    let offset = limit * page;

    const rows = database.prepare('SELECT * FROM log ORDER BY id DESC LIMIT ? OFFSET ?').all(limit, offset);
    res.json(rows);
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
