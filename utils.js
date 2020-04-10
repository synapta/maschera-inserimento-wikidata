const request   = require('request');
const fs        = require('fs');
const config = {
    instance: 'https://www.wikidata.org/w/api.php'
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

exports.sparqlQueryMonumentsNoId = function() {
    return `
    SELECT ?item ?itemLabel ?comune ?comuneLabel
    WHERE
    {
        ?item wdt:P2186 ?wlmId .
        FILTER isBLANK(?wlmId) .
        OPTIONAL { ?item wdt:P131 ?comune . }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "it". }
    }
    `;
}

exports.getSparqlRequestOptions = function(query) {
    return {
        method: 'GET',
        url: "https://query.wikidata.org/sparql?query=" + encodeURIComponent(query),
        headers: {
            'Accept': 'application/sparql-results+json',
            'User-Agent': 'nodejs'
        },
        timeout: 120000
    };
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

/**
 * Creates a brand new item on wikidata with the properties, labels and descriptions
 * specified in the request body.
 *
 * @param  {object}     object  request body.
 * @param  {object}     user    request user (undefined if not logged in).
 * @param  {Function}   created callback function.
 * @return {boolean}            successful request.
 */
exports.createNewItem = function (object, user, created) {

    let requestConfig;
    if (user !== undefined) {
        requestConfig = {
            credentials: {
                oauth: user.oauth
            }
        };
    } else {
        console.log("Not logged in, proceeding with anonymous request.")
        requestConfig = {
            anonymous: true
        };
    }

    if (object.claims.P2186 && object.claims.P2186.value === undefined) {
        object.claims.P2186.snaktype = "somevalue";
    }

    console.log("Creating...")
    wbEdit.entity.create({
        descriptions: { it: object.description},
        labels: { it: object.label},
        claims: object.claims
    }, requestConfig).then(re => {
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

/**
 * Compares the values of two sampe properties. The one from  wikidata property
 * needs to be simplified and its value extracted from the object. Returns an Array
 * containing only the properties that needs to be added to wikidata.
 *
 * @param  {string} propName name of the property, i.e. P31.
 * @param  {object} wdProp   wikidata representation of the property.
 * @param  {string|array|object} curProp  value of the property in the request body.
 * @return {array}          list of filtered properties that should be added to wikidata.
 */
function filterProperties(propName, wdProp, curProp) {
    let wdValue = wbk.simplify.propertyClaims(wdProp);
    let curValueArr = Array.isArray(curProp) ? curProp : [curProp];

    let result = [];

    // some properties accept an array of values (i.e. "P518": ["Q1385033", "Q183061"]).
    // In that case, each value is treated searately and matched against all the
    // existing wikidata values.
    //
    // i.e.
    //  wdValue = ["Q1385033", "Q183061"]
    //  curValueArr = ["Q1385033", "Q183061", "Q1107656"]
    //                   ↑match     ↑match     ↑no match
    //
    //  ==> result = ["Q1107656"]
    for (let i = 0; i<curValueArr.length; i++) {
        let curResult;
        let curValue = curValueArr[i];

        switch(propName) {
            case 'P6375':
                curResult = wdValue.includes(curValue.text);
                break;
            case 'P625':
                curResult = false;
                for (let i=0; i<wdValue.length; i++) {
                    if (wdValue[i][0] === curValue.latitude && wdValue[i][1] === curValue.longitude) {
                        curResult = true;
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
                            curResult = false;
                        } else {
                            curResult = curProp.qualifiers.P580 === wdQual;
                        }
                    }
                } else {
                    curResult = false;
                }
                break;
            default:
                curResult = wdValue.includes(curValue);
        }
        if (!curResult) {
            // if the current value of the property does not match (= there is no
            // property in wikidata with that value), add it to the returned object
            result.push(curValue);
        }
    }
    return result;
}

/**
 * For each property in the request body (body.entity.claims), check whether a
 * property with the same value already exists in wikidata. If so, removes that
 * property from the request body.
 *
 * @param  {object}     wdObj list of properties already in wikidata.
 * @param  {object}     obj   list of properties we are trying to add.
 * @param  {Function}   cb    callback function.
 * @return {object}           filtered object.
 */
function removeDuplicates(wdObj, obj, cb) {
    let totalKeys = Object.keys(obj).length;
    let currKey = 0;
    let newObj = {};

    // iterate over all the properties of the request body
    for (var k in obj) {
        if (k === 'P2186' && obj[k].value === undefined) {
            newObj[k] = obj[k];
            newObj[k].snaktype = "somevalue";
            if (++currKey === totalKeys) {
                cb(newObj);
            } else {
                continue;
            }
        }
        if (!Object.keys(wdObj).includes(k)) {
            newObj[k] = obj[k];
        } else {
            let resArray = filterProperties(k, wdObj[k], obj[k]);

            // add to the filtered body only if the result is not empty
            if (resArray.length > 0) {
                newObj[k] = resArray;
            }
        }
        if (++currKey === totalKeys) {
            cb(newObj);
        }
    }
}

/**
 * Performs an edit on an item aready existing in wikidata. First check whether
 * the item exists, then filters out properties whose values already exists for
 * the item, then performs the actual edit request.
 *
 * @param  {object}     object  request body.
 * @param  {object}     user    request user (undefined if not logged in).
 * @param  {Function}   updated callback function.
 * @return {boolean}            successful request.
 */
exports.editItem = function (object, user, updated) {

    let requestConfig;
    if (user !== undefined) {
        requestConfig = {
            credentials: {
                oauth: user.oauth
            }
        };
    } else {
        console.log("Not logged in, proceeding with anonymous request.")
        requestConfig = {
            anonymous: true
        };
    }

    getItem(object.id, function(wdObject) {
        if (wdObject === undefined) {
            updated(false);
            return;
        }

        removeDuplicates(wdObject.entities[object.id].claims, object.claims, function (editObj) {

            console.log(JSON.stringify(editObj, null, 2));

            if (Object.entries(editObj).length === 0 && editObj.constructor === Object) {
                console.log("Skip! Everything already in!");
                updated(true);
                return;
            } else {
                console.log("Updating...");
                wbEdit.entity.edit({
                  id: object.id,
                  claims: editObj
              }, requestConfig).then(re => {
                    if (re.success) {
                        updated(true);
                    } else {
                        console.error(re);
                        updated(false);
                    }
                }).catch(err => {
                    console.log("Something wrong!");
                    console.log(err);
                    console.log("\nCLAIMS:\n",editObj);
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

var convertSingleStatementToRaw = function(key, objValue) {
    let rawObj = {
        "mainsnak": {
            "snaktype": "value",
            "property": key
        },
        "type": "statement",
        "rank": "normal"
    }
    switch (key) {
        case 'P31':
        case 'P131':
        case 'P518':
        case 'P790':
            rawObj.mainsnak.datavalue = {
                "value": {
                    "entity-type": "item",
                    "numeric-id": parseInt(objValue.replace("Q","")),
                    "id": objValue
                },
                "type": "wikibase-entityid"
            };
            rawObj.mainsnak.datatype = "wikibase-item";
            break;
        case 'P856':
            rawObj.mainsnak.datavalue = {
                "value": objValue,
                "type": "string"
            };
            rawObj.mainsnak.datatype = "url";
            break;
        case 'P402':
            rawObj.mainsnak.datavalue = {
                "value": objValue,
                "type": "string"
            };
            break;
        case 'P625':
            rawObj.mainsnak.datavalue = {
                "value": objValue,
                "type": "globecoordinate"
            };
            rawObj.mainsnak.datavalue.value.globe = "http://www.wikidata.org/entity/Q2";
            rawObj.mainsnak.datatype = "globe-coordinate";
            break;
        case 'P2186':
            if (objValue.value !== undefined) {
                rawObj.mainsnak.datavalue = {
                    "value": objValue.value,
                    "type": "string"
                }
            } else {
                rawObj.mainsnak.snaktype = "somevalue";
            }
            rawObj.mainsnak.datatype = "external-id";
            if (objValue.qualifiers && objValue.qualifiers.P580) {
                rawObj.qualifiers = {
                    "P580": [
                        {
                            "snaktype": "value",
                            "property": "P580",
                            "datavalue": {
                                "value": {
                                    "time": `+${new Date(objValue.qualifiers.P580).toISOString().split(".")[0]}Z`,
                                    "timezone": 0,
                                    "before": 0,
                                    "after": 0,
                                    "precision": 9,
                                    "calendarmodel": "http://www.wikidata.org/entity/Q1985727"
                                },
                                "type": "time"
                            },
                            "datatype": "time"
                        }
                    ]
                }
            }
            break;
        case 'P6375':
            rawObj.mainsnak.datavalue = {
                "value": objValue,
                "type": "monolingualtext"
            };
            rawObj.mainsnak.datatype = "monolingualtext";
            break;
    }
    return rawObj;
}

var buildRawWikidataObject = function(postObject) {
    let rawObject = {
        "claims": []
    };

    for (var k in postObject) {
        let values = Array.isArray(postObject[k]) ? postObject[k] : [postObject[k]];
        for (let i=0; i<values.length; i++) {
            rawObject.claims.push(convertSingleStatementToRaw(k, values[i]));
        }
    }

    if (postObject.description) {
        rawObject.descriptions = { it: postObject.description};
    }
    if (postObject.label) {
        rawObject.labels = { it: postObject.label};
    }

    return rawObject;
}

var anonymousEditItem = function(object, updated) {
    getItem(object.id, function(wdObject) {
        if (wdObject === undefined) {
            updated(false);
            return;
        }

        removeDuplicates(wdObject.entities[object.id].claims, object.claims, function (editObj) {

            let wlmProp = object.claims.P2186;
            if (wlmProp && wlmProp.qualifiers && wlmProp.qualifiers.P580 && wlmProp.value === undefined) {
                editObj.P2186 = wlmProp;
            }
            console.log(JSON.stringify(buildRawWikidataObject(editObj), null, 2))

            if (Object.entries(editObj).length === 0 && editObj.constructor === Object) {
                console.log("Skip! Everything already in!");
                updated(true);
                return;
            }

            let endpointWikidata = {
                method: 'POST',
                url: `https://www.wikidata.org/w/api.php?action=wbeditentity&format=json&languages=it&id=${object.id}`,
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'User-Agent': 'nodejs',
                },
                formData: {
                    'token': '+\\',
                    'data': JSON.stringify(buildRawWikidataObject(editObj))
                },
                timeout: 120000
            };

            request(endpointWikidata, function(err,res,body){
                if (err) {
                    console.log("Error editing item:\n\n", err);
                    updated(false);
                } else {
                    if (body.error !== undefined && body.error !== null) {
                        console.log("Error creating item:\n\n", body.error);
                        updated(false);
                    } else {
                        console.log("Item succesfully edited!")
                        updated(true);
                    }
                }
            })

        });

    });
}

var anonymousCreateNewItem = function(object, created) {

    let rawObject = buildRawWikidataObject(object.claims);

    console.log(JSON.stringify(rawObject, null, 2));

    let endpointWikidata = {
        method: 'POST',
        url: 'https://www.wikidata.org/w/api.php?action=wbeditentity&format=json&languages=it&new=item',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'nodejs',
        },
        formData: {
            'token': '+\\',
            'data': JSON.stringify()
        },
        timeout: 120000
    };

    request(endpointWikidata, function(err, res, body){
        if (err) {
            console.log("Error creating item:\n\n", err);
            created(false);
        } else {
            if (body.error !== undefined && body.error !== null) {
                console.log("Error creating item:\n\n", body.error);
                created(false);
            } else {
                console.log("Item succesfully created!");
                created(true);
            }
        }
    })
}
