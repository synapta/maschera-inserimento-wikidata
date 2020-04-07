const request   = require('request');
const fs        = require('fs');
const config    = {
    instance: 'https://www.wikidata.org/w/api.php',
    credentials: {
      username: "GiulioCard",
      password: "arpS2eOnVGhfwVzOPWmH",
      summary: "Test Edit with API"
    }
}
const wbEdit    = require('wikibase-edit')(config);
const wbk       = require('wikibase-sdk')({
  instance: 'https://www.wikidata.org',
  sparqlEndpoint: 'https://query.wikidata.org/sparql'
})

let COMUNI_ID;
let COMUNI_NOMI;

exports.parseComuniFile = function() {
    let comuni = {};
    fs.readFileSync('assets/comuni_italiani.csv', 'utf8').split("\n").forEach(function(line){
        if (line === "") { return; }
        let parts = line.split(",");
        comuni[parts[1]]=parts[0];
    });
    COMUNI_ID = comuni;
    COMUNI_NOMI = Object.keys(comuni);
    COMUNI_ARR = []
    for (let k in COMUNI_ID) {
      COMUNI_ARR.push({'title': k, 'id': comuni[k]});
    }
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
        //return COMUNI_NOMI.filter(c => c.toLowerCase().startsWith(query.toLowerCase()));
        return { "items" : COMUNI_ARR.filter(function (el) {
          return el.title.toLowerCase().includes(query.toLowerCase());
        }) }
    } else {
        return { "items" : [] };
    }
}

exports.getQfromTitleWithFile = function(title, cb) {
    cb(COMUNI_ID[title]);
}

exports.getTitleFromQWithFile = function(id, cb) {
    cb(COMUNI_ARR.find(x => x.id === id));
}

 var getItem = function(id, cb) {
    let endpointWikidata = {
        method: 'GET',
        url: 'https://www.wikidata.org/w/api.php' + `?action=wbgetentities&format=json&ids=${id}&languages=it`,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'nodejs'
        },
        timeout: 120000
    };

    request(endpointWikidata, function(err, res, body) {
        if (err) {
            console.log("Error retrieving entity: \n\n", err);
            cb();
        } else {
            cb(JSON.parse(body));
        }
    })
}

exports.getItem = getItem;

function prepareClaims(obj) {
    let myClaims = {};
    let myRefs = {};

    /*myClaims["P528"] = { value: obj.id, qualifiers: { P972: 'Q52896862', P2699 : obj.uri } ,
                               references: { P143: 'Q52897564' } }
    }
    myClaims["P973"] = { value: obj.uri, references: { P143: 'Q52897564' } }*/

    //prepare references
    for (var k in obj) {
        if (k.startsWith("ref_")) {
            myRefs[k.replace("ref_","")] = obj[k];
        }
    }
    //prepare claims
    for (var k in obj) {
        if (k.startsWith("P") && !Array.isArray(obj[k])) { //XXX better if with regexp
            myClaims[k] = { value: obj[k], references: myRefs}
        } else if (k.startsWith("P") && Array.isArray(obj[k])) { //XXX better if with regexp
            myClaims[k] = [];
            for (let i = 0; i < obj[k].length; i++) {
                myClaims[k].push({ value: obj[k][i], references: myRefs})
            }
        }
    }

    return myClaims;
}

exports.createNewItem = function (object, created) {
    //let myClaims = prepareClaims(obj)

    console.log("Creating...")
    wbEdit.entity.create({
        descriptions: { it: object.description},
        labels: { it: object.label},
        claims: object.claims
    }).then(re => {
        if (re.success) {
            console.log("Created!");
            created(true);
        } else {
            console.error(re);
            created(false);
        }
    }).catch(err => {
        console.log("Something wrong!");
        console.log(err);
        console.log(object);
        created(false);
    });
}

function checkSameProperties(propName, wdProp, curProp) {
    let wdValue = wbk.simplify.propertyClaims(wdProp);
    let curValue = curProp;

    let result;
    switch(propName) {
        case 'P6375':
            result = wdValue.includes(curValue.text);
            break;
        case 'P625':
            result = false;
            for (let i=0; i<wdValue.length; i++) {
                if (wdValue[i][0] === curValue.latitude && wdValue[i][1] === curValue.longitude) {
                    result = true;
                }
            }
            break;
        case 'P2186':
            if (wdValue.includes(curValue.value)) {
                if (curProp.qualifiers && curProp.qualifiers.P580) {
                    let wdQual = undefined, index = wdValue.indexOf(curValue.value);
                    if (wdProp[index].qualifiers && wdProp[index].qualifiers.P580) {
                        wdQual = wbk.simplify.propertyQualifiers(wdProp[index].qualifiers.P580)[0].split("T")[0];
                    }
                    if (wdQual === undefined) {
                        result = false;
                    } else {
                        result = curProp.qualifiers.P580 === wdQual;
                    }
                }
            } else {
                result = false;
            }
            break;
        default:
            result = wdValue.includes(curValue);
    }
    return result;
}

function removeDuplicates(wdObj, obj, cb) {
    let totalKeys = Object.keys(obj).length;
    let currKey = 0;
    let newObj = {};
    for (var k in obj) {
        if (!Object.keys(wdObj).includes(k)) {
            newObj[k] = obj[k];
        } else {
            if (!checkSameProperties(k, wdObj[k], obj[k])) {
                newObj[k] = obj[k];
            }
        }
        if (++currKey === totalKeys) {
            cb(newObj);
        }
    }
}

exports.editItem = function (object, updated) {

    getItem(object.id, function(wdObject) {
        if (wdObject === undefined) {
            updated(false);
            return;
        }

        removeDuplicates(wdObject.entities[object.id].claims, object.claims, function (editObj) {

            //let myClaims = prepareClaims(editObj)

            if (Object.entries(editObj).length === 0 && editObj.constructor === Object) {
                console.log("Skip! Everything already in!");
                updated(true);
                return
            } else {
                console.log("Updating...");
                wbEdit.entity.edit({
                  id: object.id,
                  claims: editObj
                }).then(re => {
                    if (re.success) {
                        console.log("Updated!");
                        updated(true);
                    } else {
                        console.error(re);
                        updated(false);
                    }
                }).catch(err => {
                    console.log("Something wrong!");
                    console.log(err);
                    console.log(editObj);
                    updated(false);
                });
            }
        });
    });
}

var simpleWikidataSuggestion = function(string, cb) {
   let endpointWikidata = {
       method: 'GET',
       url: `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${string}&format=json&errorformat=plaintext&language=it&uselang=it&type=item`,
       headers: {
         'Accept': 'application/json',
         'User-Agent': 'nodejs'
       },
       timeout: 120000
   };

   request(endpointWikidata, function(err, res, body) {
       if (err) {
           console.log("Error retrieving entity: \n\n", err);
           cb();
       } else {
           cb(JSON.parse(body));
       }
   })
}
exports.simpleWikidataSuggestion = simpleWikidataSuggestion;
