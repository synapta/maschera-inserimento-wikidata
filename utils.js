const request   = require('request');
const fs        = require('fs');

const BASE_URL = 'https://www.wikidata.org/w/api.php';
let COMUNI_ID;
let COMUNI_NOMI;

exports.parseComuniFile = function() {
    let comuni = {};
    fs.readFileSync('comuni_italiani.csv', 'utf8').split("\n").forEach(function(line){
        if (line === "") { return; }
        let parts = line.split(",");
        comuni[parts[1]]=parts[0];
    });
    COMUNI_ID = comuni;
    COMUNI_NOMI = Object.keys(comuni);
}

exports.sparqlQueryMonuments = function(id) {
    return `
        SELECT ?place ?placeLabel (SAMPLE(?location) as ?location)
        WHERE
        {
          wd:${id} wdt:P625 ?loc .
          SERVICE wikibase:around {
              ?place wdt:P625 ?location .
              bd:serviceParam wikibase:center ?loc .
              bd:serviceParam wikibase:radius "10" .
          }
          ?place wdt:P1435 wd:Q26971668 .
          SERVICE wikibase:label { bd:serviceParam wikibase:language "it" }
          BIND(geof:distance(?loc, ?location) as ?dist)
        }
        GROUP BY ?place ?placeLabel ?instance
        ORDER BY ASC(?dist)
    `;
}

exports.suggestComuni = function(query, cb) {
    if (query.length > 1) {
        return COMUNI_NOMI.filter(c => c.toLowerCase().startsWith(query.toLowerCase()));
    } else {
        return [];
    }
}

exports.getQfromTitleWithFile = function(title, cb) {
    cb(COMUNI_ID[title]);
}
